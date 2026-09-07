/**
 * Landlord Executive Dashboard
 * Displays high-level maintenance statistics, urgent tickets alert, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  dashboardService,
  ticketService,
  propertyService,
  userService,
} from '../services/dataService';
import { buildRepairLogExport, exportRepairLogsToCsv } from '../services/csv';
import {
  LandlordDashboardStats,
  Ticket,
  TicketUrgency,
  TicketStatus,
  Property,
} from '@domus-flow/shared';
import { UrgencyBadge, StatusBadge } from '../components/common/Badge';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<LandlordDashboardStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [statsData, ticketsData, propsData] = await Promise.all([
          dashboardService.getStats(),
          ticketService.getAll(),
          propertyService.getAll(),
        ]);
        setStats(statsData);
        setAllTickets(ticketsData);
        setRecentTickets(ticketsData.slice(0, 5));
        setProperties(propsData);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const [allTickets, allProps, allUsers] = await Promise.all([
        ticketService.getAll(),
        propertyService.getAll(),
        userService.getAll(),
      ]);
      const logs = buildRepairLogExport(allTickets, allProps, allUsers);
      exportRepairLogsToCsv(logs, 'domus_flow_repair_logs.csv');
    } catch (err) {
      console.error('CSV Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const criticalTickets = recentTickets.filter(
    (t) => t.urgency === TicketUrgency.CRITICAL && t.status !== TicketStatus.RESOLVED
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mr-3" />
        Loading executive metrics...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─── Header & Quick Actions Bar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Executive Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time maintenance monitoring across all rental portfolios
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate('/tickets?action=new')}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow transition-all flex items-center gap-1.5"
          >
            <span>+</span>
            <span>New Ticket</span>
          </button>
          <button
            onClick={() => navigate('/properties?action=new')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            + Add Property
          </button>
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Download full repair logs as CSV"
          >
            <span>📥</span>
            <span>{isExporting ? 'Exporting...' : 'Export Logs'}</span>
          </button>
        </div>
      </div>

      {/* ─── Urgent Alert Banner ──────────────────────────────────────────────── */}
      {criticalTickets.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3.5 animate-slide-up">
          <span className="text-2xl shrink-0">🚨</span>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-rose-300">
              Immediate Attention Required: {criticalTickets.length} Critical Issue(s)
            </h2>
            <div className="mt-1 text-xs text-rose-200/80 space-y-1">
              {criticalTickets.map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <span>• {t.title}</span>
                  <button
                    onClick={() => navigate(`/tickets?id=${t.id}`)}
                    className="text-xs font-semibold text-rose-300 hover:underline"
                  >
                    View Ticket →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Managed Properties</span>
            <span>🏠</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-100">
            {stats?.totalProperties ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Total units registered</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Tenants</span>
            <span>👥</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-100">
            {stats?.totalTenants ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Occupied leases</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Open Tickets</span>
            <span>🎫</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-amber-400">
            {stats?.openTickets ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Pending repair or resolution</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Critical Issues</span>
            <span>⚡</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-rose-400">
            {stats?.criticalTickets ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Emergencies flagged</div>
        </div>
      </div>

      {/* ─── Maintenance Pipeline Distribution ───────────────────────────────── */}
      {allTickets.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>📊</span>
                <span>Maintenance Pipeline Distribution</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Live workflow progression across all maintenance requests
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Reported ({allTickets.filter((t) => t.status === TicketStatus.REPORTED).length})
              </span>
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Scheduled ({allTickets.filter((t) => t.status === TicketStatus.SCHEDULED).length})
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                In Progress (
                {allTickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length})
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Resolved ({allTickets.filter((t) => t.status === TicketStatus.RESOLVED).length})
              </span>
            </div>
          </div>

          {/* Visual Multi-Segment Pipeline Bar */}
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            <div
              style={{
                width: `${(allTickets.filter((t) => t.status === TicketStatus.REPORTED).length / allTickets.length) * 100}%`,
              }}
              className="bg-indigo-500 transition-all duration-500"
            />
            <div
              style={{
                width: `${(allTickets.filter((t) => t.status === TicketStatus.SCHEDULED).length / allTickets.length) * 100}%`,
              }}
              className="bg-sky-500 transition-all duration-500"
            />
            <div
              style={{
                width: `${(allTickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length / allTickets.length) * 100}%`,
              }}
              className="bg-amber-500 transition-all duration-500"
            />
            <div
              style={{
                width: `${(allTickets.filter((t) => t.status === TicketStatus.RESOLVED).length / allTickets.length) * 100}%`,
              }}
              className="bg-emerald-500 transition-all duration-500"
            />
          </div>
        </div>
      )}

      {/* ─── Recent Tickets & Properties Snapshot ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-100">Recent Maintenance Requests</h2>
            <button
              onClick={() => navigate('/tickets')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              View All →
            </button>
          </div>

          <div className="space-y-2.5">
            {recentTickets.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No tickets submitted yet.
              </div>
            ) : (
              recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => navigate('/tickets')}
                  className="p-3.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-xs sm:text-sm text-slate-200 truncate">
                      {ticket.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {ticket.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <UrgencyBadge urgency={ticket.urgency} />
                    <StatusBadge status={ticket.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Portfolio Snapshot */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-100">Properties Snapshot</h2>
            <button
              onClick={() => navigate('/properties')}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              Manage →
            </button>
          </div>

          <div className="space-y-3">
            {properties.slice(0, 4).map((prop) => (
              <div
                key={prop.id}
                className="p-3 rounded-xl bg-slate-800/40 border border-slate-800/80"
              >
                <div className="font-medium text-xs text-slate-200">{prop.address}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {prop.unitNumber ? `Unit: ${prop.unitNumber}` : 'Single Family Home'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
