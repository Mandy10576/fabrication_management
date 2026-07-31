const { numberToWords } = require('../utils/numberToWords');
const prisma = require('../config/prisma');

const getNextQuotationNumber = async (req, res, next) => {
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
      prisma.quotation.count({
        where: { financialYearId }
      })
    ]);

    if (!fy) {
      return res.status(404).json({ error: 'Financial year not found' });
    }

    const nextSeq = String(count + 1).padStart(3, '0');
    const quotationNumber = `QT-${fy.year}/${nextSeq}`;

    res.json({ quotationNumber, sequence: count + 1 });
  } catch (error) {
    next(error);
  }
};

const getQuotations = async (req, res, next) => {
  try {
    const { financialYearId, status, clientId, search, limit, cursor, all } = req.query;

    const where = {};
    if (financialYearId && financialYearId !== 'ALL') {
      where.financialYearId = financialYearId;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (clientId) {
      where.clientId = clientId;
    }

    if (search) {
      where.OR = [
        { quotationNumber: { contains: search } },
        { client: { companyName: { contains: search } } }
      ];
    }

    const selectFields = {
      id: true,
      quotationNumber: true,
      date: true,
      validUntil: true,
      gstType: true,
      gstRate: true,
      subtotal: true,
      taxAmount: true,
      discount: true,
      grandTotal: true,
      status: true,
      notes: true,
      terms: true,
      createdAt: true,
      clientId: true,
      client: true,
      financialYear: true,
      items: true
    };

    if (all === 'true') {
      const quotations = await prisma.quotation.findMany({
        where,
        select: selectFields,
        orderBy: { date: 'desc' }
      });
      return res.json(quotations);
    }

    const takeLimit = Math.min(100, parseInt(limit) || 20);
    const take = takeLimit + 1;

    const items = await prisma.quotation.findMany({
      where,
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: selectFields,
      orderBy: [{ date: 'desc' }, { id: 'desc' }]
    });

    let hasMore = false;
    let nextCursor = null;
    if (items.length > takeLimit) {
      hasMore = true;
      items.pop();
      nextCursor = items[items.length - 1]?.id || null;
    }

    res.json({ items, nextCursor, hasMore });
  } catch (error) {
    next(error);
  }
};

const getQuotationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        client: true,
        financialYear: true,
        items: true
      }
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const company = await prisma.companyDetails.findFirst();
    res.json({ ...quotation, company });
  } catch (error) {
    next(error);
  }
};

const createQuotation = async (req, res, next) => {
  try {
    const {
      financialYearId,
      clientId,
      date,
      validUntil,
      gstType = 'CGST_SGST',
      gstRate = 18.0,
      discount = 0,
      notes,
      terms,
      items
    } = req.body;

    const fy = await prisma.financialYear.findUnique({ where: { id: financialYearId } });
    if (!fy) return res.status(400).json({ error: 'Invalid financial year' });

    let quotationNumber = req.body.quotationNumber;
    if (!quotationNumber) {
      const count = await prisma.quotation.count({ where: { financialYearId } });
      const nextSeq = String(count + 1).padStart(3, '0');
      quotationNumber = `QT-${fy.year}/${nextSeq}`;
    } else {
      const existingQ = await prisma.quotation.findFirst({
        where: { quotationNumber, financialYearId }
      });
      if (existingQ) {
        const count = await prisma.quotation.count({ where: { financialYearId } });
        const nextSeq = String(count + 1).padStart(3, '0');
        quotationNumber = `QT-${fy.year}/${nextSeq}`;
      }
    }

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

    let taxAmount = 0;
    const ratePct = parseFloat(gstRate) || 18.0;
    if (gstType !== 'NON_GST') {
      taxAmount = (taxableAmount * ratePct) / 100;
    }

    const grandTotal = Math.round(taxableAmount + taxAmount);

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        financialYearId,
        clientId,
        date: new Date(date),
        validUntil: validUntil ? new Date(validUntil) : null,
        gstType,
        gstRate: ratePct,
        subtotal,
        taxAmount,
        discount: disc,
        grandTotal,
        status: 'PENDING',
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

    res.status(201).json(quotation);
  } catch (error) {
    next(error);
  }
};

const convertToInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const fy = await prisma.financialYear.findUnique({ where: { id: quotation.financialYearId } });
    const count = await prisma.invoice.count({ where: { financialYearId: quotation.financialYearId } });
    const nextSeq = String(count + 1).padStart(3, '0');
    const invoiceNumber = `${fy.year}/${nextSeq}`;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    const taxableAmount = Math.max(0, quotation.subtotal - quotation.discount);

    if (quotation.gstType === 'CGST_SGST') {
      cgstAmount = (taxableAmount * (quotation.gstRate / 2)) / 100;
      sgstAmount = (taxableAmount * (quotation.gstRate / 2)) / 100;
    } else if (quotation.gstType === 'IGST') {
      igstAmount = (taxableAmount * quotation.gstRate) / 100;
    }

    const grandTotal = Math.round(taxableAmount + quotation.taxAmount);
    const words = numberToWords(grandTotal);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        financialYearId: quotation.financialYearId,
        clientId: quotation.clientId,
        date: new Date(),
        dueDate: null,
        gstType: quotation.gstType,
        gstRate: quotation.gstRate,
        subtotal: quotation.subtotal,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalTax: quotation.taxAmount,
        discount: quotation.discount,
        grandTotal,
        amountInWords: words,
        amountReceived: 0,
        balanceDue: grandTotal,
        status: 'UNPAID',
        notes: `Converted from Quotation #${quotation.quotationNumber}. ${quotation.notes || ''}`,
        terms: quotation.terms,
        items: {
          create: quotation.items.map(item => ({
            description: item.description,
            hsnSac: item.hsnSac,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            amount: item.amount
          }))
        }
      },
      include: { client: true, items: true }
    });

    // Update quotation status
    await prisma.quotation.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedInvoiceId: invoice.id
      }
    });

    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
};

const updateQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      financialYearId,
      clientId,
      quotationNumber,
      date,
      validUntil,
      gstType = 'CGST_SGST',
      gstRate = 18.0,
      discount = 0,
      notes,
      terms,
      items
    } = req.body;

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

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

    let taxAmount = 0;
    const ratePct = parseFloat(gstRate) || 18.0;
    if (gstType !== 'NON_GST') {
      taxAmount = (taxableAmount * ratePct) / 100;
    }

    const grandTotal = Math.round(taxableAmount + taxAmount);

    // Delete existing quotation items & recreate
    await prisma.quotationItem.deleteMany({ where: { quotationId: id } });

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        ...(quotationNumber ? { quotationNumber } : {}),
        financialYearId,
        clientId,
        date: new Date(date),
        validUntil: validUntil ? new Date(validUntil) : null,
        gstType,
        gstRate: ratePct,
        subtotal,
        taxAmount,
        discount: disc,
        grandTotal,
        notes: notes || '',
        terms: terms || '',
        items: {
          create: processedItems
        }
      },
      include: { client: true, items: true }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found or already deleted' });
    }
    await prisma.quotation.delete({ where: { id } });
    res.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNextQuotationNumber,
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  convertToInvoice,
  deleteQuotation
};
