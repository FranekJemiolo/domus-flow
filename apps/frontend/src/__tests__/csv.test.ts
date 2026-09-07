/**
 * CSV Import & Export Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { parsePropertyCsv, buildRepairLogExport } from '../services/csv';
import { DEMO_TICKETS, DEMO_PROPERTIES, DEMO_USERS } from '../services/db';

describe('CSV Service', () => {
  describe('parsePropertyCsv', () => {
    it('parses standard CSV with Address and Unit headers', async () => {
      const csvContent = `Address,Unit
123 Main St,Unit 4
456 Elm Ave,Apt 2B
789 Pine Rd,`;

      const rows = await parsePropertyCsv(csvContent);
      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual({ address: '123 Main St', unitNumber: 'Unit 4' });
      expect(rows[1]).toEqual({ address: '456 Elm Ave', unitNumber: 'Apt 2B' });
      expect(rows[2]).toEqual({ address: '789 Pine Rd', unitNumber: undefined });
    });

    it('handles lowercase and alternate column names', async () => {
      const csvContent = `street,apartment
10 Broadway,Suite 100
20 Broadway,`;

      const rows = await parsePropertyCsv(csvContent);
      expect(rows).toHaveLength(2);
      expect(rows[0].address).toBe('10 Broadway');
      expect(rows[0].unitNumber).toBe('Suite 100');
    });

    it('ignores empty lines and missing addresses', async () => {
      const csvContent = `address,unit
,,
55 Oak St,1A
,2B
,,`;

      const rows = await parsePropertyCsv(csvContent);
      expect(rows).toHaveLength(1);
      expect(rows[0].address).toBe('55 Oak St');
    });
  });

  describe('buildRepairLogExport', () => {
    it('builds structured repair log export items with joined data', () => {
      const logs = buildRepairLogExport(DEMO_TICKETS, DEMO_PROPERTIES, Object.values(DEMO_USERS));

      expect(logs.length).toBe(DEMO_TICKETS.length);
      const first = logs[0];
      expect(first.ticketId).toBeDefined();
      expect(first.propertyAddress).toBe('42 Maple Street');
      expect(first.unitNumber).toBe('Unit 4B');
      expect(first.tenantName).toBe('James Chen');
      expect(first.contractorName).toBe('Mike Rodriguez');
      expect(first.costAcknowledged).toBe('Yes');
    });
  });
});
