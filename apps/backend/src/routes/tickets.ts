/**
 * Tickets Routes
 * GET    /api/tickets          - List tickets (role-filtered)
 * POST   /api/tickets          - Create ticket (Tenant only)
 * GET    /api/tickets/:id      - Get single ticket
 * PATCH  /api/tickets/:id      - Update ticket (Landlord/Contractor)
 * DELETE /api/tickets/:id      - Delete ticket (Landlord only)
 */

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { UserRole, TicketUrgency, TicketStatus } from '@domus-flow/shared';

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

// ─── List Tickets ─────────────────────────────────────────────────────────────

ticketsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { propertyId, status, urgency } = req.query as {
    propertyId?: string;
    status?: TicketStatus;
    urgency?: TicketUrgency;
  };

  type WhereClause = {
    propertyId?: string;
    status?: TicketStatus;
    urgency?: TicketUrgency;
    tenantId?: string;
    contractorId?: string;
    property?: { landlordId: string };
  };

  const where: WhereClause = {};
  if (propertyId) where.propertyId = propertyId;
  if (status) where.status = status;
  if (urgency) where.urgency = urgency;

  if (user.role === UserRole.TENANT) {
    where.tenantId = user.id;
  } else if (user.role === UserRole.CONTRACTOR) {
    where.contractorId = user.id;
  } else if (user.role === UserRole.LANDLORD) {
    where.property = { landlordId: user.id };
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      property: { select: { id: true, address: true, unitNumber: true } },
      tenant: { select: { id: true, name: true } },
      contractor: { select: { id: true, name: true } },
    },
    orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
  });

  res.json({ success: true, data: tickets });
});

// ─── Create Ticket ────────────────────────────────────────────────────────────

ticketsRouter.post(
  '/',
  requireRole(UserRole.TENANT),
  [
    body('propertyId').isUUID().withMessage('Valid property ID required'),
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('urgency')
      .optional()
      .isIn(Object.values(TicketUrgency))
      .withMessage('Invalid urgency level'),
    body('photoUrls').optional().isArray(),
    body('photoUrls.*').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: errors.mapped() });
      return;
    }

    const { propertyId, title, description, urgency, photoUrls } = req.body as {
      propertyId: string;
      title: string;
      description: string;
      urgency?: TicketUrgency;
      photoUrls?: string[];
    };

    // Verify the tenant is linked to this property
    const userRecord = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (userRecord?.linkedPropertyId !== propertyId) {
      throw new AppError('You can only create tickets for your linked property', 403);
    }

    const ticket = await prisma.ticket.create({
      data: {
        propertyId,
        tenantId: req.user!.id,
        title,
        description,
        urgency: urgency || TicketUrgency.MEDIUM,
        photoUrls: photoUrls || [],
      },
      include: {
        property: { select: { id: true, address: true, unitNumber: true } },
        tenant: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: ticket });
  }
);

// ─── Get Ticket ───────────────────────────────────────────────────────────────

ticketsRouter.get(
  '/:id',
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        property: { select: { id: true, address: true, unitNumber: true, landlordId: true } },
        tenant: { select: { id: true, name: true, email: true } },
        contractor: { select: { id: true, name: true, email: true } },
      },
    });

    if (!ticket) throw new AppError('Ticket not found', 404);

    const user = req.user!;
    const canAccess =
      ticket.tenantId === user.id ||
      ticket.contractorId === user.id ||
      ticket.property.landlordId === user.id;

    if (!canAccess) throw new AppError('Access denied', 403);

    res.json({ success: true, data: ticket });
  }
);

// ─── Update Ticket ────────────────────────────────────────────────────────────

ticketsRouter.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('status').optional().isIn(Object.values(TicketStatus)),
    body('urgency').optional().isIn(Object.values(TicketUrgency)),
    body('contractorId').optional({ values: 'null' }).isUUID(),
    body('eta').optional({ values: 'null' }).isString(),
    body('costAcknowledged').optional().isBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: errors.mapped() });
      return;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: { property: { select: { landlordId: true } } },
    });

    if (!ticket) throw new AppError('Ticket not found', 404);

    const user = req.user!;
    const isLandlord = ticket.property.landlordId === user.id;
    const isContractor = ticket.contractorId === user.id;
    const isTenant = ticket.tenantId === user.id;

    if (!isLandlord && !isContractor && !isTenant) {
      throw new AppError('Access denied', 403);
    }

    // Cost acknowledged can only be set by landlord, and cannot be unset
    if (req.body.costAcknowledged && !isLandlord) {
      throw new AppError('Only landlords can acknowledge costs', 403);
    }
    if (ticket.costAcknowledged && req.body.costAcknowledged === false) {
      throw new AppError('Cost acknowledgment cannot be reversed', 400);
    }

    const { status, urgency, contractorId, eta, costAcknowledged } = req.body as {
      status?: TicketStatus;
      urgency?: TicketUrgency;
      contractorId?: string | null;
      eta?: string | null;
      costAcknowledged?: boolean;
    };

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(urgency && { urgency }),
        ...('contractorId' in req.body && { contractorId }),
        ...('eta' in req.body && { eta }),
        ...(costAcknowledged !== undefined && { costAcknowledged }),
      },
      include: {
        property: { select: { id: true, address: true, unitNumber: true } },
        tenant: { select: { id: true, name: true } },
        contractor: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: updated });
  }
);

// ─── Delete Ticket ────────────────────────────────────────────────────────────

ticketsRouter.delete(
  '/:id',
  requireRole(UserRole.LANDLORD),
  [param('id').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: { property: { select: { landlordId: true } } },
    });

    if (!ticket) throw new AppError('Ticket not found', 404);
    if (ticket.property.landlordId !== req.user!.id) throw new AppError('Access denied', 403);

    await prisma.ticket.delete({ where: { id: req.params.id } });

    res.json({ success: true, data: { message: 'Ticket deleted' } });
  }
);
