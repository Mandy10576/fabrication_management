const prisma = require('../config/prisma');

let companyCache = null;

const getCompany = async (req, res, next) => {
  try {
    if (companyCache) {
      return res.json(companyCache);
    }

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
    companyCache = company;
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

    companyCache = updated;
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

    let updated;
    if (existing) {
      updated = await prisma.companyDetails.update({
        where: { id: existing.id },
        data: { logoUrl }
      });
    }

    companyCache = updated || companyCache;
    res.json({ message: 'Logo uploaded successfully', logoUrl });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCompany, updateCompany, uploadLogo };
