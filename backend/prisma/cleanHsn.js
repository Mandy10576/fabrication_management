const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invRes = await prisma.invoiceItem.updateMany({
    where: { hsnSac: '9988' },
    data: { hsnSac: null }
  });
  const quoRes = await prisma.quotationItem.updateMany({
    where: { hsnSac: '9988' },
    data: { hsnSac: null }
  });
  const rateRes = await prisma.rateMaster.updateMany({
    where: { hsnSac: '9988' },
    data: { hsnSac: '' }
  });
  console.log(`Cleaned 9988: Invoices (${invRes.count}), Quotations (${quoRes.count}), Rates (${rateRes.count})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
