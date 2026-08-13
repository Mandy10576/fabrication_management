const path = require('path');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { listCyclesSince } = require('../services/rentCycleService');
const { uploadFile } = require('../services/storageService');
const { getElectricityDueForRoom } = require('./rentElectricityController');
const devDate = require('../utils/devDate');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Per-cycle paid/pending, derived fresh from payment rows every time —
 * never stored, since a cycle's "current" status changes just by the
 * calendar rolling over even with zero payment activity. */
const summarizeCycle = (cycle, monthlyRent, payments) => {
  const paidInCycle = round2(
    payments
      .filter((p) => new Date(p.cycleStart).getTime() === cycle.cycleStart.getTime())
      .reduce((sum, p) => sum + p.amount, 0)
  );
  const pending = Math.max(0, round2(monthlyRent - paidInCycle));
  let status = 'UNPAID';
  if (paidInCycle > 0 && pending <= 0.01) status = 'PAID';
  else if (paidInCycle > 0) status = 'PARTIAL';
  return { cycleStart: cycle.cycleStart, cycleEnd: cycle.cycleEnd, expected: monthlyRent, paid: paidInCycle, pending, status };
};

/** tenancy must include `payments`. throughDate defaults to now (the dev-
 * simulated date on localhost when DEV_SIMULATED_DATE is set, otherwise the
 * real date); an ended tenancy's cycles stop at its own endDate rather than
 * accruing further. */
const computeTenancySummary = (tenancy, throughDate = devDate.now()) => {
  const through = tenancy.status === 'ENDED' && tenancy.endDate ? tenancy.endDate : throughDate;
  const cycles = listCyclesSince(tenancy.startDate, through).map((c) => summarizeCycle(c, tenancy.monthlyRent, tenancy.payments || []));
  const totalPending = round2(cycles.reduce((sum, c) => sum + c.pending, 0));
  const totalPaid = round2((tenancy.payments || []).reduce((sum, p) => sum + p.amount, 0));
  return { cycles, totalPending, totalPaid, currentCycle: cycles[0] || null };
};

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------

const getTenants = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {};

    const tenants = await prisma.rentTenant.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50,
      include: { tenancies: { where: { status: 'ACTIVE' }, select: { id: true, roomId: true } } }
    });
    res.json(tenants);
  } catch (error) {
    next(error);
  }
};

const updateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, mobile, address, aadhaarNumber, panNumber, notes } = req.body;
    if (!name || !mobile) return res.status(400).json({ error: 'Tenant name and mobile are required' });
    if (!aadhaarNumber) return res.status(400).json({ error: 'Aadhaar number is required' });

    const tenant = await prisma.rentTenant.update({
      where: { id },
      data: {
        name,
        mobile,
        address: address || null,
        aadhaarNumber: aadhaarNumber || null,
        panNumber: panNumber || null,
        notes: notes || null
      }
    });
    res.json(tenant);
  } catch (error) {
    next(error);
  }
};

const uploadTenantDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { docType } = req.body;

    const tenant = await prisma.rentTenant.findUnique({ where: { id } });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No documents provided' });
    }

    const validTypes = ['AADHAAR', 'PAN', 'OTHER'];
    const type = validTypes.includes(docType) ? docType : 'OTHER';

    const uploaded = await Promise.all(req.files.map((file, i) => uploadFile({
      buffer: file.buffer,
      filename: `tenant_doc_${Date.now()}_${i}_${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`,
      mimetype: file.mimetype,
      folder: 'tenant-documents'
    })));

    await prisma.rentTenantDocument.createMany({
      data: req.files.map((file, i) => ({
        tenantId: id,
        docType: type,
        url: uploaded[i],
        originalName: file.originalname
      }))
    });

    const documents = await prisma.rentTenantDocument.findMany({ where: { tenantId: id }, orderBy: { createdAt: 'desc' } });
    res.status(201).json(documents);
  } catch (error) {
    next(error);
  }
};

const deleteTenantDocument = async (req, res, next) => {
  try {
    const { id, documentId } = req.params;
    const existing = await prisma.rentTenantDocument.findFirst({ where: { id: documentId, tenantId: id } });
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    await prisma.rentTenantDocument.delete({ where: { id: documentId } });
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Tenancies (room assignment periods — this IS the tenant-history record)
// ---------------------------------------------------------------------------

const startTenancy = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { tenantId, name, mobile, address, aadhaarNumber, panNumber, startDate, monthlyRent, notes } = req.body;

    const room = await prisma.rentRoom.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const activeTenancy = await prisma.rentTenancy.findFirst({ where: { roomId, status: 'ACTIVE' } });
    if (activeTenancy) {
      return res.status(400).json({ error: 'This room already has an active tenant. End the current tenancy first.' });
    }

    if (!startDate) return res.status(400).json({ error: 'Rent start date is required' });

    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      if (!name || !mobile) {
        return res.status(400).json({ error: 'Tenant name and mobile are required for a new tenant' });
      }
      if (!aadhaarNumber) {
        return res.status(400).json({ error: 'Aadhaar number is required for a new tenant' });
      }
      const tenant = await prisma.rentTenant.create({
        data: {
          name,
          mobile,
          address: address || null,
          aadhaarNumber: aadhaarNumber || null,
          panNumber: panNumber || null
        }
      });
      resolvedTenantId = tenant.id;
    } else {
      const existingTenant = await prisma.rentTenant.findUnique({ where: { id: resolvedTenantId } });
      if (!existingTenant) return res.status(404).json({ error: 'Selected tenant not found' });
    }

    const [tenancy] = await prisma.$transaction([
      prisma.rentTenancy.create({
        data: {
          roomId,
          tenantId: resolvedTenantId,
          startDate: new Date(startDate),
          monthlyRent: parseFloat(monthlyRent) || room.monthlyRent,
          notes: notes || null
        },
        include: { tenant: { include: { documents: true } }, payments: true }
      }),
      prisma.rentRoom.update({ where: { id: roomId }, data: { status: 'OCCUPIED' } })
    ]);

    res.status(201).json({ ...tenancy, summary: computeTenancySummary(tenancy) });
  } catch (error) {
    next(error);
  }
};

const endTenancy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { endDate } = req.body;

    const tenancy = await prisma.rentTenancy.findUnique({ where: { id } });
    if (!tenancy) return res.status(404).json({ error: 'Tenancy not found' });
    if (tenancy.status !== 'ACTIVE') return res.status(400).json({ error: 'This tenancy has already ended' });

    const resolvedEndDate = endDate ? new Date(endDate) : devDate.now();
    if (resolvedEndDate.getTime() < new Date(tenancy.startDate).getTime()) {
      return res.status(400).json({ error: 'End date cannot be before the rent start date' });
    }

    const [updated] = await prisma.$transaction([
      prisma.rentTenancy.update({
        where: { id },
        data: { endDate: resolvedEndDate, status: 'ENDED' },
        include: { tenant: true, payments: true }
      }),
      prisma.rentRoom.update({ where: { id: tenancy.roomId }, data: { status: 'VACANT' } })
    ]);

    res.json({ ...updated, summary: computeTenancySummary(updated) });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Rent payments
// ---------------------------------------------------------------------------

const addRentPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, cycleStart, paymentDate, paymentMode, referenceNo, notes } = req.body;

    const tenancy = await prisma.rentTenancy.findUnique({ where: { id } });
    if (!tenancy) return res.status(404).json({ error: 'Tenancy not found' });

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }
    if (!cycleStart) return res.status(400).json({ error: 'A rent cycle must be selected for this payment' });

    await prisma.rentPayment.create({
      data: {
        tenancyId: id,
        cycleStart: new Date(cycleStart),
        amount: payAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : devDate.now(),
        paymentMode: paymentMode || 'CASH',
        referenceNo: referenceNo || null,
        notes: notes || null
      }
    });

    const updated = await prisma.rentTenancy.findUnique({
      where: { id },
      include: { tenant: true, payments: { orderBy: { paymentDate: 'desc' } } }
    });

    res.status(201).json({ ...updated, summary: computeTenancySummary(updated) });
  } catch (error) {
    next(error);
  }
};

/** Correction endpoint — edit an already-recorded rent payment's amount,
 * date, mode, cycle, or reference. The tenancy summary is always derived
 * fresh from payment rows, so editing one automatically recalculates every
 * cycle's paid/pending and the tenancy's total arrears — nothing else to
 * "recompute" by hand. */
const updateRentPayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;
    const { amount, cycleStart, paymentDate, paymentMode, referenceNo, notes } = req.body;

    const payment = await prisma.rentPayment.findFirst({ where: { id: paymentId, tenancyId: id } });
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    await prisma.rentPayment.update({
      where: { id: paymentId },
      data: {
        amount: payAmount,
        cycleStart: cycleStart ? new Date(cycleStart) : payment.cycleStart,
        paymentDate: paymentDate ? new Date(paymentDate) : payment.paymentDate,
        paymentMode: paymentMode || payment.paymentMode,
        referenceNo: referenceNo !== undefined ? (referenceNo || null) : payment.referenceNo,
        notes: notes !== undefined ? (notes || null) : payment.notes
      }
    });

    const updated = await prisma.rentTenancy.findUnique({
      where: { id },
      include: { tenant: true, payments: { orderBy: { paymentDate: 'desc' } } }
    });

    res.json({ ...updated, summary: computeTenancySummary(updated) });
  } catch (error) {
    next(error);
  }
};

const deleteRentPayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;
    const payment = await prisma.rentPayment.findFirst({ where: { id: paymentId, tenancyId: id } });
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    await prisma.rentPayment.delete({ where: { id: paymentId } });

    const updated = await prisma.rentTenancy.findUnique({
      where: { id },
      include: { tenant: true, payments: { orderBy: { paymentDate: 'desc' } } }
    });

    res.json({ ...updated, summary: computeTenancySummary(updated) });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Combined Rent + Electricity payment — one admin action, one receipt, that
// may settle rent, electricity, or both at once (with a partial-payment
// split between them). Each side is still just a normal RentPayment /
// RentElectricityPayment row — batchId is the only thing that ties them
// together as "one payment" for display, so Rent History and Electricity
// History keep working unchanged.
// ---------------------------------------------------------------------------

const addCombinedPayment = async (req, res, next) => {
  try {
    const { id } = req.params; // tenancyId
    const { rentAmount, rentCycleStart, electricityAmount, paymentDate, paymentMode, referenceNo, notes } = req.body;

    const tenancy = await prisma.rentTenancy.findUnique({ where: { id }, include: { payments: true } });
    if (!tenancy) return res.status(404).json({ error: 'Tenancy not found' });

    const rentAmt = round2(parseFloat(rentAmount) || 0);
    const elecAmt = round2(parseFloat(electricityAmount) || 0);

    if (rentAmt <= 0 && elecAmt <= 0) {
      return res.status(400).json({ error: 'Enter an amount for rent, electricity, or both.' });
    }

    // Validate both portions up front — nothing is written unless the whole
    // combined payment fits, so a rejected submission never leaves a
    // half-applied receipt behind.
    if (rentAmt > 0) {
      if (!rentCycleStart) {
        return res.status(400).json({ error: 'A rent cycle must be selected to apply the rent portion.' });
      }
      const summary = computeTenancySummary(tenancy);
      const targetCycle = summary.cycles.find((c) => new Date(c.cycleStart).getTime() === new Date(rentCycleStart).getTime());
      if (!targetCycle) {
        return res.status(400).json({ error: 'Selected rent cycle is not valid for this tenancy.' });
      }
      if (rentAmt > targetCycle.pending + 0.01) {
        return res.status(400).json({ error: `Rent amount cannot exceed the pending amount of ₹${targetCycle.pending.toFixed(2)} for that cycle.` });
      }
    }

    if (elecAmt > 0) {
      const due = await getElectricityDueForRoom(tenancy.roomId);
      if (elecAmt > due + 0.01) {
        return res.status(400).json({ error: `Electricity amount cannot exceed the outstanding electricity due of ₹${due.toFixed(2)}.` });
      }
    }

    const batchId = crypto.randomUUID();
    const payDate = paymentDate ? new Date(paymentDate) : devDate.now();
    const mode = paymentMode || 'CASH';

    await prisma.$transaction(async (tx) => {
      if (rentAmt > 0) {
        await tx.rentPayment.create({
          data: {
            tenancyId: id,
            cycleStart: new Date(rentCycleStart),
            amount: rentAmt,
            paymentDate: payDate,
            paymentMode: mode,
            referenceNo: referenceNo || null,
            notes: notes || null,
            batchId
          }
        });
      }

      if (elecAmt > 0) {
        const bills = await tx.rentElectricityBill.findMany({
          where: { roomId: tenancy.roomId, status: { not: 'PAID' } },
          orderBy: { billDate: 'asc' }
        });

        let remaining = elecAmt;
        for (const bill of bills) {
          if (remaining <= 0.01) break;
          const pending = round2(bill.amount - bill.amountPaid);
          if (pending <= 0.01) continue;
          const portion = round2(Math.min(pending, remaining));

          await tx.rentElectricityPayment.create({
            data: {
              billId: bill.id,
              tenancyId: bill.tenancyId,
              amount: portion,
              paymentDate: payDate,
              paymentMode: mode,
              referenceNo: referenceNo || null,
              notes: notes || null,
              batchId
            }
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

    const updatedTenancy = await prisma.rentTenancy.findUnique({
      where: { id },
      include: { tenant: true, payments: { orderBy: { paymentDate: 'desc' } } }
    });
    const electricityDue = await getElectricityDueForRoom(tenancy.roomId);

    res.status(201).json({
      batchId,
      rentAmount: rentAmt,
      electricityAmount: elecAmt,
      totalAmount: round2(rentAmt + elecAmt),
      tenancy: { ...updatedTenancy, summary: computeTenancySummary(updatedTenancy) },
      electricityDue
    });
  } catch (error) {
    next(error);
  }
};

/** Groups rent + electricity payment rows sharing a batchId into one
 * "combined payment" entry for display, most recent first. Rows without a
 * batchId (itemized rent-only / electricity-only payments made outside the
 * combined flow) are simply not part of any batch and don't appear here —
 * they still show in Rent History / Electricity History individually. */
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
// Rent Collection — cross-building current-cycle status for every active tenancy
// ---------------------------------------------------------------------------

const getRentCollection = async (req, res, next) => {
  try {
    const { areaId, buildingId, status, search } = req.query;

    const where = { status: 'ACTIVE' };
    if (buildingId) where.room = { buildingId };
    if (areaId) where.room = { ...(where.room || {}), building: { areaId } };
    if (search) {
      where.tenant = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const tenancies = await prisma.rentTenancy.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true, mobile: true } },
        payments: true,
        room: {
          select: {
            id: true,
            roomNumber: true,
            building: { select: { id: true, name: true, area: { select: { id: true, name: true } } } }
          }
        }
      },
      orderBy: [{ room: { building: { name: 'asc' } } }, { room: { roomNumber: 'asc' } }]
    });

    let results = tenancies.map((t) => {
      const summary = computeTenancySummary(t);
      const currentCyclePayments = summary.currentCycle
        ? (t.payments || [])
            .filter((p) => new Date(p.cycleStart).getTime() === new Date(summary.currentCycle.cycleStart).getTime())
            .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
        : [];
      return {
        tenancyId: t.id,
        tenant: t.tenant,
        room: t.room,
        monthlyRent: t.monthlyRent,
        startDate: t.startDate,
        currentCycle: summary.currentCycle,
        currentCyclePayments,
        totalPending: summary.totalPending
      };
    });

    if (status && status !== 'ALL') {
      results = results.filter((r) => r.currentCycle?.status === status);
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Rent Dashboard Overview — one row per occupied room, combining rent and
// electricity into a single financial snapshot. Rent and electricity stay
// separately tracked (RentPayment / RentElectricityPayment, unchanged); this
// endpoint only merges them for display, the same way the Room Detail page's
// "Current Dues" card already does per-room, just across every room at once.
//
// Per row, "charge" figures are a CURRENT snapshot, not lifetime totals:
//   - Rent: every rent cycle that still has a balance (usually just the
//     current cycle; more if payments have fallen behind), falling back to
//     the current cycle alone once everything is settled — so a fully-paid
//     row still shows what it was charged, not ₹0.
//   - Electricity: every bill not yet fully paid, falling back to the most
//     recent bill once everything is settled, for the same reason.
// Paid/pending are summed the same way, so Total − Paid = Balance always
// reconciles exactly, and a multi-month backlog is never hidden.
// ---------------------------------------------------------------------------

const getRentOverview = async (req, res, next) => {
  try {
    const { areaId, buildingId, status, search, dueDate } = req.query;

    const where = { status: 'ACTIVE' };
    if (buildingId) where.room = { buildingId };
    if (areaId) where.room = { ...(where.room || {}), building: { areaId } };
    if (search) {
      where.OR = [
        { tenant: { name: { contains: search, mode: 'insensitive' } } },
        { room: { roomNumber: { contains: search, mode: 'insensitive' } } },
        { room: { building: { name: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    const tenancies = await prisma.rentTenancy.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true, mobile: true } },
        payments: true,
        room: {
          select: {
            id: true,
            roomNumber: true,
            building: {
              select: {
                id: true,
                name: true,
                electricityBilling: true,
                area: { select: { id: true, name: true } }
              }
            },
            electricityBills: { orderBy: { billDate: 'desc' } }
          }
        }
      },
      orderBy: [{ room: { building: { name: 'asc' } } }, { room: { roomNumber: 'asc' } }]
    });

    let results = tenancies.map((t) => {
      const summary = computeTenancySummary(t);
      const openCycles = summary.cycles.filter((c) => c.pending > 0.01);
      const rentPaid = round2(
        openCycles.length > 0
          ? openCycles.reduce((sum, c) => sum + c.paid, 0)
          : (summary.currentCycle?.paid || 0)
      );
      const rentPending = summary.totalPending;
      const rentCharge = round2(rentPaid + rentPending);

      const hasElectricity = t.room.building.electricityBilling;
      const allBills = hasElectricity ? t.room.electricityBills : [];
      const openBills = allBills.filter((b) => b.status !== 'PAID');
      let electricityCharge = 0;
      let electricityPaid = 0;
      if (openBills.length > 0) {
        electricityCharge = round2(openBills.reduce((sum, b) => sum + b.amount, 0));
        electricityPaid = round2(openBills.reduce((sum, b) => sum + b.amountPaid, 0));
      } else if (allBills.length > 0) {
        electricityCharge = allBills[0].amount;
        electricityPaid = allBills[0].amountPaid;
      }
      const electricityPending = round2(electricityCharge - electricityPaid);

      const totalAmount = round2(rentCharge + electricityCharge);
      const totalPaid = round2(rentPaid + electricityPaid);
      const balance = round2(totalAmount - totalPaid);
      let overallStatus = 'UNPAID';
      if (balance <= 0.01) overallStatus = 'PAID';
      else if (totalPaid > 0.01) overallStatus = 'PARTIAL';

      return {
        tenancyId: t.id,
        roomId: t.room.id,
        tenant: t.tenant,
        area: t.room.building.area,
        building: { id: t.room.building.id, name: t.room.building.name, electricityBilling: hasElectricity },
        room: { id: t.room.id, roomNumber: t.room.roomNumber },
        monthlyRent: t.monthlyRent,
        rentCharge,
        rentPaid,
        rentPending,
        electricityCharge,
        electricityPaid,
        electricityPending,
        totalAmount,
        totalPaid,
        balance,
        status: overallStatus,
        currentCycle: summary.currentCycle,
        dueDate: summary.currentCycle?.cycleEnd || null
      };
    });

    if (status && status !== 'ALL') {
      results = results.filter((r) => r.status === status);
    }
    if (dueDate) {
      const cutoff = new Date(dueDate);
      results = results.filter((r) => r.dueDate && new Date(r.dueDate).getTime() <= cutoff.getTime());
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTenants,
  updateTenant,
  uploadTenantDocuments,
  deleteTenantDocument,
  startTenancy,
  endTenancy,
  addRentPayment,
  updateRentPayment,
  deleteRentPayment,
  addCombinedPayment,
  buildCombinedPaymentHistory,
  getRentCollection,
  getRentOverview,
  computeTenancySummary
};
