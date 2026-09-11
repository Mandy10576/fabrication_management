// rentBillingService talks to the DB via ../../src/config/prisma — mocked
// here so these tests never touch a real database. Each test controls
// exactly what Prisma "returns" and asserts on exactly what it was called
// with, so the pure decision logic (which rows to write, what fee to stamp,
// what status to derive) is verified in isolation from persistence.
jest.mock('../../src/config/prisma', () => ({
  rentBill: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn()
  },
  rentContract: {
    findMany: jest.fn()
  }
}));

const prisma = require('../../src/config/prisma');
const {
  round2,
  generateBillsForContract,
  forceGenerateCurrentCycleBill,
  generateBillsForAllContracts,
  applyLateFees,
  recomputeBill
} = require('../../src/services/rentBillingService');

const utc = (y, m, d) => new Date(Date.UTC(y, m, d));
const iso = (d) => d.toISOString().slice(0, 10);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('round2', () => {
  it('rounds to 2 decimal places, avoiding classic floating-point error', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(4300 + 455 + 500)).toBe(5255);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});

describe('generateBillsForContract', () => {
  const baseContract = {
    id: 'c1',
    startDate: utc(2026, 0, 1),
    status: 'ACTIVE',
    monthlyRent: 5000,
    gracePeriodDays: 5
  };

  it('writes one row per billable cycle, with dueDate = cycleEnd + gracePeriodDays', async () => {
    prisma.rentBill.createMany.mockResolvedValue({ count: 2 });

    const result = await generateBillsForContract(baseContract, utc(2026, 2, 15)); // through 15 Mar

    expect(prisma.rentBill.createMany).toHaveBeenCalledTimes(1);
    const { data, skipDuplicates } = prisma.rentBill.createMany.mock.calls[0][0];
    expect(skipDuplicates).toBe(true);
    expect(data).toHaveLength(2);

    const jan = data.find((r) => iso(r.cycleStart) === '2026-01-01');
    expect(iso(jan.cycleEnd)).toBe('2026-01-31');
    expect(iso(jan.dueDate)).toBe('2026-02-05'); // cycleEnd + 5 days
    expect(jan.rentAmount).toBe(5000);
    expect(jan.contractId).toBe('c1');
    expect(jan.generatedBy).toBe('AUTO');

    expect(result).toEqual({ count: 2 });
  });

  it('does not call Prisma at all when nothing is billable yet', async () => {
    const result = await generateBillsForContract(baseContract, utc(2026, 0, 10)); // still inside the first cycle
    expect(prisma.rentBill.createMany).not.toHaveBeenCalled();
    expect(result).toEqual({ count: 0 });
  });

  it('bills an ended contract\'s final partial cycle', async () => {
    prisma.rentBill.createMany.mockResolvedValue({ count: 2 });
    const ended = { ...baseContract, status: 'ENDED', endDate: utc(2026, 1, 15) };

    await generateBillsForContract(ended, utc(2026, 5, 1));

    const { data } = prisma.rentBill.createMany.mock.calls[0][0];
    const feb = data.find((r) => iso(r.cycleStart) === '2026-02-01');
    expect(feb).toBeDefined();
    expect(iso(feb.cycleEnd)).toBe('2026-02-28');
  });

  it('respects a custom generatedBy label', async () => {
    prisma.rentBill.createMany.mockResolvedValue({ count: 1 });
    await generateBillsForContract(baseContract, utc(2026, 1, 1), 'MANUAL');
    const { data } = prisma.rentBill.createMany.mock.calls[0][0];
    expect(data[0].generatedBy).toBe('MANUAL');
  });
});

describe('forceGenerateCurrentCycleBill', () => {
  it('does nothing for a non-ACTIVE contract', async () => {
    const result = await forceGenerateCurrentCycleBill({ status: 'ENDED' }, utc(2026, 2, 15));
    expect(prisma.rentBill.createMany).not.toHaveBeenCalled();
    expect(result).toEqual({ count: 0 });
  });

  it('force-bills the in-progress cycle, stamped forced: true', async () => {
    prisma.rentBill.createMany.mockResolvedValue({ count: 1 });
    const contract = { id: 'c2', status: 'ACTIVE', startDate: utc(2026, 0, 1), monthlyRent: 3000, gracePeriodDays: 3 };

    await forceGenerateCurrentCycleBill(contract, utc(2026, 2, 10)); // 10 Mar — mid-cycle

    const { data, skipDuplicates } = prisma.rentBill.createMany.mock.calls[0][0];
    expect(skipDuplicates).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].forced).toBe(true);
    expect(iso(data[0].cycleStart)).toBe('2026-03-01');
    expect(iso(data[0].cycleEnd)).toBe('2026-03-31');
    expect(iso(data[0].dueDate)).toBe('2026-04-03'); // cycleEnd (31 Mar) + 3 grace days
  });
});

describe('generateBillsForAllContracts', () => {
  it('sums generated counts across every active/ended contract', async () => {
    prisma.rentContract.findMany.mockResolvedValue([
      { id: 'a', startDate: utc(2026, 0, 1), status: 'ACTIVE', monthlyRent: 1000, gracePeriodDays: 5 },
      { id: 'b', startDate: utc(2026, 0, 1), status: 'ACTIVE', monthlyRent: 2000, gracePeriodDays: 5 }
    ]);
    prisma.rentBill.createMany
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 });

    const total = await generateBillsForAllContracts(utc(2026, 2, 15));

    expect(prisma.rentContract.findMany).toHaveBeenCalledWith({
      where: { OR: [{ status: 'ACTIVE' }, { status: 'ENDED' }] }
    });
    expect(total).toBe(3);
  });

  it('returns 0 when there are no contracts to bill', async () => {
    prisma.rentContract.findMany.mockResolvedValue([]);
    const total = await generateBillsForAllContracts(utc(2026, 2, 15));
    expect(total).toBe(0);
    expect(prisma.rentBill.createMany).not.toHaveBeenCalled();
  });
});

describe('applyLateFees', () => {
  it('stamps a fixed-amount late fee onto an overdue bill', async () => {
    prisma.rentBill.findMany.mockResolvedValue([
      { id: 'b1', rentAmount: 5000, contract: { lateFeePolicy: 'FIXED_AMOUNT', lateFeeValue: 200 } }
    ]);

    const count = await applyLateFees(utc(2026, 2, 1));

    expect(prisma.rentBill.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { lateFeeApplied: 200 } });
    expect(count).toBe(1);
  });

  it('stamps a percentage-of-rent late fee, rounded to 2 decimals', async () => {
    prisma.rentBill.findMany.mockResolvedValue([
      { id: 'b2', rentAmount: 4300, contract: { lateFeePolicy: 'PERCENTAGE', lateFeeValue: 2.5 } }
    ]);

    await applyLateFees(utc(2026, 2, 1));

    expect(prisma.rentBill.update).toHaveBeenCalledWith({ where: { id: 'b2' }, data: { lateFeeApplied: 107.5 } });
  });

  it('never stamps a zero fee', async () => {
    prisma.rentBill.findMany.mockResolvedValue([
      { id: 'b3', rentAmount: 5000, contract: { lateFeePolicy: 'PERCENTAGE', lateFeeValue: 0 } }
    ]);

    const count = await applyLateFees(utc(2026, 2, 1));

    expect(prisma.rentBill.update).not.toHaveBeenCalled();
    expect(count).toBe(1); // still counted as "considered", just not fee-stamped
  });

  it('queries only unpaid/partial, not-yet-fee-stamped, overdue bills for contracts with a late fee policy', async () => {
    prisma.rentBill.findMany.mockResolvedValue([]);
    await applyLateFees(utc(2026, 2, 1));
    expect(prisma.rentBill.findMany).toHaveBeenCalledWith({
      where: {
        status: { in: ['UNPAID', 'PARTIAL'] },
        lateFeeApplied: 0,
        dueDate: { lt: utc(2026, 2, 1) },
        contract: { lateFeePolicy: { not: 'NONE' } }
      },
      include: { contract: true }
    });
  });
});

describe('recomputeBill', () => {
  const bill = (payments, overrides = {}) => ({
    id: 'bill1', rentAmount: 5000, lateFeeApplied: 0, miscAmount: 0, discountAmount: 0,
    payments, ...overrides
  });

  it('returns null when the bill does not exist', async () => {
    prisma.rentBill.findUnique.mockResolvedValue(null);
    const result = await recomputeBill('missing');
    expect(result).toBeNull();
    expect(prisma.rentBill.update).not.toHaveBeenCalled();
  });

  it('marks UNPAID when nothing has been paid', async () => {
    prisma.rentBill.findUnique.mockResolvedValue(bill([]));
    await recomputeBill('bill1');
    expect(prisma.rentBill.update).toHaveBeenCalledWith({
      where: { id: 'bill1' }, data: { amountPaid: 0, status: 'UNPAID' }
    });
  });

  it('marks PARTIAL when some but not all is paid', async () => {
    prisma.rentBill.findUnique.mockResolvedValue(bill([{ amount: 2000 }]));
    await recomputeBill('bill1');
    expect(prisma.rentBill.update).toHaveBeenCalledWith({
      where: { id: 'bill1' }, data: { amountPaid: 2000, status: 'PARTIAL' }
    });
  });

  it('marks PAID once payments reach the full amount due (rent + late fee + misc - discount)', async () => {
    prisma.rentBill.findUnique.mockResolvedValue(
      bill([{ amount: 3000 }, { amount: 2233 }], { lateFeeApplied: 200, miscAmount: 100, discountAmount: 67 })
    );
    // amountDue = 5000 + 200 + 100 - 67 = 5233
    await recomputeBill('bill1');
    expect(prisma.rentBill.update).toHaveBeenCalledWith({
      where: { id: 'bill1' }, data: { amountPaid: 5233, status: 'PAID' }
    });
  });

  it('treats an amount within the 0.01 rounding tolerance as fully PAID', async () => {
    prisma.rentBill.findUnique.mockResolvedValue(bill([{ amount: 4999.995 }]));
    await recomputeBill('bill1');
    const call = prisma.rentBill.update.mock.calls[0][0];
    expect(call.data.status).toBe('PAID');
  });

  it('sums multiple payments correctly', async () => {
    prisma.rentBill.findUnique.mockResolvedValue(bill([{ amount: 1000 }, { amount: 1500 }, { amount: 500 }]));
    await recomputeBill('bill1');
    expect(prisma.rentBill.update).toHaveBeenCalledWith({
      where: { id: 'bill1' }, data: { amountPaid: 3000, status: 'PARTIAL' }
    });
  });
});
