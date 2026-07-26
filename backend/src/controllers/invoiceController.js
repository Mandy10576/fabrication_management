const { numberToWords } = require('../utils/numberToWords');
const prisma = require('../config/prisma');

const getNextInvoiceNumber = async (req, res, next) => {
  try {
    const { financialYearId } = req.query;
    if (!financialYearId) {
      return res.status(400).json({ error: 'financialYearId is required' });
    }

    const [fy, count] = await Promise.all([
      prisma.financialYear.findUnique({
        where: { id: financialYearId },
        select: { id: true, year: true }
      }),
      prisma.invoice.count({
        where: { financialYearId }
      })
    ]);

    if (!fy) {
      return res.status(404).json({ error: 'Financial year not found' });
    }

    const nextSeq = String(count + 1).padStart(3, '0');
    const invoiceNumber = `${fy.year}/${nextSeq}`;

    res.json({ invoiceNumber, sequence: count + 1 });
  } catch (error) {
    next(error);
  }
};

const getInvoices = async (req, res, next) => {
  try {
    const { financialYearId, status, gstType, clientId, search, limit, cursor, all } = req.query;

    const where = {};
    if (financialYearId && financialYearId !== 'ALL') {
      where.financialYearId = financialYearId;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (gstType && gstType !== 'ALL') {
      where.gstType = gstType;
    }
    if (clientId) {
      where.clientId = clientId;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { client: { companyName: { contains: search } } },
        { client: { contactPerson: { contains: search } } }
      ];
    }

    const selectFields = {
      id: true,
      invoiceNumber: true,
      date: true,
      dueDate: true,
      gstType: true,
      subtotal: true,
      totalTax: true,
      grandTotal: true,
      amountReceived: true,
      balanceDue: true,
      status: true,
      createdAt: true,
      clientId: true,
      client: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          mobile: true,
          email: true,
          gstin: true
        }
      },
      financialYear: {
        select: {
          id: true,
          year: true
        }
      }
    };

    if (all === 'true') {
      const invoices = await prisma.invoice.findMany({
        where,
        select: selectFields,
        orderBy: { date: 'desc' }
      });
      return res.json(invoices);
    }

    const takeLimit = Math.min(100, parseInt(limit) || 20);
    const take = takeLimit + 1;

    const [totalCount, items] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: selectFields,
        orderBy: [{ date: 'desc' }, { id: 'desc' }]
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

const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        financialYear: true,
        items: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const company = await prisma.companyDetails.findFirst();

    res.json({ ...invoice, company });
  } catch (error) {
    next(error);
  }
};

const createInvoice = async (req, res, next) => {
  try {
    const {
      financialYearId,
      clientId,
      date,
      dueDate,
      gstType,
      gstRate = 18.0,
      discount = 0,
      amountReceived = 0,
      notes,
      terms,
      items
    } = req.body;

    if (!financialYearId || !clientId || !date || !items || !items.length) {
      return res.status(400).json({ error: 'Financial Year, Client, Date, and Items are required' });
    }

    const fy = await prisma.financialYear.findUnique({ where: { id: financialYearId } });
    if (!fy) return res.status(400).json({ error: 'Invalid financial year' });

    // Auto calculate invoice number
    const count = await prisma.invoice.count({ where: { financialYearId } });
    const nextSeq = String(count + 1).padStart(3, '0');
    const invoiceNumber = req.body.invoiceNumber || `${fy.year}/${nextSeq}`;

    // Item calculations
    let subtotal = 0;
    const processedItems = items.map(item => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amt = qty * rate;
      subtotal += amt;
      return {
        description: item.description,
        hsnSac: item.hsnSac || '9988',
        quantity: qty,
        unit: item.unit || 'sq ft',
        rate: rate,
        amount: amt
      };
    });

    const disc = parseFloat(discount) || 0;
    const taxableAmount = Math.max(0, subtotal - disc);

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let totalTax = 0;

    const ratePct = parseFloat(gstRate) || 18.0;

    if (gstType === 'CGST_SGST') {
      cgstAmount = (taxableAmount * (ratePct / 2)) / 100;
      sgstAmount = (taxableAmount * (ratePct / 2)) / 100;
      totalTax = cgstAmount + sgstAmount;
    } else if (gstType === 'IGST') {
      igstAmount = (taxableAmount * ratePct) / 100;
      totalTax = igstAmount;
    }

    const grandTotal = Math.round(taxableAmount + totalTax);
    const amtReceived = parseFloat(amountReceived) || 0;
    const balanceDue = Math.max(0, grandTotal - amtReceived);

    let status = 'UNPAID';
    if (amtReceived >= grandTotal) {
      status = 'PAID';
    } else if (amtReceived > 0) {
      status = 'PARTIAL';
    }

    const words = numberToWords(grandTotal);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        financialYearId,
        clientId,
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : null,
        gstType: gstType || 'CGST_SGST',
        gstRate: ratePct,
        subtotal,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalTax,
        discount: disc,
        grandTotal,
        amountInWords: words,
        amountReceived: amtReceived,
        balanceDue,
        status,
        notes: notes || '',
        terms: terms || '',
        items: {
          create: processedItems
        }
      },
      include: {
        client: true,
        financialYear: true,
        items: true
      }
    });

    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
};

const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      financialYearId,
      clientId,
      date,
      dueDate,
      gstType,
      gstRate = 18.0,
      discount = 0,
      amountReceived = 0,
      notes,
      terms,
      items
    } = req.body;

    let subtotal = 0;
    const processedItems = items.map(item => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amt = qty * rate;
      subtotal += amt;
      return {
        description: item.description,
        hsnSac: item.hsnSac || '9988',
        quantity: qty,
        unit: item.unit || 'sq ft',
        rate: rate,
        amount: amt
      };
    });

    const disc = parseFloat(discount) || 0;
    const taxableAmount = Math.max(0, subtotal - disc);

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let totalTax = 0;
    const ratePct = parseFloat(gstRate) || 18.0;

    if (gstType === 'CGST_SGST') {
      cgstAmount = (taxableAmount * (ratePct / 2)) / 100;
      sgstAmount = (taxableAmount * (ratePct / 2)) / 100;
      totalTax = cgstAmount + sgstAmount;
    } else if (gstType === 'IGST') {
      igstAmount = (taxableAmount * ratePct) / 100;
      totalTax = igstAmount;
    }

    const grandTotal = Math.round(taxableAmount + totalTax);
    const amtReceived = parseFloat(amountReceived) || 0;
    const balanceDue = Math.max(0, grandTotal - amtReceived);

    let status = 'UNPAID';
    if (amtReceived >= grandTotal) {
      status = 'PAID';
    } else if (amtReceived > 0) {
      status = 'PARTIAL';
    }

    const words = numberToWords(grandTotal);

    // Delete existing items & recreate
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        financialYearId,
        clientId,
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : null,
        gstType,
        gstRate: ratePct,
        subtotal,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalTax,
        discount: disc,
        grandTotal,
        amountInWords: words,
        amountReceived: amtReceived,
        balanceDue,
        status,
        notes,
        terms,
        items: {
          create: processedItems
        }
      },
      include: {
        client: true,
        financialYear: true,
        items: true
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.invoice.delete({ where: { id } });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const duplicateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const original = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!original) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const count = await prisma.invoice.count({ where: { financialYearId: original.financialYearId } });
    const fy = await prisma.financialYear.findUnique({ where: { id: original.financialYearId } });
    const nextSeq = String(count + 1).padStart(3, '0');
    const newInvoiceNumber = `${fy.year}/${nextSeq}`;

    const duplicated = await prisma.invoice.create({
      data: {
        invoiceNumber: newInvoiceNumber,
        financialYearId: original.financialYearId,
        clientId: original.clientId,
        date: new Date(),
        dueDate: original.dueDate ? new Date(original.dueDate) : null,
        gstType: original.gstType,
        gstRate: original.gstRate,
        subtotal: original.subtotal,
        cgstAmount: original.cgstAmount,
        sgstAmount: original.sgstAmount,
        igstAmount: original.igstAmount,
        totalTax: original.totalTax,
        discount: original.discount,
        grandTotal: original.grandTotal,
        amountInWords: original.amountInWords,
        amountReceived: 0,
        balanceDue: original.grandTotal,
        status: 'UNPAID',
        notes: original.notes,
        terms: original.terms,
        items: {
          create: original.items.map(item => ({
            description: item.description,
            hsnSac: item.hsnSac,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            amount: item.amount
          }))
        }
      },
      include: {
        client: true,
        financialYear: true,
        items: true
      }
    });

    res.status(201).json(duplicated);
  } catch (error) {
    next(error);
  }
};

const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amountReceived } = req.body;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const amtReceived = parseFloat(amountReceived) || 0;
    const balanceDue = Math.max(0, invoice.grandTotal - amtReceived);

    let status = 'UNPAID';
    if (amtReceived >= invoice.grandTotal) {
      status = 'PAID';
    } else if (amtReceived > 0) {
      status = 'PARTIAL';
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        amountReceived: amtReceived,
        balanceDue,
        status
      },
      include: {
        client: true,
        financialYear: true,
        items: true
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNextInvoiceNumber,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  duplicateInvoice,
  updatePaymentStatus
};
