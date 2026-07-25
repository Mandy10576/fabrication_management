const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding company & sample data for Khodiyar Steel Fabrication...');

  // 1. Seed Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@apexsteel.com' },
    update: { password: hashedPassword, name: 'Prayag Sharma (Owner)' },
    create: {
      email: 'admin@apexsteel.com',
      password: hashedPassword,
      name: 'Prayag Sharma (Owner)',
      role: 'ADMIN'
    }
  });

  // 2. Seed Company Details matching sample invoice & Prayag Sharma
  let company = await prisma.companyDetails.findFirst();
  if (company) {
    await prisma.companyDetails.update({
      where: { id: company.id },
      data: {
        companyName: 'Khodiyar Steel Fabrication',
        ownerName: 'Prayag Sharma',
        gstin: 'N/A',
        pan: 'N/A',
        email: 'khodiyarsteelandfabrication@gmail.com',
        phone: '9825534229 / 8128209488',
        address: 'Shop-11, Meet Darshan Apartment, Navo Mahollo, Singapore Road, Surat\nCity: Surat\nPincode: 395004\nState: Gujarat',
        bankName: 'State Bank of India',
        accountNumber: '38901234567',
        ifscCode: 'SBIN0001234',
        branch: 'Surat Main Branch',
        upiId: 'khodiyarsteel@sbi',
        termsConditions: 'Thank you for doing business with us!'
      }
    });
  } else {
    await prisma.companyDetails.create({
      data: {
        companyName: 'Khodiyar Steel Fabrication',
        ownerName: 'Prayag Sharma',
        gstin: 'N/A',
        pan: 'N/A',
        email: 'khodiyarsteelandfabrication@gmail.com',
        phone: '9825534229 / 8128209488',
        address: 'Shop-11, Meet Darshan Apartment, Navo Mahollo, Singapore Road, Surat\nCity: Surat\nPincode: 395004\nState: Gujarat',
        bankName: 'State Bank of India',
        accountNumber: '38901234567',
        ifscCode: 'SBIN0001234',
        branch: 'Surat Main Branch',
        upiId: 'khodiyarsteel@sbi',
        termsConditions: 'Thank you for doing business with us!'
      }
    });
  }

  // 3. Seed Financial Years
  const fy2627 = await prisma.financialYear.upsert({
    where: { year: '2026-27' },
    update: { isCurrent: true },
    create: {
      year: '2026-27',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isCurrent: true
    }
  });

  const fy2526 = await prisma.financialYear.upsert({
    where: { year: '2025-26' },
    update: { isCurrent: false },
    create: {
      year: '2025-26',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2026-03-31'),
      isCurrent: false
    }
  });

  // 4. Rate Master Catalog
  const rates = [
    { serviceName: 'Parking Stand Pipe', hsnSac: '-', unit: 'Kg', rate: 96.0, description: 'Mild Steel pipe for heavy vehicle parking stands' },
    { serviceName: 'Parking Stand Fabrication & Installation', hsnSac: '-', unit: 'Job', rate: 3000.0, description: 'Cutting, fitting, welding & site fixing of parking stands' },
    { serviceName: 'Transportation Charges', hsnSac: '-', unit: 'Trip', rate: 200.0, description: 'Local site material transport & loading' },
    { serviceName: 'Holphas (Wall Plugs), Khila (Nails), Pati (Metal Flat), and Sariya (Metal Rod)', hsnSac: '-', unit: 'Kg', rate: 100.0, description: 'Hardware fittings, anchors & flat bar materials' },
    { serviceName: 'Grill Fabrication and Installation', hsnSac: '-', unit: 'Job', rate: 10000.0, description: 'Custom balcony & window safety grill fabrication' },
    { serviceName: 'SS 304 Railing Work', hsnSac: '-', unit: 'Sq Ft', rate: 650.0, description: 'Stainless steel glass railing' }
  ];

  for (const r of rates) {
    const exists = await prisma.rateMaster.findFirst({ where: { serviceName: r.serviceName } });
    if (!exists) {
      await prisma.rateMaster.create({ data: r });
    }
  }

  // 5. Seed Client matching sample invoice
  let sampleClient = await prisma.client.findFirst({ where: { companyName: 'Shree Hansmukti Vidhyabhavan' } });
  if (!sampleClient) {
    sampleClient = await prisma.client.create({
      data: {
        companyName: 'Shree Hansmukti Vidhyabhavan',
        contactPerson: 'Shree Hansmukti School Management',
        mobile: '9033480788',
        email: 'info@hansmuktischool.edu.in',
        gstin: '',
        pan: '',
        address: 'Singanpor Rd, near Balvant Nagar, Katargam, Surat, Gujarat 395004\nSurat, Gujarat,\nState: 24 - Gujarat',
        notes: 'School infrastructure fabrication works.',
        financialYearId: fy2627.id
      }
    });
  }

  // 6. Seed Sample Invoice matching sample 2026-27/8
  const sampleInvNumber = '2026-27/8';
  const existingInv = await prisma.invoice.findFirst({ where: { invoiceNumber: sampleInvNumber } });
  if (!existingInv) {
    await prisma.invoice.create({
      data: {
        invoiceNumber: sampleInvNumber,
        financialYearId: fy2627.id,
        clientId: sampleClient.id,
        date: new Date('2026-07-23'),
        dueDate: null,
        gstType: 'NON_GST',
        gstRate: 0.0,
        subtotal: 19808.0,
        cgstAmount: 0.0,
        sgstAmount: 0.0,
        igstAmount: 0.0,
        totalTax: 0.0,
        discount: 0.0,
        grandTotal: 19808.0,
        amountInWords: 'Nineteen Thousand Eight Hundred Eight Rupees Only',
        amountReceived: 0.0,
        balanceDue: 19808.0,
        status: 'UNPAID',
        notes: 'Place of Supply: Gujarat',
        terms: 'Thank you for doing business with us!',
        items: {
          create: [
            { description: 'Parking Stand Pipe', hsnSac: '-', quantity: 48, unit: 'Kg', rate: 96.0, amount: 4608.0 },
            { description: 'Parking Stand Fabrication & Installation', hsnSac: '-', quantity: 1, unit: 'Job', rate: 3000.0, amount: 3000.0 },
            { description: 'Transportation Charges', hsnSac: '-', quantity: 1, unit: 'Trip', rate: 200.0, amount: 200.0 },
            { description: 'Holphas (Wall Plugs), Khila (Nails), Pati (Metal Flat), and Sariya (Metal Rod)', hsnSac: '-', quantity: 20, unit: 'Kg', rate: 100.0, amount: 2000.0 },
            { description: 'Grill Fabrication and Installation', hsnSac: '-', quantity: 1, unit: 'Job', rate: 10000.0, amount: 10000.0 }
          ]
        }
      }
    });
  }

  console.log('Seed updated with Owner Name: Prayag Sharma');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
