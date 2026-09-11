const path = require('path');
const prisma = require('../config/prisma');
const { uploadFile } = require('../services/storageService');

// Same cursor-page pattern as getClients/getEmployees/etc — `all=true` is
// the escape hatch for a typeahead picker (RentRoomDetail's "Existing
// Tenant" search) that wants a flat array of a small, already-narrowed
// result set, never a real page-2. Without this split, the previous
// hardcoded `take: 50` with no way to request more meant any tenant past
// the 50th (alphabetically) was permanently invisible on the directory page.
const getTenants = async (req, res, next) => {
  try {
    const { search, limit, cursor, all } = req.query;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {};

    const includeFields = {
      contracts: { where: { status: 'ACTIVE' }, select: { id: true, roomId: true } },
      // Total across every contract ever (not just the active one above) —
      // the frontend needs this to warn accurately before a delete, since
      // an ended contract still carries bill/payment history even though
      // it won't show up as "currently housed".
      _count: { select: { contracts: true } }
    };
    const withEverHoused = (t) => ({ ...t, everHoused: t._count.contracts > 0, _count: undefined });

    if (all === 'true') {
      const tenants = await prisma.rentTenant.findMany({
        where,
        orderBy: { name: 'asc' },
        take: 50,
        include: includeFields
      });
      return res.json(tenants.map(withEverHoused));
    }

    const takeLimit = Math.min(100, parseInt(limit) || 20);
    const take = takeLimit + 1;

    const [totalCount, items] = await Promise.all([
      prisma.rentTenant.count({ where }),
      prisma.rentTenant.findMany({
        where,
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        // name alone isn't unique — a stable id tiebreaker keeps cursor
        // pagination correct when two tenants share a name.
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        include: includeFields
      })
    ]);

    let hasMore = false;
    let nextCursor = null;
    if (items.length > takeLimit) {
      hasMore = true;
      items.pop();
      nextCursor = items[items.length - 1]?.id || null;
    }

    res.json({ items: items.map(withEverHoused), nextCursor, hasMore, totalCount });
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

/** Hard delete — permanently removes the tenant and every contract they ever
 * held, cascading to that contract's bills and payments (RentBill/
 * RentBillPayment cascade via the schema's onDelete: Cascade on
 * RentContract, same as deleteContract). Electricity bills/payments billed
 * under those contracts are kept, just un-linked (their contractId is
 * nulled by the schema's onDelete: SetNull) — electricity is its own
 * independent ledger. Any room the tenant currently occupies is freed in
 * the same transaction. Tenant documents cascade via the schema too. */
const deleteTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenant = await prisma.rentTenant.findUnique({
      where: { id },
      include: { contracts: { select: { id: true, status: true, roomId: true } } }
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found or already deleted' });

    const ops = tenant.contracts.map((c) => prisma.rentContract.delete({ where: { id: c.id } }));
    tenant.contracts
      .filter((c) => c.status === 'ACTIVE')
      .forEach((c) => ops.push(prisma.rentRoom.update({ where: { id: c.roomId }, data: { status: 'VACANT' } })));
    ops.push(prisma.rentTenant.delete({ where: { id } }));

    await prisma.$transaction(ops);
    res.json({ message: 'Tenant deleted permanently' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTenants,
  createTenant,
  updateTenant,
  uploadTenantDocuments,
  deleteTenantDocument,
  deleteTenant
};
