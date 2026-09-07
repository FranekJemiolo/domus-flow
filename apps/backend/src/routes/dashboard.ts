/**
 * Dashboard Routes
 * GET /api/dashboard/stats   - Landlord stats aggregation
 * GET /api/dashboard/export  - Export repair logs as JSON (for CSV generation on frontend)
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { UserRole, TicketStatus, TicketUrgency } from '@domus-flow/shared';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

// ─── Stats ────────────────────────────────────────────────────────────────────

dashboardRouter.get(
  '/stats',
  requireRole(UserRole.LANDLORD),
  async (req: Request, res: Response): Promise<void> => {
    const landlordId = req.user!.id;

    const [properties, allTickets] = await Promise.all([
      prisma.property.findMany({
        where: { landlordId },
        include: { _count: { select: { tenants: true } } },
      }),
      prisma.ticket.findMany({
        where: { property: { landlordId } },
      }),
    ]);

    const totalTenants = properties.reduce((sum, p) => sum + p._count.tenants, 0);

    const ticketsByStatus = Object.values(TicketStatus).reduce(
      (acc, s) => {
        acc[s] = allTickets.filter((t) => t.status === s).length;
        return acc;
      },
      {} as Record<TicketStatus, number>
    );

    const ticketsByUrgency = Object.values(TicketUrgency).reduce(
      (acc, u) => {
        acc[u] = allTickets.filter((t) => t.urgency === u).length;
        return acc;
      },
      {} as Record<TicketUrgency, number>
    );

    res.json({
      success: true,
      data: {
        totalProperties: properties.length,
        totalTenants,
        openTickets: allTickets.filter((t) => t.status !== TicketStatus.RESOLVED).length,
        resolvedTickets: ticketsByStatus[TicketStatus.RESOLVED],
        criticalTickets: ticketsByUrgency[TicketUrgency.CRITICAL],
        ticketsByStatus,
        ticketsByUrgency,
      },
    });
  }
);

// ─── Export Repair Logs ────────────────────────────────────────────────────────

dashboardRouter.get(
  '/export',
  requireRole(UserRole.LANDLORD),
  async (req: Request, res: Response): Promise<void> => {
    const tickets = await prisma.ticket.findMany({
      where: { property: { landlordId: req.user!.id } },
      include: {
        property: { select: { address: true, unitNumber: true } },
        tenant: { select: { name: true } },
        contractor: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const exportData = tickets.map((t) => ({
      ticketId: t.id,
      property: t.property.address,
      unit: t.property.unitNumber,
      title: t.title,
      description: t.description,
      urgency: t.urgency,
      status: t.status,
      tenant: t.tenant.name,
      contractor: t.contractor?.name || '',
      eta: t.eta || '',
      costAcknowledged: t.costAcknowledged ? 'Yes' : 'No',
      createdAt: t.createdAt.toISOString(),
      resolvedAt: t.status === TicketStatus.RESOLVED ? t.updatedAt.toISOString() : '',
    }));

    res.json({ success: true, data: exportData });
  }
);
