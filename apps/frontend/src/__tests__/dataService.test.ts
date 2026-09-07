/**
 * DataService & Dexie Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { forceReseedDexie, DEMO_USERS, db } from '../services/db';
import {
  propertyService,
  ticketService,
  messageService,
  dashboardService,
} from '../services/dataService';
import { setStoredDemoUser } from '../services/mockAuth';
import { TicketUrgency, TicketStatus, MessageThreadType } from '@domus-flow/shared';

describe('DataService (Demo Mode / Dexie)', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('domus_force_demo', 'true');
    await forceReseedDexie();
  });

  describe('Properties Service', () => {
    it('returns all properties for Landlord', async () => {
      setStoredDemoUser(DEMO_USERS.landlord);
      const props = await propertyService.getAll();
      expect(props.length).toBeGreaterThanOrEqual(2);
      expect(props[0].address).toBeDefined();
    });

    it('returns only linked property for Tenant', async () => {
      setStoredDemoUser(DEMO_USERS.tenantA);
      const props = await propertyService.getAll();
      expect(props.length).toBe(1);
      expect(props[0].id).toBe(DEMO_USERS.tenantA.linkedPropertyId);
    });

    it('creates a new property successfully', async () => {
      setStoredDemoUser(DEMO_USERS.landlord);
      const newProp = await propertyService.create({
        address: '99 Pine Street',
        unitNumber: 'Suite 300',
      });
      expect(newProp.id).toBeDefined();
      expect(newProp.address).toBe('99 Pine Street');

      const all = await propertyService.getAll();
      expect(all.some((p) => p.id === newProp.id)).toBe(true);
    });

    it('bulk imports properties', async () => {
      setStoredDemoUser(DEMO_USERS.landlord);
      const result = await propertyService.bulkImport([
        { address: '101 First Ave', unitNumber: '1A' },
        { address: '102 First Ave', unitNumber: '2B' },
      ]);
      expect(result.importedCount).toBe(2);
    });
  });

  describe('Tickets Service', () => {
    it('returns all tickets sorted by urgency for Landlord', async () => {
      setStoredDemoUser(DEMO_USERS.landlord);
      const tickets = await ticketService.getAll();
      expect(tickets.length).toBeGreaterThanOrEqual(4);
      // Critical should be first
      expect(tickets[0].urgency).toBe(TicketUrgency.CRITICAL);
    });

    it('filters tickets by status', async () => {
      setStoredDemoUser(DEMO_USERS.landlord);
      const reportedTickets = await ticketService.getAll(TicketStatus.REPORTED);
      expect(reportedTickets.every((t) => t.status === TicketStatus.REPORTED)).toBe(true);
    });

    it('filters tickets by tenant identity in Tenant mode', async () => {
      setStoredDemoUser(DEMO_USERS.tenantA);
      const tickets = await ticketService.getAll();
      expect(tickets.every((t) => t.tenantId === DEMO_USERS.tenantA.id)).toBe(true);
    });

    it('creates a new ticket with REPORTED status', async () => {
      setStoredDemoUser(DEMO_USERS.tenantA);
      const created = await ticketService.create({
        propertyId: 'prop-01',
        title: 'Running toilet',
        description: 'Toilet runs continuously',
        urgency: TicketUrgency.LOW,
      });

      expect(created.id).toBeDefined();
      expect(created.status).toBe(TicketStatus.REPORTED);
      expect(created.costAcknowledged).toBe(false);
    });

    it('updates ticket status and contractor assignment', async () => {
      setStoredDemoUser(DEMO_USERS.landlord);
      const updated = await ticketService.update('ticket-02', {
        status: TicketStatus.SCHEDULED,
        contractorId: DEMO_USERS.contractor.id,
        eta: 'Tomorrow 10 AM',
      });

      expect(updated.status).toBe(TicketStatus.SCHEDULED);
      expect(updated.contractorId).toBe(DEMO_USERS.contractor.id);
      expect(updated.eta).toBe('Tomorrow 10 AM');
    });
  });

  describe('Messages Service & Channel Isolation', () => {
    it('fetches thread between Landlord and Tenant', async () => {
      setStoredDemoUser(DEMO_USERS.landlord);
      const msgs = await messageService.getThread(
        MessageThreadType.TENANT_LANDLORD,
        DEMO_USERS.tenantA.id
      );
      expect(msgs.length).toBeGreaterThanOrEqual(2);
      expect(msgs[0].content).toBeDefined();
    });

    it('sends a message with linked ticket ID', async () => {
      setStoredDemoUser(DEMO_USERS.tenantA);
      const sent = await messageService.sendMessage({
        threadType: MessageThreadType.TENANT_LANDLORD,
        receiverId: DEMO_USERS.landlord.id,
        content: 'Following up on the leak',
        linkedTicketId: 'ticket-01',
      });

      expect(sent.id).toBeDefined();
      expect(sent.linkedTicketId).toBe('ticket-01');
      expect(sent.content).toBe('Following up on the leak');
    });

    it('enforces channel isolation: tenants cannot post to Landlord-Contractor channel', async () => {
      setStoredDemoUser(DEMO_USERS.tenantA);
      await expect(
        messageService.sendMessage({
          threadType: MessageThreadType.LANDLORD_CONTRACTOR,
          receiverId: DEMO_USERS.contractor.id,
          content: 'I should not be able to talk here',
        })
      ).rejects.toThrow('Tenants cannot post to Landlord-Contractor channel');
    });
  });

  describe('Dashboard Service', () => {
    it('computes aggregated statistics correctly', async () => {
      setStoredDemoUser(DEMO_USERS.landlord);
      const stats = await dashboardService.getStats();
      expect(stats.totalProperties).toBeGreaterThanOrEqual(2);
      expect(stats.totalTenants).toBeGreaterThanOrEqual(2);
      expect(stats.criticalTickets).toBeGreaterThanOrEqual(1);
    });

    it('resets demo data cleanly', async () => {
      // Modify a ticket
      await db.tickets.delete('ticket-01');
      let t = await db.tickets.get('ticket-01');
      expect(t).toBeUndefined();

      // Reset
      await dashboardService.resetDemoData();
      t = await db.tickets.get('ticket-01');
      expect(t).toBeDefined();
    });
  });
});
