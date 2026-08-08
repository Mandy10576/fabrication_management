const prisma = require('../config/prisma');
const { normalizeToUTCMidnight } = require('../utils/dateCalc');
const { materializePresentDays } = require('../services/attendanceService');

const DEDUCTION_BASES = ['CALENDAR_DAYS', 'WORKING_DAYS'];

const getEmployees = async (req, res, next) => {
  try {
    const { search, status, limit, cursor, all } = req.query;

    const where = {};
    if (status === 'ACTIVE') where.isActive = true;
    else if (status === 'INACTIVE') where.isActive = false;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { mobile: { contains: search } },
      ];
    }

    const selectFields = {
      id: true,
      name: true,
      mobile: true,
      address: true,
      joiningDate: true,
      monthlySalary: true,
      salaryCycleStartDay: true,
      deductionBasis: true,
      isActive: true,
      notes: true,
      createdAt: true,
    };

    if (all === 'true') {
      const employees = await prisma.employee.findMany({ where, select: selectFields, orderBy: { name: 'asc' } });
      return res.json(employees);
    }

    const takeLimit = Math.min(100, parseInt(limit) || 20);
    const take = takeLimit + 1;

    const [totalCount, items] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: selectFields,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    let hasMore = false;
    let nextCursor = null;
    if (items.length > takeLimit) {
      hasMore = true;
      items.pop();
      nextCursor = items[items.length - 1]?.id || null;
    }

    res.json({ items, nextCursor, hasMore, totalCount });
  } catch (error) {
    next(error);
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({ where: { id } });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    next(error);
  }
};

const validateEmployeePayload = (body) => {
  const { name, mobile, joiningDate, monthlySalary, salaryCycleStartDay, deductionBasis } = body;

  if (!name || !mobile || !joiningDate || monthlySalary === undefined || monthlySalary === null) {
    return 'Name, Mobile, Joining Date, and Monthly Salary are required';
  }
  if (isNaN(parseFloat(monthlySalary)) || parseFloat(monthlySalary) < 0) {
    return 'Monthly Salary must be a valid non-negative number';
  }
  if (salaryCycleStartDay !== undefined && salaryCycleStartDay !== null) {
    const day = parseInt(salaryCycleStartDay);
    if (isNaN(day) || day < 1 || day > 31) {
      return 'Salary Cycle Start Day must be between 1 and 31';
    }
  }
  if (deductionBasis && !DEDUCTION_BASES.includes(deductionBasis)) {
    return 'Deduction Basis must be CALENDAR_DAYS or WORKING_DAYS';
  }
  return null;
};

const createEmployee = async (req, res, next) => {
  try {
    const error = validateEmployeePayload(req.body);
    if (error) return res.status(400).json({ error });

    const { name, mobile, address, joiningDate, monthlySalary, salaryCycleStartDay, deductionBasis, isActive, notes } = req.body;

    const employee = await prisma.employee.create({
      data: {
        name,
        mobile,
        address: address || '',
        joiningDate: normalizeToUTCMidnight(joiningDate),
        monthlySalary: parseFloat(monthlySalary),
        salaryCycleStartDay: salaryCycleStartDay ? parseInt(salaryCycleStartDay) : 1,
        deductionBasis: deductionBasis || 'CALENDAR_DAYS',
        isActive: isActive === undefined ? true : Boolean(isActive),
        notes: notes || '',
      },
    });

    res.status(201).json(employee);
  } catch (error) {
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const error = validateEmployeePayload(req.body);
    if (error) return res.status(400).json({ error });

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const { name, mobile, address, joiningDate, monthlySalary, salaryCycleStartDay, deductionBasis, isActive, notes } = req.body;
    const nextIsActive = isActive === undefined ? existing.isActive : Boolean(isActive);
    const isDeactivating = existing.isActive && !nextIsActive;

    const updated = await prisma.$transaction(async (tx) => {
      if (isDeactivating) {
        await materializePresentDays(tx, existing);
      }

      return tx.employee.update({
        where: { id },
        data: {
          name,
          mobile,
          address: address || '',
          joiningDate: normalizeToUTCMidnight(joiningDate),
          monthlySalary: parseFloat(monthlySalary),
          salaryCycleStartDay: salaryCycleStartDay ? parseInt(salaryCycleStartDay) : existing.salaryCycleStartDay,
          deductionBasis: deductionBasis || existing.deductionBasis,
          isActive: nextIsActive,
          notes: notes || '',
        },
      });
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.employee.findUnique({
      where: { id },
      include: { _count: { select: { attendance: true, advances: true, salaryPayments: true, workLogs: true } } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Employee not found or already deleted' });
    }

    const { attendance, advances, salaryPayments, workLogs } = existing._count || {};
    if (attendance > 0 || advances > 0 || salaryPayments > 0 || workLogs > 0) {
      return res.status(400).json({
        error: `Cannot delete '${existing.name}' because they have recorded attendance, advance, payment, or work log history. Mark them Inactive instead.`,
      });
    }

    await prisma.employee.delete({ where: { id } });
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee };
