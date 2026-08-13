const prisma = require('../config/prisma');
const { computeTenancySummary } = require('./rentTenancyController');
const { getElectricityDueForRoom } = require('./rentElectricityController');
const { sendToAllSubscriptions } = require('../services/pushService');
const devDate = require('../utils/devDate');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const DUE_SOON_DAYS = 3;

/** Scans every active tenancy and builds one summary push payload — a daily
 * digest, not one notification per tenant, so the admin gets a single
 * useful alert instead of a flood. Returns null when there's nothing to
 * report (fully settled). Uses the same devDate.now() the rest of the Rent
 * module does, so this also honors DEV_SIMULATED_DATE on localhost. */
const buildRentReminderPayload = async () => {
  const tenancies = await prisma.rentTenancy.findMany({
    where: { status: 'ACTIVE' },
    include: {
      tenant: { select: { name: true } },
      payments: true,
      room: {
        select: { id: true, roomNumber: true, building: { select: { name: true, electricityBilling: true } } }
      }
    }
  });

  const now = devDate.now();
  let overdueCount = 0;
  let dueSoonCount = 0;
  let totalRentPending = 0;
  let totalElectricityPending = 0;

  for (const t of tenancies) {
    const summary = computeTenancySummary(t, now);
    totalRentPending += summary.totalPending;

    const currentCycleStart = summary.currentCycle?.cycleStart?.getTime();
    const hasArrears = summary.cycles.some((c) => c.pending > 0.01 && c.cycleStart.getTime() !== currentCycleStart);

    if (hasArrears) {
      overdueCount++;
    } else if (summary.currentCycle && summary.currentCycle.pending > 0.01) {
      const daysToEnd = Math.ceil((summary.currentCycle.cycleEnd.getTime() - now.getTime()) / 86400000);
      if (daysToEnd <= DUE_SOON_DAYS) dueSoonCount++;
    }

    if (t.room.building.electricityBilling) {
      totalElectricityPending += await getElectricityDueForRoom(t.room.id);
    }
  }

  totalRentPending = round2(totalRentPending);
  totalElectricityPending = round2(totalElectricityPending);

  if (overdueCount === 0 && dueSoonCount === 0 && totalElectricityPending <= 0) {
    return null;
  }

  const parts = [];
  if (overdueCount > 0) parts.push(`${overdueCount} tenant${overdueCount > 1 ? 's' : ''} overdue`);
  if (dueSoonCount > 0) parts.push(`${dueSoonCount} due within ${DUE_SOON_DAYS} days`);
  if (totalElectricityPending > 0) parts.push(`₹${totalElectricityPending} electricity pending`);

  return {
    title: 'Rent & Electricity Reminder',
    body: `${parts.join(' · ')} — total rent pending ₹${totalRentPending}.`,
    url: '/rent',
    tag: 'rent-reminder'
  };
};

/** Cron entry point — Vercel Cron hits this once a day in production; it
 * can also be triggered manually by a logged-in admin (same route, normal
 * JWT auth accepted alongside the cron secret — see authenticateCronOrAdmin). */
const runDailyRentReminderCheck = async (req, res, next) => {
  try {
    const payload = await buildRentReminderPayload();
    if (!payload) {
      return res.json({ message: 'No pending rent or electricity right now — nothing to notify.', sent: 0 });
    }
    const result = await sendToAllSubscriptions(payload);
    res.json({ message: 'Rent reminder check complete', ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = { buildRentReminderPayload, runDailyRentReminderCheck };
