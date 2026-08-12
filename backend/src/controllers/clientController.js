const prisma = require('../config/prisma');

/**
 * Comparable form of a mobile number: digits only, and for anything longer
 * than a local 10-digit number, just the last 10. That makes
 * "+91 98765-43210", "098765 43210" and "9876543210" all compare equal.
 */
const normalizeMobile = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

/** Case/whitespace-insensitive text key, so line breaks and stray spacing in
 *  an address don't make two otherwise identical entries look different. */
const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

const DUPLICATE_SELECT = {
  id: true,
  companyName: true,
  contactPerson: true,
  mobile: true,
  email: true,
  gstin: true,
  address: true,
  state: true,
  financialYearId: true,
  financialYear: { select: { id: true, year: true } },
  _count: { select: { invoices: true, quotations: true } }
};

/**
 * Classifies how an incoming client collides with existing records.
 *
 * Only name + mobile + address all matching counts as the same client. A
 * shared mobile alone does not: real records here legitimately reuse one
 * number at different addresses (two firms run by the same owner, two schools
 * sharing a contact person), so that is reported as a warning the caller may
 * proceed past. A shared name alone is not a collision at all.
 *
 *   exactMatches  - name + mobile + address all equal -> the same client
 *   mobileMatches - same mobile, different address    -> warn, still allowed
 *   nameMatches   - same name only                    -> informational
 *
 * Matching runs in JS rather than SQL because stored values carry spacing and
 * punctuation a raw SQL compare would miss. The client table is small (one
 * business's customer list), so scanning it is cheap.
 */
const findDuplicateClients = async ({ mobile, companyName, address, excludeId }) => {
  const digits = normalizeMobile(mobile);
  const name = normalizeText(companyName);
  const addr = normalizeText(address);

  const candidates = await prisma.client.findMany({
    where: excludeId ? { NOT: { id: excludeId } } : undefined,
    select: DUPLICATE_SELECT,
    orderBy: { createdAt: 'desc' }
  });

  // Guard against absurdly short input matching half the table.
  const sameMobile = digits.length >= 6
    ? candidates.filter((c) => normalizeMobile(c.mobile) === digits)
    : [];

  const exactMatches = (name && addr)
    ? sameMobile.filter(
        (c) => normalizeText(c.companyName) === name && normalizeText(c.address) === addr
      )
    : [];

  const exactIds = new Set(exactMatches.map((c) => c.id));
  const mobileMatches = sameMobile.filter((c) => !exactIds.has(c.id));

  const seen = new Set([...exactIds, ...mobileMatches.map((c) => c.id)]);
  const nameMatches = name
    ? candidates.filter((c) => normalizeText(c.companyName) === name && !seen.has(c.id))
    : [];

  return { exactMatches, mobileMatches, nameMatches };
};

const checkDuplicateClient = async (req, res, next) => {
  try {
    const { mobile, companyName, address, excludeId } = req.query;
    const { exactMatches, mobileMatches, nameMatches } = await findDuplicateClients({
      mobile,
      companyName,
      address,
      excludeId
    });
    res.json({
      exactMatches,
      mobileMatches,
      nameMatches,
      hasExactMatch: exactMatches.length > 0,
      hasMobileMatch: mobileMatches.length > 0,
      hasNameMatch: nameMatches.length > 0
    });
  } catch (error) {
    next(error);
  }
};

const getClients = async (req, res, next) => {
  try {
    const { financialYearId, search, limit, cursor, all } = req.query;

    const where = {};
    if (financialYearId && financialYearId !== 'ALL') {
      where.financialYearId = financialYearId;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { gstin: { contains: search, mode: 'insensitive' } }
      ];
    }

    const selectFields = {
      id: true,
      companyName: true,
      contactPerson: true,
      mobile: true,
      email: true,
      gstin: true,
      pan: true,
      address: true,
      state: true,
      notes: true,
      financialYearId: true,
      createdAt: true,
      financialYear: {
        select: { id: true, year: true }
      },
      _count: {
        select: { invoices: true, quotations: true }
      }
    };

    if (all === 'true') {
      const clients = await prisma.client.findMany({
        where,
        select: selectFields,
        orderBy: { companyName: 'asc' }
      });
      return res.json(clients);
    }

    const takeLimit = Math.min(100, parseInt(limit) || 20);
    const take = takeLimit + 1;

    const [totalCount, items] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: selectFields,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
      })
    ]);

    let hasMore = false;
    let nextCursor = null;
    if (items.length > takeLimit) {
      hasMore = true;
      items.pop();
      nextCursor = items[items.length - 1]?.id || null;
    }

    res.json({ items, nextCursor, hasMore, totalCount });
  } catch (error) {
    next(error);
  }
};

const getClientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        financialYear: true,
        invoices: {
          orderBy: { date: 'desc' },
          include: { items: true }
        },
        quotations: {
          orderBy: { date: 'desc' },
          include: { items: true }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
};

/**
 * Compact cross-record snapshot for a single client: contact info, billing
 * totals (same sum-of-invoice-fields math as the client detail page), a
 * handful of recent invoices/payments/quotations, and every project/site.
 * Built for the invoice form's "Client Quick Summary" card, which only needs
 * a preview — the full lists remain the client detail page's job.
 */
const getClientSummary = async (req, res, next) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        contactPerson: true,
        mobile: true,
        email: true,
        gstin: true,
        address: true,
        state: true
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const [invoices, recentPayments, paymentCount, recentQuotations, quotationCount, projects] = await Promise.all([
      prisma.invoice.findMany({
        where: { clientId: id },
        orderBy: { date: 'desc' },
        select: {
          id: true, invoiceNumber: true, date: true,
          grandTotal: true, amountReceived: true, balanceDue: true, status: true
        }
      }),
      prisma.payment.findMany({
        where: { invoice: { clientId: id } },
        orderBy: { paymentDate: 'desc' },
        take: 5,
        select: {
          id: true, amount: true, paymentDate: true, paymentMode: true,
          invoice: { select: { invoiceNumber: true } }
        }
      }),
      prisma.payment.count({ where: { invoice: { clientId: id } } }),
      prisma.quotation.findMany({
        where: { clientId: id },
        orderBy: { date: 'desc' },
        take: 5,
        select: { id: true, quotationNumber: true, date: true, grandTotal: true, status: true }
      }),
      prisma.quotation.count({ where: { clientId: id } }),
      prisma.project.findMany({
        where: { clientId: id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, status: true, siteAddress: true, startDate: true, expectedCompletion: true }
      })
    ]);

    const totals = invoices.reduce(
      (acc, inv) => {
        acc.totalBilled += inv.grandTotal;
        acc.totalReceived += inv.amountReceived;
        acc.totalOutstanding += inv.balanceDue;
        return acc;
      },
      { totalBilled: 0, totalReceived: 0, totalOutstanding: 0 }
    );

    const lastInvoice = invoices[0] || null;
    const lastPayment = recentPayments[0] || null;
    let lastTransaction = null;
    if (lastInvoice || lastPayment) {
      const invoiceTime = lastInvoice ? new Date(lastInvoice.date).getTime() : -Infinity;
      const paymentTime = lastPayment ? new Date(lastPayment.paymentDate).getTime() : -Infinity;
      lastTransaction = paymentTime > invoiceTime
        ? { type: 'PAYMENT', date: lastPayment.paymentDate, amount: lastPayment.amount }
        : { type: 'INVOICE', date: lastInvoice.date, amount: lastInvoice.grandTotal };
    }

    res.json({
      client,
      totals,
      invoiceCount: invoices.length,
      recentInvoices: invoices.slice(0, 5),
      paymentCount,
      recentPayments,
      quotationCount,
      recentQuotations,
      projects,
      lastTransaction
    });
  } catch (error) {
    next(error);
  }
};

const createClient = async (req, res, next) => {
  try {
    const { companyName, contactPerson, mobile, email, gstin, pan, address, state, notes, financialYearId, confirmDuplicate } = req.body;

    if (!companyName || !mobile || !address || !financialYearId) {
      return res.status(400).json({ error: 'Company Name, Mobile, Address, and Financial Year are required' });
    }

    // Only an identical name + mobile + address is the same client; that is
    // refused by default so the API is safe on its own, while confirmDuplicate
    // lets the caller override. A shared mobile at a different address is a
    // legitimate separate client and is never blocked here.
    if (!confirmDuplicate) {
      const { exactMatches } = await findDuplicateClients({ mobile, companyName, address });
      if (exactMatches.length > 0) {
        return res.status(409).json({
          error: `${exactMatches[0].companyName} already exists with the same mobile number and address.`,
          code: 'DUPLICATE_CLIENT',
          existingClients: exactMatches
        });
      }
    }

    const client = await prisma.client.create({
      data: {
        companyName,
        contactPerson: contactPerson || '',
        mobile,
        email: email || '',
        gstin: gstin || '',
        pan: pan || '',
        address,
        state: state || '',
        notes: notes || '',
        financialYearId
      },
      include: { financialYear: true }
    });

    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyName, contactPerson, mobile, email, gstin, pan, address, state, notes, financialYearId, confirmDuplicate } = req.body;

    // Same rule as create, ignoring this client's own record.
    if (!confirmDuplicate) {
      const { exactMatches } = await findDuplicateClients({ mobile, companyName, address, excludeId: id });
      if (exactMatches.length > 0) {
        return res.status(409).json({
          error: `Another client (${exactMatches[0].companyName}) already has this same name, mobile number and address.`,
          code: 'DUPLICATE_CLIENT',
          existingClients: exactMatches
        });
      }
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        companyName,
        contactPerson: contactPerson || '',
        mobile,
        email,
        gstin,
        pan,
        address,
        state,
        notes,
        financialYearId
      },
      include: { financialYear: true }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { invoices: true, quotations: true, projects: true } } }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Client not found or already deleted' });
    }

    if (existing._count?.invoices > 0 || existing._count?.quotations > 0 || existing._count?.projects > 0) {
      return res.status(400).json({
        error: `Cannot delete '${existing.companyName}' because they have ${existing._count.invoices} invoice(s), ${existing._count.quotations} quotation(s), and ${existing._count.projects} project(s) linked.`
      });
    }

    await prisma.client.delete({ where: { id } });
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getClients, getClientById, getClientSummary, createClient, updateClient, deleteClient, checkDuplicateClient };
