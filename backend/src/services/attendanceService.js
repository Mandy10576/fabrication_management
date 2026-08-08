const { normalizeToUTCMidnight, getBusinessToday, addDaysUTC } = require('../utils/dateCalc');

const VALID_STATUSES = ['PRESENT', 'ABSENT', 'PAID_LEAVE', 'UNPAID_LEAVE', 'HOLIDAY'];

/**
 * Merges stored Attendance override rows with the computed "Present by
 * default" rule for a date range. The Attendance table only ever stores
 * exceptions — this is what lets admins skip marking everyone Present daily.
 */
async function computeAttendanceForRange(prisma, employee, fromDate, toDate) {
  const from = normalizeToUTCMidnight(fromDate);
  const to = normalizeToUTCMidnight(toDate);
  const today = getBusinessToday();
  const joiningDate = normalizeToUTCMidnight(employee.joiningDate);

  const overrides = await prisma.attendance.findMany({
    where: { employeeId: employee.id, date: { gte: from, lte: to } },
  });
  const overrideMap = new Map(overrides.map((o) => [o.date.toISOString(), o]));

  const days = [];
  let cursor = from;
  while (cursor.getTime() <= to.getTime()) {
    const key = cursor.toISOString();
    const override = overrideMap.get(key);

    let status = null;
    let source = 'unmarked';

    if (cursor.getTime() > today.getTime()) {
      source = 'future';
    } else if (cursor.getTime() < joiningDate.getTime()) {
      source = 'not-employed';
    } else if (override) {
      status = override.status;
      source = 'override';
    } else if (employee.isActive) {
      status = 'PRESENT';
      source = 'default';
    }

    days.push({ date: new Date(cursor), status, source, notes: override?.notes || null });
    cursor = addDaysUTC(cursor, 1);
  }

  return days;
}

function summarizeDays(days) {
  const summary = { present: 0, absent: 0, paidLeave: 0, unpaidLeave: 0, holiday: 0, unmarked: 0 };
  days.forEach((d) => {
    switch (d.status) {
      case 'PRESENT': summary.present += 1; break;
      case 'ABSENT': summary.absent += 1; break;
      case 'PAID_LEAVE': summary.paidLeave += 1; break;
      case 'UNPAID_LEAVE': summary.unpaidLeave += 1; break;
      case 'HOLIDAY': summary.holiday += 1; break;
      default:
        if (d.source === 'unmarked') summary.unmarked += 1;
    }
  });
  return summary;
}

/**
 * Bulk-writes explicit PRESENT rows for every unmarked day up to today, right
 * before an employee is deactivated. Without this, deactivating would
 * retroactively erase the implied-Present days from while they were active
 * (since the default-Present rule only applies to currently-active employees).
 * One bounded write, not a recurring job.
 */
async function materializePresentDays(prisma, employee) {
  const today = getBusinessToday();
  const joiningDate = normalizeToUTCMidnight(employee.joiningDate);
  if (joiningDate.getTime() > today.getTime()) return;

  const existing = await prisma.attendance.findMany({
    where: { employeeId: employee.id, date: { gte: joiningDate, lte: today } },
    select: { date: true },
  });
  const existingSet = new Set(existing.map((e) => e.date.toISOString()));

  const missing = [];
  let cursor = joiningDate;
  while (cursor.getTime() <= today.getTime()) {
    if (!existingSet.has(cursor.toISOString())) {
      missing.push(new Date(cursor));
    }
    cursor = addDaysUTC(cursor, 1);
  }

  if (missing.length === 0) return;

  await prisma.attendance.createMany({
    data: missing.map((date) => ({ employeeId: employee.id, date, status: 'PRESENT' })),
    skipDuplicates: true,
  });
}

module.exports = { VALID_STATUSES, computeAttendanceForRange, summarizeDays, materializePresentDays };
