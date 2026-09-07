/**
 * Properties Routes
 * GET    /api/properties          - List landlord's properties
 * POST   /api/properties          - Create property (Landlord only)
 * GET    /api/properties/:id      - Get single property
 * PATCH  /api/properties/:id      - Update property
 * DELETE /api/properties/:id      - Delete property
 * POST   /api/properties/bulk-import - CSV bulk import
 */

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@domus-flow/shared';

export const propertiesRouter = Router();

// All property routes require authentication
propertiesRouter.use(requireAuth);

// ─── List Properties ──────────────────────────────────────────────────────────

propertiesRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  let properties;

  if (user.role === UserRole.LANDLORD) {
    properties = await prisma.property.findMany({
      where: { landlordId: user.id },
      include: {
        tenants: { select: { id: true, name: true, email: true, inviteCode: true } },
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } else if (user.role === UserRole.TENANT) {
    const userRecord = await prisma.user.findUnique({ where: { id: user.id } });
    if (!userRecord?.linkedPropertyId) {
      res.json({ success: true, data: [] });
      return;
    }
    properties = await prisma.property.findMany({
      where: { id: userRecord.linkedPropertyId },
      include: { landlord: { select: { id: true, name: true, email: true } } },
    });
  } else {
    // Contractors see properties of their assigned tickets
    properties = await prisma.property.findMany({
      where: {
        tickets: { some: { contractorId: user.id } },
      },
      include: { landlord: { select: { id: true, name: true, email: true } } },
    });
  }

  res.json({ success: true, data: properties });
});

// ─── Create Property ──────────────────────────────────────────────────────────

propertiesRouter.post(
  '/',
  requireRole(UserRole.LANDLORD),
  [
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('unitNumber').trim().notEmpty().withMessage('Unit number is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: errors.mapped() });
      return;
    }

    const { address, unitNumber } = req.body as { address: string; unitNumber: string };

    const property = await prisma.property.create({
      data: { address, unitNumber, landlordId: req.user!.id },
    });

    res.status(201).json({ success: true, data: property });
  }
);

// ─── Get Property ─────────────────────────────────────────────────────────────

propertiesRouter.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid property ID')],
  async (req: Request, res: Response): Promise<void> => {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        landlord: { select: { id: true, name: true, email: true } },
        tenants: { select: { id: true, name: true, email: true, inviteCode: true } },
        tickets: {
          orderBy: { createdAt: 'desc' },
          include: {
            tenant: { select: { id: true, name: true } },
            contractor: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!property) throw new AppError('Property not found', 404);

    // Access control: only relevant parties can view
    const user = req.user!;
    const isLandlord = property.landlordId === user.id;
    const isTenant = property.tenants.some((t) => t.id === user.id);
    const isContractor =
      user.role === UserRole.CONTRACTOR && property.tickets.some((t) => t.contractorId === user.id);

    if (!isLandlord && !isTenant && !isContractor) {
      throw new AppError('Access denied', 403);
    }

    res.json({ success: true, data: property });
  }
);

// ─── Update Property ──────────────────────────────────────────────────────────

propertiesRouter.patch(
  '/:id',
  requireRole(UserRole.LANDLORD),
  [
    param('id').isUUID(),
    body('address').optional().trim().notEmpty(),
    body('unitNumber').optional().trim().notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!property) throw new AppError('Property not found', 404);
    if (property.landlordId !== req.user!.id) throw new AppError('Access denied', 403);

    const updated = await prisma.property.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({ success: true, data: updated });
  }
);

// ─── Delete Property ──────────────────────────────────────────────────────────

propertiesRouter.delete(
  '/:id',
  requireRole(UserRole.LANDLORD),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!property) throw new AppError('Property not found', 404);
    if (property.landlordId !== req.user!.id) throw new AppError('Access denied', 403);

    await prisma.property.delete({ where: { id: req.params.id } });

    res.json({ success: true, data: { message: 'Property deleted successfully' } });
  }
);

// ─── Bulk Import (CSV) ────────────────────────────────────────────────────────

propertiesRouter.post(
  '/bulk-import',
  requireRole(UserRole.LANDLORD),
  [body('properties').isArray({ min: 1 }).withMessage('Properties array is required')],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: errors.mapped() });
      return;
    }

    const { properties } = req.body as {
      properties: Array<{ address: string; unitNumber: string }>;
    };

    const created = await prisma.property.createMany({
      data: properties.map((p) => ({
        address: p.address,
        unitNumber: p.unitNumber,
        landlordId: req.user!.id,
      })),
      skipDuplicates: true,
    });

    res.status(201).json({
      success: true,
      data: { imported: created.count, total: properties.length },
    });
  }
);
