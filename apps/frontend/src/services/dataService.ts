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
  UserLog,
  UserRole,
  AuthProvider,
  UserStatus,
  CreateUserDto,
  UpdateUserDto,
  UserQueryFilters,
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
      if (user.status === UserStatus.SUSPENDED) {
        throw new Error('This account has been suspended. Please contact management.');
      }
      const updated = { ...user, lastLoginAt: new Date().toISOString() };
      await db.users.put(updated);
      await db.userLogs.add({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: user.id,
        action: 'LOGIN_LOCAL',
        ipAddress: '127.0.0.1',
        userAgent: navigator.userAgent,
        details: { method: 'Email/Password (Demo)' },
        createdAt: new Date().toISOString(),
      });
      setStoredDemoUser(updated);
      return updated;
    }

    const res = await apiClient.post<ApiResponse<{ token: string; user: User }>>('/auth/login', {
      email,
      password: _password,
    });
    localStorage.setItem('domus_flow_token', res.data.data.token);
    localStorage.setItem('domus_flow_user', JSON.stringify(res.data.data.user));
    return res.data.data.user;
  },

  async register(dto: CreateUserDto): Promise<User> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const existing = await db.users.where('email').equalsIgnoreCase(dto.email).first();
      if (existing) {
        throw new Error('Email already registered in Demo Mode');
      }
      const code =
        dto.inviteCode ||
        `${dto.name.toUpperCase().replace(/\s/g, '')}-${Date.now().toString().slice(-4)}`;
      const newUser: User = {
        id: `u-${uuidv4().substring(0, 8)}`,
        name: dto.name,
        email: dto.email,
        role: dto.role,
        inviteCode: code,
        linkedPropertyId: null,
        authProvider: AuthProvider.LOCAL,
        status: UserStatus.ACTIVE,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.users.add(newUser);
      await db.userLogs.add({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: newUser.id,
        action: 'REGISTER',
        ipAddress: '127.0.0.1',
        userAgent: navigator.userAgent,
        details: { role: newUser.role, provider: 'LOCAL' },
        createdAt: new Date().toISOString(),
      });
      setStoredDemoUser(newUser);
      return newUser;
    }

    const res = await apiClient.post<ApiResponse<{ token: string; user: User }>>(
      '/auth/register',
      dto
    );
    localStorage.setItem('domus_flow_token', res.data.data.token);
    localStorage.setItem('domus_flow_user', JSON.stringify(res.data.data.user));
    return res.data.data.user;
  },

  async loginWithSso(
    provider: AuthProvider,
    profile: {
      email: string;
      name: string;
      role?: UserRole;
      avatarUrl?: string;
      inviteCode?: string;
    }
  ): Promise<User> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      let user = await db.users.where('email').equalsIgnoreCase(profile.email).first();
      const now = new Date().toISOString();

      if (user) {
        if (user.status === UserStatus.SUSPENDED) {
          throw new Error('This account has been suspended. Please contact management.');
        }
        user = {
          ...user,
          lastLoginAt: now,
          authProvider: provider,
          avatarUrl: profile.avatarUrl || user.avatarUrl,
        };
        await db.users.put(user);
        await db.userLogs.add({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: user.id,
          action: `LOGIN_SSO_${provider}`,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          details: { provider, email: profile.email },
          createdAt: now,
        });
      } else {
        const code =
          profile.inviteCode ||
          `${profile.name.toUpperCase().replace(/\s/g, '')}-${Date.now().toString().slice(-4)}`;
        user = {
          id: `u-${uuidv4().substring(0, 8)}`,
          name: profile.name,
          email: profile.email,
          role: profile.role || UserRole.TENANT,
          inviteCode: code,
          linkedPropertyId: null,
          authProvider: provider,
          avatarUrl: profile.avatarUrl || null,
          status: UserStatus.ACTIVE,
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now,
        };
        await db.users.add(user);
        await db.userLogs.add({
          id: `log-${Date.now()}-reg`,
          userId: user.id,
          action: `REGISTER_SSO_${provider}`,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          details: { provider, role: user.role },
          createdAt: now,
        });
        await db.userLogs.add({
          id: `log-${Date.now()}-login`,
          userId: user.id,
          action: `LOGIN_SSO_${provider}`,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          details: { provider, email: user.email },
          createdAt: now,
        });
      }

      setStoredDemoUser(user);
      return user;
    }

    const res = await apiClient.post<ApiResponse<{ token: string; user: User }>>('/auth/sso', {
      provider,
      ...profile,
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
      if (user.status === UserStatus.SUSPENDED) {
        throw new Error('This account has been suspended. Please contact management.');
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
      case UserRole.ADMIN:
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

  async simulateIncomingMessage(data: {
    threadType: MessageThreadType;
    senderId: string;
    receiverId: string;
    content: string;
    linkedTicketId?: string | null;
  }): Promise<Message> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const newMsg: Message = {
        id: uuidv4(),
        threadType: data.threadType,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        linkedTicketId: data.linkedTicketId || null,
        timestamp: new Date().toISOString(),
      };
      await db.messages.add(newMsg);
      return newMsg;
    }

    return {
      id: uuidv4(),
      threadType: data.threadType,
      senderId: data.senderId,
      receiverId: data.receiverId,
      content: data.content,
      linkedTicketId: data.linkedTicketId || null,
      timestamp: new Date().toISOString(),
    };
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
  async getAll(filters?: UserQueryFilters): Promise<User[]> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      let users = await db.users.toArray();

      if (filters?.role) {
        users = users.filter((u) => u.role === filters.role);
      }
      if (filters?.status) {
        users = users.filter((u) => u.status === filters.status);
      }
      if (filters?.authProvider) {
        users = users.filter((u) => u.authProvider === filters.authProvider);
      }
      if (filters?.search && filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        users = users.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.inviteCode.toLowerCase().includes(q)
        );
      }

      return users;
    }

    const res = await apiClient.get<ApiResponse<User[]>>('/users', {
      params: filters,
    });
    return res.data.data;
  },

  async getById(id: string): Promise<User | null> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const user = await db.users.get(id);
      return user || null;
    }
    const res = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return res.data.data;
  },

  async create(dto: CreateUserDto): Promise<User> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const code =
        dto.inviteCode ||
        `${dto.name.toUpperCase().replace(/\s/g, '')}-${Date.now().toString().slice(-4)}`;
      const newUser: User = {
        id: `u-${uuidv4().substring(0, 8)}`,
        name: dto.name,
        email: dto.email,
        role: dto.role,
        inviteCode: code,
        linkedPropertyId: null,
        authProvider: AuthProvider.LOCAL,
        status: UserStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.users.add(newUser);
      await db.userLogs.add({
        id: `log-${Date.now()}`,
        userId: newUser.id,
        action: 'CREATE_USER',
        ipAddress: '127.0.0.1',
        userAgent: navigator.userAgent,
        details: { role: newUser.role, name: newUser.name, email: newUser.email },
        createdAt: new Date().toISOString(),
      });
      return newUser;
    }

    const res = await apiClient.post<ApiResponse<User>>('/auth/register', dto);
    return res.data.data;
  },

  async update(id: string, data: UpdateUserDto): Promise<User> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const user = await db.users.get(id);
      if (!user) throw new Error('User not found');

      const updated: User = {
        ...user,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await db.users.put(updated);

      if (data.status && data.status !== user.status) {
        await db.userLogs.add({
          id: `log-${Date.now()}-status`,
          userId: user.id,
          action: 'STATUS_CHANGE',
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          details: { previousStatus: user.status, newStatus: data.status },
          createdAt: new Date().toISOString(),
        });
      }

      if (data.role && data.role !== user.role) {
        await db.userLogs.add({
          id: `log-${Date.now()}-role`,
          userId: user.id,
          action: 'ROLE_CHANGE',
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          details: { previousRole: user.role, newRole: data.role },
          createdAt: new Date().toISOString(),
        });
      }

      return updated;
    }

    const res = await apiClient.patch<ApiResponse<User>>(`/users/${id}`, data);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      const user = await db.users.get(id);
      if (user) {
        await db.userLogs.add({
          id: `log-${Date.now()}-del`,
          userId: user.id,
          action: 'DELETE_USER',
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          details: { email: user.email },
          createdAt: new Date().toISOString(),
        });
        await db.users.delete(id);
      }
      return;
    }

    await apiClient.delete(`/users/${id}`);
  },

  async getLogs(userId?: string): Promise<UserLog[]> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      let logs = await db.userLogs.toArray();
      if (userId) {
        logs = logs.filter((l) => l.userId === userId);
      }
      return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const url = userId ? `/users/${userId}/logs` : '/users/logs/all';
    const res = await apiClient.get<ApiResponse<UserLog[]>>(url);
    return res.data.data;
  },

  async createLog(
    action: string,
    details?: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    if (isDemoMode()) {
      await seedDexieIfEmpty();
      await db.userLogs.add({
        id: `log-${Date.now()}`,
        userId: userId || null,
        action,
        ipAddress: '127.0.0.1',
        userAgent: navigator.userAgent,
        details,
        createdAt: new Date().toISOString(),
      });
    }
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
