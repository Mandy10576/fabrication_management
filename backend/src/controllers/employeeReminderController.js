const prisma = require('../config/prisma');
const { sendToAllSubscriptions } = require('../services/pushService');

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

/** Daily end-of-day digest (unlike the rent reminder, this always sends —
 * "what happened today" is relevant every day, not just when something's
 * overdue): how many active employees got attendance marked today, and
 * whether any work log entries were recorded today. */
const buildEmployeeReminderPayload = async () => {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const [activeCount, attendanceToday, workLogsToday] = await Promise.all([
    prisma.employee.count({ where: { isActive: true } }),
    prisma.attendance.findMany({ where: { date: { gte: dayStart, lte: dayEnd } }, select: { status: true } }),
    prisma.workLog.count({ where: { visitDate: { gte: dayStart, lte: dayEnd } } })
  ]);

  const presentCount = attendanceToday.filter((a) => a.status === 'PRESENT' || a.status === 'PAID_LEAVE').length;
  const markedCount = attendanceToday.length;

  const parts = [];
  if (activeCount === 0) {
    parts.push('No active employees yet.');
  } else if (markedCount === 0) {
    parts.push(`Attendance not marked yet for any of ${activeCount} employees today.`);
  } else {
    parts.push(`${presentCount} of ${activeCount} employees marked present today.`);
  }

  if (workLogsToday === 0) {
    parts.push('No work log entries today — add what work got done.');
  } else {
    parts.push(`${workLogsToday} work log ${workLogsToday === 1 ? 'entry' : 'entries'} recorded today.`);
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
