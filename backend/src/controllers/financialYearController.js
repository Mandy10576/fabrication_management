const prisma = require('../config/prisma');

let fyCache = null;

const getFinancialYears = async (req, res, next) => {
  try {
    if (fyCache) {
      return res.json(fyCache);
    }
    const years = await prisma.financialYear.findMany({
      orderBy: { year: 'desc' }
    });
    fyCache = years;
    res.json(years);
  } catch (error) {
    next(error);
  }
};

const createFinancialYear = async (req, res, next) => {
  try {
    const { year, startDate, endDate, isCurrent } = req.body;

    if (!year || !startDate || !endDate) {
      return res.status(400).json({ error: 'Year, start date, and end date are required' });
    }

    if (isCurrent) {
      await prisma.financialYear.updateMany({
        data: { isCurrent: false }
      });
    }

    const fy = await prisma.financialYear.create({
      data: {
        year,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: Boolean(isCurrent)
      }
    });

    fyCache = null; // Invalidate cache
    res.status(201).json(fy);
  } catch (error) {
    next(error);
  }
};

const setCurrentFinancialYear = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.financialYear.updateMany({
      data: { isCurrent: false }
    });

    const updated = await prisma.financialYear.update({
      where: { id },
      data: { isCurrent: true }
    });

    fyCache = null; // Invalidate cache
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

module.exports = { getFinancialYears, createFinancialYear, setCurrentFinancialYear };
