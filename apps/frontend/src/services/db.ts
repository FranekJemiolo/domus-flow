/**
 * Dexie.js Client-side Offline Database
 * Used in Demo Mode (VITE_DEMO_MODE=true) or when offline
 */

import Dexie, { Table } from 'dexie';
import {
  User,
  Property,
  Ticket,
  Message,
  UserRole,
  TicketUrgency,
  TicketStatus,
  MessageThreadType,
} from '@domus-flow/shared';

export class DomusFlowDB extends Dexie {
  users!: Table<User, string>;
  properties!: Table<Property, string>;
  tickets!: Table<Ticket, string>;
  messages!: Table<Message, string>;

  constructor() {
    super('domus_flow_demo_db');

    this.version(1).stores({
      users: 'id, email, role, inviteCode, linkedPropertyId',
      properties: 'id, landlordId, address',
      tickets: 'id, propertyId, tenantId, contractorId, status, urgency, createdAt',
      messages: 'id, threadType, senderId, receiverId, linkedTicketId, timestamp',
    });
  }
}

export const db = new DomusFlowDB();

// ─── Initial Demo Seed Data ──────────────────────────────────────────────────

export const DEMO_USERS: Record<'landlord' | 'tenantA' | 'tenantB' | 'contractor', User> = {
  landlord: {
    id: 'u-landlord-01',
    name: 'Sarah Mitchell',
    email: 'landlord@domusflow.demo',
    role: UserRole.LANDLORD,
    inviteCode: 'LANDLORD-01',
    linkedPropertyId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  tenantA: {
    id: 'u-tenant-01',
    name: 'James Chen',
    email: 'tenant.a@domusflow.demo',
    role: UserRole.TENANT,
    inviteCode: 'UNIT4B-2026',
    linkedPropertyId: 'prop-01',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
  },
  tenantB: {
    id: 'u-tenant-02',
    name: 'Priya Sharma',
    email: 'tenant.b@domusflow.demo',
    role: UserRole.TENANT,
    inviteCode: 'UNIT2A-2026',
    linkedPropertyId: 'prop-02',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
  },
  contractor: {
    id: 'u-contractor-01',
    name: 'Mike Rodriguez',
    email: 'contractor@domusflow.demo',
    role: UserRole.CONTRACTOR,
    inviteCode: 'CONTRACTOR-01',
    linkedPropertyId: null,
    createdAt: '2026-01-05T00:00:00.000Z',
    updatedAt: '2026-01-05T00:00:00.000Z',
  },
};

export const DEMO_PROPERTIES: Property[] = [
  {
    id: 'prop-01',
    landlordId: 'u-landlord-01',
    address: '42 Maple Street',
    unitNumber: 'Unit 4B',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'prop-02',
    landlordId: 'u-landlord-01',
    address: '18 Oak Avenue',
    unitNumber: 'Apt 2A',
    createdAt: '2026-01-05T00:00:00.000Z',
    updatedAt: '2026-01-05T00:00:00.000Z',
  },
];

export const DEMO_TICKETS: Ticket[] = [
  {
    id: 'ticket-01',
    propertyId: 'prop-01',
    tenantId: 'u-tenant-01',
    contractorId: 'u-contractor-01',
    title: 'Leaking pipe under kitchen sink',
    description:
      'Persistent dripping under the kitchen sink. Cabinet wood is beginning to swell. Water collects in a bowl overnight.',
    urgency: TicketUrgency.HIGH,
    status: TicketStatus.IN_PROGRESS,
    photoUrls: [
      'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=60',
    ],
    costAcknowledged: true,
    eta: 'Today at 3:00 PM',
    createdAt: '2026-09-05T09:30:00.000Z',
    updatedAt: '2026-09-06T14:00:00.000Z',
  },
  {
    id: 'ticket-02',
    propertyId: 'prop-01',
    tenantId: 'u-tenant-01',
    contractorId: null,
    title: 'Broken bedroom door handle',
    description:
      'The latch mechanism seems jammed and the handle turns freely without opening the door.',
    urgency: TicketUrgency.LOW,
    status: TicketStatus.REPORTED,
    photoUrls: [],
    costAcknowledged: false,
    eta: null,
    createdAt: '2026-09-06T11:00:00.000Z',
    updatedAt: '2026-09-06T11:00:00.000Z',
  },
  {
    id: 'ticket-03',
    propertyId: 'prop-02',
    tenantId: 'u-tenant-02',
    contractorId: 'u-contractor-01',
    title: 'No hot water in master bathroom',
    description:
      'Water from the shower is lukewarm at best. Kitchen hot water seems okay. Started yesterday morning.',
    urgency: TicketUrgency.CRITICAL,
    status: TicketStatus.SCHEDULED,
    photoUrls: [],
    costAcknowledged: false,
    eta: 'Tomorrow at 9:00 AM',
    createdAt: '2026-09-06T16:45:00.000Z',
    updatedAt: '2026-09-07T08:00:00.000Z',
  },
  {
    id: 'ticket-04',
    propertyId: 'prop-02',
    tenantId: 'u-tenant-02',
    contractorId: 'u-contractor-01',
    title: 'Cracked bathroom tile near tub',
    description: 'Tile cracked when a shampoo bottle fell. Needs replacement and resealing.',
    urgency: TicketUrgency.MEDIUM,
    status: TicketStatus.RESOLVED,
    photoUrls: [],
    costAcknowledged: true,
    eta: null,
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-24T16:30:00.000Z',
  },
];

export const DEMO_MESSAGES: Message[] = [
  {
    id: 'msg-01',
    threadType: MessageThreadType.TENANT_LANDLORD,
    senderId: 'u-tenant-01',
    receiverId: 'u-landlord-01',
    content:
      'Hi Sarah, I submitted a ticket for the kitchen sink leak. Water is dripping pretty steadily.',
    linkedTicketId: 'ticket-01',
    timestamp: '2026-09-05T09:35:00.000Z',
  },
  {
    id: 'msg-02',
    threadType: MessageThreadType.TENANT_LANDLORD,
    senderId: 'u-landlord-01',
    receiverId: 'u-tenant-01',
    content:
      'Thanks for letting me know James. I have reached out to Mike the plumber and he should be there today.',
    linkedTicketId: 'ticket-01',
    timestamp: '2026-09-05T10:15:00.000Z',
  },
  {
    id: 'msg-03',
    threadType: MessageThreadType.LANDLORD_CONTRACTOR,
    senderId: 'u-landlord-01',
    receiverId: 'u-contractor-01',
    content:
      'Hey Mike, James at 42 Maple St Unit 4B has a leaking sink pipe. Can you take a look today? Cost approved up to $200.',
    linkedTicketId: 'ticket-01',
    timestamp: '2026-09-05T10:20:00.000Z',
  },
  {
    id: 'msg-04',
    threadType: MessageThreadType.LANDLORD_CONTRACTOR,
    senderId: 'u-contractor-01',
    receiverId: 'u-landlord-01',
    content:
      'On it Sarah. Looks like a standard P-trap replacement. Will be there around 3 PM today.',
    linkedTicketId: 'ticket-01',
    timestamp: '2026-09-05T11:00:00.000Z',
  },
];

/**
 * Seeds the Dexie database with initial demo data if empty
 */
export async function seedDexieIfEmpty(): Promise<void> {
  const userCount = await db.users.count();
  if (userCount === 0) {
    await forceReseedDexie();
  }
}

/**
 * Resets and reseeds the Dexie database with fresh demo data
 */
export async function forceReseedDexie(): Promise<void> {
  await db.transaction('rw', db.users, db.properties, db.tickets, db.messages, async () => {
    await db.users.clear();
    await db.properties.clear();
    await db.tickets.clear();
    await db.messages.clear();

    await db.users.bulkAdd(Object.values(DEMO_USERS));
    await db.properties.bulkAdd(DEMO_PROPERTIES);
    await db.tickets.bulkAdd(DEMO_TICKETS);
    await db.messages.bulkAdd(DEMO_MESSAGES);
  });
}
