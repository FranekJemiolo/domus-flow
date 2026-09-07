/**
 * Shared constants used across frontend and backend
 */

export const DEMO_INVITE_CODES = {
  TENANT_A: 'UNIT4B-2026',
  TENANT_B: 'UNIT2A-2026',
  LANDLORD: 'LANDLORD-DEMO',
  CONTRACTOR: 'CONTRACTOR-01',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    ME: '/api/auth/me',
    LOGOUT: '/api/auth/logout',
  },
  USERS: {
    LIST: '/api/users',
    GET: (id: string) => `/api/users/${id}`,
    UPDATE: (id: string) => `/api/users/${id}`,
  },
  PROPERTIES: {
    LIST: '/api/properties',
    CREATE: '/api/properties',
    GET: (id: string) => `/api/properties/${id}`,
    UPDATE: (id: string) => `/api/properties/${id}`,
    DELETE: (id: string) => `/api/properties/${id}`,
    BULK_IMPORT: '/api/properties/bulk-import',
  },
  TICKETS: {
    LIST: '/api/tickets',
    CREATE: '/api/tickets',
    GET: (id: string) => `/api/tickets/${id}`,
    UPDATE: (id: string) => `/api/tickets/${id}`,
    DELETE: (id: string) => `/api/tickets/${id}`,
  },
  MESSAGES: {
    LIST: '/api/messages',
    SEND: '/api/messages',
    THREAD: (threadType: string, otherId: string) =>
      `/api/messages/thread/${threadType}/${otherId}`,
  },
  DASHBOARD: {
    STATS: '/api/dashboard/stats',
    EXPORT: '/api/dashboard/export',
  },
} as const;

export const TICKET_URGENCY_COLORS = {
  LOW: { bg: 'bg-info-500/10', text: 'text-info-400', border: 'border-info-500/30' },
  MEDIUM: { bg: 'bg-warning-500/10', text: 'text-warning-400', border: 'border-warning-500/30' },
  HIGH: { bg: 'bg-danger-500/10', text: 'text-danger-400', border: 'border-danger-500/30' },
  CRITICAL: { bg: 'bg-danger-600/20', text: 'text-danger-400', border: 'border-danger-600/50' },
} as const;

export const TICKET_STATUS_LABELS = {
  REPORTED: 'Reported',
  IN_PROGRESS: 'In Progress',
  SCHEDULED: 'Scheduled',
  RESOLVED: 'Resolved',
} as const;

export const TICKET_URGENCY_LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: '🚨 Critical',
} as const;

/** Max image size in MB before browser compression */
export const MAX_IMAGE_SIZE_MB = 0.5;
/** Max compressed image dimension */
export const MAX_IMAGE_DIMENSION_PX = 1920;
/** Max photos per ticket */
export const MAX_PHOTOS_PER_TICKET = 5;

/** Demo mode mock data seed constants */
export const DEMO_PROPERTY_IDS = {
  MAPLE_STREET: 'demo-prop-001',
  OAK_AVENUE: 'demo-prop-002',
} as const;

export const DEMO_USER_IDS = {
  LANDLORD: 'demo-user-landlord-001',
  TENANT_A: 'demo-user-tenant-001',
  TENANT_B: 'demo-user-tenant-002',
  CONTRACTOR: 'demo-user-contractor-001',
} as const;
