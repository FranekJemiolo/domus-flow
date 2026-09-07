/**
 * Authentication Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me
 * POST /api/auth/logout (client-side token discard)
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { createJwt, requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

export const authRouter = Router();

// ─── Register ─────────────────────────────────────────────────────────────────

authRouter.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(Object.values(UserRole)).withMessage('Invalid role'),
    body('inviteCode').optional().trim(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: errors.mapped() });
      return;
    }

    const { name, email, password, role, inviteCode } = req.body as {
      name: string;
      email: string;
      password: string;
      role: UserRole;
      inviteCode?: string;
    };

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already registered', 409);

    // Generate invite code if not provided
    const code =
      inviteCode || `${name.toUpperCase().replace(/\s/g, '')}-${Date.now()}`.slice(0, 20);

    // Check invite code uniqueness
    const codeExists = await prisma.user.findUnique({ where: { inviteCode: code } });
    if (codeExists) throw new AppError('Invite code already in use', 409);

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, inviteCode: code },
    });

    const token = createJwt({ id: user.id, email: user.email, role: user.role, name: user.name });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          inviteCode: user.inviteCode,
          linkedPropertyId: user.linkedPropertyId,
          createdAt: user.createdAt.toISOString(),
        },
      },
    });
  }
);

// ─── Login ────────────────────────────────────────────────────────────────────

authRouter.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ success: false, error: 'Validation failed', details: errors.mapped() });
      return;
    }

    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('Invalid email or password', 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid email or password', 401);

    const token = createJwt({ id: user.id, email: user.email, role: user.role, name: user.name });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          inviteCode: user.inviteCode,
          linkedPropertyId: user.linkedPropertyId,
          createdAt: user.createdAt.toISOString(),
        },
      },
    });
  }
);

// ─── Me ───────────────────────────────────────────────────────────────────────

authRouter.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new AppError('User not found', 404);

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      inviteCode: user.inviteCode,
      linkedPropertyId: user.linkedPropertyId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  });
});
