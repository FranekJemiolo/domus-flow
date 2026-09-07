/**
 * CSV Import & Export Utilities
 * Powered by PapaParse and FileSaver
 */

import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { Ticket, Property, User } from '@domus-flow/shared';

export interface PropertyCsvRow {
  address: string;
  unitNumber?: string;
}

export interface RepairLogExportItem {
  id: string;
  ticketId: string;
  propertyAddress: string;
  unitNumber: string;
  tenantName: string;
  contractorName: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
  costAcknowledged: string;
  eta: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Parses a CSV file or CSV string containing property rows
 */
export async function parsePropertyCsv(fileOrString: File | string): Promise<PropertyCsvRow[]> {
  const text = typeof fileOrString === 'string' ? fileOrString : await fileOrString.text();
  const results = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const rows: PropertyCsvRow[] = [];

  const findVal = (rowObj: Record<string, string>, ...targets: string[]): string => {
    const lowerTargets = targets.map((t) => t.toLowerCase().replace(/[\s_-]/g, ''));
    for (const [k, v] of Object.entries(rowObj)) {
      const cleanK = k.toLowerCase().replace(/[\s_-]/g, '');
      if (lowerTargets.includes(cleanK)) {
        return (v || '').trim();
      }
    }
    return '';
  };

  for (const row of results.data) {
    const address = findVal(row, 'address', 'street', 'propertyaddress');
    const unitNumber = findVal(row, 'unit', 'unitnumber', 'apartment', 'apt', 'suite');

    if (address) {
      rows.push({
        address,
        unitNumber: unitNumber || undefined,
      });
    }
  }

  return rows;
}

/**
 * Transforms tickets into repair log export items
 */
export function buildRepairLogExport(
  tickets: Ticket[],
  properties: Property[],
  users: User[]
): RepairLogExportItem[] {
  const propertyMap = new Map(properties.map((p) => [p.id, p]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  return tickets.map((t) => {
    const prop = propertyMap.get(t.propertyId);
    const tenant = userMap.get(t.tenantId);
    const contractor = t.contractorId ? userMap.get(t.contractorId) : undefined;

    return {
      id: t.id,
      ticketId: t.id.slice(0, 8),
      propertyAddress: prop ? prop.address : 'Unknown',
      unitNumber: prop?.unitNumber || 'N/A',
      tenantName: tenant ? tenant.name : 'Unknown',
      contractorName: contractor ? contractor.name : 'Unassigned',
      title: t.title,
      description: t.description,
      urgency: t.urgency,
      status: t.status,
      costAcknowledged: t.costAcknowledged ? 'Yes' : 'No',
      eta: t.eta || 'N/A',
      createdAt: new Date(t.createdAt).toISOString(),
      updatedAt: new Date(t.updatedAt).toISOString(),
    };
  });
}

/**
 * Exports repair logs to a downloadable CSV file
 */
export function exportRepairLogsToCsv(
  logs: RepairLogExportItem[],
  filename = 'domus_flow_repair_logs.csv'
): void {
  const csv = Papa.unparse(logs, {
    quotes: true,
    header: true,
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
}
