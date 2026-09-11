jest.mock('../../src/config/prisma', () => ({}));

const { summarizeContract } = require('../../src/controllers/rentBillController');

const utc = (y, m, d) => new Date(Date.UTC(y, m, d));

const makeBill = (overrides) => ({
  id: 'bill', cycleStart: utc(2026, 0, 1), cycleEnd: utc(2026, 0, 31), dueDate: utc(2026, 1, 5),
  rentAmount: 5000, lateFeeApplied: 0, miscAmount: 0, miscLabel: null, discountAmount: 0,
  amountPaid: 0, status: 'UNPAID', forced: false,
  ...overrides
});

describe('summarizeContract', () => {
  it('returns an empty summary for a contract with no bills', () => {
    const summary = summarizeContract({ status: 'ACTIVE', bills: [] }, utc(2026, 2, 1));
    expect(summary).toEqual({ cycles: [], totalPending: 0, totalPaid: 0, currentCycle: null });
  });

  it('includes a bill whose cycle has fully ended', () => {
    const bill = makeBill({ id: 'b1' });
    const summary = summarizeContract({ status: 'ACTIVE', bills: [bill] }, utc(2026, 1, 1)); // 1 Feb, after 31 Jan
    expect(summary.cycles).toHaveLength(1);
    expect(summary.currentCycle.billId).toBe('b1');
    expect(summary.currentCycle.expected).toBe(5000);
    expect(summary.currentCycle.pending).toBe(5000);
  });

  it('excludes a bill whose cycle has not yet ended, even though the row already exists', () => {
    const bill = makeBill({ id: 'b1' });
    // "Today" is still within the bill's own cycle (31 Jan) — defensive
    // re-check must hide it regardless of the row already existing.
    const summary = summarizeContract({ status: 'ACTIVE', bills: [bill] }, utc(2026, 0, 15));
    expect(summary.cycles).toHaveLength(0);
    expect(summary.currentCycle).toBeNull();
  });

  it('includes a forced bill even mid-cycle', () => {
    const bill = makeBill({ id: 'b1', forced: true });
    const summary = summarizeContract({ status: 'ACTIVE', bills: [bill] }, utc(2026, 0, 15));
    expect(summary.cycles).toHaveLength(1);
    expect(summary.cycles[0].forced).toBe(true);
  });

  it('includes every bill for an ENDED contract regardless of cycle-end timing', () => {
    const bill = makeBill({ id: 'b1', cycleEnd: utc(2026, 5, 30) }); // cycle "ends" far in the future
    const summary = summarizeContract(
      { status: 'ENDED', endDate: utc(2026, 0, 20), bills: [bill] },
      utc(2026, 0, 25)
    );
    expect(summary.cycles).toHaveLength(1);
  });

  it('sums totalPending across multiple unpaid cycles (arrears scenario)', () => {
    // Mirrors the real Sourav/Adajan case from this session: an older
    // unpaid cycle plus a fully-paid current cycle. Total Pending must
    // reflect the arrears even though the current cycle shows PAID.
    const julyUnpaid = makeBill({
      id: 'july', cycleStart: utc(2026, 6, 17), cycleEnd: utc(2026, 7, 16),
      rentAmount: 3500, amountPaid: 0, status: 'UNPAID'
    });
    const augustPaid = makeBill({
      id: 'august', cycleStart: utc(2026, 7, 17), cycleEnd: utc(2026, 8, 16),
      rentAmount: 3500, amountPaid: 3500, status: 'PAID', forced: true
    });
    const summary = summarizeContract({ status: 'ACTIVE', bills: [julyUnpaid, augustPaid] }, utc(2026, 8, 20));

    expect(summary.totalPending).toBe(3500);
    expect(summary.currentCycle.billId).toBe('august'); // most recent cycle
    expect(summary.currentCycle.pending).toBe(0); // current cycle itself is settled
    expect(summary.cycles.find((c) => c.billId === 'july').pending).toBe(3500); // arrears sits here
  });

  it('totalPaid sums every bill\'s amountPaid, including ones filtered out of cycles', () => {
    // A not-yet-ended cycle is excluded from `cycles`, but any payment
    // already recorded against it (e.g. an advance) must still count
    // toward totalPaid — totalPaid deliberately reads from all bills, not
    // the filtered list.
    const notYetEnded = makeBill({ id: 'advance', amountPaid: 1000, cycleEnd: utc(2026, 5, 30) });
    const summary = summarizeContract({ status: 'ACTIVE', bills: [notYetEnded] }, utc(2026, 0, 15));
    expect(summary.cycles).toHaveLength(0);
    expect(summary.totalPaid).toBe(1000);
  });

  it('caps expected at 0 when discount exceeds rent + misc', () => {
    const bill = makeBill({ discountAmount: 9999, miscAmount: 0 });
    const summary = summarizeContract({ status: 'ACTIVE', bills: [bill] }, utc(2026, 1, 1));
    expect(summary.currentCycle.expected).toBe(0);
    expect(summary.currentCycle.pending).toBe(0);
  });

  it('caps pending at 0 when the tenant has overpaid', () => {
    const bill = makeBill({ amountPaid: 6000 }); // paid more than the 5000 due
    const summary = summarizeContract({ status: 'ACTIVE', bills: [bill] }, utc(2026, 1, 1));
    expect(summary.currentCycle.pending).toBe(0);
  });

  it('sorts cycles most-recent-first', () => {
    const jan = makeBill({ id: 'jan', cycleStart: utc(2026, 0, 1), cycleEnd: utc(2026, 0, 31) });
    const feb = makeBill({ id: 'feb', cycleStart: utc(2026, 1, 1), cycleEnd: utc(2026, 1, 28) });
    const mar = makeBill({ id: 'mar', cycleStart: utc(2026, 2, 1), cycleEnd: utc(2026, 2, 31) });
    const summary = summarizeContract({ status: 'ACTIVE', bills: [jan, mar, feb] }, utc(2026, 3, 15));
    expect(summary.cycles.map((c) => c.billId)).toEqual(['mar', 'feb', 'jan']);
  });
});
