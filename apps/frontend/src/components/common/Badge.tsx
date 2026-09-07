/**
 * Badge Components for Urgency, Status, and Roles
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
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Critical
        </span>
      );
    case TicketUrgency.HIGH:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          High
        </span>
      );
    case TicketUrgency.MEDIUM:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          Medium
        </span>
      );
    case TicketUrgency.LOW:
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-300 border border-slate-600/40 ${className}`}
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
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 ${className}`}
        >
          Reported
        </span>
      );
    case TicketStatus.SCHEDULED:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/20 text-sky-300 border border-sky-500/30 ${className}`}
        >
          Scheduled
        </span>
      );
    case TicketStatus.IN_PROGRESS:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 ${className}`}
        >
          In Progress
        </span>
      );
    case TicketStatus.RESOLVED:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ${className}`}
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
    case UserRole.LANDLORD:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 ${className}`}
        >
          Landlord
        </span>
      );
    case UserRole.TENANT:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 ${className}`}
        >
          Tenant
        </span>
      );
    case UserRole.CONTRACTOR:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 ${className}`}
        >
          Contractor
        </span>
      );
  }
};
