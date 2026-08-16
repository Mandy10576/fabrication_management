const path = require('path');
const prisma = require('../config/prisma');
const { uploadFile } = require('../services/storageService');

const getTenants = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {};

    const tenants = await prisma.rentTenant.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50,
      include: { contracts: { where: { status: 'ACTIVE' }, select: { id: true, roomId: true } } }
    });
    res.json(tenants);
  } catch (error) {
    next(error);
  }
};

/** Standalone tenant creation, not attached to any room/contract yet — the
 * "Add Tenant" directory action. Contracts can still create a tenant inline
 * (startContract), unchanged; this is the second entry point for a tenant
 * that exists before they're housed. */
const createTenant = async (req, res, next) => {
  try {
    const {
      name, mobile, alternatePhone, email, dob, emergencyContactName, emergencyContactPhone,
      address, aadhaarNumber, panNumber, notes
    } = req.body;
    if (!name || !mobile) return res.status(400).json({ error: 'Tenant name and mobile are required' });
    if (!aadhaarNumber) return res.status(400).json({ error: 'Aadhaar number is required' });

    const tenant = await prisma.rentTenant.create({
      data: {
        name,
        mobile,
        alternatePhone: alternatePhone || null,
        email: email || null,
        dob: dob ? new Date(dob) : null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        address: address || null,
        aadhaarNumber: aadhaarNumber || null,
        panNumber: panNumber || null,
        notes: notes || null
      }
    });
    res.status(201).json(tenant);
  } catch (error) {
    next(error);
  }
};

const updateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, mobile, alternatePhone, email, dob, emergencyContactName, emergencyContactPhone,
      address, aadhaarNumber, panNumber, notes
    } = req.body;
    if (!name || !mobile) return res.status(400).json({ error: 'Tenant name and mobile are required' });
    if (!aadhaarNumber) return res.status(400).json({ error: 'Aadhaar number is required' });

    const tenant = await prisma.rentTenant.update({
      where: { id },
      data: {
        name,
        mobile,
        alternatePhone: alternatePhone || null,
        email: email || null,
        dob: dob ? new Date(dob) : null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        address: address || null,
        aadhaarNumber: aadhaarNumber || null,
        panNumber: panNumber || null,
        notes: notes || null
      }
    });
    res.json(tenant);
  } catch (error) {
    next(error);
  }
};

const uploadTenantDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { docType } = req.body;

    const tenant = await prisma.rentTenant.findUnique({ where: { id } });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No documents provided' });
    }

    const validTypes = ['AADHAAR', 'PAN', 'OTHER'];
    const type = validTypes.includes(docType) ? docType : 'OTHER';

    const uploaded = await Promise.all(req.files.map((file, i) => uploadFile({
      buffer: file.buffer,
      filename: `tenant_doc_${Date.now()}_${i}_${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`,
      mimetype: file.mimetype,
      folder: 'tenant-documents'
    })));

    await prisma.rentTenantDocument.createMany({
      data: req.files.map((file, i) => ({
        tenantId: id,
        docType: type,
        url: uploaded[i],
        originalName: file.originalname
      }))
    });

    const documents = await prisma.rentTenantDocument.findMany({ where: { tenantId: id }, orderBy: { createdAt: 'desc' } });
    res.status(201).json(documents);
  } catch (error) {
    next(error);
  }
};

const deleteTenantDocument = async (req, res, next) => {
  try {
    const { id, documentId } = req.params;
    const existing = await prisma.rentTenantDocument.findFirst({ where: { id: documentId, tenantId: id } });
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    await prisma.rentTenantDocument.delete({ where: { id: documentId } });
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTenants,
  createTenant,
  updateTenant,
  uploadTenantDocuments,
  deleteTenantDocument
};
