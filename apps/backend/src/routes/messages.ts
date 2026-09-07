/**
 * Messages Routes - Dual-Channel Chat
 * GET  /api/messages/thread/:threadType/:otherId  - Get thread messages
 * POST /api/messages                               - Send a message
 * GET  /api/messages                               - List all threads for user
 */

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { MessageThreadType, UserRole } from '@domus-flow/shared';

export const messagesRouter = Router();

messagesRouter.use(requireAuth);

// ─── Get Thread ───────────────────────────────────────────────────────────────

messagesRouter.get(
  '/thread/:threadType/:otherId',
  [param('threadType').isIn(Object.values(MessageThreadType)), param('otherId').isUUID()],
  async (req: Request, res: Response): Promise<void> => {
    const { threadType, otherId } = req.params as {
      threadType: MessageThreadType;
      otherId: string;
    };
    const userId = req.user!.id;

    const messages = await prisma.message.findMany({
      where: {
        threadType,
        OR: [
          { senderId: userId, receiverId: otherId },
          { senderId: otherId, receiverId: userId },
        ],
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        linkedTicket: {
          select: { id: true, title: true, status: true, urgency: true },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    res.json({ success: true, data: messages });
  }
);

// ─── List Threads ─────────────────────────────────────────────────────────────

messagesRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  // Get latest message per unique (threadType, otherUser) pair
  const sentMessages = await prisma.message.findMany({
    where: { senderId: userId },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
    orderBy: { timestamp: 'desc' },
    distinct: ['receiverId', 'threadType'],
  });

  const receivedMessages = await prisma.message.findMany({
    where: { receiverId: userId },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
    orderBy: { timestamp: 'desc' },
    distinct: ['senderId', 'threadType'],
  });

  res.json({ success: true, data: { sent: sentMessages, received: receivedMessages } });
});

// ─── Send Message ─────────────────────────────────────────────────────────────

messagesRouter.post(
  '/',
  [
    body('threadType').isIn(Object.values(MessageThreadType)).withMessage('Invalid thread type'),
    body('receiverId').isUUID().withMessage('Valid receiver ID required'),
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Message content is required')
      .isLength({ max: 5000 }),
    body('linkedTicketId').optional({ values: 'null' }).isUUID(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: errors.mapped() });
      return;
    }

    const { threadType, receiverId, content, linkedTicketId } = req.body as {
      threadType: MessageThreadType;
      receiverId: string;
      content: string;
      linkedTicketId?: string | null;
    };

    const user = req.user!;

    // Validate thread type against sender role
    if (threadType === MessageThreadType.LANDLORD_CONTRACTOR && user.role === UserRole.TENANT) {
      throw new AppError('Tenants cannot use the Landlord-Contractor channel', 403);
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) throw new AppError('Receiver not found', 404);

    // If linked ticket, verify it exists and is accessible
    if (linkedTicketId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: linkedTicketId },
        include: { property: { select: { landlordId: true } } },
      });
      if (!ticket) throw new AppError('Linked ticket not found', 404);
    }

    const message = await prisma.message.create({
      data: {
        threadType,
        senderId: user.id,
        receiverId,
        content,
        linkedTicketId: linkedTicketId || null,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        linkedTicket: {
          select: { id: true, title: true, status: true, urgency: true },
        },
      },
    });

    res.status(201).json({ success: true, data: message });
  }
);
