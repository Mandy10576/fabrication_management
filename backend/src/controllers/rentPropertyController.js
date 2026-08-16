const prisma = require('../config/prisma');
const { getElectricityDueForRoom } = require('./rentElectricityController');
const { summarizeContract, buildCombinedPaymentHistory } = require('./rentBillController');

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

const getProperties = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            { addressLine1: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {};

    const properties = await prisma.rentProperty.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { rooms: { select: { status: true } } }
    });

    const withCounts = properties.map((p) => {
      const { rooms, ...rest } = p;
      return {
        ...rest,
        roomCount: rooms.length,
        occupiedCount: rooms.filter((r) => r.status === 'OCCUPIED').length,
        vacantCount: rooms.filter((r) => r.status === 'VACANT').length
      };
    });

    res.json(withCounts);
  } catch (error) {
    next(error);
  }
};

/** Flat property list — powers filter dropdowns that need every property up
 * front rather than only the ones surviving the current result set. */
const getAllProperties = async (req, res, next) => {
  try {
    const properties = await prisma.rentProperty.findMany({
      select: { id: true, name: true, city: true },
      orderBy: { name: 'asc' }
    });
    res.json(properties);
  } catch (error) {
    next(error);
  }
};

const createProperty = async (req, res, next) => {
  try {
    const {
      name, addressLine1, addressLine2, city, state, pinCode, type,
      totalFloors, yearBuilt, description, totalRooms, electricityBilling, electricityRate, notes
    } = req.body;

    if (!name || !addressLine1 || !city) {
      return res.status(400).json({ error: 'Property name, address, and city are required' });
    }

    const property = await prisma.rentProperty.create({
      data: {
        name,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state: state || null,
        pinCode: pinCode || null,
        type: type || 'RESIDENTIAL',
        totalFloors: totalFloors !== undefined && totalFloors !== '' ? parseInt(totalFloors, 10) : null,
        yearBuilt: yearBuilt !== undefined && yearBuilt !== '' ? parseInt(yearBuilt, 10) : null,
        description: description || null,
        totalRooms: parseInt(totalRooms, 10) || 0,
        electricityBilling: Boolean(electricityBilling),
        electricityRate: electricityRate !== undefined && electricityRate !== '' ? parseFloat(electricityRate) || 0 : 10,
        notes: notes || null
      }
    });
    res.status(201).json(property);
  } catch (error) {
    next(error);
  }
};

const getPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await prisma.rentProperty.findUnique({
      where: { id },
      include: {
        rooms: {
          orderBy: { roomNumber: 'asc' },
          include: {
            contracts: {
              where: { status: 'ACTIVE' },
              take: 1,
              include: { tenant: { select: { id: true, name: true, mobile: true } } }
            }
          }
        }
      }
    });

    if (!property) return res.status(404).json({ error: 'Property not found' });

    const rooms = property.rooms.map((r) => {
      const { contracts, ...rest } = r;
      return { ...rest, currentContract: contracts[0] || null };
    });

    res.json({ ...property, rooms });
  } catch (error) {
    next(error);
  }
};

const updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, addressLine1, addressLine2, city, state, pinCode, type,
      totalFloors, yearBuilt, description, totalRooms, electricityBilling, electricityRate, notes
    } = req.body;

    if (!name || !addressLine1 || !city) {
      return res.status(400).json({ error: 'Property name, address, and city are required' });
    }

    const property = await prisma.rentProperty.update({
      where: { id },
      data: {
        name,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state: state || null,
        pinCode: pinCode || null,
        type: type || 'RESIDENTIAL',
        totalFloors: totalFloors !== undefined && totalFloors !== '' ? parseInt(totalFloors, 10) : null,
        yearBuilt: yearBuilt !== undefined && yearBuilt !== '' ? parseInt(yearBuilt, 10) : null,
        description: description || null,
        totalRooms: parseInt(totalRooms, 10) || 0,
        electricityBilling: Boolean(electricityBilling),
        electricityRate: electricityRate !== undefined && electricityRate !== '' ? parseFloat(electricityRate) || 0 : 10,
        notes: notes || null
      }
    });
    res.json(property);
  } catch (error) {
    next(error);
  }
};

const deleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.rentProperty.findUnique({
      where: { id },
      include: { _count: { select: { rooms: true } } }
    });
    if (!existing) return res.status(404).json({ error: 'Property not found or already deleted' });

    if (existing._count.rooms > 0) {
      return res.status(400).json({
        error: `Cannot delete '${existing.name}' because it has ${existing._count.rooms} room(s). Remove them first.`
      });
    }

    await prisma.rentProperty.delete({ where: { id } });
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

const createRoom = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { roomNumber, floor, roomType, areaSqft, electricityMeterNumber, monthlyRent, depositAmount, furnishingStatus, notes } = req.body;
    if (!roomNumber || monthlyRent === undefined || monthlyRent === null) {
      return res.status(400).json({ error: 'Room number and monthly rent are required' });
    }

    const property = await prisma.rentProperty.findUnique({ where: { id: propertyId } });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const room = await prisma.rentRoom.create({
      data: {
        propertyId,
        roomNumber,
        floor: floor || null,
        roomType: roomType || null,
        areaSqft: areaSqft !== undefined && areaSqft !== '' ? parseFloat(areaSqft) : null,
        electricityMeterNumber: electricityMeterNumber || null,
        monthlyRent: parseFloat(monthlyRent) || 0,
        depositAmount: depositAmount !== undefined && depositAmount !== '' ? parseFloat(depositAmount) : null,
        furnishingStatus: furnishingStatus || 'UNFURNISHED',
        notes: notes || null
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
        property: true,
        contracts: {
          orderBy: { startDate: 'desc' },
          include: {
            tenant: { include: { documents: { orderBy: { createdAt: 'desc' } } } },
            bills: { orderBy: { cycleStart: 'desc' }, include: { payments: { orderBy: { paymentDate: 'desc' } } } },
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

    const activeContract = room.contracts.find((c) => c.status === 'ACTIVE') || null;
    const currentContract = activeContract
      ? {
          ...activeContract,
          summary: summarizeContract(activeContract),
          combinedPayments: buildCombinedPaymentHistory(
            activeContract.bills.flatMap((b) => b.payments.map((p) => ({ ...p, cycleStart: b.cycleStart }))),
            activeContract.electricityPayments
          )
        }
      : null;

    const contractHistory = room.contracts
      .filter((c) => c.status !== 'ACTIVE')
      .map((c) => ({ ...c, summary: summarizeContract(c) }));

    const electricityPaymentHistory = room.electricityBills
      .flatMap((b) => b.payments.map((p) => ({ ...p, billId: b.id, billDate: b.billDate })))
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    const currentDues = {
      rentDue: currentContract?.summary.totalPending || 0,
      electricityDue: await getElectricityDueForRoom(id)
    };
    currentDues.totalDue = Math.round((currentDues.rentDue + currentDues.electricityDue + Number.EPSILON) * 100) / 100;

    res.json({ ...room, currentContract, contractHistory, electricityPaymentHistory, currentDues });
  } catch (error) {
    next(error);
  }
};

const updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roomNumber, floor, roomType, areaSqft, electricityMeterNumber, monthlyRent, depositAmount, furnishingStatus, notes } = req.body;
    if (!roomNumber || monthlyRent === undefined || monthlyRent === null) {
      return res.status(400).json({ error: 'Room number and monthly rent are required' });
    }

    const room = await prisma.rentRoom.update({
      where: { id },
      data: {
        roomNumber,
        floor: floor || null,
        roomType: roomType || null,
        areaSqft: areaSqft !== undefined && areaSqft !== '' ? parseFloat(areaSqft) : null,
        electricityMeterNumber: electricityMeterNumber || null,
        monthlyRent: parseFloat(monthlyRent) || 0,
        depositAmount: depositAmount !== undefined && depositAmount !== '' ? parseFloat(depositAmount) : null,
        furnishingStatus: furnishingStatus || 'UNFURNISHED',
        notes: notes || null
      }
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
      include: { _count: { select: { contracts: true, electricityBills: true } } }
    });
    if (!existing) return res.status(404).json({ error: 'Room not found or already deleted' });

    if (existing._count.contracts > 0) {
      return res.status(400).json({
        error: `Cannot delete room '${existing.roomNumber}' because it has contract history. Rooms with any current or past tenant are kept permanently.`
      });
    }

    await prisma.rentRoom.delete({ where: { id } });
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProperties,
  getAllProperties,
  createProperty,
  getPropertyById,
  updateProperty,
  deleteProperty,
  createRoom,
  getRoomById,
  updateRoom,
  deleteRoom
};
