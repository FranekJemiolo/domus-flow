/**
 * Properties Integration Tests
 */

import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';

const app = createApp();

// Test helpers
async function registerAndLogin(
  role: 'LANDLORD' | 'TENANT' | 'CONTRACTOR',
  suffix: string
): Promise<{ token: string; userId: string }> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: `Test ${role} ${suffix}`,
      email: `${role.toLowerCase()}.${suffix}@test.com`,
      password: 'password123',
      role,
      inviteCode: `${role}-${suffix}-CODE`.toUpperCase(),
    });
  return { token: res.body.data.token, userId: res.body.data.user.id };
}

describe('Properties API', () => {
  let landlordToken: string;
  let tenantToken: string;
  let propertyId: string;

  beforeAll(async () => {
    await prisma.message.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();

    const landlord = await registerAndLogin('LANDLORD', 'prop1');
    landlordToken = landlord.token;
    const tenant = await registerAndLogin('TENANT', 'prop1');
    tenantToken = tenant.token;
  });

  afterAll(async () => {
    await prisma.message.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/properties', () => {
    it('landlord can create a property', async () => {
      const res = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ address: '10 Test Street', unitNumber: '1A' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.address).toBe('10 Test Street');
      propertyId = res.body.data.id;
    });

    it('tenant cannot create a property', async () => {
      const res = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ address: '20 Other St', unitNumber: '2B' });

      expect(res.status).toBe(403);
    });

    it('rejects missing address', async () => {
      const res = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ unitNumber: '3C' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/properties', () => {
    it('landlord sees their properties', async () => {
      const res = await request(app)
        .get('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/properties');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/properties/:id', () => {
    it('landlord can get their property', async () => {
      const res = await request(app)
        .get(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(propertyId);
    });

    it('returns 404 for non-existent property', async () => {
      const res = await request(app)
        .get('/api/properties/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/properties/bulk-import', () => {
    it('landlord can bulk import properties', async () => {
      const res = await request(app)
        .post('/api/properties/bulk-import')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          properties: [
            { address: '100 Bulk Ave', unitNumber: 'A1' },
            { address: '200 Bulk Ave', unitNumber: 'B2' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.imported).toBe(2);
    });
  });

  describe('PATCH /api/properties/:id', () => {
    it('landlord can update their property', async () => {
      const res = await request(app)
        .patch(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ address: '10 Updated Street' });

      expect(res.status).toBe(200);
      expect(res.body.data.address).toBe('10 Updated Street');
    });
  });

  describe('DELETE /api/properties/:id', () => {
    it('landlord can delete their property', async () => {
      const created = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ address: 'Delete Me St', unitNumber: '99' });

      const res = await request(app)
        .delete(`/api/properties/${created.body.data.id}`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
    });
  });
});
