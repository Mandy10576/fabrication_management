// Bill-generation engine — turns "which cycles are billable" (rentCycleService)
// into persisted RentBill rows. Called from three places that must all stay
// idempotent against each other: the daily cron, the manual "Generate Bills"
// admin action, and the one-time data migration script.
const prisma = require('../config/prisma');
const { listBillableCycles } = require('./rentCycleService');
const { addDaysUTC } = require('../utils/dateCalc');
const devDate = require('../utils/devDate');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Materializes every billable-but-not-yet-billed cycle for one contract as
 * a RentBill row. Safe to call repeatedly (createMany + skipDuplicates on
 * the [contractId, cycleStart] unique constraint) — re-running for a cycle
 * that's already billed is a no-op and never touches that bill's payment
 * history. dueDate is schedule-based (cycleEnd + gracePeriodDays), not
 * generatedAt-based, so a late backfill doesn't understate how overdue an
 * old cycle already is. */
const generateBillsForContract = async (contract, throughDate = devDate.now(), generatedBy = 'AUTO') => {
  const billableCycles = listBillableCycles(contract.startDate, contract.status === 'ENDED' ? contract.endDate : null, throughDate);
  if (billableCycles.length === 0) return { count: 0 };

  const rows = billableCycles.map((c) => ({
    contractId: contract.id,
    cycleStart: c.cycleStart,
    cycleEnd: c.cycleEnd,
    dueDate: addDaysUTC(c.cycleEnd, contract.gracePeriodDays),
    rentAmount: contract.monthlyRent,
    generatedBy
  }));

  return prisma.rentBill.createMany({ data: rows, skipDuplicates: true });
};

/** Runs bill generation for every ACTIVE contract, plus any ENDED contract
 * whose final cycle might not have been billed yet (e.g. ended since the
 * last cron run). Returns the total bills created. */
const generateBillsForAllContracts = async (throughDate = devDate.now()) => {
  const contracts = await prisma.rentContract.findMany({
    where: { OR: [{ status: 'ACTIVE' }, { status: 'ENDED' }] }
  });

  let total = 0;
  for (const contract of contracts) {
    const result = await generateBillsForContract(contract, throughDate, 'AUTO');
    total += result.count || 0;
  }
  return total;
};

/** Stamps a late fee once onto every bill that's gone overdue and hasn't
 * already been fee-stamped — never recomputed after, so a partial payment
 * later doesn't change what fee was already applied. */
const applyLateFees = async (throughDate = devDate.now()) => {
  const overdueBills = await prisma.rentBill.findMany({
    where: {
      status: { in: ['UNPAID', 'PARTIAL'] },
      lateFeeApplied: 0,
      dueDate: { lt: throughDate },
      contract: { lateFeePolicy: { not: 'NONE' } }
    },
    include: { contract: true }
  });

  for (const bill of overdueBills) {
    const fee = bill.contract.lateFeePolicy === 'FIXED_AMOUNT'
      ? bill.contract.lateFeeValue
      : round2((bill.rentAmount * bill.contract.lateFeeValue) / 100);
    if (fee > 0) {
      await prisma.rentBill.update({ where: { id: bill.id }, data: { lateFeeApplied: fee } });
    }
  }
  return overdueBills.length;
};

/** Recomputes amountPaid/status for one bill from its payment ledger —
 * never hand-set outside this function, same pattern as
 * recomputeElectricityBill. Compared against (rentAmount + lateFeeApplied),
 * not rentAmount alone, so a stamped late fee counts toward "paid in full". */
const recomputeBill = async (billId) => {
  const bill = await prisma.rentBill.findUnique({ where: { id: billId }, include: { payments: true } });
  if (!bill) return null;

  const amountPaid = round2(bill.payments.reduce((sum, p) => sum + p.amount, 0));
  const amountDue = round2(bill.rentAmount + bill.lateFeeApplied);
  let status = 'UNPAID';
  if (amountPaid > 0 && amountPaid >= amountDue - 0.01) status = 'PAID';
  else if (amountPaid > 0) status = 'PARTIAL';

  return prisma.rentBill.update({ where: { id: billId }, data: { amountPaid, status } });
};

/** Cron entry point — generate first, then apply late fees, in that order
 * (a bill freshly generated this run must not be immediately fee-stamped
 * before its own grace period has elapsed; dueDate being cycleEnd-based
 * already guarantees this either way). */
const runDailyBillingCycle = async (throughDate = devDate.now()) => {
  const generated = await generateBillsForAllContracts(throughDate);
  const feesApplied = await applyLateFees(throughDate);
  return { generated, feesApplied };
};

module.exports = {
  round2,
  generateBillsForContract,
  generateBillsForAllContracts,
  applyLateFees,
  recomputeBill,
  runDailyBillingCycle
};
