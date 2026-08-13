const prisma = require('../config/prisma');
const { sendToAllSubscriptions } = require('../services/pushService');
const { buildRentReminderPayload } = require('./rentReminderController');
const { buildEmployeeReminderPayload } = require('./employeeReminderController');

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

/** Lets an admin fire a real push on demand, to confirm the subscription
 * actually works end-to-end. `type` picks which daily digest to preview
 * ('rent' | 'employee', defaults to 'rent'). The rent digest sends a
 * friendly placeholder when there's nothing pending, rather than silently
 * doing nothing — which looked like a broken feature when there was no
 * pending rent to report; the employee digest always has something to say,
 * so it never needs a fallback. */
const sendTestNotification = async (req, res, next) => {
  try {
    const type = req.body?.type === 'employee' ? 'employee' : 'rent';
    const payload = type === 'employee'
      ? await buildEmployeeReminderPayload()
      : (await buildRentReminderPayload()) || {
          title: 'Khodiyar Steel — Test Notification',
          body: 'Push notifications are working. You\'ll get a real reminder here whenever rent or electricity is pending.',
          url: '/rent',
          tag: 'test-notification'
        };
    const result = await sendToAllSubscriptions(payload);
    res.json({ message: 'Test notification sent', ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPublicKey, subscribe, unsubscribe, sendTestNotification };
