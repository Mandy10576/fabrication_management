const prisma = require('../config/prisma');
const { getBusinessToday, daysInMonth, addDaysUTC } = require('../utils/dateCalc');

const PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'];

const parseMonthRange = (month) => {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthNum] = month.split('-').map(Number);
  const monthIndex = monthNum - 1;
  const fromDate = new Date(Date.UTC(year, monthIndex, 1));
  const toDate = new Date(Date.UTC(year, monthIndex, daysInMonth(year, monthIndex)));
  return { fromDate, toDate };
};

const getEmployeeAdvances = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const advances = await prisma.advance.findMany({
      where: { employeeId: id },
      orderBy: { advanceDate: 'desc' },
    });

    res.json(advances);
  } catch (error) {
    next(error);
  }
};

const addAdvance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, advanceDate, paymentMode, referenceNo, notes } = req.body;

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a valid positive number' });
    }
    if (paymentMode && !PAYMENT_MODES.includes(paymentMode)) {
      return res.status(400).json({ error: `Payment Mode must be one of: ${PAYMENT_MODES.join(', ')}` });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const advance = await prisma.advance.create({
      data: {
        employeeId: id,
        amount: payAmount,
        advanceDate: advanceDate ? new Date(advanceDate) : new Date(),
        paymentMode: paymentMode || 'CASH',
        referenceNo: referenceNo || null,
        notes: notes || null,
      },
    });

    res.status(201).json(advance);
  } catch (error) {
    next(error);
  }
};

const deleteAdvance = async (req, res, next) => {
  try {
    const { id, advanceId } = req.params;
    const existing = await prisma.advance.findFirst({ where: { id: advanceId, employeeId: id } });
    if (!existing) return res.status(404).json({ error: 'Advance record not found' });

    await prisma.advance.delete({ where: { id: advanceId } });
    res.json({ message: 'Advance deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getOrgAdvances = async (req, res, next) => {
  try {
    const { search, month, all, limit } = req.query;

    const where = {};
    const range = parseMonthRange(month);
    if (range) {
      where.advanceDate = { gte: range.fromDate, lt: addDaysUTC(range.toDate, 1) };
    }
    if (search) {
      where.employee = { OR: [{ name: { contains: search } }, { mobile: { contains: search } }] };
    }

    const advances = await prisma.advance.findMany({
      where,
      include: { employee: { select: { id: true, name: true, mobile: true } } },
      orderBy: { advanceDate: 'desc' },
      ...(all === 'true' ? {} : { take: Math.min(200, parseInt(limit) || 50) }),
    });

    res.json(advances);
  } catch (error) {
    next(error);
  }
};

module.exports = { getEmployeeAdvances, addAdvance, deleteAdvance, getOrgAdvances, PAYMENT_MODES };
