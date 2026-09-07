/**
 * Tickets & Work Orders Management Page
 * Displays maintenance requests in Kanban Board or List view, with role-based actions,
 * photo attachments, ETA tracking, and status transitions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketService, propertyService, userService } from '../services/dataService';
import { Ticket, TicketStatus, TicketUrgency, Property, User, UserRole } from '@domus-flow/shared';
import { UrgencyBadge, StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { PhotoUploadDropzone } from '../components/tickets/PhotoUploadDropzone';
import { TicketDetailModal } from '../components/tickets/TicketDetailModal';
import { sendBrowserNotification } from '../utils/notifications';

export const TicketsPage: React.FC = () => {
  const { role } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [contractors, setContractors] = useState<User[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [propertyFilter, setPropertyFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // New Ticket Form State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPropertyId, setNewPropertyId] = useState('');
  const [newUrgency, setNewUrgency] = useState<TicketUrgency>(TicketUrgency.MEDIUM);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Detail / Action Modal State
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allTickets, allProps, allContractors] = await Promise.all([
        ticketService.getAll(),
        propertyService.getAll(),
        userService.getContractors(),
      ]);
      setTickets(allTickets);
      setProperties(allProps);
      setContractors(allContractors);

      if (allProps.length > 0) {
        setNewPropertyId((prev) => prev || allProps[0].id);
      }
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    if (searchParams.get('action') === 'new') {
      setIsNewModalOpen(true);
      setSearchParams({});
    }
  }, [loadData, searchParams, setSearchParams]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !newPropertyId) return;
    setIsCreating(true);
    try {
      const created = await ticketService.create({
        propertyId: newPropertyId,
        title: newTitle.trim(),
        description: newDescription.trim(),
        urgency: newUrgency,
        photoUrls: newPhotos,
      });

      if (newUrgency === TicketUrgency.CRITICAL) {
        sendBrowserNotification('Critical Maintenance Reported!', {
          body: `Urgent ticket: "${created.title}" requires immediate attention.`,
        });
      }

      setNewTitle('');
      setNewDescription('');
      setNewPhotos([]);
      setIsNewModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to create ticket', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    try {
      const updated = await ticketService.update(ticketId, { status });
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(updated);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleAssignContractor = async (ticketId: string, contractorId: string) => {
    try {
      const updated = await ticketService.update(ticketId, {
        contractorId: contractorId || null,
        status: TicketStatus.SCHEDULED,
      });
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(updated);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to assign contractor', err);
    }
  };

  const handleUpdateDetails = async (
    ticketId: string,
    updates: { eta?: string | null; costAcknowledged?: boolean }
  ) => {
    try {
      const updated = await ticketService.update(ticketId, updates);
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(updated);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to update ticket details', err);
    }
  };

  const handleShareToChat = (ticket: Ticket) => {
    navigate(`/messages?ticketId=${ticket.id}`);
  };

  const getNextStatus = (current: TicketStatus): TicketStatus | null => {
    switch (current) {
      case TicketStatus.REPORTED:
        return TicketStatus.SCHEDULED;
      case TicketStatus.SCHEDULED:
        return TicketStatus.IN_PROGRESS;
      case TicketStatus.IN_PROGRESS:
        return TicketStatus.RESOLVED;
      default:
        return null;
    }
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (urgencyFilter !== 'ALL' && t.urgency !== urgencyFilter) return false;
    if (propertyFilter !== 'ALL' && t.propertyId !== propertyFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      return matchTitle || matchDesc;
    }
    return true;
  });

  const kanbanColumns: {
    status: TicketStatus;
    label: string;
    icon: string;
    border: string;
  }[] = [
    {
      status: TicketStatus.REPORTED,
      label: 'Reported',
      icon: '📬',
      border: 'border-indigo-500/40',
    },
    {
      status: TicketStatus.SCHEDULED,
      label: 'Scheduled',
      icon: '📅',
      border: 'border-sky-500/40',
    },
    {
      status: TicketStatus.IN_PROGRESS,
      label: 'In Progress',
      icon: '🔧',
      border: 'border-amber-500/40',
    },
    {
      status: TicketStatus.RESOLVED,
      label: 'Resolved',
      icon: '✅',
      border: 'border-emerald-500/40',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Header & Controls ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            {role === UserRole.CONTRACTOR ? 'Assigned Work Orders' : 'Maintenance Tickets'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track repairs, scheduling, and contractor assignments
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Toggle */}
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                viewMode === 'kanban'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📊</span>
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📋</span>
              <span>List</span>
            </button>
          </div>

          {/* New Ticket Button (Tenants and Landlords) */}
          {role !== UserRole.CONTRACTOR && (
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold tracking-wide transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-2"
            >
              <span>+</span>
              <span>Report Issue</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Filter Bar ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-900/80 border border-slate-800/80 rounded-2xl">
        {/* Search Filter */}
        <div>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search tickets by keywords..."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Urgency Filter */}
        <div>
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Urgency Levels</option>
            <option value={TicketUrgency.LOW}>Low</option>
            <option value={TicketUrgency.MEDIUM}>Medium</option>
            <option value={TicketUrgency.HIGH}>High</option>
            <option value={TicketUrgency.CRITICAL}>Critical (Emergency)</option>
          </select>
        </div>

        {/* Property Filter */}
        <div>
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address} {p.unitNumber ? `(${p.unitNumber})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Content Views ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading tickets...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="py-20 text-center text-slate-500 space-y-3 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <span className="text-4xl">📬</span>
          <div className="text-base font-semibold text-slate-300">No maintenance tickets found</div>
          <div className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchFilter || urgencyFilter !== 'ALL' || propertyFilter !== 'ALL'
              ? 'Try adjusting your search or filters.'
              : 'Everything is running smoothly! New repair requests will appear here.'}
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        /* ─── KANBAN BOARD VIEW ──────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kanbanColumns.map((col) => {
            const columnTickets = filteredTickets.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                className="flex flex-col rounded-2xl bg-slate-900/60 border border-slate-800 p-3 min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{col.icon}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {col.label}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-bold text-slate-300">
                    {columnTickets.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnTickets.map((ticket) => {
                    const prop = properties.find((p) => p.id === ticket.propertyId);
                    const nextStatus = getNextStatus(ticket.status);

                    return (
                      <div
                        key={ticket.id}
                        className={`p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 transition-all space-y-2.5 shadow-sm group`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <UrgencyBadge urgency={ticket.urgency} />
                          {ticket.photoUrls && ticket.photoUrls.length > 0 && (
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                              <span>📷</span>
                              <span>{ticket.photoUrls.length}</span>
                            </span>
                          )}
                        </div>

                        {/* Click to open details */}
                        <div
                          onClick={() => setSelectedTicket(ticket)}
                          className="cursor-pointer space-y-1"
                        >
                          <h2 className="text-xs font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
                            {ticket.title}
                          </h2>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {ticket.description}
                          </p>
                        </div>

                        {/* Property / ETA info */}
                        <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="truncate max-w-[130px]">
                            {prop ? prop.address : 'Property'}
                          </span>
                          {ticket.eta ? (
                            <span className="font-semibold text-indigo-400">ETA: {ticket.eta}</span>
                          ) : (
                            <span>#{ticket.id.slice(0, 6)}</span>
                          )}
                        </div>

                        {/* Quick Action Bar */}
                        <div className="pt-1.5 flex items-center justify-between gap-1">
                          <button
                            onClick={() => handleShareToChat(ticket)}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-300 text-[10px] font-medium transition-colors flex items-center gap-1"
                            title="Discuss ticket in chat"
                          >
                            <span>💬</span>
                            <span>Chat</span>
                          </button>

                          {nextStatus && (
                            <button
                              onClick={() => handleUpdateStatus(ticket.id, nextStatus)}
                              className="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30 transition-colors flex items-center gap-1"
                              title={`Advance status to ${nextStatus}`}
                            >
                              <span>Next</span>
                              <span>→</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── LIST VIEW ──────────────────────────────────────────────────────── */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Ticket</th>
                  <th className="px-4 py-3.5">Property</th>
                  <th className="px-4 py-3.5">Urgency</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">ETA / Schedule</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTickets.map((ticket) => {
                  const prop = properties.find((p) => p.id === ticket.propertyId);
                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <span>{ticket.title}</span>
                          {ticket.photoUrls && ticket.photoUrls.length > 0 && (
                            <span className="text-[10px] text-slate-400">📷</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          #{ticket.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">{prop ? prop.address : '—'}</td>
                      <td className="px-4 py-3.5">
                        <UrgencyBadge urgency={ticket.urgency} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {ticket.eta ? (
                          <span className="font-semibold text-indigo-400">{ticket.eta}</span>
                        ) : (
                          'Not set'
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleShareToChat(ticket)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                          >
                            Chat
                          </button>
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-semibold"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── New Ticket Creation Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Submit Maintenance Request"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Property *
            </label>
            <select
              required
              value={newPropertyId}
              onChange={(e) => setNewPropertyId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address} {p.unitNumber ? `(Unit ${p.unitNumber})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Issue Title *</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Garbage disposal humming but not spinning"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Detailed Description *
            </label>
            <textarea
              required
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Describe what happened, where the issue is located, and any attempts to fix it..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Urgency Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  level: TicketUrgency.LOW,
                  label: 'Low',
                  desc: 'Cosmetic / Non-urgent',
                },
                {
                  level: TicketUrgency.MEDIUM,
                  label: 'Medium',
                  desc: 'Noticeable inconvenience',
                },
                {
                  level: TicketUrgency.HIGH,
                  label: 'High',
                  desc: 'Potential property damage',
                },
                {
                  level: TicketUrgency.CRITICAL,
                  label: 'Critical',
                  desc: 'Flood / Fire / Emergency',
                },
              ].map((item) => (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => setNewUrgency(item.level)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    newUrgency === item.level
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold ring-1 ring-indigo-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Upload Dropzone with Compression */}
          <PhotoUploadDropzone photos={newPhotos} onChange={setNewPhotos} maxPhotos={4} />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !newTitle.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
            >
              {isCreating ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Ticket Details & Action Modal ────────────────────────────────────── */}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        properties={properties}
        contractors={contractors}
        role={role}
        onUpdateStatus={handleUpdateStatus}
        onAssignContractor={handleAssignContractor}
        onUpdateDetails={handleUpdateDetails}
        onShareToChat={handleShareToChat}
      />
    </div>
  );
};
