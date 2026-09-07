/**
 * DomusFlow Shared Types
 * =====================
 * These types are the single source of truth for all data models
 * across the frontend, backend, and demo (Dexie.js) layers.
 *
 * IMPORTANT: Keep in sync with prisma/schema.prisma
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum UserRole {
  LANDLORD = 'LANDLORD',
  TENANT = 'TENANT',
  CONTRACTOR = 'CONTRACTOR',
}

export enum TicketUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketStatus {
  REPORTED = 'REPORTED',
  IN_PROGRESS = 'IN_PROGRESS',
  SCHEDULED = 'SCHEDULED',
  RESOLVED = 'RESOLVED',
}

export enum MessageThreadType {
  TENANT_LANDLORD = 'TENANT_LANDLORD',
  LANDLORD_CONTRACTOR = 'LANDLORD_CONTRACTOR',
}

// ─── Core Data Models ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  inviteCode: string;
  linkedPropertyId: string | null;
  createdAt: string; // ISO date string
  updatedAt: string;
}

export interface Property {
  id: string;
  address: string;
  unitNumber: string;
  landlordId: string;
  createdAt: string;
  updatedAt: string;
  // Relations (optionally populated)
  landlord?: Pick<User, 'id' | 'name' | 'email'>;
  tenants?: Pick<User, 'id' | 'name' | 'email' | 'inviteCode'>[];
  tickets?: Ticket[];
}

export interface Ticket {
  id: string;
  propertyId: string;
  tenantId: string;
  contractorId: string | null;
  title: string;
  description: string;
  /** Base64 strings in Demo Mode, URLs in Production */
  photoUrls: string[];
  urgency: TicketUrgency;
  status: TicketStatus;
  /** Manual text ETA set by Landlord */
  eta: string | null;
  costAcknowledged: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations (optionally populated)
  property?: Pick<Property, 'id' | 'address' | 'unitNumber'>;
  tenant?: Pick<User, 'id' | 'name'>;
  contractor?: Pick<User, 'id' | 'name'> | null;
}

export interface Message {
  id: string;
  threadType: MessageThreadType;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string; // ISO date string
  /** When set, renders as a clickable TicketCard in chat */
  linkedTicketId: string | null;
  linkedTicket?: Pick<Ticket, 'id' | 'title' | 'status' | 'urgency'> | null;
  // Relations (optionally populated)
  sender?: Pick<User, 'id' | 'name' | 'role'>;
}

// ─── API Request/Response DTOs ────────────────────────────────────────────────

export interface CreateUserDto {
  role: UserRole;
  name: string;
  email: string;
  password: string;
  inviteCode?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'updatedAt'>;
}

export interface CreatePropertyDto {
  address: string;
  unitNumber: string;
}

export interface CreateTicketDto {
  propertyId: string;
  title: string;
  description: string;
  photoUrls?: string[];
  urgency: TicketUrgency;
}

export interface UpdateTicketDto {
  status?: TicketStatus;
  urgency?: TicketUrgency;
  contractorId?: string | null;
  eta?: string | null;
  costAcknowledged?: boolean;
}

export interface CreateMessageDto {
  threadType: MessageThreadType;
  receiverId: string;
  content: string;
  linkedTicketId?: string | null;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Dashboard Aggregates ─────────────────────────────────────────────────────

export interface LandlordDashboardStats {
  totalProperties: number;
  totalTenants: number;
  openTickets: number;
  resolvedTickets: number;
  criticalTickets: number;
  ticketsByStatus: Record<TicketStatus, number>;
  ticketsByUrgency: Record<TicketUrgency, number>;
}

// ─── CSV Import/Export ────────────────────────────────────────────────────────

export interface PropertyCsvRow {
  address: string;
  unitNumber: string;
}

export interface TenantCsvRow {
  name: string;
  email: string;
  propertyAddress: string;
  unitNumber: string;
  inviteCode: string;
}

export interface ContractorCsvRow {
  name: string;
  email: string;
  specialty: string;
  inviteCode: string;
}

export interface RepairLogCsvRow {
  ticketId: string;
  property: string;
  unit: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
  tenant: string;
  contractor: string;
  eta: string;
  costAcknowledged: string;
  createdAt: string;
  resolvedAt: string;
}

// ─── Notification Types ───────────────────────────────────────────────────────

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    ticketId?: string;
    type: 'NEW_TICKET' | 'STATUS_CHANGE' | 'MESSAGE' | 'CRITICAL_ALERT';
  };
}
