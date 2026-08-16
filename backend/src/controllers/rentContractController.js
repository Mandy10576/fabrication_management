const prisma = require('../config/prisma');
const { round2 } = require('../services/rentBillingService');
const { summarizeContract } = require('./rentBillController');
const devDate = require('../utils/devDate');

// ---------------------------------------------------------------------------
// Contracts (room assignment periods — this IS the tenant-history record)
// ---------------------------------------------------------------------------

const startContract = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const {
      tenantId, name, mobile, alternatePhone, email, dob, emergencyContactName, emergencyContactPhone,
      address, aadhaarNumber, panNumber,
      startDate, monthlyRent, depositAmount, lateFeePolicy, lateFeeValue, gracePeriodDays, notes
    } = req.body;

    const room = await prisma.rentRoom.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const activeContract = await prisma.rentContract.findFirst({ where: { roomId, status: 'ACTIVE' } });
    if (activeContract) {
      return res.status(400).json({ error: 'This room already has an active tenant. End the current contract first.' });
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
          alternatePhone: alternatePhone || null,
          email: email || null,
          dob: dob ? new Date(dob) : null,
          emergencyContactName: emergencyContactName || null,
          emergencyContactPhone: emergencyContactPhone || null,
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

    const [contract] = await prisma.$transaction([
      prisma.rentContract.create({
        data: {
          roomId,
          tenantId: resolvedTenantId,
          startDate: new Date(startDate),
          monthlyRent: parseFloat(monthlyRent) || room.monthlyRent,
          depositAmount: depositAmount !== undefined && depositAmount !== '' ? parseFloat(depositAmount) : null,
          lateFeePolicy: lateFeePolicy || 'NONE',
          lateFeeValue: lateFeeValue !== undefined && lateFeeValue !== '' ? parseFloat(lateFeeValue) || 0 : 0,
          gracePeriodDays: gracePeriodDays !== undefined && gracePeriodDays !== '' ? parseInt(gracePeriodDays, 10) || 5 : 5,
          notes: notes || null
        },
        include: { tenant: { include: { documents: true } }, bills: { include: { payments: true } } }
      }),
      prisma.rentRoom.update({ where: { id: roomId }, data: { status: 'OCCUPIED' } })
    ]);

    res.status(201).json({ ...contract, summary: summarizeContract(contract) });
  } catch (error) {
    next(error);
  }
};

/** Edits an active contract's rent cycle start date, monthly rent, deposit,
 * or late-fee terms. Changing startDate shifts which day-of-month every
 * cycle boundary falls on, so already-generated bills keep their own
 * cycleStart and may no longer line up with the recomputed cycles going
 * forward — the admin is warned of this in the UI. */
const updateContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, monthlyRent, depositAmount, lateFeePolicy, lateFeeValue, gracePeriodDays } = req.body;

    const contract = await prisma.rentContract.findUnique({ where: { id } });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (contract.status !== 'ACTIVE') return res.status(400).json({ error: 'Only an active contract can be edited' });

    const data = {};
    if (startDate) {
      const parsed = new Date(startDate);
      if (isNaN(parsed.getTime())) return res.status(400).json({ error: 'Invalid rent cycle start date' });
      data.startDate = parsed;
    }
    if (monthlyRent !== undefined && monthlyRent !== '') {
      const rent = parseFloat(monthlyRent);
      if (isNaN(rent) || rent <= 0) return res.status(400).json({ error: 'Valid monthly rent is required' });
      data.monthlyRent = rent;
    }
    if (depositAmount !== undefined) {
      data.depositAmount = depositAmount === '' ? null : parseFloat(depositAmount);
    }
    if (lateFeePolicy !== undefined) {
      data.lateFeePolicy = lateFeePolicy || 'NONE';
    }
    if (lateFeeValue !== undefined && lateFeeValue !== '') {
      data.lateFeeValue = parseFloat(lateFeeValue) || 0;
    }
    if (gracePeriodDays !== undefined && gracePeriodDays !== '') {
      data.gracePeriodDays = parseInt(gracePeriodDays, 10) || 5;
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const updated = await prisma.rentContract.update({
      where: { id },
      data,
      include: { tenant: true, bills: { orderBy: { cycleStart: 'desc' }, include: { payments: true } } }
    });

    res.json({ ...updated, summary: summarizeContract(updated) });
  } catch (error) {
    next(error);
  }
};

const endContract = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { endDate } = req.body;

    const contract = await prisma.rentContract.findUnique({ where: { id } });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (contract.status !== 'ACTIVE') return res.status(400).json({ error: 'This contract has already ended' });

    const resolvedEndDate = endDate ? new Date(endDate) : devDate.now();
    if (resolvedEndDate.getTime() < new Date(contract.startDate).getTime()) {
      return res.status(400).json({ error: 'End date cannot be before the rent start date' });
    }

    const [updated] = await prisma.$transaction([
      prisma.rentContract.update({
        where: { id },
        data: { endDate: resolvedEndDate, status: 'ENDED' },
        include: { tenant: true, bills: { include: { payments: true } } }
      }),
      prisma.rentRoom.update({ where: { id: contract.roomId }, data: { status: 'VACANT' } })
    ]);

    res.json({ ...updated, summary: summarizeContract(updated) });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Rent Collection — cross-property current-bill status for every active contract
// ---------------------------------------------------------------------------

const getRentCollection = async (req, res, next) => {
  try {
    const { propertyId, status, search } = req.query;

    const where = { status: 'ACTIVE' };
    if (propertyId) where.room = { propertyId };
    if (search) {
      where.tenant = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const contracts = await prisma.rentContract.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true, mobile: true } },
        bills: { orderBy: { cycleStart: 'desc' }, include: { payments: { orderBy: { paymentDate: 'desc' } } } },
        room: {
          select: {
            id: true,
            roomNumber: true,
            property: { select: { id: true, name: true, city: true } }
          }
        }
      },
      orderBy: [{ room: { property: { name: 'asc' } } }, { room: { roomNumber: 'asc' } }]
    });

    let results = contracts.map((c) => {
      const summary = summarizeContract(c);
      const currentBill = c.bills.find((b) => summary.currentCycle && b.id === summary.currentCycle.billId) || null;
      return {
        contractId: c.id,
        tenant: c.tenant,
        room: c.room,
        monthlyRent: c.monthlyRent,
        startDate: c.startDate,
        currentCycle: summary.currentCycle,
        currentCyclePayments: currentBill ? currentBill.payments : [],
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
// electricity into a single financial snapshot for display only (underlying
// ledgers stay separate). "Charge" figures are a CURRENT snapshot, not
// lifetime totals — same convention as before, now sourced from persisted
// RentBill rows instead of live cycle math.
// ---------------------------------------------------------------------------

const getRentOverview = async (req, res, next) => {
  try {
    const { propertyId, status, search, dueDate } = req.query;

    const where = { status: 'ACTIVE' };
    if (propertyId) where.room = { propertyId };
    if (search) {
      where.OR = [
        { tenant: { name: { contains: search, mode: 'insensitive' } } },
        { room: { roomNumber: { contains: search, mode: 'insensitive' } } },
        { room: { property: { name: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    const contracts = await prisma.rentContract.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true, mobile: true } },
        bills: { orderBy: { cycleStart: 'desc' }, include: { payments: true } },
        room: {
          select: {
            id: true,
            roomNumber: true,
            property: {
              select: { id: true, name: true, city: true, electricityBilling: true }
            },
            electricityBills: { orderBy: { billDate: 'desc' } }
          }
        }
      },
      orderBy: [{ room: { property: { name: 'asc' } } }, { room: { roomNumber: 'asc' } }]
    });

    let results = contracts.map((c) => {
      const summary = summarizeContract(c);
      const openCycles = summary.cycles.filter((cyc) => cyc.pending > 0.01);
      const rentPaid = round2(
        openCycles.length > 0
          ? openCycles.reduce((sum, cyc) => sum + cyc.paid, 0)
          : (summary.currentCycle?.paid || 0)
      );
      const rentPending = summary.totalPending;
      const rentCharge = round2(rentPaid + rentPending);

      const hasElectricity = c.room.property.electricityBilling;
      const allBills = hasElectricity ? c.room.electricityBills : [];
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
        contractId: c.id,
        roomId: c.room.id,
        tenant: c.tenant,
        property: { id: c.room.property.id, name: c.room.property.name, city: c.room.property.city, electricityBilling: hasElectricity },
        room: { id: c.room.id, roomNumber: c.room.roomNumber },
        monthlyRent: c.monthlyRent,
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
        dueDate: summary.currentCycle?.dueDate || null
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
  startContract,
  updateContract,
  endContract,
  getRentCollection,
  getRentOverview
};
