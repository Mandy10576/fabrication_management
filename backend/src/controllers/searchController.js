const prisma = require('../config/prisma');

const PER_GROUP_LIMIT = 5;

const like = (q) => ({ contains: q, mode: 'insensitive' });

/** Rounds to 2 decimal places and collapses floating-point noise. */
const round2 = (n) => Math.round(((n || 0) + Number.EPSILON) * 100) / 100;

/**
 * Amount queries are matched on a small window rather than exact equality so
 * that "20000" finds 20,000.00 and "666.67" finds 666.6666… without the user
 * having to type the exact stored float.
 */
const amountWindow = (value) => ({ gte: value - 0.5, lte: value + 0.5 });

const parseAmount = (q) => {
  const cleaned = q.replace(/[₹,\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
};

/**
 * Cross-module search over Clients, Invoices, Quotations, Payments, Projects,
 * Employees, Salary Payments and Advances. Deliberately spans every financial
 * year - a global lookup for "that invoice from last year" is the main reason
 * to use it, so scoping it to the selected FY would defeat the purpose.
 */
const globalSearch = async (req, res, next) => {
  try {
    const raw = (req.query.q || '').trim();
    if (raw.length < 2) {
      return res.json({ query: raw, groups: [], totalResults: 0 });
    }

    const take = Math.min(20, parseInt(req.query.limit) || PER_GROUP_LIMIT);
    const amount = parseAmount(raw);

    const orAmount = (field) => (amount === null ? [] : [{ [field]: amountWindow(amount) }]);

    const [clients, invoices, quotations, payments, projects, employees, salaryPayments, advances] =
      await Promise.all([
        prisma.client.findMany({
          where: {
            OR: [
              { companyName: like(raw) },
              { contactPerson: like(raw) },
              { mobile: like(raw) },
              { email: like(raw) },
              { gstin: like(raw) },
            ],
          },
          select: { id: true, companyName: true, contactPerson: true, mobile: true, gstin: true, state: true },
          take,
          orderBy: { companyName: 'asc' },
        }),

        prisma.invoice.findMany({
          where: {
            OR: [
              { invoiceNumber: like(raw) },
              { client: { companyName: like(raw) } },
              { client: { contactPerson: like(raw) } },
              { client: { mobile: like(raw) } },
              ...orAmount('grandTotal'),
            ],
          },
          select: {
            id: true, invoiceNumber: true, date: true, grandTotal: true,
            balanceDue: true, status: true,
            client: { select: { id: true, companyName: true } },
          },
          take,
          orderBy: { date: 'desc' },
        }),

        prisma.quotation.findMany({
          where: {
            OR: [
              { quotationNumber: like(raw) },
              { client: { companyName: like(raw) } },
              { client: { contactPerson: like(raw) } },
              ...orAmount('grandTotal'),
            ],
          },
          select: {
            id: true, quotationNumber: true, date: true, grandTotal: true, status: true,
            client: { select: { id: true, companyName: true } },
          },
          take,
          orderBy: { date: 'desc' },
        }),

        prisma.payment.findMany({
          where: {
            OR: [
              { referenceNo: like(raw) },
              { notes: like(raw) },
              { paymentMode: like(raw) },
              { invoice: { invoiceNumber: like(raw) } },
              { invoice: { client: { companyName: like(raw) } } },
              ...orAmount('amount'),
            ],
          },
          select: {
            id: true, amount: true, paymentDate: true, paymentMode: true, referenceNo: true,
            invoice: {
              select: { id: true, invoiceNumber: true, client: { select: { companyName: true } } },
            },
          },
          take,
          orderBy: { paymentDate: 'desc' },
        }),

        prisma.project.findMany({
          where: {
            OR: [
              { name: like(raw) },
              { siteAddress: like(raw) },
              { contactNumber: like(raw) },
              { client: { companyName: like(raw) } },
            ],
          },
          select: {
            id: true, name: true, siteAddress: true, status: true, startDate: true,
            client: { select: { id: true, companyName: true } },
          },
          take,
          orderBy: { startDate: 'desc' },
        }),

        prisma.employee.findMany({
          where: {
            OR: [
              { name: like(raw) },
              { mobile: like(raw) },
              { address: like(raw) },
              ...orAmount('monthlySalary'),
            ],
          },
          select: { id: true, name: true, mobile: true, monthlySalary: true, isActive: true },
          take,
          orderBy: { name: 'asc' },
        }),

        prisma.salaryPayment.findMany({
          where: {
            OR: [
              { referenceNo: like(raw) },
              { notes: like(raw) },
              { paymentMode: like(raw) },
              { employee: { name: like(raw) } },
              ...orAmount('amount'),
            ],
          },
          select: {
            id: true, amount: true, paymentDate: true, paymentMode: true, referenceNo: true,
            cycleStart: true,
            employee: { select: { id: true, name: true } },
          },
          take,
          orderBy: { paymentDate: 'desc' },
        }),

        prisma.advance.findMany({
          where: {
            OR: [
              { referenceNo: like(raw) },
              { notes: like(raw) },
              { paymentMode: like(raw) },
              { employee: { name: like(raw) } },
              ...orAmount('amount'),
            ],
          },
          select: {
            id: true, amount: true, advanceDate: true, paymentMode: true, referenceNo: true,
            employee: { select: { id: true, name: true } },
          },
          take,
          orderBy: { advanceDate: 'desc' },
        }),
      ]);

    // Related-record rollups, only for the handful of matched clients/employees.
    const clientIds = clients.map((c) => c.id);
    const employeeIds = employees.map((e) => e.id);

    const [invAgg, quoAgg, projAgg, advAgg, salAgg, attAgg] = await Promise.all([
      clientIds.length
        ? prisma.invoice.groupBy({
            by: ['clientId'],
            where: { clientId: { in: clientIds } },
            _count: { _all: true },
            _sum: { balanceDue: true, grandTotal: true },
          })
        : [],
      clientIds.length
        ? prisma.quotation.groupBy({
            by: ['clientId'],
            where: { clientId: { in: clientIds } },
            _count: { _all: true },
          })
        : [],
      clientIds.length
        ? prisma.project.groupBy({
            by: ['clientId'],
            where: { clientId: { in: clientIds } },
            _count: { _all: true },
          })
        : [],
      employeeIds.length
        ? prisma.advance.groupBy({
            by: ['employeeId'],
            where: { employeeId: { in: employeeIds } },
            _count: { _all: true },
            _sum: { amount: true },
          })
        : [],
      employeeIds.length
        ? prisma.salaryPayment.groupBy({
            by: ['employeeId'],
            where: { employeeId: { in: employeeIds } },
            _count: { _all: true },
            _sum: { amount: true },
          })
        : [],
      employeeIds.length
        ? prisma.attendance.groupBy({
            by: ['employeeId'],
            where: { employeeId: { in: employeeIds } },
            _count: { _all: true },
          })
        : [],
    ]);

    const byId = (rows, key) => new Map(rows.map((r) => [r[key], r]));
    const invByClient = byId(invAgg, 'clientId');
    const quoByClient = byId(quoAgg, 'clientId');
    const projByClient = byId(projAgg, 'clientId');
    const advByEmp = byId(advAgg, 'employeeId');
    const salByEmp = byId(salAgg, 'employeeId');
    const attByEmp = byId(attAgg, 'employeeId');

    const groups = [
      {
        key: 'clients',
        label: 'Clients',
        items: clients.map((c) => {
          const inv = invByClient.get(c.id);
          const quo = quoByClient.get(c.id);
          const proj = projByClient.get(c.id);
          return {
            id: c.id,
            type: 'client',
            title: c.companyName,
            subtitle: [c.contactPerson, c.mobile].filter(Boolean).join(' · '),
            outstanding: round2(inv?._sum?.balanceDue),
            related: {
              invoices: inv?._count?._all || 0,
              quotations: quo?._count?._all || 0,
              projects: proj?._count?._all || 0,
            },
          };
        }),
      },
      {
        key: 'invoices',
        label: 'Invoices',
        items: invoices.map((i) => ({
          id: i.id,
          type: 'invoice',
          title: i.invoiceNumber,
          subtitle: i.client?.companyName || '',
          amount: round2(i.grandTotal),
          balanceDue: round2(i.balanceDue),
          status: i.status,
          date: i.date,
        })),
      },
      {
        key: 'quotations',
        label: 'Quotations',
        items: quotations.map((q) => ({
          id: q.id,
          type: 'quotation',
          title: q.quotationNumber,
          subtitle: q.client?.companyName || '',
          amount: round2(q.grandTotal),
          status: q.status,
          date: q.date,
        })),
      },
      {
        key: 'payments',
        label: 'Payments',
        items: payments.map((p) => ({
          id: p.id,
          type: 'payment',
          invoiceId: p.invoice?.id || null,
          title: `${p.invoice?.invoiceNumber || 'Payment'} · ${p.paymentMode}`,
          subtitle: [p.invoice?.client?.companyName, p.referenceNo && `Ref ${p.referenceNo}`]
            .filter(Boolean)
            .join(' · '),
          amount: round2(p.amount),
          date: p.paymentDate,
        })),
      },
      {
        key: 'projects',
        label: 'Projects / Sites',
        items: projects.map((p) => ({
          id: p.id,
          type: 'project',
          title: p.name,
          subtitle: [p.client?.companyName, p.siteAddress].filter(Boolean).join(' · '),
          status: p.status,
          date: p.startDate,
        })),
      },
      {
        key: 'employees',
        label: 'Employees',
        items: employees.map((e) => {
          const adv = advByEmp.get(e.id);
          const sal = salByEmp.get(e.id);
          const att = attByEmp.get(e.id);
          return {
            id: e.id,
            type: 'employee',
            title: e.name,
            subtitle: e.mobile,
            amount: round2(e.monthlySalary),
            isActive: e.isActive,
            related: {
              attendanceRecords: att?._count?._all || 0,
              advances: adv?._count?._all || 0,
              advancesTotal: round2(adv?._sum?.amount),
              salaryPayments: sal?._count?._all || 0,
              salaryPaidTotal: round2(sal?._sum?.amount),
            },
          };
        }),
      },
      {
        key: 'salaryPayments',
        label: 'Salary Payments',
        items: salaryPayments.map((s) => ({
          id: s.id,
          type: 'salaryPayment',
          employeeId: s.employee?.id || null,
          title: s.employee?.name || 'Salary Payment',
          subtitle: [s.paymentMode, s.referenceNo && `Ref ${s.referenceNo}`].filter(Boolean).join(' · '),
          amount: round2(s.amount),
          date: s.paymentDate,
        })),
      },
      {
        key: 'advances',
        label: 'Advances',
        items: advances.map((a) => ({
          id: a.id,
          type: 'advance',
          employeeId: a.employee?.id || null,
          title: a.employee?.name || 'Advance',
          subtitle: [a.paymentMode, a.referenceNo && `Ref ${a.referenceNo}`].filter(Boolean).join(' · '),
          amount: round2(a.amount),
          date: a.advanceDate,
        })),
      },
    ].filter((g) => g.items.length > 0);

    const totalResults = groups.reduce((sum, g) => sum + g.items.length, 0);

    res.json({ query: raw, groups, totalResults });
  } catch (error) {
    next(error);
  }
};

module.exports = { globalSearch };
