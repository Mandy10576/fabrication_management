const prisma = require('../config/prisma');
const devDate = require('../utils/devDate');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Re-aggregates a bill's payments and writes back amountPaid/status/
 * paymentDate/paymentMode — the same recompute-after-every-mutation pattern
 * used for Invoice and RentBill, never incremented in place. Returns the
 * refreshed bill (with its payments, most recent first). */
const recomputeElectricityBill = async (billId) => {
  const bill = await prisma.rentElectricityBill.findUnique({
    where: { id: billId },
    include: { payments: { orderBy: { paymentDate: 'desc' } } }
  });
  if (!bill) return null;

  const amountPaid = round2(bill.payments.reduce((sum, p) => sum + p.amount, 0));
  const pending = round2(bill.amount - amountPaid);
  let status = 'PENDING';
  if (amountPaid > 0 && pending <= 0.01) status = 'PAID';
  else if (amountPaid > 0) status = 'PARTIAL';

  const mostRecent = bill.payments[0] || null;

  return prisma.rentElectricityBill.update({
    where: { id: billId },
    data: {
      amountPaid,
      status,
      paymentDate: mostRecent ? mostRecent.paymentDate : null,
      paymentMode: mostRecent ? mostRecent.paymentMode : null
    },
    include: { payments: { orderBy: { paymentDate: 'desc' } } }
  });
};

/** Total outstanding electricity across every non-fully-paid bill for a
 * room — the "Electricity Due" figure shown alongside rent in the combined
 * payment view. */
const getElectricityDueForRoom = async (roomId) => {
  const bills = await prisma.rentElectricityBill.findMany({
    where: { roomId, status: { not: 'PAID' } },
    orderBy: { billDate: 'asc' }
  });
  return round2(bills.reduce((sum, b) => sum + (b.amount - b.amountPaid), 0));
};

/**
 * Automatic meter-reading calculator: Units Consumed = Current − Previous,
 * Amount = Units × Rate/Unit (a snapshot of the building's rate at billing
 * time, so a later rate change never rewrites past bills).
 */
const addElectricityBill = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { billDate, currentReading, previousReading, notes } = req.body;

    const room = await prisma.rentRoom.findUnique({
      where: { id: roomId },
      include: { property: { select: { electricityBilling: true, electricityRate: true, name: true } } }
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!room.property.electricityBilling) {
      return res.status(400).json({ error: `Electricity billing is not enabled for ${room.property.name}.` });
    }

    const current = parseFloat(currentReading);
    if (isNaN(current)) {
      return res.status(400).json({ error: 'Current meter reading is required' });
    }

    // The previous cycle's reading carries forward automatically; only the
    // very first bill for a room has no prior bill to derive it from.
    const lastBill = await prisma.rentElectricityBill.findFirst({
      where: { roomId },
      orderBy: { billDate: 'desc' }
    });

    let previous;
    if (lastBill && lastBill.currentReading !== null) {
      previous = lastBill.currentReading;
    } else {
      previous = parseFloat(previousReading);
      if (isNaN(previous)) {
        return res.status(400).json({ error: 'This is the first bill for this room — a starting (previous) reading is required.' });
      }
    }

    if (current < previous) {
      return res.status(400).json({ error: `Current reading (${current}) cannot be less than the previous reading (${previous}).` });
    }

    const ratePerUnit = room.property.electricityRate;
    const unitsConsumed = round2(current - previous);
    const amount = round2(unitsConsumed * ratePerUnit);

    const activeContract = await prisma.rentContract.findFirst({ where: { roomId, status: 'ACTIVE' } });

    const bill = await prisma.rentElectricityBill.create({
      data: {
        roomId,
        contractId: activeContract?.id || null,
        billDate: billDate ? new Date(billDate) : devDate.now(),
        previousReading: previous,
        currentReading: current,
        ratePerUnit,
        unitsConsumed,
        amount,
        notes: notes || null
      }
    });
    res.status(201).json(bill);
  } catch (error) {
    next(error);
  }
};

/**
 * Full correction endpoint — reachable regardless of payment status. A PAID
 * bill is never locked: readings, rate, bill date and notes can always be
 * fixed, and payment status itself can be flipped PAID ↔ PENDING (routed
 * through the payment ledger so amountPaid/status stay derived, never
 * hand-set — see recomputeElectricityBill).
 */
const updateElectricityBill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { billDate, currentReading, previousReading, ratePerUnit, notes, status, paymentMode, paymentDate } = req.body;

    const existing = await prisma.rentElectricityBill.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Electricity bill not found' });

    let current = currentReading !== undefined && currentReading !== '' ? parseFloat(currentReading) : existing.currentReading;
    let rate = ratePerUnit !== undefined && ratePerUnit !== '' ? parseFloat(ratePerUnit) : existing.ratePerUnit;
    if (isNaN(current)) {
      return res.status(400).json({ error: 'Current meter reading must be a number' });
    }
    if (isNaN(rate) || rate < 0) {
      return res.status(400).json({ error: 'Rate per unit must be a valid number' });
    }

    // Only the anchor (first-ever) bill for a room has an editable previous
    // reading — every later bill's previous reading is derived, not typed.
    const priorBill = await prisma.rentElectricityBill.findFirst({
      where: { roomId: existing.roomId, billDate: { lt: existing.billDate } },
      orderBy: { billDate: 'desc' }
    });
    let previous = existing.previousReading;
    if (priorBill) {
      previous = priorBill.currentReading;
    } else if (previousReading !== undefined && previousReading !== '') {
      previous = parseFloat(previousReading);
      if (isNaN(previous)) {
        return res.status(400).json({ error: 'Previous meter reading must be a number' });
      }
    }

    // A later bill's previous reading is derived from this one, so only
    // block the edit if the resolved reading actually differs from what's
    // on record — everyday edits (notes, rate, status) on an older bill
    // shouldn't trip this just because the (unchanged) reading was resent.
    const readingsChanged = current !== existing.currentReading || previous !== existing.previousReading;
    if (readingsChanged) {
      const newerBill = await prisma.rentElectricityBill.findFirst({
        where: { roomId: existing.roomId, billDate: { gt: existing.billDate } }
      });
      if (newerBill) {
        return res.status(400).json({ error: 'This is not the most recent bill for this room — its meter reading can no longer be changed without desyncing later bills. Edit the most recent bill instead.' });
      }
    }

    if (current < previous) {
      return res.status(400).json({ error: `Current reading (${current}) cannot be less than the previous reading (${previous}).` });
    }

    const unitsConsumed = round2(current - previous);
    const amount = round2(unitsConsumed * rate);

    await prisma.rentElectricityBill.update({
      where: { id },
      data: {
        billDate: billDate ? new Date(billDate) : existing.billDate,
        previousReading: previous,
        currentReading: current,
        ratePerUnit: rate,
        unitsConsumed,
        amount,
        notes: notes !== undefined ? (notes || null) : existing.notes
      }
    });

    // Manual payment-status correction. Routed through the ledger (not a
    // direct status/amountPaid write) so recomputeElectricityBill below
    // stays the single source of truth for both fields.
    if (status === 'PENDING') {
      await prisma.rentElectricityPayment.deleteMany({ where: { billId: id } });
    } else if (status === 'PAID') {
      const refreshed = await prisma.rentElectricityBill.findUnique({ where: { id } });
      const pending = round2(refreshed.amount - refreshed.amountPaid);
      if (pending > 0.01) {
        await prisma.rentElectricityPayment.create({
          data: {
            billId: id,
            contractId: refreshed.contractId,
            amount: pending,
            paymentDate: paymentDate ? new Date(paymentDate) : devDate.now(),
            paymentMode: paymentMode || 'CASH',
            notes: 'Marked paid via bill correction'
          }
        });
      }
    }

    const updated = await recomputeElectricityBill(id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Electricity payments — a ledger, same shape as RentPayment, so a bill can
// be paid in full, in installments, and every payment can be corrected.
// ---------------------------------------------------------------------------

const addElectricityPayment = async (req, res, next) => {
  try {
    const { id } = req.params; // bill id
    const { amount, paymentDate, paymentMode, referenceNo, notes, batchId } = req.body;

    const bill = await prisma.rentElectricityBill.findUnique({ where: { id } });
    if (!bill) return res.status(404).json({ error: 'Electricity bill not found' });

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'A valid payment amount is required' });
    }

    const pending = round2(bill.amount - bill.amountPaid);
    if (pending <= 0.01) {
      return res.status(400).json({ error: 'This electricity bill is already paid in full.' });
    }
    if (payAmount > pending + 0.01) {
      return res.status(400).json({ error: `Payment cannot exceed the pending amount of ₹${pending.toFixed(2)}.` });
    }

    await prisma.rentElectricityPayment.create({
      data: {
        billId: id,
        contractId: bill.contractId,
        amount: payAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : devDate.now(),
        paymentMode: paymentMode || 'CASH',
        referenceNo: referenceNo || null,
        notes: notes || null,
        batchId: batchId || null
      }
    });

    const updated = await recomputeElectricityBill(id);
    res.status(201).json(updated);
  } catch (error) {
    next(error);
  }
};

/** Convenience wrapper kept for existing callers ("Mark Paid" buttons) —
 * records a payment for exactly the remaining pending amount. */
const markElectricityBillPaid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentDate, paymentMode } = req.body;

    const bill = await prisma.rentElectricityBill.findUnique({ where: { id } });
    if (!bill) return res.status(404).json({ error: 'Electricity bill not found' });

    const pending = round2(bill.amount - bill.amountPaid);
    if (pending <= 0.01) {
      return res.status(400).json({ error: 'This electricity bill is already paid in full.' });
    }

    await prisma.rentElectricityPayment.create({
      data: {
        billId: id,
        contractId: bill.contractId,
        amount: pending,
        paymentDate: paymentDate ? new Date(paymentDate) : devDate.now(),
        paymentMode: paymentMode || 'CASH'
      }
    });

    const updated = await recomputeElectricityBill(id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const updateElectricityPayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params; // id = bill id
    const { amount, paymentDate, paymentMode, referenceNo, notes } = req.body;

    const payment = await prisma.rentElectricityPayment.findFirst({ where: { id: paymentId, billId: id } });
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'A valid payment amount is required' });
    }

    const bill = await prisma.rentElectricityBill.findUnique({ where: { id } });
    const otherPayments = await prisma.rentElectricityPayment.aggregate({
      where: { billId: id, id: { not: paymentId } },
      _sum: { amount: true }
    });
    const othersTotal = otherPayments._sum.amount || 0;
    if (othersTotal + payAmount > bill.amount + 0.01) {
      return res.status(400).json({ error: `This amount would make total payments exceed the bill amount of ₹${bill.amount.toFixed(2)}.` });
    }

    await prisma.rentElectricityPayment.update({
      where: { id: paymentId },
      data: {
        amount: payAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : payment.paymentDate,
        paymentMode: paymentMode || payment.paymentMode,
        referenceNo: referenceNo !== undefined ? (referenceNo || null) : payment.referenceNo,
        notes: notes !== undefined ? (notes || null) : payment.notes
      }
    });

    const updated = await recomputeElectricityBill(id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteElectricityPayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;
    const payment = await prisma.rentElectricityPayment.findFirst({ where: { id: paymentId, billId: id } });
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    await prisma.rentElectricityPayment.delete({ where: { id: paymentId } });

    const updated = await recomputeElectricityBill(id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteElectricityBill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.rentElectricityBill.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Electricity bill not found' });

    // A later bill's "previous reading" is derived from this one — deleting
    // it out of order would silently corrupt that chain, so only the most
    // recent bill for its room may be removed (a straightforward mistake-undo).
    const newerBill = await prisma.rentElectricityBill.findFirst({
      where: { roomId: existing.roomId, billDate: { gt: existing.billDate } }
    });
    if (newerBill) {
      return res.status(400).json({ error: 'Only the most recent electricity bill for a room can be deleted, to keep meter readings consistent.' });
    }

    await prisma.rentElectricityBill.delete({ where: { id } });
    res.json({ message: 'Electricity bill deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getElectricityBills = async (req, res, next) => {
  try {
    const { propertyId, status } = req.query;

    const where = {};
    if (propertyId) where.room = { propertyId };
    if (status && status !== 'ALL') where.status = status;

    const bills = await prisma.rentElectricityBill.findMany({
      where,
      include: {
        room: {
          select: {
            id: true,
            roomNumber: true,
            property: { select: { id: true, name: true, city: true } }
          }
        },
        contract: { select: { id: true, tenant: { select: { id: true, name: true } } } },
        payments: { orderBy: { paymentDate: 'desc' } }
      },
      orderBy: { billDate: 'desc' }
    });
    res.json(bills);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addElectricityBill,
  updateElectricityBill,
  markElectricityBillPaid,
  addElectricityPayment,
  updateElectricityPayment,
  deleteElectricityPayment,
  deleteElectricityBill,
  getElectricityBills,
  recomputeElectricityBill,
  getElectricityDueForRoom
};
