/**
 * App Routing and UI Component Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import 'fake-indexeddb/auto';
import { App } from '../App';
import { forceReseedDexie } from '../services/db';
import { UrgencyBadge, StatusBadge, RoleBadge } from '../components/common/Badge';
import { TicketUrgency, TicketStatus, UserRole } from '@domus-flow/shared';

describe('DomusFlow App Routing & UI Components', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('domus_force_demo', 'true');
    await forceReseedDexie();
  });

  describe('Badge Components', () => {
    it('renders UrgencyBadge with correct labels and styles', () => {
      const { rerender } = render(<UrgencyBadge urgency={TicketUrgency.CRITICAL} />);
      expect(screen.getByText('Critical')).toBeInTheDocument();

      rerender(<UrgencyBadge urgency={TicketUrgency.HIGH} />);
      expect(screen.getByText('High')).toBeInTheDocument();

      rerender(<UrgencyBadge urgency={TicketUrgency.MEDIUM} />);
      expect(screen.getByText('Medium')).toBeInTheDocument();

      rerender(<UrgencyBadge urgency={TicketUrgency.LOW} />);
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('renders StatusBadge with correct labels', () => {
      const { rerender } = render(<StatusBadge status={TicketStatus.REPORTED} />);
      expect(screen.getByText('Reported')).toBeInTheDocument();

      rerender(<StatusBadge status={TicketStatus.SCHEDULED} />);
      expect(screen.getByText('Scheduled')).toBeInTheDocument();

      rerender(<StatusBadge status={TicketStatus.IN_PROGRESS} />);
      expect(screen.getByText('In Progress')).toBeInTheDocument();

      rerender(<StatusBadge status={TicketStatus.RESOLVED} />);
      expect(screen.getByText('Resolved')).toBeInTheDocument();
    });

    it('renders RoleBadge with correct roles', () => {
      const { rerender } = render(<RoleBadge role={UserRole.LANDLORD} />);
      expect(screen.getByText('Landlord')).toBeInTheDocument();

      rerender(<RoleBadge role={UserRole.TENANT} />);
      expect(screen.getByText('Tenant')).toBeInTheDocument();

      rerender(<RoleBadge role={UserRole.CONTRACTOR} />);
      expect(screen.getByText('Contractor')).toBeInTheDocument();
    });
  });

  describe('App Navigation and Flow', () => {
    it('renders the App and loads default Landlord view in demo mode', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Executive Overview/i })).toBeInTheDocument();
      });

      expect(screen.getByText(/Managed Properties/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Tenants/i)).toBeInTheDocument();
      expect(screen.getByText(/Open Tickets/i)).toBeInTheDocument();
    });

    it('allows switching demo role via quick persona menu', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Executive Overview/i })).toBeInTheDocument();
      });

      // Open role switcher menu
      const switchBtn = screen.getByRole('button', { name: /switch persona/i });
      await user.click(switchBtn);

      // Select Tenant (James Chen)
      const tenantOption = screen.getByText(/James Chen/i);
      await user.click(tenantOption);

      // Should now be on tickets/work orders view for Tenant
      await waitFor(() => {
        expect(screen.getByText(/Maintenance Tickets/i)).toBeInTheDocument();
      });
    });
  });
});
