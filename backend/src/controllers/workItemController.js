const prisma = require('../config/prisma');

const WORK_ITEM_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

const getProjectWorkItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const items = await prisma.workItem.findMany({
      where: { projectId: id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

const addWorkItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Work item name is required' });
    }
    if (status && !WORK_ITEM_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${WORK_ITEM_STATUSES.join(', ')}` });
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const maxOrder = await prisma.workItem.aggregate({
      where: { projectId: id },
      _max: { sortOrder: true },
    });

    const item = await prisma.workItem.create({
      data: {
        projectId: id,
        name,
        status: status || 'PENDING',
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

const updateWorkItem = async (req, res, next) => {
  try {
    const { id, workItemId } = req.params;
    const { name, status, sortOrder } = req.body;

    if (status && !WORK_ITEM_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${WORK_ITEM_STATUSES.join(', ')}` });
    }

    const existing = await prisma.workItem.findFirst({ where: { id: workItemId, projectId: id } });
    if (!existing) return res.status(404).json({ error: 'Work item not found' });

    const updated = await prisma.workItem.update({
      where: { id: workItemId },
      data: {
        name: name !== undefined ? name : existing.name,
        status: status || existing.status,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : existing.sortOrder,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteWorkItem = async (req, res, next) => {
  try {
    const { id, workItemId } = req.params;
    const existing = await prisma.workItem.findFirst({ where: { id: workItemId, projectId: id } });
    if (!existing) return res.status(404).json({ error: 'Work item not found' });

    await prisma.workItem.delete({ where: { id: workItemId } });
    res.json({ message: 'Work item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProjectWorkItems, addWorkItem, updateWorkItem, deleteWorkItem, WORK_ITEM_STATUSES };
