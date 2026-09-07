/**
 * Shared utility functions used across frontend and backend
 */

import { TicketUrgency, TicketStatus } from './types.js';

/**
 * Generates a random invite code in the format UNIT4B-2026
 */
export function generateInviteCode(unitNumber?: string): string {
  const unit = unitNumber?.toUpperCase().replace(/\s/g, '') || 'UNIT';
  const year = new Date().getFullYear();
  return `${unit}-${year}`;
}

/**
 * Returns a human-readable label for urgency level
 */
export function getUrgencyLabel(urgency: TicketUrgency): string {
  const labels: Record<TicketUrgency, string> = {
    [TicketUrgency.LOW]: 'Low',
    [TicketUrgency.MEDIUM]: 'Medium',
    [TicketUrgency.HIGH]: 'High',
    [TicketUrgency.CRITICAL]: 'Critical',
  };
  return labels[urgency];
}

/**
 * Returns a numeric priority (lower = more urgent) for sorting
 */
export function getUrgencyPriority(urgency: TicketUrgency): number {
  const priorities: Record<TicketUrgency, number> = {
    [TicketUrgency.CRITICAL]: 0,
    [TicketUrgency.HIGH]: 1,
    [TicketUrgency.MEDIUM]: 2,
    [TicketUrgency.LOW]: 3,
  };
  return priorities[urgency];
}

/**
 * Returns a human-readable status label
 */
export function getStatusLabel(status: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    [TicketStatus.REPORTED]: 'Reported',
    [TicketStatus.IN_PROGRESS]: 'In Progress',
    [TicketStatus.SCHEDULED]: 'Scheduled',
    [TicketStatus.RESOLVED]: 'Resolved',
  };
  return labels[status];
}

/**
 * Formats an ISO date string to a human-readable relative time
 */
export function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const date = new Date(isoDate).getTime();
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return new Date(isoDate).toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * Validates an invite code format
 */
export function isValidInviteCode(code: string): boolean {
  return /^[A-Z0-9]+-\d{4}$/.test(code);
}

/**
 * Truncates a string to a max length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
