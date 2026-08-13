// Browser push notifications for Rent due/overdue reminders. No backend
// change needed to add more notification types later — this file is purely
// the browser-side plumbing (service worker registration + subscription).
import { api } from './api';

export const isPushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

// Push requires HTTPS (or literally "localhost") — a plain LAN IP over
// http, e.g. when testing from a phone at http://192.168.x.x:5173, is NOT
// a secure context, so the browser hides serviceWorker/PushManager
// entirely and isPushSupported() comes back false. Surfaced separately so
// the UI can explain *why* instead of just disappearing.
export const isSecureContext = () => typeof window !== 'undefined' && window.isSecureContext === true;

// Web Push requires the VAPID key as a Uint8Array, but the backend hands it
// over as a URL-safe base64 string — this is the standard conversion.
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

/** Current state without prompting the user — used to render the right
 * button state on page load. */
export const getPushStatus = async () => {
  if (!isPushSupported()) {
    return { supported: false, secure: isSecureContext(), permission: 'unsupported', subscribed: false };
  }

  const permission = Notification.permission; // 'default' | 'granted' | 'denied'
  if (permission !== 'granted') return { supported: true, permission, subscribed: false };

  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  return { supported: true, permission, subscribed: !!subscription };
};

/** Registers the service worker, asks permission, subscribes, and sends the
 * subscription to the backend — the full "Enable Notifications" flow. */
export const enablePushNotifications = async () => {
  if (!isPushSupported()) throw new Error('Push notifications are not supported in this browser.');

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied' ? 'Notifications were blocked. Enable them in your browser settings to turn this on.' : 'Notification permission was not granted.');
  }

  const { publicKey } = await api.get('/push/vapid-public-key');
  if (!publicKey) throw new Error('Push notifications are not configured on the server.');

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }

  const json = subscription.toJSON();
  await api.post('/push/subscribe', { endpoint: json.endpoint, keys: json.keys });
  return true;
};

export const disablePushNotifications = async () => {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.post('/push/unsubscribe', { endpoint }).catch(() => {});
};

export const sendTestNotification = (type = 'rent') => api.post('/push/test', { type });
