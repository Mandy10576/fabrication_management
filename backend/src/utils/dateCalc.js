const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Normalizes any date-like value to a UTC-midnight Date (strips time-of-day). */
function normalizeToUTCMidnight(dateLike) {
  const d = new Date(dateLike);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * "Today" in IST, as a UTC-midnight Date. The server runs in UTC (Vercel) but
 * the business is IST — without this, attendance/salary "today" boundaries
 * would drift by up to 5.5 hours between what the client and server consider
 * the current day.
 */
function getBusinessToday() {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));
}

/** Days in a given UTC month (0-indexed month). */
function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Clamps a target day-of-month to the last valid day of that month (e.g. 31 in Feb -> 28/29). */
function clampDayToMonth(year, monthIndex, day) {
  return Math.min(day, daysInMonth(year, monthIndex));
}

function addDaysUTC(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

module.exports = {
  normalizeToUTCMidnight,
  getBusinessToday,
  daysInMonth,
  clampDayToMonth,
  addDaysUTC,
};
