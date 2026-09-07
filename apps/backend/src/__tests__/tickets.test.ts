/**
 * Tickets Integration Tests
 */

import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';

const app = createApp();

async function registerAndLogin(
  role: 'LANDLORD' | 'TENANT' | 'CONTRACTOR',
  suffix: string
): Promise<{ token: string; userId: string }> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: `${role} ${suffix}`,
      email: `${role.toLowerCase()}.${suffix}.tkt@test.com`,
      password: 'password123',
      role,
      inviteCode: `TKT-${role}-${suffix}`.toUpperCase(),
    });
  return { token: res.body.data.token, userId: res.body.data.user.id };
}

describe('Tickets API', () => {
  let landlordToken: string;
  let tenantToken: string;
  let tenantUserId: string;
  let contractorToken: string;
  let contractorUserId: string;
  let propertyId: string;
  let ticketId: string;

  beforeAll(async () => {
    await prisma.message.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();

    const landlord = await registerAndLogin('LANDLORD', 'tkt1');
    landlordToken = landlord.token;

    const tenant = await registerAndLogin('TENANT', 'tkt1');
    tenantToken = tenant.token;
    tenantUserId = tenant.userId;

    const contractor = await registerAndLogin('CONTRACTOR', 'tkt1');
    contractorToken = contractor.token;
    contractorUserId = contractor.userId;

    // Create property
    const propRes = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ address: '5 Ticket Lane', unitNumber: '3A' });
    propertyId = propRes.body.data.id;

    // Link tenant to property
    await prisma.user.update({
      where: { id: tenantUserId },
      data: { linkedPropertyId: propertyId },
    });
  });

  afterAll(async () => {
    await prisma.message.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/tickets', () => {
    it('tenant can create a ticket for their linked property', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId,
          title: 'Leaking tap',
          description: 'The kitchen tap drips constantly',
          urgency: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Leaking tap');
      expect(res.body.data.status).toBe('REPORTED');
      ticketId = res.body.data.id;
    });

    it('landlord cannot create a ticket (TENANT only)', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId,
          title: 'Landlord ticket',
          description: 'Should fail',
          urgency: 'LOW',
        });

      expect(res.status).toBe(403);
    });

    it('tenant cannot create ticket for unlinked property', async () => {
      const otherProp = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ address: '99 Other St', unitNumber: 'Z9' });

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId: otherProp.body.data.id,
          title: 'Unauthorized',
          description: 'Should fail',
          urgency: 'LOW',
        });

      expect(res.status).toBe(403);
    });

    it('rejects empty title', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ propertyId, title: '', description: 'Something', urgency: 'LOW' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tickets', () => {
    it('landlord sees all their property tickets', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('tenant only sees their own tickets', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((t: { tenantId: string }) => {
        expect(t.tenantId).toBe(tenantUserId);
      });
    });
  });

  describe('PATCH /api/tickets/:id', () => {
    it('landlord can update ticket status', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ status: 'IN_PROGRESS', eta: 'Friday 3pm' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('IN_PROGRESS');
      expect(res.body.data.eta).toBe('Friday 3pm');
    });

    it('landlord can assign a contractor', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ contractorId: contractorUserId });

      expect(res.status).toBe(200);
      expect(res.body.data.contractorId).toBe(contractorUserId);
    });

    it('landlord can acknowledge cost', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ costAcknowledged: true });

      expect(res.status).toBe(200);
      expect(res.body.data.costAcknowledged).toBe(true);
    });

    it('cost acknowledgment cannot be reversed', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ costAcknowledged: false });

      expect(res.status).toBe(400);
    });

    it('tenant cannot acknowledge cost', async () => {
      // Create a fresh ticket
      const newTicket = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ propertyId, title: 'Cost test', description: 'Test', urgency: 'LOW' });

      const res = await request(app)
        .patch(`/api/tickets/${newTicket.body.data.id}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ costAcknowledged: true });

      expect(res.status).toBe(403);
    });

    it('contractor cannot access unassigned ticket', async () => {
      const newTicket = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ propertyId, title: 'Unassigned', description: 'Test', urgency: 'LOW' });

      const res = await request(app)
        .patch(`/api/tickets/${newTicket.body.data.id}`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/tickets?propertyId=...', () => {
    it('filters tickets by property', async () => {
      const res = await request(app)
        .get(`/api/tickets?propertyId=${propertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((t: { propertyId: string }) => {
        expect(t.propertyId).toBe(propertyId);
      });
    });
  });
});
