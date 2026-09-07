/**
 * Messages Integration Tests
 * Tests the dual-channel chat system
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
      email: `${role.toLowerCase()}.${suffix}.msg@test.com`,
      password: 'password123',
      role,
      inviteCode: `MSG-${role}-${suffix}`.toUpperCase(),
    });
  return { token: res.body.data.token, userId: res.body.data.user.id };
}

describe('Messages API (Dual-Channel Chat)', () => {
  let landlordToken: string;
  let landlordId: string;
  let tenantToken: string;
  let tenantId: string;
  let contractorId: string;
  let propertyId: string;
  let ticketId: string;

  beforeAll(async () => {
    await prisma.message.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();

    const landlord = await registerAndLogin('LANDLORD', 'msg1');
    landlordToken = landlord.token;
    landlordId = landlord.userId;

    const tenant = await registerAndLogin('TENANT', 'msg1');
    tenantToken = tenant.token;
    tenantId = tenant.userId;

    const contractor = await registerAndLogin('CONTRACTOR', 'msg1');
    contractorId = contractor.userId;

    // Create property and link tenant
    const propRes = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ address: '7 Chat Lane', unitNumber: '1M' });
    propertyId = propRes.body.data.id;

    await prisma.user.update({
      where: { id: tenantId },
      data: { linkedPropertyId: propertyId },
    });

    // Create a ticket for "Share to Chat" tests
    const ticketRes = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ propertyId, title: 'Chat test ticket', description: 'Test', urgency: 'MEDIUM' });
    ticketId = ticketRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.message.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/messages (Tenant-Landlord channel)', () => {
    it('tenant can send a message to landlord', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          threadType: 'TENANT_LANDLORD',
          receiverId: landlordId,
          content: 'Hello landlord, I have a question about my unit.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Hello landlord, I have a question about my unit.');
      expect(res.body.data.threadType).toBe('TENANT_LANDLORD');
    });

    it('landlord can reply to tenant', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          threadType: 'TENANT_LANDLORD',
          receiverId: tenantId,
          content: 'Of course, what is the issue?',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.senderId).toBe(landlordId);
    });

    it('tenant can share a ticket card in chat (linkedTicketId)', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          threadType: 'TENANT_LANDLORD',
          receiverId: landlordId,
          content: 'Here is the repair ticket I was talking about:',
          linkedTicketId: ticketId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.linkedTicketId).toBe(ticketId);
      expect(res.body.data.linkedTicket).toBeDefined();
      expect(res.body.data.linkedTicket.title).toBe('Chat test ticket');
    });
  });

  describe('POST /api/messages (Landlord-Contractor channel)', () => {
    it('landlord can send a message to contractor', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          threadType: 'LANDLORD_CONTRACTOR',
          receiverId: contractorId,
          content: 'Mike, can you check the boiler on Tuesday?',
          linkedTicketId: ticketId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.threadType).toBe('LANDLORD_CONTRACTOR');
    });

    it('tenant cannot use the landlord-contractor channel', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          threadType: 'LANDLORD_CONTRACTOR',
          receiverId: contractorId,
          content: 'Tenant sneaking in contractor channel',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/messages/thread/:threadType/:otherId', () => {
    it('retrieves tenant-landlord thread', async () => {
      const res = await request(app)
        .get(`/api/messages/thread/TENANT_LANDLORD/${landlordId}`)
        .set('Authorization', `Bearer ${tenantToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Messages should only be between these two parties
      res.body.data.forEach((m: { senderId: string; receiverId: string }) => {
        const isValid =
          (m.senderId === tenantId && m.receiverId === landlordId) ||
          (m.senderId === landlordId && m.receiverId === tenantId);
        expect(isValid).toBe(true);
      });
    });

    it('retrieves landlord-contractor thread', async () => {
      const res = await request(app)
        .get(`/api/messages/thread/LANDLORD_CONTRACTOR/${contractorId}`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`/api/messages/thread/TENANT_LANDLORD/${landlordId}`);
      expect(res.status).toBe(401);
    });
  });

  describe('Message validation', () => {
    it('rejects empty content', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          threadType: 'TENANT_LANDLORD',
          receiverId: landlordId,
          content: '',
        });

      expect(res.status).toBe(400);
    });

    it('rejects invalid thread type', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          threadType: 'INVALID_THREAD',
          receiverId: landlordId,
          content: 'Test',
        });

      expect(res.status).toBe(400);
    });

    it('rejects linked ticket that does not exist', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          threadType: 'TENANT_LANDLORD',
          receiverId: landlordId,
          content: 'Missing ticket',
          linkedTicketId: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(404);
    });
  });
});
