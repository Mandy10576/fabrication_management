const prisma = require('../config/prisma');
const { normalizeToUTCMidnight, getBusinessToday, daysInMonth } = require('../utils/dateCalc');
const { getCycleForDate, listAvailableCycles } = require('../services/cycleService');
const { computeCycleSummary } = require('../services/salaryService');

const SALARY_PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'];

const getEmployeeSalary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const today = getBusinessToday();
    const referenceDate = req.query.cycleStart ? normalizeToUTCMidnight(req.query.cycleStart) : today;
    const { cycleStart, cycleEnd } = getCycleForDate(employee, referenceDate);

    const currentCycle = await computeCycleSummary(prisma, employee, cycleStart, cycleEnd);
    const availableCycles = listAvailableCycles(employee, today);

    let history;
    if (req.query.history === 'true') {
      history = await Promise.all(
        availableCycles.map((c) => computeCycleSummary(prisma, employee, c.cycleStart, c.cycleEnd))
      );
    }

    res.json({ employeeId: id, employeeName: employee.name, currentCycle, availableCycles, ...(history ? { history } : {}) });
  } catch (error) {
    next(error);
  }
};

const getOrgSalary = async (req, res, next) => {
  try {
    const { search, status, month } = req.query;

    const where = {};
    if (status === 'INACTIVE') where.isActive = false;
    else if (status !== 'ALL') where.isActive = true;
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { mobile: { contains: search, mode: 'insensitive' } }];

    const employees = await prisma.employee.findMany({ where, orderBy: { name: 'asc' } });

    const today = getBusinessToday();
    let referenceDate = today;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNum] = month.split('-').map(Number);
      const lastDay = new Date(Date.UTC(year, monthNum - 1, daysInMonth(year, monthNum - 1)));
      referenceDate = lastDay.getTime() < today.getTime() ? lastDay : today;
    }

    const rows = await Promise.all(
      employees.map(async (employee) => {
        const { cycleStart, cycleEnd } = getCycleForDate(employee, referenceDate);
        const summary = await computeCycleSummary(prisma, employee, cycleStart, cycleEnd);
        return { employeeId: employee.id, name: employee.name, mobile: employee.mobile, isActive: employee.isActive, ...summary };
      })
    );

    res.json({ referenceDate, rows });
  } catch (error) {
    next(error);
  }
};

const getEmployeeSalaryPayments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const payments = await prisma.salaryPayment.findMany({
      where: { employeeId: id },
      orderBy: { paymentDate: 'desc' },
    });

    res.json(payments);
  } catch (error) {
    next(error);
  }
};

const addSalaryPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cycleStart, amount, paymentDate, paymentMode, referenceNo, notes } = req.body;

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a valid positive number' });
    }
    if (paymentMode && !SALARY_PAYMENT_MODES.includes(paymentMode)) {
      return res.status(400).json({ error: `Payment Mode must be one of: ${SALARY_PAYMENT_MODES.join(', ')}` });
    }
    if (!cycleStart) {
      return res.status(400).json({ error: 'cycleStart is required' });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const normalizedCycleStart = normalizeToUTCMidnight(cycleStart);
    const { cycleStart: resolvedCycleStart, cycleEnd: resolvedCycleEnd } = getCycleForDate(employee, normalizedCycleStart);
    if (resolvedCycleStart.getTime() !== normalizedCycleStart.getTime()) {
      return res.status(400).json({ error: 'cycleStart does not match a valid salary cycle for this employee' });
    }

    const today = getBusinessToday();
    const { cycleStart: currentCycleStart } = getCycleForDate(employee, today);
    if (normalizedCycleStart.getTime() > currentCycleStart.getTime()) {
      return res.status(400).json({ error: 'Cannot record a payment for a future salary cycle' });
    }

    await prisma.salaryPayment.create({
      data: {
        employeeId: id,
        cycleStart: normalizedCycleStart,
        amount: payAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMode: paymentMode || 'CASH',
        referenceNo: referenceNo || null,
        notes: notes || null,
      },
    });

    const summary = await computeCycleSummary(prisma, employee, resolvedCycleStart, resolvedCycleEnd);
    res.status(201).json(summary);
  } catch (error) {
    next(error);
  }
};

const deleteSalaryPayment = async (req, res, next) => {
  try {
    const { id, paymentId } = req.params;
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const existing = await prisma.salaryPayment.findFirst({ where: { id: paymentId, employeeId: id } });
    if (!existing) return res.status(404).json({ error: 'Salary payment record not found' });

    await prisma.salaryPayment.delete({ where: { id: paymentId } });

    const { cycleStart, cycleEnd } = getCycleForDate(employee, existing.cycleStart);
    const summary = await computeCycleSummary(prisma, employee, cycleStart, cycleEnd);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployeeSalary,
  getOrgSalary,
  getEmployeeSalaryPayments,
  addSalaryPayment,
  deleteSalaryPayment,
  SALARY_PAYMENT_MODES,
};
