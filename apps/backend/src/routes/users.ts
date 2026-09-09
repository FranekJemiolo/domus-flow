/**
 * Users & User Management Routes
 * GET    /api/users/invite/:code      - Lookup user by invite code (Public)
 * GET    /api/users                   - List & filter users (Landlord / Admin)
 * GET    /api/users/logs/all          - Query all audit activity logs (Landlord / Admin)
 * GET    /api/users/:id               - Get user by ID (Self, Landlord, Admin)
 * GET    /api/users/:id/logs          - Get user audit logs (Self, Landlord, Admin)
 * PATCH  /api/users/:id               - Update user details, role, status, property (Landlord / Admin)
 * PATCH  /api/users/:id/link-property - Link tenant to a property
 * DELETE /api/users/:id               - Delete user (Landlord / Admin)
 */

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { UserRole, UserStatus, AuthProvider } from '@prisma/client';

export const usersRouter = Router();

// ─── Public: Lookup User by Invite Code ────────────────────────────────────────

usersRouter.get('/invite/:code', async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { inviteCode: req.params.code },
    select: {
      id: true,
      name: true,
      role: true,
      inviteCode: true,
      linkedPropertyId: true,
      authProvider: true,
      status: true,
    },
  });

  if (!user) throw new AppError('Invite code not found', 404);

  res.json({ success: true, data: user });
});

// All routes below require authentication
usersRouter.use(requireAuth);

// ─── List Users with Filters (Landlord or Admin) ──────────────────────────────

usersRouter.get(
  '/',
  requireRole(UserRole.LANDLORD, UserRole.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    const { role, status, authProvider, search } = req.query as {
      role?: UserRole;
      status?: UserStatus;
      authProvider?: AuthProvider;
      search?: string;
    };

    const whereClause: Record<string, unknown> = {};

    if (role && Object.values(UserRole).includes(role)) {
      whereClause.role = role;
    }
    if (status && Object.values(UserStatus).includes(status)) {
      whereClause.status = status;
    }
    if (authProvider && Object.values(AuthProvider).includes(authProvider)) {
      whereClause.authProvider = authProvider;
    }
    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { inviteCode: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        inviteCode: true,
        linkedPropertyId: true,
        authProvider: true,
        authProviderId: true,
        avatarUrl: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        linkedProperty: {
          select: {
            id: true,
            address: true,
            unitNumber: true,
          },
        },
        _count: {
          select: {
            tenantTickets: true,
            contractorTickets: true,
            logs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      inviteCode: u.inviteCode,
      linkedPropertyId: u.linkedPropertyId,
      authProvider: u.authProvider,
      authProviderId: u.authProviderId,
      avatarUrl: u.avatarUrl,
      status: u.status,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      linkedProperty: u.linkedProperty,
      ticketCount: u._count.tenantTickets + u._count.contractorTickets,
      logCount: u._count.logs,
    }));

    res.json({ success: true, data: formatted });
  }
);

// ─── Query Global Audit Activity Logs ─────────────────────────────────────────

usersRouter.get(
  '/logs/all',
  requireRole(UserRole.LANDLORD, UserRole.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const logs = await prisma.userLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        action: l.action,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        details: l.details,
        createdAt: l.createdAt.toISOString(),
        user: l.user,
      })),
    });
  }
);

// ─── Get User by ID ───────────────────────────────────────────────────────────

usersRouter.get(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        linkedProperty: {
          select: { id: true, address: true, unitNumber: true },
        },
        logs: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) throw new AppError('User not found', 404);

    const requester = req.user!;
    if (
      requester.id !== req.params.id &&
      requester.role !== UserRole.LANDLORD &&
      requester.role !== UserRole.ADMIN
    ) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        inviteCode: user.inviteCode,
        linkedPropertyId: user.linkedPropertyId,
        authProvider: user.authProvider,
        authProviderId: user.authProviderId,
        avatarUrl: user.avatarUrl,
        status: user.status,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        linkedProperty: user.linkedProperty,
        logs: user.logs.map((l) => ({
          id: l.id,
          action: l.action,
          ipAddress: l.ipAddress,
          userAgent: l.userAgent,
          details: l.details,
          createdAt: l.createdAt.toISOString(),
        })),
      },
    });
  }
);

// ─── Get Specific User Audit Logs ────────────────────────────────────────────

usersRouter.get(
  '/:id/logs',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const requester = req.user!;
    if (
      requester.id !== req.params.id &&
      requester.role !== UserRole.LANDLORD &&
      requester.role !== UserRole.ADMIN
    ) {
      throw new AppError('Access denied', 403);
    }

    const logs = await prisma.userLog.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        action: l.action,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        details: l.details,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  }
);

// ─── Update User Details, Role, Status, Property ─────────────────────────────

usersRouter.patch(
  '/:id',
  requireRole(UserRole.LANDLORD, UserRole.ADMIN),
  [
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(Object.values(UserRole)),
    body('status').optional().isIn(Object.values(UserStatus)),
    body('linkedPropertyId').optional({ nullable: true }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: errors.mapped() });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError('User not found', 404);

    const { name, email, role, status, linkedPropertyId } = req.body as {
      name?: string;
      email?: string;
      role?: UserRole;
      status?: UserStatus;
      linkedPropertyId?: string | null;
    };

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email && email !== user.email) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) throw new AppError('Email already in use', 409);
      updateData.email = email;
    }
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (linkedPropertyId !== undefined) updateData.linkedPropertyId = linkedPropertyId;

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        linkedProperty: {
          select: { id: true, address: true, unitNumber: true },
        },
      },
    });

    // Record audit logs for changes
    if (status && status !== user.status) {
      await prisma.userLog.create({
        data: {
          userId: user.id,
          action: 'STATUS_CHANGE',
          ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || null,
          userAgent: req.headers['user-agent'] || null,
          details: { previousStatus: user.status, newStatus: status, changedBy: req.user!.id },
        },
      });
    }

    if (role && role !== user.role) {
      await prisma.userLog.create({
        data: {
          userId: user.id,
          action: 'ROLE_CHANGE',
          ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || null,
          userAgent: req.headers['user-agent'] || null,
          details: { previousRole: user.role, newRole: role, changedBy: req.user!.id },
        },
      });
    }

    await prisma.userLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_USER',
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || null,
        userAgent: req.headers['user-agent'] || null,
        details: { fields: Object.keys(updateData), updatedBy: req.user!.id },
      },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        inviteCode: updated.inviteCode,
        linkedPropertyId: updated.linkedPropertyId,
        authProvider: updated.authProvider,
        status: updated.status,
        avatarUrl: updated.avatarUrl,
        lastLoginAt: updated.lastLoginAt ? updated.lastLoginAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        linkedProperty: updated.linkedProperty,
      },
    });
  }
);

// ─── Link Tenant to Property ─────────────────────────────────────────────────

usersRouter.patch(
  '/:id/link-property',
  requireRole(UserRole.LANDLORD, UserRole.ADMIN),
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

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new AppError('Property not found', 404);
    if (req.user!.role !== UserRole.ADMIN && property.landlordId !== req.user!.id) {
      throw new AppError('Access denied', 403);
    }

    const tenant = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!tenant) throw new AppError('User not found', 404);
    if (tenant.role !== UserRole.TENANT) throw new AppError('User is not a tenant', 400);

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { linkedPropertyId: propertyId },
      select: { id: true, name: true, email: true, role: true, linkedPropertyId: true },
    });

    await prisma.userLog.create({
      data: {
        userId: tenant.id,
        action: 'PROPERTY_LINKED',
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || null,
        userAgent: req.headers['user-agent'] || null,
        details: { propertyId, address: property.address, unitNumber: property.unitNumber },
      },
    });

    res.json({ success: true, data: updated });
  }
);

// ─── Delete User ─────────────────────────────────────────────────────────────

usersRouter.delete(
  '/:id',
  requireRole(UserRole.LANDLORD, UserRole.ADMIN),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError('User not found', 404);

    // Prevent deleting oneself
    if (user.id === req.user!.id) {
      throw new AppError('Cannot delete your own account', 400);
    }

    await prisma.user.delete({ where: { id: req.params.id } });

    res.json({
      success: true,
      message: `User ${user.email} successfully deleted`,
    });
  }
);
