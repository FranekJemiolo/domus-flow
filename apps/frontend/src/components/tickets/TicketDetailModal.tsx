/**
 * Comprehensive Ticket Detail & Lifecycle Management Modal
 * Includes photo gallery lightbox, contractor assignment, ETA scheduling,
 * cost acknowledgment, and printable summary.
 */

import React, { useState } from 'react';
import { Ticket, TicketStatus, UserRole, Property, User } from '@domus-flow/shared';
import { UrgencyBadge, StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { sendBrowserNotification } from '../../utils/notifications';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  contractors: User[];
  role: UserRole | null;
  onUpdateStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  onAssignContractor: (ticketId: string, contractorId: string) => Promise<void>;
  onUpdateDetails: (
    ticketId: string,
    updates: { eta?: string | null; costAcknowledged?: boolean }
  ) => Promise<void>;
  onShareToChat: (ticket: Ticket) => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  isOpen,
  onClose,
  properties,
  contractors,
  role,
  onUpdateStatus,
  onAssignContractor,
  onUpdateDetails,
  onShareToChat,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [editingEta, setEditingEta] = useState(false);
  const [etaValue, setEtaValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!ticket) return null;

  const property = properties.find((p) => p.id === ticket.propertyId);
  const contractor = contractors.find((c) => c.id === ticket.contractorId);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(ticket.id, newStatus);
      if (newStatus === TicketStatus.RESOLVED) {
        sendBrowserNotification('Ticket Resolved', {
          body: `Ticket #${ticket.id.slice(0, 8)}: "${ticket.title}" has been marked resolved.`,
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEta = async () => {
    setIsUpdating(true);
    try {
      await onUpdateDetails(ticket.id, { eta: etaValue.trim() || null });
      setEditingEta(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleCost = async () => {
    setIsUpdating(true);
    try {
      await onUpdateDetails(ticket.id, { costAcknowledged: !ticket.costAcknowledged });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={ticket.title} maxWidth="2xl">
        <div className="space-y-5 print:text-black">
          {/* ─── Header Badges & ID ────────────────────────────────────────────── */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-2 flex-wrap">
              <UrgencyBadge urgency={ticket.urgency} />
              <StatusBadge status={ticket.status} />
              {ticket.costAcknowledged && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  ✓ Cost Acknowledged
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 font-mono">
              #{ticket.id.slice(0, 8)} •{' '}
              {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>

          {/* ─── Property & Location Info ──────────────────────────────────────── */}
          {property && (
            <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🏢</span>
                <div>
                  <div className="font-semibold text-slate-800">{property.address}</div>
                  {property.unitNumber && (
                    <div className="text-slate-500">Unit: {property.unitNumber}</div>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-indigo-600 font-medium">Property Details</span>
            </div>
          )}

          {/* ─── Description ──────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Issue Description
            </h3>
            <p className="text-sm text-slate-800 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* ─── Photo Attachments Gallery ────────────────────────────────────── */}
          {ticket.photoUrls && ticket.photoUrls.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Photos ({ticket.photoUrls.length})
                </h3>
                <span className="text-[11px] text-slate-500">Click to enlarge</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ticket.photoUrls.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedPhoto(url)}
                    className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <img
                      src={url}
                      alt={`Evidence ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                      🔍 Enlarge
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── ETA & Scheduling Section ─────────────────────────────────────── */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span>⏱️</span>
                <span>Estimated Arrival / Completion (ETA)</span>
              </span>
              {(role === UserRole.LANDLORD || role === UserRole.CONTRACTOR) && !editingEta && (
                <button
                  type="button"
                  onClick={() => {
                    setEtaValue(ticket.eta || '');
                    setEditingEta(true);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  {ticket.eta ? 'Edit ETA' : '+ Set ETA'}
                </button>
              )}
            </div>

            {editingEta ? (
              <div className="flex gap-2 items-center pt-1">
                <input
                  type="text"
                  value={etaValue}
                  onChange={(e) => setEtaValue(e.target.value)}
                  placeholder="e.g. Tomorrow at 10:00 AM, or 2026-09-08 14:00"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleSaveEta}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEta(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-700">
                {ticket.eta ? (
                  <span className="font-semibold text-indigo-700">{ticket.eta}</span>
                ) : (
                  <span className="text-slate-400 italic">No ETA scheduled yet</span>
                )}
              </div>
            )}
          </div>

          {/* ─── Contractor Assignment (Landlord) or Contractor Info ───────────── */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Assigned Contractor
            </h3>
            {role === UserRole.LANDLORD ? (
              <select
                value={ticket.contractorId || ''}
                disabled={isUpdating}
                onChange={(e) => onAssignContractor(ticket.id, e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Unassigned — Select Contractor</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs text-slate-700">
                {contractor ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{contractor.name}</span>
                      <span className="text-slate-500 ml-2">({contractor.email})</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-semibold border border-sky-200">
                      Contractor
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">No contractor assigned yet.</span>
                )}
              </div>
            )}
          </div>

          {/* ─── Cost Acknowledgment Section ──────────────────────────────────── */}
          {(role === UserRole.LANDLORD || role === UserRole.CONTRACTOR) && (
            <div className="flex items-center justify-between p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs">
              <div>
                <div className="font-semibold text-slate-800">Cost Authorization</div>
                <div className="text-[11px] text-slate-500">
                  Acknowledges contractor quote and authorized repair expenses
                </div>
              </div>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleToggleCost}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  ticket.costAcknowledged
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {ticket.costAcknowledged ? '✓ Acknowledged' : 'Acknowledge Cost'}
              </button>
            </div>
          )}

          {/* ─── Status Workflow Action Bar ───────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Workflow Status Transition
            </h3>
            <div className="flex flex-wrap gap-2">
              {ticket.status !== TicketStatus.REPORTED && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(TicketStatus.REPORTED)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-semibold disabled:opacity-40 transition-colors"
                >
                  ↩ Mark Reported
                </button>
              )}
              {ticket.status !== TicketStatus.SCHEDULED && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(TicketStatus.SCHEDULED)}
                  className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 text-xs font-semibold disabled:opacity-40 transition-colors"
                >
                  📅 Mark Scheduled
                </button>
              )}
              {ticket.status !== TicketStatus.IN_PROGRESS && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(TicketStatus.IN_PROGRESS)}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-xs font-semibold disabled:opacity-40 transition-colors"
                >
                  🔧 Mark In Progress
                </button>
              )}
              {ticket.status !== TicketStatus.RESOLVED && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange(TicketStatus.RESOLVED)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-40 flex items-center gap-1 shadow-xs transition-colors"
                >
                  <span>✓</span>
                  <span>Mark Resolved</span>
                </button>
              )}
            </div>
          </div>

          {/* ─── Bottom Action Bar ────────────────────────────────────────────── */}
          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onShareToChat(ticket)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span>💬</span>
                <span>Discuss in Chat</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Print ticket work order summary"
              >
                <span>🖨️</span>
                <span>Print Summary</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Photo Lightbox Modal ─────────────────────────────────────────────── */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white text-sm bg-slate-800/80 px-3 py-1 rounded-full hover:bg-slate-700"
            >
              ✕ Close Preview
            </button>
            <img
              src={selectedPhoto}
              alt="Expanded view"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-700"
            />
          </div>
        </div>
      )}
    </>
  );
};
