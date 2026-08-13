const prisma = require('../config/prisma');
const { sendToAllSubscriptions } = require('../services/pushService');
const { buildRentReminderPayload } = require('./rentReminderController');

const getPublicKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
};

const subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'A valid push subscription (endpoint + keys) is required' });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: req.user.id, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth }
    });

    res.status(201).json({ message: 'Subscribed to notifications' });
  } catch (error) {
    next(error);
  }
};

const unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });

    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user.id } });
    res.json({ message: 'Unsubscribed' });
  } catch (error) {
    next(error);
  }
};

/** Lets an admin fire the same daily reminder on demand — useful to confirm
 * notifications actually arrive without waiting for the Vercel Cron slot. */
const sendTestNotification = async (req, res, next) => {
  try {
    const payload = await buildRentReminderPayload();
    if (!payload) {
      return res.json({ message: 'No pending rent or electricity right now — nothing to notify.', sent: 0 });
    }
    const result = await sendToAllSubscriptions(payload);
    res.json({ message: 'Test notification sent', ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPublicKey, subscribe, unsubscribe, sendTestNotification };
