const { normalizeToUTCMidnight, clampDayToMonth, addDaysUTC } = require('../utils/dateCalc');

/** Shifts (year, monthIndex) by `delta` months, wrapping the year. */
function shiftMonthIndex(year, monthIndex, delta) {
  const total = monthIndex + delta;
  const newYear = year + Math.floor(total / 12);
  const newMonthIndex = ((total % 12) + 12) % 12;
  return { year: newYear, monthIndex: newMonthIndex };
}

/**
 * The cycle-start date for a specific (year, monthIndex), given the
 * employee's fixed start-day. Always derived from the ORIGINAL start day —
 * never chained off another month's already-clamped date, which would
 * compound drift (e.g. a startDay=31 clamped to Feb 28 must not become the
 * basis for March's date, or March would wrongly clamp from 28 instead of 31).
 */
function cycleStartForMonth(startDay, year, monthIndex) {
  const day = clampDayToMonth(year, monthIndex, startDay);
  return new Date(Date.UTC(year, monthIndex, day));
}

/**
 * Resolves which salary cycle a given date falls into, for an employee with
 * their own `salaryCycleStartDay` (1-31, clamped to shorter months).
 * e.g. startDay=7 -> cycle runs 7th of month M through the 6th of month M+1.
 */
function getCycleForDate(employee, referenceDate) {
  const ref = normalizeToUTCMidnight(referenceDate);
  const startDay = employee.salaryCycleStartDay || 1;

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

/** All cycles from the employee's first cycle (containing joiningDate) through the one containing throughDate, most recent first. */
function listAvailableCycles(employee, throughDate) {
  const startDay = employee.salaryCycleStartDay || 1;
  const { cycleStart: firstCycleStart } = getCycleForDate(employee, employee.joiningDate);
  const { cycleStart: lastCycleStart } = getCycleForDate(employee, throughDate);

  const cycles = [];
  let year = firstCycleStart.getUTCFullYear();
  let monthIndex = firstCycleStart.getUTCMonth();
  let cursor = firstCycleStart;

  while (cursor.getTime() <= lastCycleStart.getTime()) {
    const next = shiftMonthIndex(year, monthIndex, 1);
    const nextStart = cycleStartForMonth(startDay, next.year, next.monthIndex);
    const cycleEnd = addDaysUTC(nextStart, -1);
    cycles.push({ cycleStart: cursor, cycleEnd });
    year = next.year;
    monthIndex = next.monthIndex;
    cursor = nextStart;
  }

  return cycles.reverse();
}

module.exports = { getCycleForDate, listAvailableCycles };
