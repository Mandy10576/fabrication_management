const prisma = require('../config/prisma');
const { getElectricityDueForRoom } = require('./rentElectricityController');
const { runDailyBillingCycle } = require('../services/rentBillingService');
const { sendToAllSubscriptions } = require('../services/pushService');
const devDate = require('../utils/devDate');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Scans every unpaid/partial bill and builds one summary push payload — a
 * daily digest, not one notification per tenant, so the admin gets a single
 * useful alert instead of a flood. Returns null when there's nothing to
 * report (fully settled).
 *
 * Bills are only ever generated for a cycle that has fully ended (see
 * rentCycleService.listBillableCycles), so every unpaid/partial RentBill
 * here is by definition already overdue — there's no "due soon" for a bill
 * that hasn't been generated yet. */
const buildRentReminderPayload = async () => {
  const now = devDate.now();
  const [openBills, propertiesWithElectricity] = await Promise.all([
    prisma.rentBill.findMany({
      // Defensive re-check, via dueDate rather than cycleEnd: a forced bill
      // (see forceGenerateCurrentCycleBill) has a dueDate scheduled past
      // its own cycleEnd, so "dueDate already passed" is true precisely
      // when a bill — forced or naturally generated — is actually overdue,
      // with no separate `forced` exception needed here.
      where: { status: { in: ['UNPAID', 'PARTIAL'] }, contract: { status: 'ACTIVE' }, dueDate: { lt: now } },
      include: { contract: { select: { id: true, roomId: true } } }
    }),
    prisma.rentRoom.findMany({
      where: { property: { electricityBilling: true } },
      select: { id: true }
    })
  ]);

  const overdueContracts = new Set(openBills.map((b) => b.contract.id));
  const totalRentPending = round2(openBills.reduce((sum, b) => sum + Math.max(0, b.rentAmount + b.lateFeeApplied + b.miscAmount - b.discountAmount - b.amountPaid), 0));

  let totalElectricityPending = 0;
  for (const room of propertiesWithElectricity) {
    totalElectricityPending += await getElectricityDueForRoom(room.id);
  }
  totalElectricityPending = round2(totalElectricityPending);

  if (overdueContracts.size === 0 && totalElectricityPending <= 0) {
    return null;
  }

  const parts = [];
  if (overdueContracts.size > 0) parts.push(`${overdueContracts.size} tenant${overdueContracts.size > 1 ? 's' : ''} with pending rent`);
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
 * JWT auth accepted alongside the cron secret — see authenticateCronOrAdmin).
 * Runs bill generation + late-fee application first, so the reminder always
 * reflects freshly-generated bills rather than whatever was billed as of
 * the last run. */
const runDailyRentReminderCheck = async (req, res, next) => {
  try {
    const billingResult = await runDailyBillingCycle(devDate.now());
    const payload = await buildRentReminderPayload();
    if (!payload) {
      return res.json({ message: 'No pending rent or electricity right now — nothing to notify.', sent: 0, billing: billingResult });
    }
    const result = await sendToAllSubscriptions(payload);
    res.json({ message: 'Rent reminder check complete', ...result, billing: billingResult });
  } catch (error) {
    next(error);
  }
};

module.exports = { buildRentReminderPayload, runDailyRentReminderCheck };
