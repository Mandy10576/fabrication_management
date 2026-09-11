const {
  normalizeToUTCMidnight,
  daysInMonth,
  clampDayToMonth,
  addDaysUTC,
  getBusinessToday
} = require('../../src/utils/dateCalc');

describe('normalizeToUTCMidnight', () => {
  it('strips the time-of-day from a Date object', () => {
    const d = new Date(Date.UTC(2026, 5, 15, 23, 59, 59));
    const result = normalizeToUTCMidnight(d);
    expect(result.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });

  it('accepts a date string', () => {
    const result = normalizeToUTCMidnight('2026-03-01T18:30:00.000Z');
    expect(result.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });
});

describe('daysInMonth', () => {
  it('returns 31 for January', () => {
    expect(daysInMonth(2026, 0)).toBe(31);
  });

  it('returns 28 for February in a non-leap year', () => {
    expect(daysInMonth(2026, 1)).toBe(28);
  });

  it('returns 29 for February in a leap year', () => {
    expect(daysInMonth(2028, 1)).toBe(29);
  });

  it('returns 30 for April', () => {
    expect(daysInMonth(2026, 3)).toBe(30);
  });
});

describe('clampDayToMonth', () => {
  it('leaves an in-range day untouched', () => {
    expect(clampDayToMonth(2026, 0, 15)).toBe(15);
  });

  it('clamps day 31 down to 28 in a non-leap February', () => {
    expect(clampDayToMonth(2026, 1, 31)).toBe(28);
  });

  it('clamps day 31 down to 29 in a leap February', () => {
    expect(clampDayToMonth(2028, 1, 31)).toBe(29);
  });

  it('clamps day 31 down to 30 in April', () => {
    expect(clampDayToMonth(2026, 3, 31)).toBe(30);
  });
});

describe('addDaysUTC', () => {
  it('adds days within the same month', () => {
    const result = addDaysUTC(new Date(Date.UTC(2026, 0, 1)), 5);
    expect(result.toISOString()).toBe('2026-01-06T00:00:00.000Z');
  });

  it('rolls over into the next month', () => {
    const result = addDaysUTC(new Date(Date.UTC(2026, 0, 30)), 5);
    expect(result.toISOString()).toBe('2026-02-04T00:00:00.000Z');
  });

  it('rolls over into the next year', () => {
    const result = addDaysUTC(new Date(Date.UTC(2026, 11, 30)), 5);
    expect(result.toISOString()).toBe('2027-01-04T00:00:00.000Z');
  });

  it('subtracts days when given a negative count', () => {
    const result = addDaysUTC(new Date(Date.UTC(2026, 2, 1)), -1);
    expect(result.toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });
});

describe('getBusinessToday', () => {
  it('shifts a UTC time into IST before taking the date', () => {
    // 2026-06-14 19:00 UTC is 2026-06-15 00:30 IST — the business day has
    // already rolled over even though the UTC calendar date has not.
    jest.useFakeTimers().setSystemTime(new Date('2026-06-14T19:00:00.000Z'));
    const result = getBusinessToday();
    expect(result.toISOString()).toBe('2026-06-15T00:00:00.000Z');
    jest.useRealTimers();
  });

  it('does not roll over for a UTC time still within the same IST day', () => {
    // 2026-06-14 10:00 UTC is 2026-06-14 15:30 IST — same day both ways.
    jest.useFakeTimers().setSystemTime(new Date('2026-06-14T10:00:00.000Z'));
    const result = getBusinessToday();
    expect(result.toISOString()).toBe('2026-06-14T00:00:00.000Z');
    jest.useRealTimers();
  });
});
