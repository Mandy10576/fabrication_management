// One-time data migration: backfills RentBill/RentBillPayment from the
// legacy RentPayment ledger, now that RentArea/RentBuilding/RentTenancy have
// already been renamed in place to RentProperty/RentContract (schema-level
// migration — see prisma/manual_migrations/20260816_rent_rearchitecture_phase1.sql).
//
// Run in DRY RUN mode by default — it only logs what it would do. Pass
// --commit to actually write, after you've reviewed the dry-run output and
// taken a pg_dump backup.
//
//   node scripts/migrateRentToContracts.js            # dry run
//   node scripts/migrateRentToContracts.js --commit    # actually writes
//
// Known, permanent data-fidelity gap: historical per-cycle rent amounts
// aren't recoverable anywhere in the old schema — a backfilled RentBill's
// rentAmount uses the contract's CURRENT monthlyRent, not whatever it may
// have been at the time that cycle actually occurred. This only matters for
// a tenant whose rent changed mid-tenancy.
const prisma = require('../src/config/prisma');
const { round2 } = require('../src/services/rentBillingService');
const { listCyclesSince, listBillableCycles } = require('../src/services/rentCycleService');
const { addDaysUTC } = require('../src/utils/dateCalc');
const devDate = require('../src/utils/devDate');

const COMMIT = process.argv.includes('--commit');

const log = (...args) => console.log(...args);

async function preflight(contracts, legacyPayments) {
  const paymentsByContract = new Map();
  for (const p of legacyPayments) {
    if (!paymentsByContract.has(p.tenancyId)) paymentsByContract.set(p.tenancyId, []);
    paymentsByContract.get(p.tenancyId).push(p);
  }

  const orphanedCycleStarts = [];
  const notYetEndedCycles = [];
  const now = devDate.now();

  for (const contract of contracts) {
    const payments = paymentsByContract.get(contract.id) || [];
    if (payments.length === 0) continue;

    const currentCycles = listCyclesSince(contract.startDate, contract.status === 'ENDED' ? contract.endDate : now);
    const currentCycleStarts = new Set(currentCycles.map((c) => c.cycleStart.getTime()));

    for (const p of payments) {
      const cycleStartTime = new Date(p.cycleStart).getTime();
      if (!currentCycleStarts.has(cycleStartTime)) {
        orphanedCycleStarts.push({ contractId: contract.id, paymentId: p.id, cycleStart: p.cycleStart });
      }
      const matchingCycle = currentCycles.find((c) => c.cycleStart.getTime() === cycleStartTime);
      if (matchingCycle && matchingCycle.cycleEnd.getTime() >= now.getTime() && contract.status === 'ACTIVE') {
        notYetEndedCycles.push({ contractId: contract.id, paymentId: p.id, cycleStart: p.cycleStart });
      }
    }
  }

  return { orphanedCycleStarts, notYetEndedCycles };
}

async function run() {
  log(`\n=== Rent → Contract/Bill migration (${COMMIT ? 'COMMIT' : 'DRY RUN'}) ===\n`);

  const [contracts, legacyPayments] = await Promise.all([
    prisma.rentContract.findMany(),
    prisma.rentPayment.findMany()
  ]);

  log(`Contracts to process: ${contracts.length}`);
  log(`Legacy RentPayment rows to migrate: ${legacyPayments.length} (total ₹${round2(legacyPayments.reduce((s, p) => s + p.amount, 0))})`);

  const { orphanedCycleStarts, notYetEndedCycles } = await preflight(contracts, legacyPayments);
  if (orphanedCycleStarts.length > 0) {
    log(`\n⚠ ${orphanedCycleStarts.length} payment(s) reference a cycleStart that no longer matches the contract's current cycle math (likely because startDate was edited after the payment was recorded). These will still be migrated — a RentBill will be created directly at that exact cycleStart even if it falls outside the current cycle sequence.`);
    orphanedCycleStarts.forEach((o) => log(`   contract=${o.contractId} payment=${o.paymentId} cycleStart=${o.cycleStart.toISOString().slice(0, 10)}`));
  }
  if (notYetEndedCycles.length > 0) {
    log(`\n⚠ ${notYetEndedCycles.length} payment(s) reference a cycle that is not yet fully ended as of today, for a still-ACTIVE contract. These break the "cycle must be ended to bill" rule and are flagged for manual review — MANUAL REVIEW RECOMMENDED before committing:`);
    notYetEndedCycles.forEach((o) => log(`   contract=${o.contractId} payment=${o.paymentId} cycleStart=${o.cycleStart.toISOString().slice(0, 10)}`));
  }

  let billsGenerated = 0;
  let paymentsMigrated = 0;
  let paymentsSkippedAlreadyMigrated = 0;
  const billIdCache = new Map(); // `${contractId}|${cycleStartISO}` -> billId

  const paymentsByContract = new Map();
  for (const p of legacyPayments) {
    if (!paymentsByContract.has(p.tenancyId)) paymentsByContract.set(p.tenancyId, []);
    paymentsByContract.get(p.tenancyId).push(p);
  }

  const doWork = async (tx) => {
    for (const contract of contracts) {
      // Backfill every billable cycle up to today (or endDate) — this also
      // materializes currently-unpaid arrears that have zero payments, so
      // they aren't invisible in the new Bill table until the next cron run.
      const billableCycles = listBillableCycles(contract.startDate, contract.status === 'ENDED' ? contract.endDate : null, devDate.now());
      const result = await tx.rentBill.createMany({
        data: billableCycles.map((c) => ({
          contractId: contract.id,
          cycleStart: c.cycleStart,
          cycleEnd: c.cycleEnd,
          dueDate: addDaysUTC(c.cycleEnd, contract.gracePeriodDays),
          rentAmount: contract.monthlyRent,
          generatedBy: 'AUTO'
        })),
        skipDuplicates: true
      });
      billsGenerated += result.count || 0;

      const payments = paymentsByContract.get(contract.id) || [];
      for (const p of payments) {
        const cacheKey = `${contract.id}|${new Date(p.cycleStart).toISOString()}`;
        let billId = billIdCache.get(cacheKey);
        if (!billId) {
          let bill = await tx.rentBill.findUnique({
            where: { contractId_cycleStart: { contractId: contract.id, cycleStart: p.cycleStart } }
          });
          if (!bill) {
            // Orphaned cycleStart (didn't come out of the standard cycle
            // walk) — create a bill directly at the payment's own recorded
            // cycleStart so the payment has somewhere to attach.
            const cycleEnd = new Date(p.cycleStart);
            cycleEnd.setUTCMonth(cycleEnd.getUTCMonth() + 1);
            cycleEnd.setUTCDate(cycleEnd.getUTCDate() - 1);
            bill = await tx.rentBill.create({
              data: {
                contractId: contract.id,
                cycleStart: p.cycleStart,
                cycleEnd,
                dueDate: addDaysUTC(cycleEnd, contract.gracePeriodDays),
                rentAmount: contract.monthlyRent,
                generatedBy: 'AUTO'
              }
            });
            billsGenerated += 1;
          }
          billId = bill.id;
          billIdCache.set(cacheKey, billId);
        }

        const existing = await tx.rentBillPayment.findUnique({ where: { legacyPaymentId: p.id } });
        if (existing) {
          paymentsSkippedAlreadyMigrated += 1;
          continue;
        }

        await tx.rentBillPayment.create({
          data: {
            billId,
            amount: p.amount,
            paymentDate: p.paymentDate,
            paymentMode: p.paymentMode,
            referenceNo: p.referenceNo,
            notes: p.notes,
            batchId: p.batchId,
            legacyPaymentId: p.id
          }
        });
        paymentsMigrated += 1;
      }
    }

    // Recompute amountPaid/status on every bill touched.
    const touchedBillIds = Array.from(billIdCache.values());
    for (const billId of touchedBillIds) {
      const bill = await tx.rentBill.findUnique({ where: { id: billId }, include: { payments: true } });
      const amountPaid = round2(bill.payments.reduce((s, p) => s + p.amount, 0));
      const amountDue = round2(bill.rentAmount + bill.lateFeeApplied);
      let status = 'UNPAID';
      if (amountPaid > 0 && amountPaid >= amountDue - 0.01) status = 'PAID';
      else if (amountPaid > 0) status = 'PARTIAL';
      await tx.rentBill.update({ where: { id: billId }, data: { amountPaid, status } });
    }
  };

  if (COMMIT) {
    await prisma.$transaction(doWork, { timeout: 5 * 60_000 });
  } else {
    // Dry run: run the same logic inside a transaction that we always roll
    // back, so we get accurate counts without writing anything.
    try {
      await prisma.$transaction(async (tx) => {
        await doWork(tx);
        throw new Error('__DRY_RUN_ROLLBACK__');
      }, { timeout: 5 * 60_000 });
    } catch (err) {
      if (err.message !== '__DRY_RUN_ROLLBACK__') throw err;
    }
  }

  log(`\nBills created: ${billsGenerated}`);
  log(`Payments migrated: ${paymentsMigrated}`);
  if (paymentsSkippedAlreadyMigrated > 0) log(`Payments already migrated (skipped, re-run safe): ${paymentsSkippedAlreadyMigrated}`);

  // Sanity check (read-only queries against the actual committed state; in
  // dry-run mode the totals below reflect pre-existing data only, since
  // nothing was written).
  const oldSum = round2(legacyPayments.reduce((s, p) => s + p.amount, 0));
  const newPayments = await prisma.rentBillPayment.findMany({ where: { legacyPaymentId: { not: null } } });
  const newSum = round2(newPayments.reduce((s, p) => s + p.amount, 0));
  log(`\nSanity check — legacy RentPayment total: ₹${oldSum}, migrated RentBillPayment total: ₹${newSum} ${COMMIT ? (oldSum === newSum ? '✔ MATCH' : '✘ MISMATCH') : '(dry run — not yet written)'}`);

  log(`\n${COMMIT ? 'Migration committed.' : 'Dry run complete — no data was written. Re-run with --commit to apply.'}\n`);
}

run()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
