/**
 * Integration & Unit Tests for Tickets, Media, and Dual-Channel Chat
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import 'fake-indexeddb/auto';
import { MemoryRouter } from 'react-router-dom';
import { TicketDetailModal } from '../components/tickets/TicketDetailModal';
import { PhotoUploadDropzone } from '../components/tickets/PhotoUploadDropzone';
import { MessagesPage } from '../pages/MessagesPage';
import { TicketsPage } from '../pages/TicketsPage';
import { AuthProvider } from '../context/AuthContext';
import { forceReseedDexie, DEMO_USERS } from '../services/db';
import { Ticket, TicketStatus, TicketUrgency, UserRole, Property, User } from '@domus-flow/shared';
import { fileToDataUrl, compressAndEncodeImage } from '../utils/imageUtils';
import { requestNotificationPermission, sendBrowserNotification } from '../utils/notifications';

const mockTicket: Ticket = {
  id: 'ticket-12345678',
  propertyId: 'prop-1',
  tenantId: DEMO_USERS.tenantA.id,
  contractorId: DEMO_USERS.contractor.id,
  title: 'Water pipe leaking under kitchen sink',
  description: 'Water is accumulating quickly inside the lower cabinet.',
  urgency: TicketUrgency.CRITICAL,
  status: TicketStatus.SCHEDULED,
  photoUrls: [
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  ],
  costAcknowledged: true,
  eta: 'Tomorrow at 10:00 AM',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockProperty: Property = {
  id: 'prop-1',
  landlordId: DEMO_USERS.landlord.id,
  address: '742 Evergreen Terrace',
  unitNumber: 'Unit 4B',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockContractor: User = {
  id: DEMO_USERS.contractor.id,
  email: 'contractor@apexrepairs.com',
  name: 'Apex Plumbing & HVAC',
  role: UserRole.CONTRACTOR,
  inviteCode: 'APEX123',
  linkedPropertyId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Tickets, Media & Chat System Tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('domus_force_demo', 'true');
    await forceReseedDexie();
    vi.restoreAllMocks();
  });

  describe('Image & Notification Utilities', () => {
    it('fileToDataUrl converts Blob to Base64 string', async () => {
      const blob = new Blob(['sample-data'], { type: 'text/plain' });
      const dataUrl = await fileToDataUrl(blob);
      expect(dataUrl).toContain('data:text/plain;base64,');
    });

    it('compressAndEncodeImage processes an image file with fallback', async () => {
      const file = new File(['dummy content'], 'photo.png', { type: 'image/png' });
      const result = await compressAndEncodeImage(file);
      expect(result.dataUrl).toBeTruthy();
      expect(result.fileName).toBe('photo.png');
    });

    it('notification utility handles granted permission', async () => {
      class MockNotification {
        static permission = 'granted';
        static requestPermission = vi.fn().mockResolvedValue('granted');
        title: string;
        options?: NotificationOptions;
        constructor(title: string, options?: NotificationOptions) {
          this.title = title;
          this.options = options;
        }
      }
      vi.stubGlobal('Notification', MockNotification);

      const granted = await requestNotificationPermission();
      expect(granted).toBe(true);

      const notif = sendBrowserNotification('Test Title', { body: 'Test body' });
      expect(notif).toBeDefined();
    });
  });

  describe('PhotoUploadDropzone Component', () => {
    it('renders upload area and allows removing existing photos', async () => {
      const onChange = vi.fn();
      const photos = ['data:image/png;base64,test1', 'data:image/png;base64,test2'];

      render(<PhotoUploadDropzone photos={photos} onChange={onChange} maxPhotos={4} />);

      expect(screen.getByText('Photo Evidence (2/4)')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: '✕' })).toHaveLength(2);

      // Click remove on first photo
      fireEvent.click(screen.getAllByRole('button', { name: '✕' })[0]);
      expect(onChange).toHaveBeenCalledWith(['data:image/png;base64,test2']);
    });
  });

  describe('TicketDetailModal Component', () => {
    it('renders full ticket details, status actions, and ETA', () => {
      const onUpdateStatus = vi.fn();
      const onAssignContractor = vi.fn();
      const onUpdateDetails = vi.fn();
      const onShareToChat = vi.fn();

      render(
        <TicketDetailModal
          ticket={mockTicket}
          isOpen={true}
          onClose={vi.fn()}
          properties={[mockProperty]}
          contractors={[mockContractor]}
          role={UserRole.LANDLORD}
          onUpdateStatus={onUpdateStatus}
          onAssignContractor={onAssignContractor}
          onUpdateDetails={onUpdateDetails}
          onShareToChat={onShareToChat}
        />
      );

      expect(screen.getByText(mockTicket.title)).toBeInTheDocument();
      expect(screen.getByText('742 Evergreen Terrace')).toBeInTheDocument();
      expect(screen.getByText('Tomorrow at 10:00 AM')).toBeInTheDocument();
      expect(screen.getByText('✓ Cost Acknowledged')).toBeInTheDocument();
      expect(screen.getByText('Photos (1)')).toBeInTheDocument();

      // Trigger Share to Chat
      const chatBtn = screen.getByRole('button', { name: /discuss in chat/i });
      fireEvent.click(chatBtn);
      expect(onShareToChat).toHaveBeenCalledWith(mockTicket);

      // Trigger Status update to In Progress
      const inProgressBtn = screen.getByRole('button', { name: /mark in progress/i });
      fireEvent.click(inProgressBtn);
      expect(onUpdateStatus).toHaveBeenCalledWith(mockTicket.id, TicketStatus.IN_PROGRESS);
    });
  });

  describe('TicketsPage View', () => {
    it('renders tickets list and responds to search filter', async () => {
      render(
        <MemoryRouter initialEntries={['/tickets']}>
          <AuthProvider>
            <TicketsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Maintenance Tickets/i)).toBeInTheDocument();
      });

      // Filter input
      const searchInput = screen.getByPlaceholderText(/search tickets by keywords/i);
      await userEvent.type(searchInput, 'non-existent-search-term-xyz');

      await waitFor(() => {
        expect(screen.getByText(/no maintenance tickets found/i)).toBeInTheDocument();
      });
    });
  });

  describe('MessagesPage Chat', () => {
    it('renders canned quick replies and sends a canned message', async () => {
      render(
        <MemoryRouter initialEntries={['/messages']}>
          <AuthProvider>
            <MessagesPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Direct Maintenance Communications/i)).toBeInTheDocument();
      });

      // Verify canned reply exists
      const cannedBtn = screen.getByRole('button', {
        name: /approved, please proceed with repair/i,
      });
      expect(cannedBtn).toBeInTheDocument();

      // Click canned reply to populate message
      fireEvent.click(cannedBtn);

      const input = screen.getByPlaceholderText(/type a message or updates/i) as HTMLInputElement;
      expect(input.value).toBe('👍 Approved, please proceed with repair');
    });
  });
});
