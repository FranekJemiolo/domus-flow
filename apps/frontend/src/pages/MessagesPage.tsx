/**
 * Dual-Channel Chat Page
 * Implements isolated messaging between Tenant-Landlord and Landlord-Contractor
 * Features "Share to Chat" linked ticket previews
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messageService, ticketService } from '../services/dataService';
import { DEMO_USERS } from '../services/db';
import { Message, MessageThreadType, UserRole, Ticket } from '@domus-flow/shared';
import { UrgencyBadge, StatusBadge } from '../components/common/Badge';

export const MessagesPage: React.FC = () => {
  const { currentUser, role } = useAuth();
  const [searchParams] = useSearchParams();

  // Selected thread channel
  const [threadType, setThreadType] = useState<MessageThreadType>(
    MessageThreadType.TENANT_LANDLORD
  );
  const [otherUserId, setOtherUserId] = useState<string>(DEMO_USERS.landlord.id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [newContent, setNewContent] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Setup default otherUserId according to active role and channel
  useEffect(() => {
    if (role === UserRole.LANDLORD) {
      if (threadType === MessageThreadType.TENANT_LANDLORD) {
        setOtherUserId(DEMO_USERS.tenantA.id);
      } else {
        setOtherUserId(DEMO_USERS.contractor.id);
      }
    } else if (role === UserRole.TENANT) {
      setThreadType(MessageThreadType.TENANT_LANDLORD);
      setOtherUserId(DEMO_USERS.landlord.id);
    } else if (role === UserRole.CONTRACTOR) {
      setThreadType(MessageThreadType.LANDLORD_CONTRACTOR);
      setOtherUserId(DEMO_USERS.landlord.id);
    }
  }, [role, threadType]);

  // Handle "Share to Chat" query param
  useEffect(() => {
    const linked = searchParams.get('ticketId');
    if (linked) {
      setSelectedTicketId(linked);
    }
  }, [searchParams]);

  const loadMessages = useCallback(async () => {
    if (!otherUserId) return;
    try {
      const [msgs, allTickets] = await Promise.all([
        messageService.getThread(threadType, otherUserId),
        ticketService.getAll(),
      ]);
      setMessages(msgs);
      setTickets(allTickets);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setIsLoading(false);
    }
  }, [threadType, otherUserId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() && !selectedTicketId) return;

    setIsSending(true);
    try {
      await messageService.sendMessage({
        threadType,
        receiverId: otherUserId,
        content: newContent.trim() || 'Shared a maintenance ticket reference.',
        linkedTicketId: selectedTicketId,
      });
      setNewContent('');
      setSelectedTicketId(null);
      await loadMessages();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const getTicketDetails = (ticketId?: string | null): Ticket | undefined => {
    if (!ticketId) return undefined;
    return tickets.find((t) => t.id === ticketId);
  };

  const isTenant = role === UserRole.TENANT;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden animate-fade-in">
      {/* ─── Channel Header ───────────────────────────────────────────────────── */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>💬</span>
            <span>Direct Maintenance Communications</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Isolated chat channels with ticket sharing capability
          </p>
        </div>

        {/* Channel Tab Selector */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setThreadType(MessageThreadType.TENANT_LANDLORD)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              threadType === MessageThreadType.TENANT_LANDLORD
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tenant ↔ Landlord
          </button>

          {!isTenant && (
            <button
              onClick={() => setThreadType(MessageThreadType.LANDLORD_CONTRACTOR)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                threadType === MessageThreadType.LANDLORD_CONTRACTOR
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Landlord ↔ Contractor
            </button>
          )}
        </div>
      </div>

      {/* ─── Messages Feed ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading conversations...</div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs space-y-2">
            <span className="text-3xl">✉️</span>
            <div>No messages in this channel yet.</div>
            <div className="text-[11px] text-slate-400">Say hello or share a ticket to begin!</div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUser?.id;
            const linkedTicket = getTicketDetails(msg.linkedTicketId);

            return (
              <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-medium text-slate-400">
                    {isMine ? 'You' : 'Participant'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div
                  className={`max-w-md sm:max-w-lg rounded-2xl p-4 text-xs space-y-2.5 shadow-md ${
                    isMine
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-none'
                  }`}
                >
                  <div className="leading-relaxed text-[13px]">{msg.content}</div>

                  {/* ─── "Share to Chat" TicketCard ───────────────────────────── */}
                  {linkedTicket && (
                    <div
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        isMine
                          ? 'bg-indigo-700/60 border-indigo-500/50 text-white'
                          : 'bg-slate-900/80 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                          🎫 Linked Maintenance Ticket
                        </span>
                        <UrgencyBadge urgency={linkedTicket.urgency} />
                      </div>
                      <div className="font-bold text-xs">{linkedTicket.title}</div>
                      <p className="text-[11px] opacity-80 line-clamp-2">
                        {linkedTicket.description}
                      </p>
                      <div className="pt-1 flex items-center justify-between text-[10px]">
                        <StatusBadge status={linkedTicket.status} />
                        {linkedTicket.eta && (
                          <span className="font-medium">ETA: {linkedTicket.eta}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ─── Message Input & Linked Ticket Preview ─────────────────────────────── */}
      <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 shrink-0 space-y-2">
        {selectedTicketId && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300">
            <span className="flex items-center gap-2">
              <span>📎 Attaching ticket:</span>
              <span className="font-bold font-mono">#{selectedTicketId.slice(0, 8)}</span>
            </span>
            <button
              onClick={() => setSelectedTicketId(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Remove
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          {/* Ticket Picker Button */}
          <div className="relative">
            <select
              value={selectedTicketId || ''}
              onChange={(e) => setSelectedTicketId(e.target.value || null)}
              className="px-2.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
              title="Attach a ticket reference to message"
            >
              <option value="">📎 Attach Ticket</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.id.slice(0, 6)} - {t.title.slice(0, 24)}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Type a message or updates..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />

          <button
            type="submit"
            disabled={isSending || (!newContent.trim() && !selectedTicketId)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wide transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <span>Send</span>
            <span>➤</span>
          </button>
        </form>
      </div>
    </div>
  );
};
