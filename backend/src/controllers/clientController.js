const prisma = require('../config/prisma');

const getClients = async (req, res, next) => {
  try {
    const { financialYearId, search, limit, cursor, all } = req.query;

    const where = {};
    if (financialYearId && financialYearId !== 'ALL') {
      where.financialYearId = financialYearId;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactPerson: { contains: search } },
        { mobile: { contains: search } },
        { email: { contains: search } },
        { gstin: { contains: search } }
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

const createClient = async (req, res, next) => {
  try {
    const { companyName, contactPerson, mobile, email, gstin, pan, address, notes, financialYearId } = req.body;

    if (!companyName || !mobile || !address || !financialYearId) {
      return res.status(400).json({ error: 'Company Name, Mobile, Address, and Financial Year are required' });
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
    const { companyName, contactPerson, mobile, email, gstin, pan, address, notes, financialYearId } = req.body;

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

module.exports = { getClients, getClientById, createClient, updateClient, deleteClient };
