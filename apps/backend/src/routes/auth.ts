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
import { UserRole, AuthProvider, UserStatus } from '@prisma/client';

export const authRouter = Router();

// Helper to sanitize user object for responses
const sanitizeUser = (user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  inviteCode: string;
  linkedPropertyId: string | null;
  authProvider: AuthProvider;
  authProviderId: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt?: Date;
}) => ({
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
  updatedAt: user.updatedAt ? user.updatedAt.toISOString() : user.createdAt.toISOString(),
});

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
      data: {
        name,
        email,
        passwordHash,
        role,
        inviteCode: code,
        authProvider: AuthProvider.LOCAL,
        status: UserStatus.ACTIVE,
        lastLoginAt: new Date(),
      },
    });

    // Record audit log
    await prisma.userLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || null,
        userAgent: req.headers['user-agent'] || null,
        details: { provider: 'LOCAL', role: user.role },
      },
    });

    const token = createJwt({ id: user.id, email: user.email, role: user.role, name: user.name });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: sanitizeUser(user),
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

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError('This account has been suspended. Please contact management.', 403);
    }

    if (!user.passwordHash) {
      throw new AppError(
        `This account was created with ${user.authProvider} SSO. Please sign in with ${user.authProvider}.`,
        400
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid email or password', 401);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Record login audit log
    await prisma.userLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_LOCAL',
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || null,
        userAgent: req.headers['user-agent'] || null,
        details: { email: user.email },
      },
    });

    const token = createJwt({ id: user.id, email: user.email, role: user.role, name: user.name });

    res.json({
      success: true,
      data: {
        token,
        user: sanitizeUser(updatedUser),
      },
    });
  }
);

// ─── SSO (Apple, Google, Facebook) ───────────────────────────────────────────

authRouter.post(
  '/sso',
  [
    body('provider')
      .isIn(['GOOGLE', 'APPLE', 'FACEBOOK'])
      .withMessage('Provider must be GOOGLE, APPLE, or FACEBOOK'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role'),
    body('authProviderId').optional().trim(),
    body('avatarUrl').optional().trim(),
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

    const { provider, email, name, role, authProviderId, avatarUrl, inviteCode } = req.body as {
      provider: 'GOOGLE' | 'APPLE' | 'FACEBOOK';
      email: string;
      name: string;
      role?: UserRole;
      authProviderId?: string;
      avatarUrl?: string;
      inviteCode?: string;
    };

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      if (user.status === UserStatus.SUSPENDED) {
        throw new AppError('This account has been suspended. Please contact management.', 403);
      }

      // Update last login and avatar if missing
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          avatarUrl: user.avatarUrl || avatarUrl,
          authProviderId: user.authProviderId || authProviderId,
        },
      });

      // Audit log for SSO login
      await prisma.userLog.create({
        data: {
          userId: user.id,
          action: `LOGIN_SSO_${provider}`,
          ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || null,
          userAgent: req.headers['user-agent'] || null,
          details: { provider, email },
        },
      });
    } else {
      // Auto-register new SSO user
      const code =
        inviteCode || `${name.toUpperCase().replace(/\s/g, '')}-${Date.now()}`.slice(0, 20);

      user = await prisma.user.create({
        data: {
          name,
          email,
          role: role || UserRole.TENANT,
          authProvider: provider as AuthProvider,
          authProviderId: authProviderId || null,
          avatarUrl: avatarUrl || null,
          status: UserStatus.ACTIVE,
          inviteCode: code,
          lastLoginAt: new Date(),
        },
      });

      // Audit logs for SSO registration and login
      await prisma.userLog.create({
        data: {
          userId: user.id,
          action: `REGISTER_SSO_${provider}`,
          ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || null,
          userAgent: req.headers['user-agent'] || null,
          details: { provider, email, role: user.role },
        },
      });

      await prisma.userLog.create({
        data: {
          userId: user.id,
          action: `LOGIN_SSO_${provider}`,
          ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || null,
          userAgent: req.headers['user-agent'] || null,
          details: { provider, email },
        },
      });
    }

    const token = createJwt({ id: user.id, email: user.email, role: user.role, name: user.name });

    res.json({
      success: true,
      data: {
        token,
        user: sanitizeUser(user),
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
    data: sanitizeUser(user),
  });
});
