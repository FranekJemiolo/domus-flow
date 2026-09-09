/**
 * Auth Integration Tests
 * Runs against a real PostgreSQL test database
 */

import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';

const app = createApp();

describe('POST /api/auth/register', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.message.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('registers a new landlord and returns a JWT', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Landlord',
      email: 'landlord@test.com',
      password: 'password123',
      role: 'LANDLORD',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('LANDLORD');
    expect(res.body.data.user.email).toBe('landlord@test.com');
    expect(res.body.data.user.inviteCode).toBeDefined();
    // Password hash must NOT be in response
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('registers a new tenant with a custom invite code', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Tenant',
      email: 'tenant@test.com',
      password: 'password123',
      role: 'TENANT',
      inviteCode: 'UNIT5C-2026',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.inviteCode).toBe('UNIT5C-2026');
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'First User',
      email: 'dup@test.com',
      password: 'password123',
      role: 'LANDLORD',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Second User',
      email: 'dup@test.com',
      password: 'password123',
      role: 'TENANT',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects invalid email format', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad Email',
      email: 'not-an-email',
      password: 'password123',
      role: 'LANDLORD',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Short Pass',
      email: 'short@test.com',
      password: 'abc',
      role: 'LANDLORD',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany();
    await request(app).post('/api/auth/register').send({
      name: 'Login Test User',
      email: 'login@test.com',
      password: 'password123',
      role: 'LANDLORD',
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let token: string;

  beforeAll(async () => {
    await prisma.user.deleteMany();
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Me Test',
      email: 'me@test.com',
      password: 'password123',
      role: 'TENANT',
    });
    token = reg.body.data.token;
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('returns current user with valid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('me@test.com');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/sso', () => {
  beforeEach(async () => {
    await prisma.userLog.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.userLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('provisions a new user when signing in with Google SSO', async () => {
    const res = await request(app).post('/api/auth/sso').send({
      provider: 'GOOGLE',
      email: 'sso.google@example.com',
      name: 'Google User',
      role: 'TENANT',
      avatarUrl: 'https://lh3.googleusercontent.com/a/test',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('sso.google@example.com');
    expect(res.body.data.user.authProvider).toBe('GOOGLE');
    expect(res.body.data.user.status).toBe('ACTIVE');

    // Confirm audit logs were recorded
    const logs = await prisma.userLog.findMany({
      where: { userId: res.body.data.user.id },
    });
    expect(logs.some((l) => l.action === 'REGISTER_SSO_GOOGLE')).toBe(true);
    expect(logs.some((l) => l.action === 'LOGIN_SSO_GOOGLE')).toBe(true);
  });

  it('logs in an existing user with Apple SSO', async () => {
    // First register via Apple SSO
    await request(app).post('/api/auth/sso').send({
      provider: 'APPLE',
      email: 'sso.apple@example.com',
      name: 'Apple User',
      role: 'LANDLORD',
    });

    // Login again with Apple SSO
    const res = await request(app).post('/api/auth/sso').send({
      provider: 'APPLE',
      email: 'sso.apple@example.com',
      name: 'Apple User',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('sso.apple@example.com');
    expect(res.body.data.user.role).toBe('LANDLORD');
  });

  it('rejects suspended accounts from SSO', async () => {
    // Create suspended user
    const user = await prisma.user.create({
      data: {
        name: 'Suspended User',
        email: 'suspended@example.com',
        role: 'TENANT',
        inviteCode: 'SUSP-01',
        authProvider: 'FACEBOOK',
        status: 'SUSPENDED',
      },
    });

    const res = await request(app).post('/api/auth/sso').send({
      provider: 'FACEBOOK',
      email: user.email,
      name: user.name,
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('suspended');
  });
});
