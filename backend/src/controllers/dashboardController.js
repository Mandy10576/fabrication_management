const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getDashboardStats = async (req, res, next) => {
  try {
    const { financialYearId } = req.query;

    const invoiceWhere = {};
    const clientWhere = {};
    const quoteWhere = {};

    if (financialYearId && financialYearId !== 'ALL') {
      invoiceWhere.financialYearId = financialYearId;
      clientWhere.financialYearId = financialYearId;
      quoteWhere.financialYearId = financialYearId;
    }

    const totalClients = await prisma.client.count({ where: clientWhere });
    const invoices = await prisma.invoice.findMany({ where: invoiceWhere });
    const quotations = await prisma.quotation.findMany({ where: quoteWhere });

    let totalRevenue = 0;
    let pendingPayments = 0;
    let amountReceivedTotal = 0;
    let gstBillsCount = 0;
    let gstBillsAmount = 0;
    let nonGstBillsCount = 0;
    let nonGstBillsAmount = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    invoices.forEach(inv => {
      totalRevenue += inv.grandTotal;
      pendingPayments += inv.balanceDue;
      amountReceivedTotal += inv.amountReceived;

      if (inv.gstType === 'NON_GST') {
        nonGstBillsCount += 1;
        nonGstBillsAmount += inv.grandTotal;
      } else {
        gstBillsCount += 1;
        gstBillsAmount += inv.grandTotal;
      }

      if (inv.status === 'PAID') paidCount += 1;
      else if (inv.status === 'PARTIAL') partialCount += 1;
      else unpaidCount += 1;
    });

    // Monthly Analytics aggregation (Apr to Mar)
    const monthlyDataMap = {
      'Apr': { month: 'Apr', revenue: 0, received: 0, pending: 0 },
      'May': { month: 'May', revenue: 0, received: 0, pending: 0 },
      'Jun': { month: 'Jun', revenue: 0, received: 0, pending: 0 },
      'Jul': { month: 'Jul', revenue: 0, received: 0, pending: 0 },
      'Aug': { month: 'Aug', revenue: 0, received: 0, pending: 0 },
      'Sep': { month: 'Sep', revenue: 0, received: 0, pending: 0 },
      'Oct': { month: 'Oct', revenue: 0, received: 0, pending: 0 },
      'Nov': { month: 'Nov', revenue: 0, received: 0, pending: 0 },
      'Dec': { month: 'Dec', revenue: 0, received: 0, pending: 0 },
      'Jan': { month: 'Jan', revenue: 0, received: 0, pending: 0 },
      'Feb': { month: 'Feb', revenue: 0, received: 0, pending: 0 },
      'Mar': { month: 'Mar', revenue: 0, received: 0, pending: 0 },
    };

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    invoices.forEach(inv => {
      const d = new Date(inv.date);
      const mName = monthNames[d.getMonth()];
      if (monthlyDataMap[mName]) {
        monthlyDataMap[mName].revenue += inv.grandTotal;
        monthlyDataMap[mName].received += inv.amountReceived;
        monthlyDataMap[mName].pending += inv.balanceDue;
      }
    });

    const monthlyAnalytics = Object.values(monthlyDataMap);

    const paymentBreakdown = [
      { name: 'Paid', value: paidCount, amount: invoices.filter(i => i.status === 'PAID').reduce((a, b) => a + b.grandTotal, 0) },
      { name: 'Partial', value: partialCount, amount: invoices.filter(i => i.status === 'PARTIAL').reduce((a, b) => a + b.grandTotal, 0) },
      { name: 'Unpaid', value: unpaidCount, amount: invoices.filter(i => i.status === 'UNPAID').reduce((a, b) => a + b.grandTotal, 0) }
    ];

    const gstBreakdown = [
      { name: 'GST Invoices', count: gstBillsCount, amount: gstBillsAmount },
      { name: 'Non-GST Invoices', count: nonGstBillsCount, amount: nonGstBillsAmount }
    ];

    // Recent 5 Invoices
    const recentInvoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      take: 5,
      orderBy: { date: 'desc' },
      include: { client: true }
    });

    res.json({
      summary: {
        totalClients,
        totalInvoices: invoices.length,
        totalQuotations: quotations.length,
        totalRevenue,
        amountReceivedTotal,
        pendingPayments,
        gstBillsCount,
        gstBillsAmount,
        nonGstBillsCount,
        nonGstBillsAmount
      },
      monthlyAnalytics,
      paymentBreakdown,
      gstBreakdown,
      recentInvoices
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
