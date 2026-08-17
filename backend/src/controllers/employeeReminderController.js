const prisma = require('../config/prisma');
const { sendToAllSubscriptions } = require('../services/pushService');

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

/** Daily end-of-day digest (unlike the rent reminder, this always sends —
 * "what happened today" is relevant every day, not just when something's
 * overdue). Attendance itself defaults to PRESENT for every active employee
 * unless an admin explicitly overrides a day to ABSENT/leave/etc. (see
 * computeAttendanceForRange in attendanceService.js) — so there's nothing to
 * "remind" about there; this only flags admin-marked absences, plus which
 * projects/sites had work logged today so the admin remembers to fill in
 * anything missing. */
const buildEmployeeReminderPayload = async () => {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const [activeCount, absentToday, workLogsToday] = await Promise.all([
    prisma.employee.count({ where: { isActive: true } }),
    prisma.attendance.findMany({
      where: { date: { gte: dayStart, lte: dayEnd }, status: { in: ['ABSENT', 'UNPAID_LEAVE'] } },
      select: { employee: { select: { name: true } } }
    }),
    prisma.workLog.findMany({
      where: { visitDate: { gte: dayStart, lte: dayEnd } },
      select: { project: { select: { name: true } } }
    })
  ]);

  const parts = [];
  if (activeCount === 0) {
    parts.push('No active employees yet.');
  } else if (absentToday.length > 0) {
    parts.push(`${absentToday.map((a) => a.employee.name).join(', ')} marked absent today.`);
  } else {
    parts.push(`All ${activeCount} employees present today.`);
  }

  if (workLogsToday.length === 0) {
    parts.push('No work log entries today — add what work got done.');
  } else {
    const sites = [...new Set(workLogsToday.map((w) => w.project.name))];
    parts.push(`Work logged today at ${sites.join(', ')}.`);
  }

  return {
    title: 'Daily Wrap-up Reminder',
    body: parts.join(' '),
    url: '/attendance',
    tag: 'employee-reminder'
  };
};

/** Cron entry point — Vercel Cron hits this once a day at 9:30 PM IST; also
 * triggerable by a logged-in admin for testing (same dual-auth pattern as
 * the rent reminder cron). */
const runDailyEmployeeReminderCheck = async (req, res, next) => {
  try {
    const payload = await buildEmployeeReminderPayload();
    const result = await sendToAllSubscriptions(payload);
    res.json({ message: 'Employee reminder check complete', ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = { buildEmployeeReminderPayload, runDailyEmployeeReminderCheck };
