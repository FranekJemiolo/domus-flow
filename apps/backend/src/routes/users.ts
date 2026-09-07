/**
 * Users Routes
 * GET   /api/users             - List users (Landlord only)
 * GET   /api/users/:id         - Get user by ID
 * PATCH /api/users/:id/link-property - Link tenant to a property
 */

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@domus-flow/shared';

export const usersRouter = Router();

usersRouter.use(requireAuth);

// ─── List Users (Landlord only) ───────────────────────────────────────────────

usersRouter.get(
  '/',
  requireRole(UserRole.LANDLORD),
  async (req: Request, res: Response): Promise<void> => {
    const { role } = req.query as { role?: UserRole };

    const users = await prisma.user.findMany({
      where: role ? { role } : {},
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        inviteCode: true,
        linkedPropertyId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: users });
  }
);

// ─── Get User by ID ───────────────────────────────────────────────────────────

usersRouter.get(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        inviteCode: true,
        linkedPropertyId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new AppError('User not found', 404);

    // Only self or landlord can view user details
    const requester = req.user!;
    if (requester.id !== req.params.id && requester.role !== UserRole.LANDLORD) {
      throw new AppError('Access denied', 403);
    }

    res.json({ success: true, data: user });
  }
);

// ─── Link Tenant to Property ─────────────────────────────────────────────────

usersRouter.patch(
  '/:id/link-property',
  requireRole(UserRole.LANDLORD),
  [param('id').isUUID(), body('propertyId').isUUID().withMessage('Valid property ID required')],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: errors.mapped() });
      return;
    }

    const { propertyId } = req.body as { propertyId: string };

    // Verify property belongs to this landlord
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new AppError('Property not found', 404);
    if (property.landlordId !== req.user!.id) throw new AppError('Access denied', 403);

    // Verify user is a tenant
    const tenant = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!tenant) throw new AppError('User not found', 404);
    if (tenant.role !== UserRole.TENANT) throw new AppError('User is not a tenant', 400);

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { linkedPropertyId: propertyId },
      select: { id: true, name: true, email: true, role: true, linkedPropertyId: true },
    });

    res.json({ success: true, data: updated });
  }
);

// ─── Lookup User by Invite Code ───────────────────────────────────────────────

usersRouter.get('/invite/:code', async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { inviteCode: req.params.code },
    select: {
      id: true,
      name: true,
      role: true,
      inviteCode: true,
      linkedPropertyId: true,
    },
  });

  if (!user) throw new AppError('Invite code not found', 404);

  res.json({ success: true, data: user });
});
