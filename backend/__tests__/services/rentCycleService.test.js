const { getCycleForDate, listCyclesSince, listBillableCycles } = require('../../src/services/rentCycleService');

const iso = (d) => d.toISOString().slice(0, 10);
const utc = (y, m, d) => new Date(Date.UTC(y, m, d));

describe('getCycleForDate', () => {
  it('resolves a reference date to the cycle it falls inside (mid-cycle)', () => {
    // Tenant started on the 12th — a cycle runs 12th of month M through the
    // 11th of M+1.
    const { cycleStart, cycleEnd } = getCycleForDate(12, utc(2026, 7, 20)); // 20 Aug
    expect(iso(cycleStart)).toBe('2026-08-12');
    expect(iso(cycleEnd)).toBe('2026-09-11');
  });

  it('resolves a reference date that falls before this month\'s start day into the previous cycle', () => {
    const { cycleStart, cycleEnd } = getCycleForDate(12, utc(2026, 7, 5)); // 5 Aug, before the 12th
    expect(iso(cycleStart)).toBe('2026-07-12');
    expect(iso(cycleEnd)).toBe('2026-08-11');
  });

  it('resolves the reference date landing exactly on the start day', () => {
    const { cycleStart, cycleEnd } = getCycleForDate(12, utc(2026, 7, 12));
    expect(iso(cycleStart)).toBe('2026-08-12');
    expect(iso(cycleEnd)).toBe('2026-09-11');
  });

  it('clamps a start day of 31 in a 30-day month instead of overflowing', () => {
    // Tenant started on the 31st. 15 Apr falls before April's clamped start
    // (the 30th), so it belongs to the PRIOR cycle: March 31 - April 29 —
    // the clamped April date is the cycle's END here, not its start.
    const { cycleStart, cycleEnd } = getCycleForDate(31, utc(2026, 3, 15)); // 15 Apr
    expect(iso(cycleStart)).toBe('2026-03-31');
    expect(iso(cycleEnd)).toBe('2026-04-29');
  });

  it('clamps a start day of 31 correctly across a non-leap February', () => {
    // 20 Feb 2026 falls before Feb's clamped start (the 28th), so it's
    // still in the cycle that started Jan 31.
    const { cycleStart, cycleEnd } = getCycleForDate(31, utc(2026, 1, 20)); // 20 Feb 2026 (non-leap)
    expect(iso(cycleStart)).toBe('2026-01-31');
    expect(iso(cycleEnd)).toBe('2026-02-27');
  });

  it('clamps a start day of 31 correctly across a leap February', () => {
    const { cycleStart, cycleEnd } = getCycleForDate(31, utc(2028, 1, 20)); // 20 Feb 2028 (leap)
    expect(iso(cycleStart)).toBe('2028-01-31');
    expect(iso(cycleEnd)).toBe('2028-02-28');
  });

  it('wraps the year correctly when the reference date is in January and cycle started in December', () => {
    const { cycleStart, cycleEnd } = getCycleForDate(20, utc(2027, 0, 5)); // 5 Jan 2027, before the 20th
    expect(iso(cycleStart)).toBe('2026-12-20');
    expect(iso(cycleEnd)).toBe('2027-01-19');
  });

  it('defaults to day 1 when no cycleStartDay is given', () => {
    const { cycleStart, cycleEnd } = getCycleForDate(null, utc(2026, 5, 15));
    expect(iso(cycleStart)).toBe('2026-06-01');
    expect(iso(cycleEnd)).toBe('2026-06-30');
  });
});

describe('listCyclesSince', () => {
  it('lists every cycle from the tenancy start through the reference date, most recent first', () => {
    const cycles = listCyclesSince(utc(2026, 0, 15), utc(2026, 3, 20)); // started 15 Jan, through 20 Apr
    expect(cycles.map((c) => iso(c.cycleStart))).toEqual([
      '2026-04-15', '2026-03-15', '2026-02-15', '2026-01-15'
    ]);
    // Every cycleEnd is exactly one day before the next cycle's start.
    expect(iso(cycles[3].cycleEnd)).toBe('2026-02-14');
    expect(iso(cycles[0].cycleEnd)).toBe('2026-05-14');
  });

  it('returns a single cycle when the reference date is within the first cycle', () => {
    const cycles = listCyclesSince(utc(2026, 0, 15), utc(2026, 0, 25));
    expect(cycles).toHaveLength(1);
    expect(iso(cycles[0].cycleStart)).toBe('2026-01-15');
  });

  it('keeps a day-31 anchor clamped consistently across every listed cycle', () => {
    const cycles = listCyclesSince(utc(2026, 0, 31), utc(2026, 3, 15)); // started 31 Jan, through 15 Apr
    // Jan(31) -> Feb(28, clamped) -> Mar(31) -> Apr(30, clamped) — each
    // derived independently from day 31, never compounding drift.
    expect(cycles.map((c) => iso(c.cycleStart)).reverse()).toEqual([
      '2026-01-31', '2026-02-28', '2026-03-31'
    ]);
  });
});

describe('listBillableCycles', () => {
  it('excludes the still-in-progress current cycle for an active contract', () => {
    // Started 1 Jan; "today" is 15 Mar, so the Mar 1-31 cycle hasn't ended.
    const cycles = listBillableCycles(utc(2026, 0, 1), null, utc(2026, 2, 15));
    expect(cycles.map((c) => iso(c.cycleStart))).toEqual(['2026-02-01', '2026-01-01']);
  });

  it('includes a cycle the instant it has fully ended (day after cycleEnd)', () => {
    // Cycle Jan 1-31 ends 31 Jan; the day after (1 Feb) it becomes billable.
    const cycles = listBillableCycles(utc(2026, 0, 1), null, utc(2026, 1, 1));
    expect(cycles.map((c) => iso(c.cycleStart))).toEqual(['2026-01-01']);
  });

  it('does not yet include a cycle on its very last day', () => {
    const cycles = listBillableCycles(utc(2026, 0, 1), null, utc(2026, 0, 31));
    expect(cycles).toHaveLength(0);
  });

  it('bills an ended contract\'s final (possibly partial) cycle immediately, even mid-cycle', () => {
    // Contract started 1 Jan, ended 15 Feb (mid-cycle) — that partial final
    // cycle must still be billable, since it will never "finish" naturally.
    const cycles = listBillableCycles(utc(2026, 0, 1), utc(2026, 1, 15), utc(2026, 1, 16));
    expect(cycles.map((c) => iso(c.cycleStart))).toEqual(['2026-02-01', '2026-01-01']);
    expect(iso(cycles[0].cycleEnd)).toBe('2026-02-28');
  });

  it('returns nothing for a brand-new contract still inside its first cycle', () => {
    const cycles = listBillableCycles(utc(2026, 5, 1), null, utc(2026, 5, 10));
    expect(cycles).toHaveLength(0);
  });
});
