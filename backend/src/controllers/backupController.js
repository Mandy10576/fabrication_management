const prisma = require('../config/prisma');

const exportBackup = async (req, res, next) => {
  try {
    const [companyDetails, financialYears, clients, rateMaster, invoices, quotations] = await Promise.all([
      prisma.companyDetails.findMany(),
      prisma.financialYear.findMany(),
      prisma.client.findMany(),
      prisma.rateMaster.findMany(),
      prisma.invoice.findMany({ include: { items: true } }),
      prisma.quotation.findMany({ include: { items: true } })
    ]);

    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      companyDetails,
      financialYears,
      clients,
      rateMaster,
      invoices,
      quotations
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=fabrication_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.json(backupData);
  } catch (error) {
    next(error);
  }
};

const restoreBackup = async (req, res, next) => {
  try {
    const backupData = req.body;
    if (!backupData || !backupData.version) {
      return res.status(400).json({ error: 'Invalid backup file format' });
    }

    // 1. Restore Company Details
    if (backupData.companyDetails && backupData.companyDetails.length) {
      for (const comp of backupData.companyDetails) {
        const { id, createdAt, updatedAt, ...rest } = comp;
        await prisma.companyDetails.upsert({
          where: { id },
          update: rest,
          create: comp
        });
      }
    }

    // 2. Restore Financial Years
    if (backupData.financialYears && backupData.financialYears.length) {
      for (const fy of backupData.financialYears) {
        const { id, createdAt, ...rest } = fy;
        const startDate = new Date(fy.startDate);
        const endDate = new Date(fy.endDate);
        await prisma.financialYear.upsert({
          where: { id },
          update: { ...rest, startDate, endDate },
          create: { ...fy, startDate, endDate }
        });
      }
    }

    // 3. Restore Rate Master
    if (backupData.rateMaster && backupData.rateMaster.length) {
      for (const r of backupData.rateMaster) {
        const { id, createdAt, updatedAt, ...rest } = r;
        if (id) {
          await prisma.rateMaster.upsert({
            where: { id },
            update: rest,
            create: r
          });
        } else {
          await prisma.rateMaster.create({ data: rest });
        }
      }
    }

    // 4. Restore Clients
    if (backupData.clients && backupData.clients.length) {
      for (const c of backupData.clients) {
        const { id, createdAt, updatedAt, ...rest } = c;
        await prisma.client.upsert({
          where: { id },
          update: rest,
          create: c
        });
      }
    }

    // 5. Restore Invoices & Invoice Items
    if (backupData.invoices && backupData.invoices.length) {
      for (const inv of backupData.invoices) {
        const { items, id, createdAt, updatedAt, ...invData } = inv;
        const date = invData.date ? new Date(invData.date) : new Date();
        const dueDate = invData.dueDate ? new Date(invData.dueDate) : null;

        const itemCreates = items && items.length ? items.map(item => {
          const { id: itemId, invoiceId, ...itemRest } = item;
          return itemRest;
        }) : [];

        const existing = await prisma.invoice.findUnique({ where: { id } });
        if (existing) {
          await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
          await prisma.invoice.update({
            where: { id },
            data: {
              ...invData,
              date,
              dueDate,
              items: itemCreates.length ? { create: itemCreates } : undefined
            }
          });
        } else {
          await prisma.invoice.create({
            data: {
              ...invData,
              id,
              date,
              dueDate,
              items: itemCreates.length ? { create: itemCreates } : undefined
            }
          });
        }
      }
    }

    // 6. Restore Quotations & Quotation Items
    if (backupData.quotations && backupData.quotations.length) {
      for (const q of backupData.quotations) {
        const { items, id, createdAt, updatedAt, ...qData } = q;
        const date = qData.date ? new Date(qData.date) : new Date();
        const validUntil = qData.validUntil ? new Date(qData.validUntil) : null;

        const itemCreates = items && items.length ? items.map(item => {
          const { id: itemId, quotationId, ...itemRest } = item;
          return itemRest;
        }) : [];

        const existing = await prisma.quotation.findUnique({ where: { id } });
        if (existing) {
          await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
          await prisma.quotation.update({
            where: { id },
            data: {
              ...qData,
              date,
              validUntil,
              items: itemCreates.length ? { create: itemCreates } : undefined
            }
          });
        } else {
          await prisma.quotation.create({
            data: {
              ...qData,
              id,
              date,
              validUntil,
              items: itemCreates.length ? { create: itemCreates } : undefined
            }
          });
        }
      }
    }

    res.json({ message: 'Full backup (clients, invoices, quotations, rate master, company details) restored successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { exportBackup, restoreBackup };
