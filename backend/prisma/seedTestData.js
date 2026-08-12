// Extra local-only test data: a handful of clients spread across different
// states (to exercise CGST+SGST vs IGST and the GST state-code display),
// employees, projects, invoices in each payment status, their payments, and
// a couple of quotations. Safe to re-run — every insert is guarded by a
// findFirst/upsert check, same idiom as prisma/seed.js.
const prisma = require('../src/config/prisma');
const { numberToWords } = require('../src/utils/numberToWords');

const calcInvoiceTotals = (subtotal, gstType, gstRate, discount = 0) => {
  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0, totalTax = 0;
  const taxable = subtotal - discount;
  if (gstType === 'CGST_SGST') {
    cgstAmount = (taxable * gstRate) / 200;
    sgstAmount = (taxable * gstRate) / 200;
    totalTax = cgstAmount + sgstAmount;
  } else if (gstType === 'IGST') {
    igstAmount = (taxable * gstRate) / 100;
    totalTax = igstAmount;
  }
  const grandTotal = Math.round((taxable + totalTax) * 100) / 100;
  return { cgstAmount, sgstAmount, igstAmount, totalTax, grandTotal };
};

async function ensureClient(data) {
  let client = await prisma.client.findFirst({ where: { companyName: data.companyName } });
  if (!client) client = await prisma.client.create({ data });
  return client;
}

async function ensureEmployee(data) {
  let emp = await prisma.employee.findFirst({ where: { name: data.name, mobile: data.mobile } });
  if (!emp) emp = await prisma.employee.create({ data });
  return emp;
}

async function ensureProject(data) {
  let project = await prisma.project.findFirst({ where: { name: data.name } });
  if (!project) project = await prisma.project.create({ data });
  return project;
}

async function ensureInvoice(invoiceNumber, buildData) {
  const existing = await prisma.invoice.findFirst({ where: { invoiceNumber } });
  if (existing) return existing;
  return prisma.invoice.create({ data: buildData() });
}

async function ensureQuotation(quotationNumber, buildData) {
  const existing = await prisma.quotation.findFirst({ where: { quotationNumber } });
  if (existing) return existing;
  return prisma.quotation.create({ data: buildData() });
}

async function main() {
  console.log('Seeding local test data (clients, employees, projects, invoices, quotations)...');

  const fy = await prisma.financialYear.findUnique({ where: { year: '2026-27' } });
  if (!fy) throw new Error('Run `npm run seed` first to create the 2026-27 financial year.');

  // --- Clients across different states, for GST-mode + state-code testing ---
  const patel = await ensureClient({
    companyName: 'Patel Industries',
    contactPerson: 'Jignesh Patel',
    mobile: '9876543210',
    email: 'jignesh@patelindustries.in',
    gstin: '24AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
    address: 'Plot 12, GIDC Estate, Vatva, Ahmedabad, Gujarat 382445',
    state: 'Gujarat',
    notes: 'Repeat client — parking stand & grill work.',
    financialYearId: fy.id
  });

  const mumbaiSteel = await ensureClient({
    companyName: 'Mumbai Steel Traders',
    contactPerson: 'Anil Deshmukh',
    mobile: '9822011223',
    email: 'anil@mumbaisteel.co.in',
    gstin: '27BBBBB1111B2Z6',
    pan: 'BBBBB1111B',
    address: '14, Kalbadevi Road, Mumbai, Maharashtra 400002',
    state: 'Maharashtra',
    notes: 'Inter-state client — IGST applies.',
    financialYearId: fy.id
  });

  const delhiFab = await ensureClient({
    companyName: 'Delhi Fabrication Co',
    contactPerson: 'Rohit Verma',
    mobile: '9911223344',
    email: 'rohit@delhifab.in',
    gstin: '07CCCCC2222C3Z7',
    pan: 'CCCCC2222C',
    address: 'B-45, Wazirpur Industrial Area, Delhi 110052',
    state: 'Delhi',
    notes: '',
    financialYearId: fy.id
  });

  const rajBuilders = await ensureClient({
    companyName: 'Rajasthan Builders',
    contactPerson: 'Mahesh Sharma',
    mobile: '9414123456',
    email: 'mahesh@rajasthanbuilders.in',
    gstin: '08DDDDD3333D4Z8',
    pan: 'DDDDD3333D',
    address: '22, MI Road, Jaipur, Rajasthan 302001',
    state: 'Rajasthan',
    notes: '',
    financialYearId: fy.id
  });

  const suratConst = await ensureClient({
    companyName: 'Surat Construction Co',
    contactPerson: 'Kiran Bhai',
    mobile: '9998887776',
    email: '',
    gstin: '',
    pan: '',
    address: 'Ring Road, Surat, Gujarat 395002',
    state: 'Gujarat',
    notes: 'Cash/retail client — Non-GST billing.',
    financialYearId: fy.id
  });

  // --- Employees ---
  const emp1 = await ensureEmployee({
    name: 'Ramesh Patel',
    mobile: '9876500001',
    address: 'Katargam, Surat',
    joiningDate: new Date('2025-01-15'),
    monthlySalary: 18000,
    salaryCycleStartDay: 1,
    deductionBasis: 'CALENDAR_DAYS',
    isActive: true
  });

  const emp2 = await ensureEmployee({
    name: 'Suresh Kumar',
    mobile: '9876500002',
    address: 'Varachha, Surat',
    joiningDate: new Date('2025-03-10'),
    monthlySalary: 22000,
    salaryCycleStartDay: 1,
    deductionBasis: 'WORKING_DAYS',
    isActive: true
  });

  await ensureEmployee({
    name: 'Vikram Singh',
    mobile: '9876500003',
    address: 'Adajan, Surat',
    joiningDate: new Date('2024-11-01'),
    monthlySalary: 20000,
    salaryCycleStartDay: 1,
    deductionBasis: 'CALENDAR_DAYS',
    isActive: false
  });

  // --- Projects / Sites ---
  await ensureProject({
    clientId: patel.id,
    name: 'Patel Industries – Gate Fabrication',
    siteAddress: 'Plot 12, GIDC Estate, Vatva, Ahmedabad',
    contactNumber: patel.mobile,
    startDate: new Date('2026-05-01'),
    expectedCompletion: new Date('2026-08-01'),
    status: 'ACTIVE',
    notes: 'Main entrance gate + security cabin grills.'
  });

  await ensureProject({
    clientId: mumbaiSteel.id,
    name: 'Mumbai Steel – Railing Work',
    siteAddress: '14, Kalbadevi Road, Mumbai',
    contactNumber: mumbaiSteel.mobile,
    startDate: new Date('2026-03-01'),
    expectedCompletion: new Date('2026-04-15'),
    status: 'COMPLETED',
    notes: 'SS 304 railing across 3 floors.'
  });

  await ensureProject({
    clientId: suratConst.id,
    name: 'Surat Construction – Site Shed',
    siteAddress: 'Ring Road, Surat',
    contactNumber: suratConst.mobile,
    startDate: new Date('2026-06-10'),
    expectedCompletion: null,
    status: 'ON_HOLD',
    notes: 'Paused pending client material approval.'
  });

  // --- Invoices (one per payment status, spread across GST modes) ---
  const invoicesToCreate = [
    {
      number: '2026-27/9',
      client: patel,
      gstType: 'CGST_SGST',
      gstRate: 18,
      items: [
        { description: 'Grill Fabrication and Installation', hsnSac: '-', quantity: 1, unit: 'Job', rate: 10000, amount: 10000 },
        { description: 'Transportation Charges', hsnSac: '-', quantity: 2, unit: 'Trip', rate: 200, amount: 400 }
      ],
      amountReceived: null, // filled to grandTotal below (PAID)
      date: new Date('2026-06-05'),
      payments: [{ amount: null, paymentDate: new Date('2026-06-10'), paymentMode: 'BANK_TRANSFER', referenceNo: 'NEFT2606001' }]
    },
    {
      number: '2026-27/10',
      client: mumbaiSteel,
      gstType: 'IGST',
      gstRate: 18,
      items: [
        { description: 'SS 304 Railing Work', hsnSac: '-', quantity: 60, unit: 'Sq Ft', rate: 650, amount: 39000 }
      ],
      amountReceived: 20000,
      date: new Date('2026-04-02'),
      payments: [{ amount: 20000, paymentDate: new Date('2026-04-10'), paymentMode: 'BANK_TRANSFER', referenceNo: 'IMPS0402334' }]
    },
    {
      number: '2026-27/11',
      client: delhiFab,
      gstType: 'IGST',
      gstRate: 18,
      items: [
        { description: 'Parking Stand Fabrication & Installation', hsnSac: '-', quantity: 2, unit: 'Job', rate: 3000, amount: 6000 }
      ],
      amountReceived: 0,
      date: new Date('2026-07-01'),
      payments: []
    },
    {
      number: '2026-27/12',
      client: rajBuilders,
      gstType: 'IGST',
      gstRate: 18,
      items: [
        { description: 'Holphas (Wall Plugs), Khila (Nails), Pati (Metal Flat), and Sariya (Metal Rod)', hsnSac: '-', quantity: 50, unit: 'Kg', rate: 100, amount: 5000 }
      ],
      amountReceived: null, // PAID
      date: new Date('2026-05-20'),
      payments: [{ amount: null, paymentDate: new Date('2026-05-25'), paymentMode: 'UPI', referenceNo: 'UPI522334455' }]
    },
    {
      number: '2026-27/13',
      client: suratConst,
      gstType: 'NON_GST',
      gstRate: 0,
      items: [
        { description: 'Parking Stand Pipe', hsnSac: '-', quantity: 30, unit: 'Kg', rate: 96, amount: 2880 }
      ],
      amountReceived: 0,
      date: new Date('2026-07-10'),
      payments: []
    },
    {
      number: '2026-27/14',
      client: patel,
      gstType: 'CGST_SGST',
      gstRate: 18,
      items: [
        { description: 'Transportation Charges', hsnSac: '-', quantity: 3, unit: 'Trip', rate: 200, amount: 600 }
      ],
      amountReceived: 300,
      date: new Date('2026-08-01'),
      payments: [{ amount: 300, paymentDate: new Date('2026-08-02'), paymentMode: 'CASH', referenceNo: '' }]
    }
  ];

  for (const inv of invoicesToCreate) {
    await ensureInvoice(inv.number, () => {
      const subtotal = inv.items.reduce((sum, i) => sum + i.amount, 0);
      const { cgstAmount, sgstAmount, igstAmount, totalTax, grandTotal } = calcInvoiceTotals(subtotal, inv.gstType, inv.gstRate);
      const amountReceived = inv.amountReceived === null ? grandTotal : inv.amountReceived;
      const balanceDue = Math.round((grandTotal - amountReceived) * 100) / 100;
      const status = balanceDue <= 0 ? 'PAID' : (amountReceived > 0 ? 'PARTIAL' : 'UNPAID');
      const payments = inv.payments.map((p) => ({
        amount: p.amount === null ? grandTotal : p.amount,
        paymentDate: p.paymentDate,
        paymentMode: p.paymentMode,
        referenceNo: p.referenceNo || null
      }));

      return {
        invoiceNumber: inv.number,
        financialYearId: fy.id,
        clientId: inv.client.id,
        date: inv.date,
        state: inv.client.state,
        gstType: inv.gstType,
        gstRate: inv.gstRate,
        subtotal,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalTax,
        discount: 0,
        grandTotal,
        amountInWords: numberToWords(grandTotal),
        amountReceived,
        balanceDue,
        status,
        notes: `Place of Supply: ${inv.client.state}`,
        terms: 'Thank you for doing business with us!',
        items: { create: inv.items },
        payments: { create: payments }
      };
    });
  }

  // --- Quotations ---
  await ensureQuotation('QT-2026-27/001', () => {
    const items = [
      { description: 'Grill Fabrication and Installation', hsnSac: '-', quantity: 2, unit: 'Job', rate: 10000, amount: 20000 }
    ];
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const taxAmount = subtotal * 0.18;
    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;
    return {
      quotationNumber: 'QT-2026-27/001',
      financialYearId: fy.id,
      clientId: patel.id,
      date: new Date('2026-07-15'),
      validUntil: new Date('2026-08-15'),
      state: patel.state,
      gstType: 'CGST_SGST',
      gstRate: 18,
      subtotal,
      taxAmount,
      discount: 0,
      grandTotal,
      status: 'PENDING',
      notes: '',
      terms: 'Valid for 30 days from date of issue.',
      items: { create: items }
    };
  });

  await ensureQuotation('QT-2026-27/002', () => {
    const items = [
      { description: 'SS 304 Railing Work', hsnSac: '-', quantity: 40, unit: 'Sq Ft', rate: 650, amount: 26000 }
    ];
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const taxAmount = subtotal * 0.18;
    const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;
    return {
      quotationNumber: 'QT-2026-27/002',
      financialYearId: fy.id,
      clientId: mumbaiSteel.id,
      date: new Date('2026-03-10'),
      validUntil: new Date('2026-04-10'),
      state: mumbaiSteel.state,
      gstType: 'IGST',
      gstRate: 18,
      subtotal,
      taxAmount,
      discount: 0,
      grandTotal,
      status: 'ACCEPTED',
      notes: 'Converted to invoice 2026-27/10 after acceptance.',
      terms: 'Valid for 30 days from date of issue.',
      items: { create: items }
    };
  });

  console.log('Test data seeded: 5 clients, 3 employees, 3 projects, 6 invoices, 2 quotations.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
