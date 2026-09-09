/**
 * Badge Components for Urgency, Status, and Roles
 * Tailored with a modern, clean pastel color palette
 */

import React from 'react';
import { TicketUrgency, TicketStatus, UserRole } from '@domus-flow/shared';

interface UrgencyBadgeProps {
  urgency: TicketUrgency;
  className?: string;
}

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ urgency, className = '' }) => {
  switch (urgency) {
    case TicketUrgency.CRITICAL:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm shadow-rose-100/50 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Critical
        </span>
      );
    case TicketUrgency.HIGH:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          High
        </span>
      );
    case TicketUrgency.MEDIUM:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          Medium
        </span>
      );
    case TicketUrgency.LOW:
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Low
        </span>
      );
  }
};

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case TicketStatus.REPORTED:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 ${className}`}
        >
          Reported
        </span>
      );
    case TicketStatus.SCHEDULED:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 ${className}`}
        >
          Scheduled
        </span>
      );
    case TicketStatus.IN_PROGRESS:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
        >
          In Progress
        </span>
      );
    case TicketStatus.RESOLVED:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 ${className}`}
        >
          Resolved
        </span>
      );
  }
};

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = '' }) => {
  switch (role) {
    case UserRole.ADMIN:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 ${className}`}
        >
          Admin
        </span>
      );
    case UserRole.LANDLORD:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}
        >
          Landlord
        </span>
      );
    case UserRole.TENANT:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 ${className}`}
        >
          Tenant
        </span>
      );
    case UserRole.CONTRACTOR:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
        >
          Contractor
        </span>
      );
  }
};

interface StatusPillProps {
  status?: string;
  className?: string;
}

export const UserStatusBadge: React.FC<StatusPillProps> = ({ status, className = '' }) => {
  if (status === 'SUSPENDED') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Suspended
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  );
};

interface AuthProviderBadgeProps {
  provider?: string;
  className?: string;
}

export const AuthProviderBadge: React.FC<AuthProviderBadgeProps> = ({
  provider = 'LOCAL',
  className = '',
}) => {
  switch (provider) {
    case 'GOOGLE':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
        >
          <span>🌐</span> Google
        </span>
      );
    case 'APPLE':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-300 ${className}`}
        >
          <span>🍎</span> Apple
        </span>
      );
    case 'FACEBOOK':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 text-sky-800 border border-sky-200 ${className}`}
        >
          <span>📘</span> Facebook
        </span>
      );
    case 'LOCAL':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200 ${className}`}
        >
          <span>🔐</span> Local
        </span>
      );
  }
};
