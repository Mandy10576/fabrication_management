const path = require('path');
const prisma = require('../config/prisma');
const { normalizeToUTCMidnight } = require('../utils/dateCalc');
const { uploadFile } = require('../services/storageService');

const PAYMENT_MODES = ['CASH', 'UPI', 'BANK', 'OTHER'];

const WORK_LOG_INCLUDE = {
  employees: { select: { id: true, name: true, mobile: true } },
  materials: true,
  photos: true,
};

const validateWorkLogPayload = (body) => {
  const { visitDate, paymentMode, amount, paymentReceived, materials } = body;

  if (!visitDate) {
    return 'Visit Date is required';
  }
  if (paymentMode && !PAYMENT_MODES.includes(paymentMode)) {
    return `Payment Mode must be one of: ${PAYMENT_MODES.join(', ')}`;
  }
  if (amount !== undefined && (isNaN(parseFloat(amount)) || parseFloat(amount) < 0)) {
    return 'Amount must be a valid non-negative number';
  }
  if (paymentReceived !== undefined && (isNaN(parseFloat(paymentReceived)) || parseFloat(paymentReceived) < 0)) {
    return 'Payment Received must be a valid non-negative number';
  }
  if (materials && Array.isArray(materials)) {
    for (const m of materials) {
      if (!m.materialName || !m.unit || isNaN(parseFloat(m.quantity)) || parseFloat(m.quantity) <= 0) {
        return 'Each material must have a name, unit, and a positive quantity';
      }
    }
  }
  return null;
};

const getProjectWorkLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit, cursor } = req.query;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const takeLimit = Math.min(100, parseInt(limit) || 20);
    const take = takeLimit + 1;

    const [totalCount, items] = await Promise.all([
      prisma.workLog.count({ where: { projectId: id } }),
      prisma.workLog.findMany({
        where: { projectId: id },
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: WORK_LOG_INCLUDE,
        orderBy: [{ visitDate: 'desc' }, { id: 'desc' }],
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

const getOrgWorkLogs = async (req, res, next) => {
  try {
    const { limit, cursor, projectId } = req.query;

    const where = {};
    if (projectId) where.projectId = projectId;

    const takeLimit = Math.min(100, parseInt(limit) || 20);
    const take = takeLimit + 1;

    const [totalCount, items] = await Promise.all([
      prisma.workLog.count({ where }),
      prisma.workLog.findMany({
        where,
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          project: { select: { id: true, name: true } },
          employees: { select: { id: true, name: true } },
        },
        orderBy: [{ visitDate: 'desc' }, { id: 'desc' }],
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

const addWorkLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const error = validateWorkLogPayload(req.body);
    if (error) return res.status(400).json({ error });

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const {
      visitDate, visitTime, workDone, workInProgress, workPending,
      amount, paymentReceived, paymentMode, notes, employeeIds, materials,
    } = req.body;

    const workLog = await prisma.workLog.create({
      data: {
        projectId: id,
        visitDate: normalizeToUTCMidnight(visitDate),
        visitTime: visitTime || null,
        workDone: workDone || null,
        workInProgress: workInProgress || null,
        workPending: workPending || null,
        amount: amount !== undefined ? parseFloat(amount) : 0,
        paymentReceived: paymentReceived !== undefined ? parseFloat(paymentReceived) : 0,
        paymentMode: paymentMode || 'CASH',
        notes: notes || null,
        employees: Array.isArray(employeeIds) && employeeIds.length > 0
          ? { connect: employeeIds.map((empId) => ({ id: empId })) }
          : undefined,
        materials: Array.isArray(materials) && materials.length > 0
          ? { create: materials.map((m) => ({ materialName: m.materialName, quantity: parseFloat(m.quantity), unit: m.unit })) }
          : undefined,
      },
      include: WORK_LOG_INCLUDE,
    });

    res.status(201).json(workLog);
  } catch (error) {
    next(error);
  }
};

const updateWorkLog = async (req, res, next) => {
  try {
    const { id, workLogId } = req.params;
    const error = validateWorkLogPayload(req.body);
    if (error) return res.status(400).json({ error });

    const existing = await prisma.workLog.findFirst({ where: { id: workLogId, projectId: id } });
    if (!existing) return res.status(404).json({ error: 'Work log not found' });

    const {
      visitDate, visitTime, workDone, workInProgress, workPending,
      amount, paymentReceived, paymentMode, notes, employeeIds, materials,
    } = req.body;

    const updated = await prisma.workLog.update({
      where: { id: workLogId },
      data: {
        visitDate: normalizeToUTCMidnight(visitDate),
        visitTime: visitTime || null,
        workDone: workDone || null,
        workInProgress: workInProgress || null,
        workPending: workPending || null,
        amount: amount !== undefined ? parseFloat(amount) : existing.amount,
        paymentReceived: paymentReceived !== undefined ? parseFloat(paymentReceived) : existing.paymentReceived,
        paymentMode: paymentMode || existing.paymentMode,
        notes: notes || null,
        employees: Array.isArray(employeeIds)
          ? { set: employeeIds.map((empId) => ({ id: empId })) }
          : undefined,
        materials: Array.isArray(materials)
          ? {
              deleteMany: {},
              create: materials.map((m) => ({ materialName: m.materialName, quantity: parseFloat(m.quantity), unit: m.unit })),
            }
          : undefined,
      },
      include: WORK_LOG_INCLUDE,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteWorkLog = async (req, res, next) => {
  try {
    const { id, workLogId } = req.params;
    const existing = await prisma.workLog.findFirst({ where: { id: workLogId, projectId: id } });
    if (!existing) return res.status(404).json({ error: 'Work log not found' });

    await prisma.workLog.delete({ where: { id: workLogId } });
    res.json({ message: 'Work log deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const uploadWorkLogPhotos = async (req, res, next) => {
  try {
    const { id, workLogId } = req.params;
    const existing = await prisma.workLog.findFirst({ where: { id: workLogId, projectId: id } });
    if (!existing) return res.status(404).json({ error: 'Work log not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photos provided' });
    }

    const urls = await Promise.all(req.files.map((file, i) => uploadFile({
      buffer: file.buffer,
      filename: `worklog_${Date.now()}_${i}_${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`,
      mimetype: file.mimetype,
      folder: 'worklogs'
    })));

    await prisma.workLogPhoto.createMany({
      data: urls.map((url) => ({ workLogId, url })),
    });

    const photos = await prisma.workLogPhoto.findMany({ where: { workLogId }, orderBy: { createdAt: 'asc' } });
    res.status(201).json(photos);
  } catch (error) {
    next(error);
  }
};

const deleteWorkLogPhoto = async (req, res, next) => {
  try {
    const { id, workLogId, photoId } = req.params;
    const existing = await prisma.workLogPhoto.findFirst({ where: { id: photoId, workLogId } });
    if (!existing) return res.status(404).json({ error: 'Photo not found' });

    const workLog = await prisma.workLog.findFirst({ where: { id: workLogId, projectId: id } });
    if (!workLog) return res.status(404).json({ error: 'Work log not found' });

    await prisma.workLogPhoto.delete({ where: { id: photoId } });
    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjectWorkLogs,
  getOrgWorkLogs,
  addWorkLog,
  updateWorkLog,
  deleteWorkLog,
  uploadWorkLogPhotos,
  deleteWorkLogPhoto,
  PAYMENT_MODES,
};
