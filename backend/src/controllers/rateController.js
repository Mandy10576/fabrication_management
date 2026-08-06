const prisma = require('../config/prisma');

const getRates = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { serviceName: { contains: search } },
        { hsnSac: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const rates = await prisma.rateMaster.findMany({
      where,
      orderBy: { serviceName: 'asc' },
      select: {
        id: true,
        serviceName: true,
        hsnSac: true,
        unit: true,
        rate: true,
        description: true
      }
    });
    res.json(rates);
  } catch (error) {
    next(error);
  }
};

const createRate = async (req, res, next) => {
  try {
    const { serviceName, hsnSac, unit, rate, description } = req.body;
    if (!serviceName || rate === undefined) {
      return res.status(400).json({ error: 'Service name and rate are required' });
    }

    const newRate = await prisma.rateMaster.create({
      data: {
        serviceName,
        hsnSac: hsnSac || '',
        unit: unit || 'sq ft',
        rate: parseFloat(rate),
        description: description || ''
      }
    });

    res.status(201).json(newRate);
  } catch (error) {
    next(error);
  }
};

const updateRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { serviceName, hsnSac, unit, rate, description } = req.body;

    const updated = await prisma.rateMaster.update({
      where: { id },
      data: {
        serviceName,
        hsnSac,
        unit,
        rate: parseFloat(rate),
        description
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.rateMaster.delete({ where: { id } });
    res.json({ message: 'Rate master item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRates, createRate, updateRate, deleteRate };
