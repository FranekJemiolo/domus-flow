/**
 * Tests for User Management, Registration, SSO, and Audit Logging
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { UsersPage } from '../pages/UsersPage';
import { authService, userService } from '../services/dataService';
import { db, forceReseedDexie } from '../services/db';
import { UserRole, AuthProvider as SharedAuthProvider, UserStatus } from '@domus-flow/shared';

describe('User Management, Registration, SSO & Audit Logging', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('domus_force_demo', 'true');
    await forceReseedDexie();
  });

  it('registers a new user locally with audit logging', async () => {
    const newUser = await authService.register({
      name: 'Dr. John Watson',
      email: 'watson@bakerstreet.demo',
      password: 'password123',
      role: UserRole.TENANT,
      inviteCode: 'WATSON-221B',
    });

    expect(newUser.id).toBeDefined();
    expect(newUser.email).toBe('watson@bakerstreet.demo');
    expect(newUser.role).toBe(UserRole.TENANT);
    expect(newUser.authProvider).toBe(SharedAuthProvider.LOCAL);
    expect(newUser.status).toBe(UserStatus.ACTIVE);

    // Verify user stored in Dexie
    const inDb = await db.users.get(newUser.id);
    expect(inDb).toBeDefined();

    // Verify audit log recorded
    const logs = await db.userLogs.where('userId').equals(newUser.id).toArray();
    expect(logs.some((l) => l.action === 'REGISTER')).toBe(true);
  });

  it('provisions a new Google SSO user and records SSO audit logs', async () => {
    const ssoUser = await authService.loginWithSso(SharedAuthProvider.GOOGLE, {
      name: 'Google Test User',
      email: 'tester.google@gmail.com',
      role: UserRole.CONTRACTOR,
      avatarUrl: 'https://example.com/avatar.jpg',
    });

    expect(ssoUser.email).toBe('tester.google@gmail.com');
    expect(ssoUser.role).toBe(UserRole.CONTRACTOR);
    expect(ssoUser.authProvider).toBe(SharedAuthProvider.GOOGLE);

    // Verify audit logs
    const logs = await db.userLogs.where('userId').equals(ssoUser.id).toArray();
    expect(logs.some((l) => l.action === 'REGISTER_SSO_GOOGLE')).toBe(true);
    expect(logs.some((l) => l.action === 'LOGIN_SSO_GOOGLE')).toBe(true);
  });

  it('filters users by role and search term in userService', async () => {
    // Search for James Chen
    const searchResult = await userService.getAll({ search: 'Chen' });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].name).toBe('James Chen');

    // Filter by CONTRACTOR role
    const contractors = await userService.getAll({ role: UserRole.CONTRACTOR });
    expect(contractors.length).toBe(1);
    expect(contractors[0].role).toBe(UserRole.CONTRACTOR);
  });

  it('updates user role, status and records corresponding audit logs', async () => {
    const tenant = await db.users.where('email').equals('tenant.a@domusflow.demo').first();
    expect(tenant).toBeDefined();

    const updated = await userService.update(tenant!.id, {
      status: UserStatus.SUSPENDED,
      role: UserRole.CONTRACTOR,
    });

    expect(updated.status).toBe(UserStatus.SUSPENDED);
    expect(updated.role).toBe(UserRole.CONTRACTOR);

    // Verify audit logs were written
    const logs = await userService.getLogs(tenant!.id);
    expect(logs.some((l) => l.action === 'STATUS_CHANGE')).toBe(true);
    expect(logs.some((l) => l.action === 'ROLE_CHANGE')).toBe(true);
  });

  it('renders the UsersPage directory with stat counters and user list', async () => {
    render(
      <AuthProvider>
        <HashRouter>
          <UsersPage />
        </HashRouter>
      </AuthProvider>
    );

    // Wait for users table to render
    await waitFor(() => {
      expect(screen.getByText('User Directory & Access Control')).toBeInTheDocument();
      expect(screen.getByText('Sarah Mitchell')).toBeInTheDocument();
      expect(screen.getByText('James Chen')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Active Accounts')).toBeInTheDocument();
  });
});
