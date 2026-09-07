/**
 * DomusFlow Unified Data Service
 * Seamlessly routes data operations to Dexie.js (Demo Mode / Offline) or REST API (Backend Mode)
 */

import { v4 as uuidv4 } from 'uuid';
import {
  User,
  Property,
  Ticket,
  Message,
  UserRole,
  TicketStatus,
  TicketUrgency,
  MessageThreadType,
  LandlordDashboardStats,
  ApiResponse,
} from '@domus-flow/shared';
import { db, seedDexieIfEmpty, forceReseedDexie, DEMO_USERS } from './db';
import { apiClient } from './api';
import { getStoredDemoUser, setStoredDemoUser } from './mockAuth';

/**
 * Determines whether the app is running in offline demo mode
 */
export function isDemoMode(): boolean {
  // 1. Explicit env flag from build
  if (import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.VITE_DEMO_MODE === true) {
    return true;
  }
  // 2. User-toggled override in localStorage
  const localOverride = localStorage.getItem('domus_force_demo');
  if (localOverride !== null) {
    return localOverride === 'true';
  }
  // 3. Default to true if not on a custom server / running in GitHub Pages
  if (window.location.hostname.includes('github.io')) {
    return true;
  }
  return false;
}

export function setDemoModeOverride(forceDemo: boolean): void {
  localStorage.setItem('domus_force_demo', String(forceDemo));
  window.location.reload();
}

// ─── AUTHENTICATION SERVICE ──────────────────────────────────────────────────

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      return getStoredDemoUser() || DEMO_USERS.landlord;
    }

    try {
      const res = await apiClient.get<ApiResponse<User>>('/auth/me');
      return res.data.data;
    } catch {
      return null;
    }
  },

  async login(email: string, _password?: string): Promise<User> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const user = await db.users.where('email').equalsIgnoreCase(email).first();
      if (!user) {
        throw new Error('User not found with this email in Demo Mode');
      }
      setStoredDemoUser(user);
      return user;
    }

    const res = await apiClient.post<ApiResponse<{ token: string; user: User }>>('/auth/login', {
      email,
      password: _password,
    });
    localStorage.setItem('domus_flow_token', res.data.data.token);
    localStorage.setItem('domus_flow_user', JSON.stringify(res.data.data.user));
    return res.data.data.user;
  },

  async loginWithInviteCode(inviteCode: string): Promise<User> {
    const normalized = inviteCode.trim().toUpperCase();

    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const user = await db.users.where('inviteCode').equals(normalized).first();
      if (!user) {
        throw new Error('Invalid invite code. Try UNIT4B-2026 or CONTRACTOR-01');
      }
      setStoredDemoUser(user);
      return user;
    }

    // Backend route for invite lookup
    const res = await apiClient.get<ApiResponse<User>>(`/users/invite/${normalized}`);
    return res.data.data;
  },

  async loginAsDemoRole(role: UserRole): Promise<User> {
    await seedDexieIfEmpty();
    let user: User;
    switch (role) {
      case UserRole.LANDLORD:
        user = DEMO_USERS.landlord;
        break;
      case UserRole.TENANT:
        user = DEMO_USERS.tenantA;
        break;
      case UserRole.CONTRACTOR:
        user = DEMO_USERS.contractor;
        break;
    }
    setStoredDemoUser(user);
    return user;
  },

  async logout(): Promise<void> {
    if (isDemoMode()) {
      setStoredDemoUser(null);
    } else {
      localStorage.removeItem('domus_flow_token');
      localStorage.removeItem('domus_flow_user');
    }
  },
};

// ─── PROPERTIES SERVICE ──────────────────────────────────────────────────────

export const propertyService = {
  async getAll(): Promise<Property[]> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const currentUser = getStoredDemoUser() || DEMO_USERS.landlord;

      if (currentUser.role === UserRole.LANDLORD) {
        return db.properties.toArray();
      }
      if (currentUser.role === UserRole.TENANT && currentUser.linkedPropertyId) {
        const prop = await db.properties.get(currentUser.linkedPropertyId);
        return prop ? [prop] : [];
      }
      return db.properties.toArray();
    }

    const res = await apiClient.get<ApiResponse<Property[]>>('/properties');
    return res.data.data;
  },

  async getById(id: string): Promise<Property | null> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const prop = await db.properties.get(id);
      return prop || null;
    }

    const res = await apiClient.get<ApiResponse<Property>>(`/properties/${id}`);
    return res.data.data;
  },

  async create(data: { address: string; unitNumber?: string }): Promise<Property> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const currentUser = getStoredDemoUser() || DEMO_USERS.landlord;
      const now = new Date().toISOString();
      const newProp: Property = {
        id: uuidv4(),
        landlordId: currentUser.id,
        address: data.address,
        unitNumber: data.unitNumber || '',
        createdAt: now,
        updatedAt: now,
      };
      await db.properties.add(newProp);
      return newProp;
    }

    const res = await apiClient.post<ApiResponse<Property>>('/properties', data);
    return res.data.data;
  },

  async bulkImport(
    properties: Array<{ address: string; unitNumber?: string }>
  ): Promise<{ importedCount: number }> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const currentUser = getStoredDemoUser() || DEMO_USERS.landlord;
      const now = new Date().toISOString();
      const newProps: Property[] = properties.map((p) => ({
        id: uuidv4(),
        landlordId: currentUser.id,
        address: p.address,
        unitNumber: p.unitNumber || '',
        createdAt: now,
        updatedAt: now,
      }));
      await db.properties.bulkAdd(newProps);
      return { importedCount: newProps.length };
    }

    const res = await apiClient.post<ApiResponse<{ importedCount: number }>>('/properties/bulk', {
      properties,
    });
    return res.data.data;
  },
};

// ─── TICKETS SERVICE ─────────────────────────────────────────────────────────

export const ticketService = {
  async getAll(status?: TicketStatus): Promise<Ticket[]> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const currentUser = getStoredDemoUser() || DEMO_USERS.landlord;
      let tickets = await db.tickets.toArray();

      // RBAC Filtering in Demo mode
      if (currentUser.role === UserRole.TENANT) {
        tickets = tickets.filter((t) => t.tenantId === currentUser.id);
      } else if (currentUser.role === UserRole.CONTRACTOR) {
        tickets = tickets.filter((t) => t.contractorId === currentUser.id);
      }

      if (status) {
        tickets = tickets.filter((t) => t.status === status);
      }

      // Sort by urgency then date
      const urgencyRank: Record<TicketUrgency, number> = {
        [TicketUrgency.CRITICAL]: 4,
        [TicketUrgency.HIGH]: 3,
        [TicketUrgency.MEDIUM]: 2,
        [TicketUrgency.LOW]: 1,
      };

      return tickets.sort((a, b) => {
        const uA = urgencyRank[a.urgency] || 0;
        const uB = urgencyRank[b.urgency] || 0;
        if (uA !== uB) return uB - uA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    const res = await apiClient.get<ApiResponse<Ticket[]>>('/tickets', {
      params: status ? { status } : undefined,
    });
    return res.data.data;
  },

  async getById(id: string): Promise<Ticket | null> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const ticket = await db.tickets.get(id);
      return ticket || null;
    }

    const res = await apiClient.get<ApiResponse<Ticket>>(`/tickets/${id}`);
    return res.data.data;
  },

  async create(data: {
    propertyId: string;
    title: string;
    description: string;
    urgency: TicketUrgency;
    photoUrls?: string[];
  }): Promise<Ticket> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const currentUser = getStoredDemoUser() || DEMO_USERS.tenantA;
      const now = new Date().toISOString();
      const newTicket: Ticket = {
        id: uuidv4(),
        propertyId: data.propertyId,
        tenantId: currentUser.id,
        contractorId: null,
        title: data.title,
        description: data.description,
        urgency: data.urgency,
        status: TicketStatus.REPORTED,
        photoUrls: data.photoUrls || [],
        costAcknowledged: false,
        eta: null,
        createdAt: now,
        updatedAt: now,
      };
      await db.tickets.add(newTicket);
      return newTicket;
    }

    const res = await apiClient.post<ApiResponse<Ticket>>('/tickets', data);
    return res.data.data;
  },

  async update(
    id: string,
    updates: {
      status?: TicketStatus;
      urgency?: TicketUrgency;
      contractorId?: string | null;
      eta?: string | null;
      costAcknowledged?: boolean;
    }
  ): Promise<Ticket> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const existing = await db.tickets.get(id);
      if (!existing) throw new Error('Ticket not found');

      const updated: Ticket = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await db.tickets.put(updated);
      return updated;
    }

    const res = await apiClient.patch<ApiResponse<Ticket>>(`/tickets/${id}`, updates);
    return res.data.data;
  },
};

// ─── MESSAGES SERVICE (DUAL-CHANNEL CHAT) ────────────────────────────────────

export const messageService = {
  async getThread(threadType: MessageThreadType, otherId: string): Promise<Message[]> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const currentUser = getStoredDemoUser() || DEMO_USERS.landlord;

      const msgs = await db.messages
        .where('threadType')
        .equals(threadType)
        .filter((m) => {
          return (
            (m.senderId === currentUser.id && m.receiverId === otherId) ||
            (m.senderId === otherId && m.receiverId === currentUser.id)
          );
        })
        .sortBy('timestamp');

      return msgs;
    }

    const res = await apiClient.get<ApiResponse<Message[]>>(
      `/messages/thread/${threadType}/${otherId}`
    );
    return res.data.data;
  },

  async sendMessage(data: {
    threadType: MessageThreadType;
    receiverId: string;
    content: string;
    linkedTicketId?: string | null;
  }): Promise<Message> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const currentUser = getStoredDemoUser() || DEMO_USERS.landlord;

      // Channel isolation validation
      if (
        data.threadType === MessageThreadType.LANDLORD_CONTRACTOR &&
        currentUser.role === UserRole.TENANT
      ) {
        throw new Error('Tenants cannot post to Landlord-Contractor channel');
      }

      const newMsg: Message = {
        id: uuidv4(),
        threadType: data.threadType,
        senderId: currentUser.id,
        receiverId: data.receiverId,
        content: data.content,
        linkedTicketId: data.linkedTicketId || null,
        timestamp: new Date().toISOString(),
      };
      await db.messages.add(newMsg);
      return newMsg;
    }

    const res = await apiClient.post<ApiResponse<Message>>('/messages', data);
    return res.data.data;
  },
};

// ─── DASHBOARD SERVICE ───────────────────────────────────────────────────────

export const dashboardService = {
  async getStats(): Promise<LandlordDashboardStats> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const properties = await db.properties.toArray();
      const users = await db.users.toArray();
      const tickets = await db.tickets.toArray();

      const tenants = users.filter((u) => u.role === UserRole.TENANT);

      const ticketsByStatus = Object.values(TicketStatus).reduce(
        (acc, s) => {
          acc[s] = tickets.filter((t) => t.status === s).length;
          return acc;
        },
        {} as Record<TicketStatus, number>
      );

      const ticketsByUrgency = Object.values(TicketUrgency).reduce(
        (acc, u) => {
          acc[u] = tickets.filter((t) => t.urgency === u).length;
          return acc;
        },
        {} as Record<TicketUrgency, number>
      );

      return {
        totalProperties: properties.length,
        totalTenants: tenants.length,
        openTickets: tickets.filter((t) => t.status !== TicketStatus.RESOLVED).length,
        resolvedTickets: ticketsByStatus[TicketStatus.RESOLVED] || 0,
        criticalTickets: ticketsByUrgency[TicketUrgency.CRITICAL] || 0,
        ticketsByStatus,
        ticketsByUrgency,
      };
    }

    const res = await apiClient.get<ApiResponse<LandlordDashboardStats>>('/dashboard/stats');
    return res.data.data;
  },

  async resetDemoData(): Promise<void> {
    if (isDemoMode()) {
      await forceReseedDexie();
      setStoredDemoUser(DEMO_USERS.landlord);
    }
  },
};

// ─── USERS SERVICE ───────────────────────────────────────────────────────────

export const userService = {
  async getAll(): Promise<User[]> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      return db.users.toArray();
    }
    const res = await apiClient.get<ApiResponse<User[]>>('/users');
    return res.data.data;
  },

  async getContractors(): Promise<User[]> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      return db.users.where('role').equals(UserRole.CONTRACTOR).toArray();
    }
    const res = await apiClient.get<ApiResponse<User[]>>('/users?role=CONTRACTOR');
    return res.data.data;
  },

  async getTenants(): Promise<User[]> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      return db.users.where('role').equals(UserRole.TENANT).toArray();
    }
    const res = await apiClient.get<ApiResponse<User[]>>('/users?role=TENANT');
    return res.data.data;
  },
};
