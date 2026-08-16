// Rent-cycle boundary math — a deliberate parallel implementation of
// cycleService.js's day-of-month cycle logic, kept separate from the
// employee-payroll domain so this module can't regress Salary. Takes a
// plain cycleStartDay (1-31) + anchorDate instead of an Employee row.
const { normalizeToUTCMidnight, clampDayToMonth, addDaysUTC } = require('../utils/dateCalc');

/** Shifts (year, monthIndex) by `delta` months, wrapping the year. */
function shiftMonthIndex(year, monthIndex, delta) {
  const total = monthIndex + delta;
  const newYear = year + Math.floor(total / 12);
  const newMonthIndex = ((total % 12) + 12) % 12;
  return { year: newYear, monthIndex: newMonthIndex };
}

/**
 * The cycle-start date for a specific (year, monthIndex), given the fixed
 * start-day. Always derived from the ORIGINAL start day — never chained off
 * another month's already-clamped date, which would compound drift (e.g. a
 * startDay=31 clamped to Feb 28 must not become the basis for March's date).
 */
function cycleStartForMonth(startDay, year, monthIndex) {
  const day = clampDayToMonth(year, monthIndex, startDay);
  return new Date(Date.UTC(year, monthIndex, day));
}

/**
 * Resolves which rent cycle a given date falls into, for a tenancy whose
 * rent cycle starts on `cycleStartDay` (1-31, clamped to shorter months —
 * derived from the tenant's actual move-in date). e.g. a tenant who joined
 * on the 12th has cycles running 12th of month M through the 11th of M+1.
 */
function getCycleForDate(cycleStartDay, referenceDate) {
  const ref = normalizeToUTCMidnight(referenceDate);
  const startDay = cycleStartDay || 1;

  const thisMonthStart = cycleStartForMonth(startDay, ref.getUTCFullYear(), ref.getUTCMonth());

  let cycleStartYear = ref.getUTCFullYear();
  let cycleStartMonthIndex = ref.getUTCMonth();
  if (ref.getTime() < thisMonthStart.getTime()) {
    ({ year: cycleStartYear, monthIndex: cycleStartMonthIndex } = shiftMonthIndex(cycleStartYear, cycleStartMonthIndex, -1));
  }

  const cycleStart = cycleStartForMonth(startDay, cycleStartYear, cycleStartMonthIndex);
  const next = shiftMonthIndex(cycleStartYear, cycleStartMonthIndex, 1);
  const nextCycleStart = cycleStartForMonth(startDay, next.year, next.monthIndex);
  const cycleEnd = addDaysUTC(nextCycleStart, -1);

  return { cycleStart, cycleEnd };
}

/**
 * All cycles from the tenancy's first cycle (containing startDate) through
 * the one containing throughDate, most recent first. cycleStartDay is
 * derived from startDate's own day-of-month, so the tenancy's very first
 * cycle always begins exactly on startDate.
 */
function listCyclesSince(startDate, throughDate) {
  const anchor = normalizeToUTCMidnight(startDate);
  const cycleStartDay = anchor.getUTCDate();

  const { cycleStart: firstCycleStart } = getCycleForDate(cycleStartDay, anchor);
  const { cycleStart: lastCycleStart } = getCycleForDate(cycleStartDay, throughDate);

  const cycles = [];
  let year = firstCycleStart.getUTCFullYear();
  let monthIndex = firstCycleStart.getUTCMonth();
  let cursor = firstCycleStart;

  while (cursor.getTime() <= lastCycleStart.getTime()) {
    const next = shiftMonthIndex(year, monthIndex, 1);
    const nextStart = cycleStartForMonth(cycleStartDay, next.year, next.monthIndex);
    const cycleEnd = addDaysUTC(nextStart, -1);
    cycles.push({ cycleStart: cursor, cycleEnd });
    year = next.year;
    monthIndex = next.monthIndex;
    cursor = nextStart;
  }

  return cycles.reverse();
}

/**
 * The single source of truth for "which cycles are billable right now" — a
 * cycle only becomes billable once it has fully ended, so a still-in-progress
 * cycle is excluded for an active tenancy/contract. An ended tenancy's final
 * (possibly partial) cycle is billed immediately at `endDate`, since it will
 * never "finish" on the calendar. Used identically by bill generation and by
 * anything summarizing what's owed — must stay the only place this predicate
 * is expressed, so the two can never drift apart.
 */
function listBillableCycles(startDate, endDate, throughDate) {
  const ended = Boolean(endDate);
  const through = ended ? endDate : throughDate;
  const throughDay = normalizeToUTCMidnight(through);

  return listCyclesSince(startDate, through)
    .filter((c) => ended || c.cycleEnd.getTime() < throughDay.getTime());
}

module.exports = { getCycleForDate, listCyclesSince, listBillableCycles };
