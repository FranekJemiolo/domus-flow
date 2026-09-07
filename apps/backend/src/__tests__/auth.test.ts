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
