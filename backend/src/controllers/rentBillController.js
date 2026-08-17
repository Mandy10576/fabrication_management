const crypto = require('crypto');
const prisma = require('../config/prisma');
const { round2, generateBillsForContract, forceGenerateCurrentCycleBill, generateBillsForAllContracts, recomputeBill } = require('../services/rentBillingService');
const { getElectricityDueForRoom } = require('./rentElectricityController');
const { normalizeToUTCMidnight } = require('../utils/dateCalc');
const devDate = require('../utils/devDate');

/** A contract's bills, already persisted rows — no live cycle math here.
 * `contract` must include `bills`. Kept name-compatible with the old
 * computeTenancySummary shape (`cycles`, `totalPending`, `totalPaid`,
 * `currentCycle`) so callers didn't need a second rename, but every figure
 * now comes straight from RentBill rows instead of being recomputed.
 *
 * Defensive re-check: a bill is only ever surfaced once its own cycle has
 * fully ended (or the contract itself has ended) — same "must be ended"
 * rule bill generation is supposed to enforce at write time. Re-checking it
 * here too means a bad row (e.g. a legacy advance payment migrated onto a
 * not-yet-ended cycle) can never show as a premature "current" due, no
 * matter how it ended up in the table. The one exception is a bill stamped
 * `forced: true` — an admin explicitly asked to bill ahead of schedule via
 * "Force Generate", so it's allowed through even mid-cycle. */
const summarizeContract = (contract, throughDate = devDate.now()) => {
  const ended = contract.status === 'ENDED' && contract.endDate;
  const throughDay = normalizeToUTCMidnight(ended ? contract.endDate : throughDate);

  const cycles = (contract.bills || [])
    .filter((bill) => ended || bill.forced || new Date(bill.cycleEnd).getTime() < throughDay.getTime())
    .slice()
    .sort((a, b) => new Date(b.cycleStart).getTime() - new Date(a.cycleStart).getTime())
    .map((bill) => {
      const expected = Math.max(0, round2(bill.rentAmount + bill.lateFeeApplied + bill.miscAmount - bill.discountAmount));
      const pending = Math.max(0, round2(expected - bill.amountPaid));
      return {
        billId: bill.id,
        cycleStart: bill.cycleStart,
        cycleEnd: bill.cycleEnd,
        dueDate: bill.dueDate,
        expected,
        rentAmount: bill.rentAmount,
        lateFeeApplied: bill.lateFeeApplied,
        miscAmount: bill.miscAmount,
        miscLabel: bill.miscLabel,
        discountAmount: bill.discountAmount,
        paid: bill.amountPaid,
        pending,
        status: bill.status,
        forced: bill.forced
      };
    });
  const totalPending = round2(cycles.reduce((sum, c) => sum + c.pending, 0));
  const totalPaid = round2((contract.bills || []).reduce((sum, b) => sum + b.amountPaid, 0));
  return { cycles, totalPending, totalPaid, currentCycle: cycles[0] || null };
};

/** Groups rent + electricity payment rows sharing a batchId into one
 * "combined payment" entry for display, most recent first. Rows without a
 * batchId (itemized rent-only / electricity-only payments made outside the
 * combined flow) simply aren't part of any batch and don't appear here. */
const buildCombinedPaymentHistory = (rentPayments, electricityPayments) => {
  const batches = new Map();

  const touch = (batchId, patch, amountKey) => {
    const cur = batches.get(batchId) || {
      batchId, rentAmount: 0, electricityAmount: 0,
      paymentDate: patch.paymentDate, paymentMode: patch.paymentMode,
      referenceNo: patch.referenceNo, notes: patch.notes
    };
    cur[amountKey] = round2(cur[amountKey] + patch.amount);
    batches.set(batchId, cur);
  };

  (rentPayments || []).filter((p) => p.batchId).forEach((p) => touch(p.batchId, p, 'rentAmount'));
  (electricityPayments || []).filter((p) => p.batchId).forEach((p) => touch(p.batchId, p, 'electricityAmount'));

  return Array.from(batches.values())
    .map((b) => ({ ...b, totalAmount: round2(b.rentAmount + b.electricityAmount) }))
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
};

// ---------------------------------------------------------------------------
// Bill generation
// ---------------------------------------------------------------------------

/** Manual "Generate Bills" action — same idempotent function the daily cron
 * uses, so calling it never creates a duplicate for an already-billed
 * cycle. Optionally scoped to one contract via `contractId` in the body;
 * otherwise runs for every ACTIVE/ENDED contract.
 *
 * `force: true` (only valid together with `contractId`) is the one
 * sanctioned way to bill a cycle before it's ended — see
 * forceGenerateCurrentCycleBill. Everywhere else in the app, "not yet
 * ended" means "not billable", full stop. */
const generateBills = async (req, res, next) => {
  try {
    const { contractId, force, rentAmount, lateFee, discountAmount, miscAmount, miscLabel, notes } = req.body || {};

    if (contractId) {
      const contract = await prisma.rentContract.findUnique({ where: { id: contractId } });
      if (!contract) return res.status(404).json({ error: 'Contract not found' });

      if (force && contract.status !== 'ACTIVE') {
        return res.status(400).json({ error: 'Only an active contract has a current cycle to force-bill.' });
      }

      const miscAmt = round2(parseFloat(miscAmount) || 0);
      if (miscAmt > 0 && !miscLabel?.trim()) {
        return res.status(400).json({ error: 'Enter what the miscellaneous charge is for.' });
      }

      const result = force
        ? await forceGenerateCurrentCycleBill(contract, devDate.now())
        : await generateBillsForContract(contract, devDate.now(), 'MANUAL');

      // Overrides entered on the manual-generate form apply to the bill
      // this call just created — rent amount, late fee, discount, misc
      // charge, notes. Only meaningful when exactly one new cycle was
      // billed (the normal case for a manual single-contract generate) —
      // found via the most recent cycleStart for this contract.
      if ((result.count || 0) > 0) {
        const newestBill = await prisma.rentBill.findFirst({ where: { contractId }, orderBy: { cycleStart: 'desc' } });
        if (newestBill) {
          const data = {
            lateFeeApplied: round2(parseFloat(lateFee) || 0),
            discountAmount: round2(parseFloat(discountAmount) || 0),
            miscAmount: miscAmt,
            miscLabel: miscAmt > 0 ? miscLabel.trim() : null,
            notes: notes?.trim() || null
          };
          if (rentAmount !== undefined && rentAmount !== '' && !isNaN(parseFloat(rentAmount))) {
            data.rentAmount = round2(parseFloat(rentAmount));
          }
          await prisma.rentBill.update({ where: { id: newestBill.id }, data });
          await recomputeBill(newestBill.id);
        }
      }

      return res.status(201).json({ generated: result.count || 0, forced: !!force });
    }

    const generated = await generateBillsForAllContracts(devDate.now());
    res.status(201).json({ generated });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Bills (list/detail)
// ---------------------------------------------------------------------------

const getBills = async (req, res, next) => {
  try {
    const { propertyId, status, search, month } = req.query;

    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (propertyId || search) {
      where.contract = {
        room: {
          ...(propertyId ? { propertyId } : {}),
          ...(search ? { roomNumber: { contains: search, mode: 'insensitive' } } : {})
        }
      };
    }
    if (search) {
      where.OR = [
        { contract: { tenant: { name: { contains: search, mode: 'insensitive' } } } },
        { contract: { room: { roomNumber: { contains: search, mode: 'insensitive' } } } }
      ];
    }
    if (month) {
      const monthStart = new Date(month);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
      where.cycleStart = { gte: monthStart, lt: monthEnd };
    }

    // Defensive re-check: never list a bill whose own cycle hasn't actually
    // ended yet (for a still-active contract) — see summarizeContract for
    // why this must be enforced again here, not just at generation time.
    // `forced` bills are the one sanctioned exception (see generateBills).
    const throughDay = normalizeToUTCMidnight(devDate.now());
    where.AND = [{ OR: [{ cycleEnd: { lt: throughDay } }, { contract: { status: 'ENDED' } }, { forced: true }] }];

    const bills = await prisma.rentBill.findMany({
      where,
      include: {
        contract: {
          include: {
            tenant: { select: { id: true, name: true, mobile: true } },
            room: { select: { id: true, roomNumber: true, property: { select: { id: true, name: true } } } }
          }
        },
        payments: { orderBy: { paymentDate: 'desc' } }
      },
      orderBy: { cycleStart: 'desc' }
    });

    res.json(bills.map((b) => ({ ...b, amountDue: Math.max(0, round2(b.rentAmount + b.lateFeeApplied + b.miscAmount - b.discountAmount - b.amountPaid)) })));
  } catch (error) {
    next(error);
  }
};

const getBillById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bill = await prisma.rentBill.findUnique({
      where: { id },
      include: {
        contract: { include: { tenant: true, room: { include: { property: true } } } },
        payments: { orderBy: { paymentDate: 'desc' } }
      }
    });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json({ ...bill, amountDue: Math.max(0, round2(bill.rentAmount + bill.lateFeeApplied + bill.miscAmount - bill.discountAmount - bill.amountPaid)) });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Bill payments
// ---------------------------------------------------------------------------

const addBillPayment = async (req, res, next) => {
  try {
    const { id } = req.params; // bill id
    const { amount, paymentDate, paymentMode, referenceNo, notes } = req.body;

    const bill = await prisma.rentBill.findUnique({ where: { id } });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    await prisma.rentBillPayment.create({
      data: {
        billId: id,
        amount: payAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : devDate.now(),
        paymentMode: paymentMode || 'CASH',
        referenceNo: referenceNo || null,
        notes: notes || null
      }
    });

    const updated = await recomputeBill(id);
    res.status(201).json(updated);
  } catch (error) {
    next(error);
  }
};

const updateBillPayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params; // id = bill id
    const { amount, paymentDate, paymentMode, referenceNo, notes } = req.body;

    const payment = await prisma.rentBillPayment.findFirst({ where: { id: paymentId, billId: id } });
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    await prisma.rentBillPayment.update({
      where: { id: paymentId },
      data: {
        amount: payAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : payment.paymentDate,
        paymentMode: paymentMode || payment.paymentMode,
        referenceNo: referenceNo !== undefined ? (referenceNo || null) : payment.referenceNo,
        notes: notes !== undefined ? (notes || null) : payment.notes
      }
    });

    const updated = await recomputeBill(id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteBillPayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;
    const payment = await prisma.rentBillPayment.findFirst({ where: { id: paymentId, billId: id } });
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    await prisma.rentBillPayment.delete({ where: { id: paymentId } });

    const updated = await recomputeBill(id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Miscellaneous charge — one free-form extra line an admin can attach to a
// bill (e.g. a repair, a one-off fee), on top of rent + late fee. Setting
// miscAmount to 0 clears it. Never touches the payment ledger — just
// changes what the bill is due for, so amountPaid/status get recomputed
// the same way a payment mutation would.
// ---------------------------------------------------------------------------

const updateBillCharge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { miscAmount, miscLabel } = req.body;

    const bill = await prisma.rentBill.findUnique({ where: { id } });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const amt = round2(parseFloat(miscAmount) || 0);
    if (amt < 0) return res.status(400).json({ error: 'Charge amount cannot be negative.' });
    if (amt > 0 && !miscLabel?.trim()) {
      return res.status(400).json({ error: 'Enter what this miscellaneous charge is for.' });
    }

    await prisma.rentBill.update({
      where: { id },
      data: { miscAmount: amt, miscLabel: amt > 0 ? miscLabel.trim() : null }
    });

    const updated = await recomputeBill(id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Combined Rent + Electricity payment — one admin action, one receipt, that
// may settle a rent bill, electricity, or both at once (with a partial
// split between them). Each side is still just a normal RentBillPayment /
// RentElectricityPayment row — batchId is the only thing that ties them
// together as "one payment" for display.
// ---------------------------------------------------------------------------

const addCombinedPayment = async (req, res, next) => {
  try {
    const { id } = req.params; // contractId
    const { rentAmount, rentBillId, electricityAmount, paymentDate, paymentMode, referenceNo, notes } = req.body;

    const contract = await prisma.rentContract.findUnique({ where: { id } });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const rentAmt = round2(parseFloat(rentAmount) || 0);
    const elecAmt = round2(parseFloat(electricityAmount) || 0);

    if (rentAmt <= 0 && elecAmt <= 0) {
      return res.status(400).json({ error: 'Enter an amount for rent, electricity, or both.' });
    }

    let targetBill = null;
    if (rentAmt > 0) {
      if (!rentBillId) {
        return res.status(400).json({ error: 'A rent bill must be selected to apply the rent portion.' });
      }
      targetBill = await prisma.rentBill.findFirst({ where: { id: rentBillId, contractId: id } });
      if (!targetBill) {
        return res.status(400).json({ error: 'Selected rent bill is not valid for this contract.' });
      }
      const pending = Math.max(0, round2(targetBill.rentAmount + targetBill.lateFeeApplied + targetBill.miscAmount - targetBill.discountAmount - targetBill.amountPaid));
      if (rentAmt > pending + 0.01) {
        return res.status(400).json({ error: `Rent amount cannot exceed the pending amount of ₹${pending.toFixed(2)} for that bill.` });
      }
    }

    if (elecAmt > 0) {
      const due = await getElectricityDueForRoom(contract.roomId);
      if (elecAmt > due + 0.01) {
        return res.status(400).json({ error: `Electricity amount cannot exceed the outstanding electricity due of ₹${due.toFixed(2)}.` });
      }
    }

    const batchId = crypto.randomUUID();
    const payDate = paymentDate ? new Date(paymentDate) : devDate.now();
    const mode = paymentMode || 'CASH';

    await prisma.$transaction(async (tx) => {
      if (rentAmt > 0) {
        await tx.rentBillPayment.create({
          data: { billId: targetBill.id, amount: rentAmt, paymentDate: payDate, paymentMode: mode, referenceNo: referenceNo || null, notes: notes || null, batchId }
        });
        const paid = await tx.rentBillPayment.aggregate({ where: { billId: targetBill.id }, _sum: { amount: true } });
        const amountPaid = round2(paid._sum.amount || 0);
        const amountDue = Math.max(0, round2(targetBill.rentAmount + targetBill.lateFeeApplied + targetBill.miscAmount - targetBill.discountAmount));
        let status = 'UNPAID';
        if (amountPaid > 0 && amountPaid >= amountDue - 0.01) status = 'PAID';
        else if (amountPaid > 0) status = 'PARTIAL';
        await tx.rentBill.update({ where: { id: targetBill.id }, data: { amountPaid, status } });
      }

      if (elecAmt > 0) {
        const bills = await tx.rentElectricityBill.findMany({
          where: { roomId: contract.roomId, status: { not: 'PAID' } },
          orderBy: { billDate: 'asc' }
        });

        let remaining = elecAmt;
        for (const bill of bills) {
          if (remaining <= 0.01) break;
          const pending = round2(bill.amount - bill.amountPaid);
          if (pending <= 0.01) continue;
          const portion = round2(Math.min(pending, remaining));

          await tx.rentElectricityPayment.create({
            data: { billId: bill.id, contractId: bill.contractId, amount: portion, paymentDate: payDate, paymentMode: mode, referenceNo: referenceNo || null, notes: notes || null, batchId }
          });

          const newAmountPaid = round2(bill.amountPaid + portion);
          const newPending = round2(bill.amount - newAmountPaid);
          let newStatus = 'PENDING';
          if (newAmountPaid > 0 && newPending <= 0.01) newStatus = 'PAID';
          else if (newAmountPaid > 0) newStatus = 'PARTIAL';

          await tx.rentElectricityBill.update({
            where: { id: bill.id },
            data: { amountPaid: newAmountPaid, status: newStatus, paymentDate: payDate, paymentMode: mode }
          });

          remaining = round2(remaining - portion);
        }
      }
    });

    const updatedContract = await prisma.rentContract.findUnique({
      where: { id },
      include: { tenant: true, bills: { orderBy: { cycleStart: 'desc' }, include: { payments: true } } }
    });
    const electricityDue = await getElectricityDueForRoom(contract.roomId);

    res.status(201).json({
      batchId,
      rentAmount: rentAmt,
      electricityAmount: elecAmt,
      totalAmount: round2(rentAmt + elecAmt),
      contract: { ...updatedContract, summary: summarizeContract(updatedContract) },
      electricityDue
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  summarizeContract,
  buildCombinedPaymentHistory,
  generateBills,
  getBills,
  getBillById,
  addBillPayment,
  updateBillPayment,
  deleteBillPayment,
  updateBillCharge,
  addCombinedPayment
};
