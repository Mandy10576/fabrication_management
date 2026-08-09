const prisma = require('../config/prisma');
const { normalizeToUTCMidnight, getBusinessToday, daysInMonth } = require('../utils/dateCalc');
const { VALID_STATUSES, computeAttendanceForRange, summarizeDays } = require('../services/attendanceService');

/** Parses a "YYYY-MM" query param into {fromDate, toDate} covering that whole month (UTC). Defaults to the current month. */
const parseMonthParam = (month) => {
  let year, monthIndex;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    [year, monthIndex] = month.split('-').map(Number);
    monthIndex -= 1;
  } else {
    const today = getBusinessToday();
    year = today.getUTCFullYear();
    monthIndex = today.getUTCMonth();
  }
  const fromDate = new Date(Date.UTC(year, monthIndex, 1));
  const toDate = new Date(Date.UTC(year, monthIndex, daysInMonth(year, monthIndex)));
  return { fromDate, toDate };
};

const getEmployeeAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const { fromDate, toDate } = parseMonthParam(req.query.month);
    const days = await computeAttendanceForRange(prisma, employee, fromDate, toDate);
    const summary = summarizeDays(days);

    res.json({ employeeId: id, employeeName: employee.name, fromDate, toDate, days, summary });
  } catch (error) {
    next(error);
  }
};

const setAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, status, notes } = req.body;

    if (!date || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const normalizedDate = normalizeToUTCMidnight(date);
    const today = getBusinessToday();
    const joiningDate = normalizeToUTCMidnight(employee.joiningDate);

    if (normalizedDate.getTime() > today.getTime()) {
      return res.status(400).json({ error: 'Cannot set attendance for a future date' });
    }
    if (normalizedDate.getTime() < joiningDate.getTime()) {
      return res.status(400).json({ error: 'Cannot set attendance before the employee\'s joining date' });
    }

    const record = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: id, date: normalizedDate } },
      update: { status, notes: notes || null },
      create: { employeeId: id, date: normalizedDate, status, notes: notes || null },
    });

    res.json(record);
  } catch (error) {
    next(error);
  }
};

const deleteAttendanceOverride = async (req, res, next) => {
  try {
    const { id, date } = req.params;
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const normalizedDate = normalizeToUTCMidnight(date);

    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: id, date: normalizedDate } },
    });
    if (!existing) return res.status(404).json({ error: 'No attendance override found for that date' });

    await prisma.attendance.delete({ where: { id: existing.id } });

    const [revertedDay] = await computeAttendanceForRange(prisma, employee, normalizedDate, normalizedDate);
    res.json(revertedDay);
  } catch (error) {
    next(error);
  }
};

const getOrgAttendance = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const where = {};
    if (status === 'INACTIVE') where.isActive = false;
    else if (status !== 'ALL') where.isActive = true;

    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { mobile: { contains: search, mode: 'insensitive' } }];
    }

    const employees = await prisma.employee.findMany({ where, orderBy: { name: 'asc' } });
    const { fromDate, toDate } = parseMonthParam(req.query.month);

    const rows = await Promise.all(
      employees.map(async (employee) => {
        const days = await computeAttendanceForRange(prisma, employee, fromDate, toDate);
        return {
          employeeId: employee.id,
          name: employee.name,
          mobile: employee.mobile,
          isActive: employee.isActive,
          summary: summarizeDays(days),
        };
      })
    );

    res.json({ fromDate, toDate, rows });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEmployeeAttendance, setAttendance, deleteAttendanceOverride, getOrgAttendance };
