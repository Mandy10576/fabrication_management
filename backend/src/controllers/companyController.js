const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getCompany = async (req, res, next) => {
  try {
    let company = await prisma.companyDetails.findFirst();
    if (!company) {
      company = await prisma.companyDetails.create({
        data: {
          companyName: 'My Fabrication Works',
          ownerName: 'Owner Name',
          email: 'owner@fabrication.com',
          phone: '+91 99999 99999'
        }
      });
    }
    res.json(company);
  } catch (error) {
    next(error);
  }
};

const updateCompany = async (req, res, next) => {
  try {
    const existing = await prisma.companyDetails.findFirst();
    const data = { ...req.body };

    let updated;
    if (existing) {
      updated = await prisma.companyDetails.update({
        where: { id: existing.id },
        data
      });
    } else {
      updated = await prisma.companyDetails.create({ data });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided' });
    }
    const logoUrl = `/uploads/${req.file.filename}`;
    const existing = await prisma.companyDetails.findFirst();

    if (existing) {
      await prisma.companyDetails.update({
        where: { id: existing.id },
        data: { logoUrl }
      });
    }

    res.json({ message: 'Logo uploaded successfully', logoUrl });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCompany, updateCompany, uploadLogo };
