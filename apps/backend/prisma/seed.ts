/**
 * Database Seeder
 * Populates the database with demo data matching the frontend demo mode
 * Run: npm run db:seed
 */

import {
  PrismaClient,
  UserRole,
  TicketUrgency,
  TicketStatus,
  MessageThreadType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Clean existing data ─────────────────────────────────────────────────
  await prisma.message.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing data');

  const hash = await bcrypt.hash('password123', 12);

  // ─── Create Landlord ─────────────────────────────────────────────────────
  const landlord = await prisma.user.create({
    data: {
      id: 'demo-user-landlord-001',
      role: UserRole.LANDLORD,
      name: 'Sarah Mitchell',
      email: 'landlord@domusflow.demo',
      passwordHash: hash,
      inviteCode: 'LANDLORD-DEMO',
    },
  });
  console.log(`👤 Landlord created: ${landlord.name}`);

  // ─── Create Contractor ────────────────────────────────────────────────────
  const contractor = await prisma.user.create({
    data: {
      id: 'demo-user-contractor-001',
      role: UserRole.CONTRACTOR,
      name: 'Mike Rodriguez',
      email: 'contractor@domusflow.demo',
      passwordHash: hash,
      inviteCode: 'CONTRACTOR-01',
    },
  });
  console.log(`🔧 Contractor created: ${contractor.name}`);

  // ─── Create Properties ────────────────────────────────────────────────────
  const mapleStreet = await prisma.property.create({
    data: {
      id: 'demo-prop-001',
      address: '42 Maple Street',
      unitNumber: '4B',
      landlordId: landlord.id,
    },
  });

  const oakAvenue = await prisma.property.create({
    data: {
      id: 'demo-prop-002',
      address: '18 Oak Avenue',
      unitNumber: '2A',
      landlordId: landlord.id,
    },
  });
  console.log(`🏠 Properties created: ${mapleStreet.address}, ${oakAvenue.address}`);

  // ─── Create Tenants ───────────────────────────────────────────────────────
  const tenantA = await prisma.user.create({
    data: {
      id: 'demo-user-tenant-001',
      role: UserRole.TENANT,
      name: 'James Chen',
      email: 'tenant.a@domusflow.demo',
      passwordHash: hash,
      inviteCode: 'UNIT4B-2026',
      linkedPropertyId: mapleStreet.id,
    },
  });

  const tenantB = await prisma.user.create({
    data: {
      id: 'demo-user-tenant-002',
      role: UserRole.TENANT,
      name: 'Priya Sharma',
      email: 'tenant.b@domusflow.demo',
      passwordHash: hash,
      inviteCode: 'UNIT2A-2026',
      linkedPropertyId: oakAvenue.id,
    },
  });
  console.log(`👥 Tenants created: ${tenantA.name}, ${tenantB.name}`);

  // ─── Create Tickets ───────────────────────────────────────────────────────
  const ticket1 = await prisma.ticket.create({
    data: {
      id: 'demo-ticket-001',
      propertyId: mapleStreet.id,
      tenantId: tenantA.id,
      contractorId: contractor.id,
      title: 'Leaking pipe under kitchen sink',
      description:
        "There is a constant drip from the pipe connection under the kitchen sink. It has been getting worse over the past 3 days and I'm worried about water damage.",
      urgency: TicketUrgency.HIGH,
      status: TicketStatus.IN_PROGRESS,
      eta: 'Thursday between 2-5pm',
      photoUrls: [],
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      id: 'demo-ticket-002',
      propertyId: mapleStreet.id,
      tenantId: tenantA.id,
      title: 'Broken bedroom door handle',
      description:
        'The door handle on the master bedroom door has snapped off. The door still closes but cannot be opened easily from inside.',
      urgency: TicketUrgency.MEDIUM,
      status: TicketStatus.REPORTED,
      photoUrls: [],
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      id: 'demo-ticket-003',
      propertyId: oakAvenue.id,
      tenantId: tenantB.id,
      title: 'No hot water',
      description:
        'The boiler seems to have failed. I have had no hot water since yesterday morning. This is urgent as I have young children.',
      urgency: TicketUrgency.CRITICAL,
      status: TicketStatus.SCHEDULED,
      contractorId: contractor.id,
      eta: 'Tomorrow 9am',
      photoUrls: [],
    },
  });

  const ticket4 = await prisma.ticket.create({
    data: {
      id: 'demo-ticket-004',
      propertyId: oakAvenue.id,
      tenantId: tenantB.id,
      title: 'Cracked bathroom tile',
      description:
        'One of the tiles in the bathroom has developed a crack. It is not urgent but should be replaced to prevent water getting underneath.',
      urgency: TicketUrgency.LOW,
      status: TicketStatus.RESOLVED,
      costAcknowledged: true,
      photoUrls: [],
    },
  });
  console.log(
    `🎫 Tickets created: ${ticket1.title}, ${ticket2.title}, ${ticket3.title}, ${ticket4.title}`
  );

  // ─── Create Messages ──────────────────────────────────────────────────────
  await prisma.message.create({
    data: {
      senderId: tenantA.id,
      receiverId: landlord.id,
      threadType: MessageThreadType.TENANT_LANDLORD,
      content: 'Hi Sarah, just wanted to follow up on the kitchen leak. Is Mike coming tomorrow?',
      linkedTicketId: ticket1.id,
    },
  });

  await prisma.message.create({
    data: {
      senderId: landlord.id,
      receiverId: tenantA.id,
      threadType: MessageThreadType.TENANT_LANDLORD,
      content:
        "Yes! Mike confirmed for Thursday between 2-5pm. I've updated the ticket with the ETA.",
    },
  });

  await prisma.message.create({
    data: {
      senderId: landlord.id,
      receiverId: contractor.id,
      threadType: MessageThreadType.LANDLORD_CONTRACTOR,
      content:
        "Mike, for the Maple Street job — can you also check the water pressure while you're there?",
      linkedTicketId: ticket1.id,
    },
  });

  await prisma.message.create({
    data: {
      senderId: contractor.id,
      receiverId: landlord.id,
      threadType: MessageThreadType.LANDLORD_CONTRACTOR,
      content:
        "Sure, no problem. I'll bring a pressure gauge. Parts for the pipe repair will be around £45.",
    },
  });

  console.log(`💬 Messages created`);

  console.log(`
✅ Seed complete!

Demo Login Credentials:
─────────────────────────────────────
Landlord:   landlord@domusflow.demo  / password123
Tenant A:   tenant.a@domusflow.demo  / password123 (invite: UNIT4B-2026)
Tenant B:   tenant.b@domusflow.demo  / password123 (invite: UNIT2A-2026)
Contractor: contractor@domusflow.demo/ password123 (invite: CONTRACTOR-01)
─────────────────────────────────────
  `);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
