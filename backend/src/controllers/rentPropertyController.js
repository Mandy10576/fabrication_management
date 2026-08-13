const prisma = require('../config/prisma');
const { computeTenancySummary, buildCombinedPaymentHistory } = require('./rentTenancyController');
const { getElectricityDueForRoom } = require('./rentElectricityController');

// ---------------------------------------------------------------------------
// Areas
// ---------------------------------------------------------------------------

const getAreas = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {};

    const areas = await prisma.rentArea.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { buildings: true } },
        buildings: { select: { id: true, _count: { select: { rooms: true } }, rooms: { select: { status: true } } } }
      }
    });

    const withCounts = areas.map((area) => {
      const totalRooms = area.buildings.reduce((sum, b) => sum + b.rooms.length, 0);
      const occupiedRooms = area.buildings.reduce((sum, b) => sum + b.rooms.filter((r) => r.status === 'OCCUPIED').length, 0);
      const { buildings, ...rest } = area;
      return { ...rest, totalRooms, occupiedRooms };
    });

    res.json(withCounts);
  } catch (error) {
    next(error);
  }
};

const getAreaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const area = await prisma.rentArea.findUnique({
      where: { id },
      include: {
        buildings: {
          orderBy: { name: 'asc' },
          include: { rooms: { select: { id: true, status: true, monthlyRent: true } } }
        }
      }
    });

    if (!area) return res.status(404).json({ error: 'Area not found' });

    const buildings = area.buildings.map((b) => {
      const { rooms, ...rest } = b;
      return {
        ...rest,
        roomCount: rooms.length,
        occupiedCount: rooms.filter((r) => r.status === 'OCCUPIED').length,
        vacantCount: rooms.filter((r) => r.status === 'VACANT').length
      };
    });

    res.json({ ...area, buildings });
  } catch (error) {
    next(error);
  }
};

const createArea = async (req, res, next) => {
  try {
    const { name, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Area name is required' });

    const area = await prisma.rentArea.create({ data: { name, notes: notes || null } });
    res.status(201).json(area);
  } catch (error) {
    next(error);
  }
};

const updateArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Area name is required' });

    const area = await prisma.rentArea.update({ where: { id }, data: { name, notes: notes || null } });
    res.json(area);
  } catch (error) {
    next(error);
  }
};

const deleteArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.rentArea.findUnique({
      where: { id },
      include: { _count: { select: { buildings: true } } }
    });
    if (!existing) return res.status(404).json({ error: 'Area not found or already deleted' });

    if (existing._count.buildings > 0) {
      return res.status(400).json({
        error: `Cannot delete '${existing.name}' because it has ${existing._count.buildings} building(s). Remove them first.`
      });
    }

    await prisma.rentArea.delete({ where: { id } });
    res.json({ message: 'Area deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

const createBuilding = async (req, res, next) => {
  try {
    const { areaId } = req.params;
    const { name, address, totalRooms, electricityBilling, electricityRate, notes } = req.body;
    if (!name || !address) return res.status(400).json({ error: 'Building name and address are required' });

    const area = await prisma.rentArea.findUnique({ where: { id: areaId } });
    if (!area) return res.status(404).json({ error: 'Area not found' });

    const building = await prisma.rentBuilding.create({
      data: {
        areaId,
        name,
        address,
        totalRooms: parseInt(totalRooms, 10) || 0,
        electricityBilling: Boolean(electricityBilling),
        electricityRate: electricityRate !== undefined && electricityRate !== '' ? parseFloat(electricityRate) || 0 : 10,
        notes: notes || null
      }
    });
    res.status(201).json(building);
  } catch (error) {
    next(error);
  }
};

const getBuildingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const building = await prisma.rentBuilding.findUnique({
      where: { id },
      include: {
        area: { select: { id: true, name: true } },
        rooms: {
          orderBy: { roomNumber: 'asc' },
          include: {
            tenancies: {
              where: { status: 'ACTIVE' },
              take: 1,
              include: { tenant: { select: { id: true, name: true, mobile: true } } }
            }
          }
        }
      }
    });

    if (!building) return res.status(404).json({ error: 'Building not found' });

    const rooms = building.rooms.map((r) => {
      const { tenancies, ...rest } = r;
      return { ...rest, currentTenancy: tenancies[0] || null };
    });

    res.json({ ...building, rooms });
  } catch (error) {
    next(error);
  }
};

const updateBuilding = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, address, totalRooms, electricityBilling, electricityRate, notes } = req.body;
    if (!name || !address) return res.status(400).json({ error: 'Building name and address are required' });

    const building = await prisma.rentBuilding.update({
      where: { id },
      data: {
        name,
        address,
        totalRooms: parseInt(totalRooms, 10) || 0,
        electricityBilling: Boolean(electricityBilling),
        electricityRate: electricityRate !== undefined && electricityRate !== '' ? parseFloat(electricityRate) || 0 : 10,
        notes: notes || null
      }
    });
    res.json(building);
  } catch (error) {
    next(error);
  }
};

const deleteBuilding = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.rentBuilding.findUnique({
      where: { id },
      include: { _count: { select: { rooms: true } } }
    });
    if (!existing) return res.status(404).json({ error: 'Building not found or already deleted' });

    if (existing._count.rooms > 0) {
      return res.status(400).json({
        error: `Cannot delete '${existing.name}' because it has ${existing._count.rooms} room(s). Remove them first.`
      });
    }

    await prisma.rentBuilding.delete({ where: { id } });
    res.json({ message: 'Building deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/** Flat building list (optionally scoped to one area) — powers the Building
 * filter dropdown on the Rent Dashboard overview, which needs every building
 * up front rather than only the ones surviving the current result set. */
const getAllBuildings = async (req, res, next) => {
  try {
    const { areaId } = req.query;
    const where = areaId ? { areaId } : {};
    const buildings = await prisma.rentBuilding.findMany({
      where,
      select: { id: true, name: true, areaId: true },
      orderBy: { name: 'asc' }
    });
    res.json(buildings);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

const createRoom = async (req, res, next) => {
  try {
    const { buildingId } = req.params;
    const { roomNumber, monthlyRent } = req.body;
    if (!roomNumber || monthlyRent === undefined || monthlyRent === null) {
      return res.status(400).json({ error: 'Room number and monthly rent are required' });
    }

    const building = await prisma.rentBuilding.findUnique({ where: { id: buildingId } });
    if (!building) return res.status(404).json({ error: 'Building not found' });

    const room = await prisma.rentRoom.create({
      data: {
        buildingId,
        roomNumber,
        monthlyRent: parseFloat(monthlyRent) || 0,
        notes: req.body.notes || null
      }
    });
    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
};

const getRoomById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await prisma.rentRoom.findUnique({
      where: { id },
      include: {
        building: { include: { area: { select: { id: true, name: true } } } },
        tenancies: {
          orderBy: { startDate: 'desc' },
          include: {
            tenant: { include: { documents: { orderBy: { createdAt: 'desc' } } } },
            payments: { orderBy: { paymentDate: 'desc' } },
            electricityPayments: { orderBy: { paymentDate: 'desc' } }
          }
        },
        electricityBills: {
          orderBy: { billDate: 'desc' },
          include: { payments: { orderBy: { paymentDate: 'desc' } } }
        }
      }
    });

    if (!room) return res.status(404).json({ error: 'Room not found' });

    const activeTenancy = room.tenancies.find((t) => t.status === 'ACTIVE') || null;
    const currentTenancy = activeTenancy
      ? {
          ...activeTenancy,
          summary: computeTenancySummary(activeTenancy),
          combinedPayments: buildCombinedPaymentHistory(activeTenancy.payments, activeTenancy.electricityPayments)
        }
      : null;

    const tenancyHistory = room.tenancies
      .filter((t) => t.status !== 'ACTIVE')
      .map((t) => ({ ...t, summary: computeTenancySummary(t) }));

    // All electricity payments across every bill for this room, most recent
    // first — the room-level "Electricity History" (independent of which
    // tenancy was current when each payment landed).
    const electricityPaymentHistory = room.electricityBills
      .flatMap((b) => b.payments.map((p) => ({ ...p, billId: b.id, billDate: b.billDate })))
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    const currentDues = activeTenancy
      ? {
          rentDue: currentTenancy.summary.currentCycle?.pending || 0,
          electricityDue: await getElectricityDueForRoom(id),
        }
      : { rentDue: 0, electricityDue: await getElectricityDueForRoom(id) };
    currentDues.totalDue = Math.round((currentDues.rentDue + currentDues.electricityDue + Number.EPSILON) * 100) / 100;

    res.json({ ...room, currentTenancy, tenancyHistory, electricityPaymentHistory, currentDues });
  } catch (error) {
    next(error);
  }
};

const updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roomNumber, monthlyRent, notes } = req.body;
    if (!roomNumber || monthlyRent === undefined || monthlyRent === null) {
      return res.status(400).json({ error: 'Room number and monthly rent are required' });
    }

    const room = await prisma.rentRoom.update({
      where: { id },
      data: { roomNumber, monthlyRent: parseFloat(monthlyRent) || 0, notes: notes || null }
    });
    res.json(room);
  } catch (error) {
    next(error);
  }
};

const deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.rentRoom.findUnique({
      where: { id },
      include: { _count: { select: { tenancies: true, electricityBills: true } } }
    });
    if (!existing) return res.status(404).json({ error: 'Room not found or already deleted' });

    if (existing._count.tenancies > 0) {
      return res.status(400).json({
        error: `Cannot delete room '${existing.roomNumber}' because it has tenancy history. Rooms with any current or past tenant are kept permanently.`
      });
    }

    await prisma.rentRoom.delete({ where: { id } });
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAreas,
  getAreaById,
  createArea,
  updateArea,
  deleteArea,
  createBuilding,
  getAllBuildings,
  getBuildingById,
  updateBuilding,
  deleteBuilding,
  createRoom,
  getRoomById,
  updateRoom,
  deleteRoom
};
