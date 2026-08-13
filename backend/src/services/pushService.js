const webpush = require('web-push');
const prisma = require('../config/prisma');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/** Sends one push payload to every subscribed device. Subscriptions the
 * browser has dropped (410 Gone / 404) are removed automatically — that's
 * the standard signal a subscription is dead, not a transient failure. */
const sendToAllSubscriptions = async (payload) => {
  const subscriptions = await prisma.pushSubscription.findMany();
  const body = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body
      ).catch((err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          return prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
        throw err;
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - sent;
  return { targeted: subscriptions.length, sent, failed };
};

module.exports = { sendToAllSubscriptions, webpush };
