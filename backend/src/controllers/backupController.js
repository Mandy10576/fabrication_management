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

    // Clean & restore in transaction or sequential
    if (backupData.rateMaster && backupData.rateMaster.length) {
      await prisma.rateMaster.deleteMany();
      for (const r of backupData.rateMaster) {
        delete r.id; // allow fresh UUID or retain
        await prisma.rateMaster.create({ data: r });
      }
    }

    if (backupData.clients && backupData.clients.length) {
      // Re-sync clients
      for (const c of backupData.clients) {
        const { id, createdAt, updatedAt, ...rest } = c;
        await prisma.client.upsert({
          where: { id },
          update: rest,
          create: c
        });
      }
    }

    res.json({ message: 'Backup restored successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { exportBackup, restoreBackup };
