const { normalizeToUTCMidnight, getBusinessToday, addDaysUTC } = require('../utils/dateCalc');
const { computeAttendanceForRange, summarizeDays } = require('./attendanceService');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Rounds to 2 decimal places (rupees/paise) and collapses floating-point noise like 3.6e-12. */
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Computes a full salary breakdown for one cycle. Salary is never stored —
 * it's always derived fresh from Employee + Attendance + Advance, except for
 * the actual SalaryPayment rows recording money paid out.
 */
async function computeCycleSummary(prisma, employee, cycleStart, cycleEnd) {
  const today = getBusinessToday();
  const joiningDate = normalizeToUTCMidnight(employee.joiningDate);

  const totalDaysInCycle = Math.round((cycleEnd.getTime() - cycleStart.getTime()) / MS_PER_DAY) + 1;
  const isCycleComplete = cycleEnd.getTime() <= today.getTime();
  const computedThrough = isCycleComplete ? cycleEnd : today;
  const knownWindowEnd = cycleEnd.getTime() < today.getTime() ? cycleEnd : today;

  const knownDays = knownWindowEnd.getTime() >= cycleStart.getTime()
    ? await computeAttendanceForRange(prisma, employee, cycleStart, knownWindowEnd)
    : [];
  const holidayCount = knownDays.filter((d) => d.status === 'HOLIDAY').length;

  const employableStart = cycleStart.getTime() > joiningDate.getTime() ? cycleStart : joiningDate;
  const earnableDays = knownDays.filter((d) => d.date.getTime() >= employableStart.getTime());
  const counts = summarizeDays(earnableDays);

  let perDayRate = 0;
  let earned = 0;
  let workingDaysInCycle = null;

  if (employee.deductionBasis === 'WORKING_DAYS') {
    workingDaysInCycle = Math.max(0, totalDaysInCycle - holidayCount);
    perDayRate = workingDaysInCycle > 0 ? employee.monthlySalary / workingDaysInCycle : 0;
    earned = perDayRate * (counts.present + counts.paidLeave);
  } else {
    perDayRate = totalDaysInCycle > 0 ? employee.monthlySalary / totalDaysInCycle : 0;
    earned = perDayRate * (counts.present + counts.paidLeave + counts.holiday);
  }

  const advanceAgg = await prisma.advance.aggregate({
    where: { employeeId: employee.id, advanceDate: { gte: cycleStart, lt: addDaysUTC(cycleEnd, 1) } },
    _sum: { amount: true },
  });
  const advancesInCycle = advanceAgg._sum.amount || 0;

  const netPayable = round2(earned - advancesInCycle);
  const payableDisplay = Math.max(0, netPayable);
  const excessAdvance = netPayable < 0 ? round2(-netPayable) : 0;

  const paymentAgg = await prisma.salaryPayment.aggregate({
    where: { employeeId: employee.id, cycleStart },
    _sum: { amount: true },
  });
  const paidSoFar = round2(paymentAgg._sum.amount || 0);
  const balance = round2(netPayable - paidSoFar);

  let status = 'UNPAID';
  if (paidSoFar > 0 && balance <= 0) status = 'PAID';
  else if (paidSoFar > 0) status = 'PARTIAL';

  return {
    cycleStart,
    cycleEnd,
    totalDaysInCycle,
    workingDaysInCycle,
    deductionBasis: employee.deductionBasis,
    perDayRate: round2(perDayRate),
    counts,
    earned: round2(earned),
    advancesInCycle: round2(advancesInCycle),
    netPayable,
    payableDisplay,
    excessAdvance,
    paidSoFar,
    balance,
    status,
    isOverpaid: balance < 0,
    isCycleComplete,
    computedThrough,
  };
}

module.exports = { computeCycleSummary };
