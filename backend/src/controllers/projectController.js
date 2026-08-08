const prisma = require('../config/prisma');
const { normalizeToUTCMidnight } = require('../utils/dateCalc');

const PROJECT_STATUSES = ['ACTIVE', 'COMPLETED', 'ON_HOLD'];

const getProjects = async (req, res, next) => {
  try {
    const { search, status, limit, cursor, all } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { siteAddress: { contains: search } },
        { contactNumber: { contains: search } },
        { client: { companyName: { contains: search } } },
      ];
    }

    const selectFields = {
      id: true,
      name: true,
      siteAddress: true,
      contactNumber: true,
      startDate: true,
      expectedCompletion: true,
      status: true,
      notes: true,
      createdAt: true,
      client: { select: { id: true, companyName: true } },
      _count: { select: { workLogs: true, workItems: true } },
    };

    if (all === 'true') {
      const projects = await prisma.project.findMany({ where, select: selectFields, orderBy: { name: 'asc' } });
      return res.json(projects);
    }

    const takeLimit = Math.min(100, parseInt(limit) || 20);
    const take = takeLimit + 1;

    const [totalCount, items] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: selectFields,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    let hasMore = false;
    let nextCursor = null;
    if (items.length > takeLimit) {
      hasMore = true;
      items.pop();
      nextCursor = items[items.length - 1]?.id || null;
    }

    res.json({ items, nextCursor, hasMore, totalCount });
  } catch (error) {
    next(error);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
};

const validateProjectPayload = (body) => {
  const { clientId, name, siteAddress, startDate, status } = body;

  if (!clientId || !name || !siteAddress || !startDate) {
    return 'Client, Project/Site Name, Site Address, and Start Date are required';
  }
  if (status && !PROJECT_STATUSES.includes(status)) {
    return 'Status must be ACTIVE, COMPLETED, or ON_HOLD';
  }
  return null;
};

const createProject = async (req, res, next) => {
  try {
    const error = validateProjectPayload(req.body);
    if (error) return res.status(400).json({ error });

    const { clientId, name, siteAddress, contactNumber, startDate, expectedCompletion, status, notes } = req.body;

    const project = await prisma.project.create({
      data: {
        clientId,
        name,
        siteAddress,
        contactNumber: contactNumber || null,
        startDate: normalizeToUTCMidnight(startDate),
        expectedCompletion: expectedCompletion ? normalizeToUTCMidnight(expectedCompletion) : null,
        status: status || 'ACTIVE',
        notes: notes || null,
      },
      include: { client: { select: { id: true, companyName: true } } },
    });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const error = validateProjectPayload(req.body);
    if (error) return res.status(400).json({ error });

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { clientId, name, siteAddress, contactNumber, startDate, expectedCompletion, status, notes } = req.body;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        clientId,
        name,
        siteAddress,
        contactNumber: contactNumber || null,
        startDate: normalizeToUTCMidnight(startDate),
        expectedCompletion: expectedCompletion ? normalizeToUTCMidnight(expectedCompletion) : null,
        status: status || existing.status,
        notes: notes || null,
      },
      include: { client: { select: { id: true, companyName: true } } },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { workLogs: true, workItems: true } } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Project not found or already deleted' });
    }

    if (existing._count.workLogs > 0 || existing._count.workItems > 0) {
      return res.status(400).json({
        error: `Cannot delete '${existing.name}' because it has ${existing._count.workLogs} work log(s) and ${existing._count.workItems} work item(s) recorded. Mark it Completed instead.`,
      });
    }

    await prisma.project.delete({ where: { id } });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getProjectOverview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { client: { select: { id: true, companyName: true } } },
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [workLogs, itemGroups] = await Promise.all([
      prisma.workLog.findMany({
        where: { projectId: id },
        include: {
          employees: { select: { id: true, name: true, mobile: true } },
          materials: true,
          photos: true,
        },
        orderBy: { visitDate: 'desc' },
      }),
      prisma.workItem.groupBy({ by: ['status'], where: { projectId: id }, _count: true }),
    ]);

    const itemCounts = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 };
    itemGroups.forEach((g) => {
      itemCounts[g.status] = g._count;
    });
    const totalWorkItems = itemCounts.PENDING + itemCounts.IN_PROGRESS + itemCounts.COMPLETED;

    let totalWorkValue = 0;
    let totalReceived = 0;
    const materialMap = new Map();
    const employeeMap = new Map();

    workLogs.forEach((log) => {
      totalWorkValue += log.amount;
      totalReceived += log.paymentReceived;

      log.materials.forEach((m) => {
        const key = `${m.materialName}::${m.unit}`;
        const existing = materialMap.get(key);
        if (existing) {
          existing.totalQuantity += m.quantity;
        } else {
          materialMap.set(key, { materialName: m.materialName, unit: m.unit, totalQuantity: m.quantity });
        }
      });

      log.employees.forEach((emp) => {
        const existing = employeeMap.get(emp.id);
        if (existing) {
          existing.visitCount += 1;
        } else {
          employeeMap.set(emp.id, { id: emp.id, name: emp.name, mobile: emp.mobile, visitCount: 1 });
        }
      });
    });

    const pendingAmount = Math.max(0, totalWorkValue - totalReceived);

    res.json({
      project,
      totals: {
        workItems: {
          completed: itemCounts.COMPLETED,
          inProgress: itemCounts.IN_PROGRESS,
          pending: itemCounts.PENDING,
          total: totalWorkItems,
        },
      },
      financials: { totalWorkValue, totalReceived, pendingAmount },
      materials: Array.from(materialMap.values()),
      employees: Array.from(employeeMap.values()),
      lastVisit: workLogs[0] || null,
      workLogCount: workLogs.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectOverview,
  PROJECT_STATUSES,
};
