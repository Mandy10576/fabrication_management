// Dev-only "current date" override for the Rent module, so a developer can
// manually fast-forward through rent cycles / electricity bill months on
// localhost without waiting for the real calendar to advance.
//
// Set DEV_SIMULATED_DATE=2026-09-13 in backend/.env and restart the server —
// every call to now() below then returns that calendar date (with the real
// clock's time-of-day layered on top, so timestamps still advance naturally
// within a session instead of colliding). Leave it unset to use the real
// date, which is also what happens automatically whenever NODE_ENV is
// 'production' — this override can never activate in production regardless
// of what's in the environment. Nothing here is exposed via any API
// response or the frontend; it only changes what the backend treats as
// "now" when a date isn't explicitly supplied.
const isProduction = process.env.NODE_ENV === 'production';

let simulatedDate = null;
if (!isProduction && process.env.DEV_SIMULATED_DATE) {
  const parsed = new Date(process.env.DEV_SIMULATED_DATE);
  if (isNaN(parsed.getTime())) {
    throw new Error(`DEV_SIMULATED_DATE is not a valid date: "${process.env.DEV_SIMULATED_DATE}"`);
  }
  simulatedDate = parsed;
  // eslint-disable-next-line no-console
  console.warn(
    `[dev] Rent module date simulation ACTIVE — treating "now" as ${simulatedDate.toISOString().split('T')[0]} ` +
    `(real date is ${new Date().toISOString().split('T')[0]}). Unset DEV_SIMULATED_DATE to use the real date.`
  );
}

/** The Rent module's notion of "now" — the real date unless a dev override is active. */
const now = () => {
  if (!simulatedDate) return new Date();
  const real = new Date();
  const combined = new Date(simulatedDate);
  combined.setUTCHours(real.getUTCHours(), real.getUTCMinutes(), real.getUTCSeconds(), real.getUTCMilliseconds());
  return combined;
};

module.exports = { now };
