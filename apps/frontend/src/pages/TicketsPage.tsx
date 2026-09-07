/**
 * Tickets & Work Orders Management Page
 * Displays maintenance requests in Kanban Board or List view, with role-based actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketService, propertyService, userService } from '../services/dataService';
import { Ticket, TicketStatus, TicketUrgency, Property, User, UserRole } from '@domus-flow/shared';
import { UrgencyBadge, StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const TicketsPage: React.FC = () => {
  const { role } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [contractors, setContractors] = useState<User[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isLoading, setIsLoading] = useState(true);

  // New Ticket Modal State
  const [searchParams, setSearchParams] = useSearchParams();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPropertyId, setNewPropertyId] = useState('');
  const [newUrgency, setNewUrgency] = useState<TicketUrgency>(TicketUrgency.MEDIUM);
  const [isCreating, setIsCreating] = useState(false);

  // Detail / Update Modal State
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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
      await ticketService.create({
        propertyId: newPropertyId,
        title: newTitle.trim(),
        description: newDescription.trim(),
        urgency: newUrgency,
      });
      setNewTitle('');
      setNewDescription('');
      setIsNewModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to create ticket', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    setUpdatingStatus(true);
    try {
      await ticketService.update(ticketId, { status });
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
      await loadData();
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssignContractor = async (ticketId: string, contractorId: string) => {
    try {
      await ticketService.update(ticketId, {
        contractorId: contractorId || null,
        status: TicketStatus.SCHEDULED,
      });
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          contractorId: contractorId || null,
          status: TicketStatus.SCHEDULED,
        });
      }
      await loadData();
    } catch (err) {
      console.error('Failed to assign contractor', err);
    }
  };

  const handleShareToChat = (ticket: Ticket) => {
    // Navigate to messages with linked ticket ID
    navigate(`/messages?ticketId=${ticket.id}`);
  };

  const kanbanColumns: { status: TicketStatus; label: string; icon: string; border: string }[] = [
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

        <div className="flex items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                viewMode === 'kanban'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📋</span>
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📑</span>
              <span>List</span>
            </button>
          </div>

          {/* New Ticket (Tenants & Landlords can create) */}
          {role !== UserRole.CONTRACTOR && (
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow transition-all flex items-center gap-1.5"
              id="new-ticket-button"
            >
              <span>+</span>
              <span>New Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Tickets View ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
          <span className="text-4xl">🎉</span>
          <h2 className="text-base font-bold text-slate-200 mt-3">All Clear! No Active Tickets</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            There are currently no maintenance issues pending for your account.
          </p>
          {role !== UserRole.CONTRACTOR && (
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
            >
              + Submit New Request
            </button>
          )}
        </div>
      ) : viewMode === 'kanban' ? (
        /* ─── Kanban Board View ────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colTickets = tickets.filter((t) => t.status === col.status);

            return (
              <div
                key={col.status}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 min-h-[400px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{col.icon}</span>
                    <span className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                      {col.label}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">
                    {colTickets.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3">
                  {colTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border ${col.border} hover:border-slate-600 transition-all cursor-pointer shadow-sm space-y-2`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <UrgencyBadge urgency={ticket.urgency} />
                        <span className="text-[10px] text-slate-400 font-mono">
                          #{ticket.id.slice(0, 6)}
                        </span>
                      </div>

                      <h2 className="font-bold text-xs text-slate-100 leading-snug">
                        {ticket.title}
                      </h2>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {ticket.description}
                      </p>

                      {ticket.eta && (
                        <div className="text-[10px] text-sky-400 flex items-center gap-1">
                          <span>⏱️ ETA:</span>
                          <span>{ticket.eta}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareToChat(ticket);
                          }}
                          className="hover:text-indigo-300 flex items-center gap-1 font-medium"
                          title="Share to Chat"
                        >
                          <span>💬 Chat</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── List View ────────────────────────────────────────────────────── */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="divide-y divide-slate-800">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="p-4 hover:bg-slate-800/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UrgencyBadge urgency={ticket.urgency} />
                    <StatusBadge status={ticket.status} />
                    <span className="text-xs font-mono text-slate-500">
                      #{ticket.id.slice(0, 8)}
                    </span>
                  </div>
                  <h2 className="font-bold text-sm text-slate-100">{ticket.title}</h2>
                  <p className="text-xs text-slate-400 line-clamp-1">{ticket.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {ticket.eta && (
                    <span className="text-xs text-sky-300 font-medium">ETA: {ticket.eta}</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareToChat(ticket);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
                  >
                    💬 Share to Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Create Ticket Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Submit Maintenance Request"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Property / Unit *
            </label>
            <select
              value={newPropertyId}
              onChange={(e) => setNewPropertyId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address} {p.unitNumber ? `(${p.unitNumber})` : ''}
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
              rows={4}
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
                { level: TicketUrgency.LOW, label: 'Low', desc: 'Cosmetic / Non-urgent' },
                { level: TicketUrgency.MEDIUM, label: 'Medium', desc: 'Noticeable inconvenience' },
                { level: TicketUrgency.HIGH, label: 'High', desc: 'Potential property damage' },
                {
                  level: TicketUrgency.CRITICAL,
                  label: 'Critical',
                  desc: 'Flood / Fire / No heat',
                },
              ].map((item) => (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => setNewUrgency(item.level)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    newUrgency === item.level
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
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
      <Modal
        isOpen={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket ? selectedTicket.title : ''}
        maxWidth="lg"
      >
        {selectedTicket && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <UrgencyBadge urgency={selectedTicket.urgency} />
              <StatusBadge status={selectedTicket.status} />
              <span className="text-xs text-slate-400 font-mono">
                ID: {selectedTicket.id.slice(0, 8)}
              </span>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Description
              </h2>
              <p className="text-sm text-slate-200 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                {selectedTicket.description}
              </p>
            </div>

            {/* Contractor Assignment (for Landlords) */}
            {role === UserRole.LANDLORD && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Assign Contractor
                </h2>
                <select
                  value={selectedTicket.contractorId || ''}
                  onChange={(e) => handleAssignContractor(selectedTicket.id, e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Transition Action Bar */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Update Status
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={updatingStatus || selectedTicket.status === TicketStatus.SCHEDULED}
                  onClick={() => handleUpdateStatus(selectedTicket.id, TicketStatus.SCHEDULED)}
                  className="px-3 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/40 text-xs font-semibold disabled:opacity-40"
                >
                  Schedule
                </button>
                <button
                  disabled={updatingStatus || selectedTicket.status === TicketStatus.IN_PROGRESS}
                  onClick={() => handleUpdateStatus(selectedTicket.id, TicketStatus.IN_PROGRESS)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-xs font-semibold disabled:opacity-40"
                >
                  Mark In Progress
                </button>
                <button
                  disabled={updatingStatus || selectedTicket.status === TicketStatus.RESOLVED}
                  onClick={() => handleUpdateStatus(selectedTicket.id, TicketStatus.RESOLVED)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-semibold disabled:opacity-40"
                >
                  Mark Resolved
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => handleShareToChat(selectedTicket)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5"
              >
                <span>💬</span>
                <span>Discuss in Chat</span>
              </button>
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
