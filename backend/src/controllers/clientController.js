const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getClients = async (req, res, next) => {
  try {
    const { financialYearId, search } = req.query;

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

    const clients = await prisma.client.findMany({
      where,
      include: {
        financialYear: true,
        _count: {
          select: { invoices: true, quotations: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(clients);
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

    if (!companyName || !contactPerson || !mobile || !address || !financialYearId) {
      return res.status(400).json({ error: 'Company Name, Contact Person, Mobile, Address, and Financial Year are required' });
    }

    const client = await prisma.client.create({
      data: {
        companyName,
        contactPerson,
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
        contactPerson,
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
    await prisma.client.delete({ where: { id } });
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getClients, getClientById, createClient, updateClient, deleteClient };
