const { PrismaClient } = require('@prisma/client');
const { numberToWords } = require('../utils/numberToWords');
const prisma = new PrismaClient();

const getQuotations = async (req, res, next) => {
  try {
    const { financialYearId, status, clientId, search } = req.query;

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

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        client: true,
        financialYear: true,
        items: true
      },
      orderBy: { date: 'desc' }
    });

    res.json(quotations);
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

    const count = await prisma.quotation.count({ where: { financialYearId } });
    const nextSeq = String(count + 1).padStart(3, '0');
    const quotationNumber = req.body.quotationNumber || `QT-${fy.year}/${nextSeq}`;

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

const deleteQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.quotation.delete({ where: { id } });
    res.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuotations,
  getQuotationById,
  createQuotation,
  convertToInvoice,
  deleteQuotation
};
