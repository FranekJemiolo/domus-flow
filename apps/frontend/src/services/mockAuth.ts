/**
 * Mock Authentication for Demo Mode
 * Allows instant role switching between Landlord, Tenants, and Contractor
 */

import { User, UserRole } from '@domus-flow/shared';
import { DEMO_USERS, db, seedDexieIfEmpty } from './db';

export interface DemoAccount {
  label: string;
  role: UserRole;
  description: string;
  user: User;
  inviteCode?: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Sarah Mitchell',
    role: UserRole.LANDLORD,
    description: 'Property Owner / Manager (2 Properties, 4 Tickets)',
    user: DEMO_USERS.landlord,
  },
  {
    label: 'James Chen',
    role: UserRole.TENANT,
    description: 'Tenant at 42 Maple St (Unit 4B)',
    user: DEMO_USERS.tenantA,
    inviteCode: DEMO_USERS.tenantA.inviteCode,
  },
  {
    label: 'Priya Sharma',
    role: UserRole.TENANT,
    description: 'Tenant at 18 Oak Ave (Apt 2A)',
    user: DEMO_USERS.tenantB,
    inviteCode: DEMO_USERS.tenantB.inviteCode,
  },
  {
    label: 'Mike Rodriguez',
    role: UserRole.CONTRACTOR,
    description: 'Licensed Plumber / General Contractor',
    user: DEMO_USERS.contractor,
    inviteCode: DEMO_USERS.contractor.inviteCode,
  },
];

/**
 * Validates an invite code in demo mode against the Dexie users table
 */
export async function findUserByInviteCode(inviteCode: string): Promise<User | undefined> {
  await seedDexieIfEmpty();
  const normalized = inviteCode.trim().toUpperCase();
  return db.users.where('inviteCode').equals(normalized).first();
}

/**
 * Gets currently logged in user from localStorage in demo mode
 */
export function getStoredDemoUser(): User | null {
  const json = localStorage.getItem('domus_demo_user');
  if (!json) return null;
  try {
    return JSON.parse(json) as User;
  } catch {
    return null;
  }
}

/**
 * Sets active demo user in localStorage
 */
export function setStoredDemoUser(user: User | null): void {
  if (!user) {
    localStorage.removeItem('domus_demo_user');
  } else {
    localStorage.setItem('domus_demo_user', JSON.stringify(user));
  }
}
