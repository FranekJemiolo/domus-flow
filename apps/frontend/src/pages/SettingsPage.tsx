/**
 * Settings & System Management Page
 * Handles Demo Mode toggle, Dexie database reset, CSV repair log export, and platform stats
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  dashboardService,
  ticketService,
  propertyService,
  userService,
} from '../services/dataService';
import { buildRepairLogExport, exportRepairLogsToCsv } from '../services/csv';
import { RoleBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { sendBrowserNotification } from '../utils/notifications';

export const SettingsPage: React.FC = () => {
  const { currentUser, role, isDemo, toggleDemoMode } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await dashboardService.resetDemoData();
      setIsResetConfirmOpen(false);
      setSuccessMessage('Demo database reset successfully to default state!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Reset failed', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportRepairLogs = async () => {
    setIsExporting(true);
    try {
      const [tickets, properties, users] = await Promise.all([
        ticketService.getAll(),
        propertyService.getAll(),
        userService.getAll(),
      ]);
      const logs = buildRepairLogExport(tickets, properties, users);
      exportRepairLogsToCsv(logs, 'domus_flow_repair_logs.csv');
      setSuccessMessage('Repair logs exported and downloaded!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTestNotification = async () => {
    await sendBrowserNotification('DomusFlow Notification Test', {
      body: 'Maintenance notifications are active and functioning properly!',
    });
    setSuccessMessage('Test notification dispatched!');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* ─── Header ───────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          System Settings & Operations
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure application connection modes, database management, and data exports
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-slide-down shadow-xs">
          <span>✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* ─── Profile Overview ─────────────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-600">
          👤 User Profile
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-500 block mb-1">Full Name</span>
            <span className="font-semibold text-slate-900 text-sm">
              {currentUser?.name || 'Guest'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-500 block mb-1">Email Address</span>
            <span className="font-semibold text-slate-900 text-sm">{currentUser?.email}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-500 block mb-1">Active Role</span>
            {role ? <RoleBadge role={role} /> : 'None'}
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-500 block mb-1">Invite Code</span>
            <span className="font-mono text-slate-800 font-semibold">
              {currentUser?.inviteCode || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Connection & Data Mode ────────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-600">
            ⚙️ Connection & Storage Architecture
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            DomusFlow features a dual-mode engine: fully offline Dexie.js (IndexedDB) or live REST
            API (PostgreSQL).
          </p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div>
            <div className="font-semibold text-xs text-slate-900">
              Current Mode: {isDemo ? 'Offline Demo Mode' : 'Connected Live API Mode'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {isDemo
                ? 'Running entirely in client browser with Dexie.js. No server required.'
                : 'Connecting to Express & PostgreSQL backend at /api.'}
            </div>
          </div>

          <button
            onClick={toggleDemoMode}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors shadow-xs ${
              isDemo
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500'
            }`}
          >
            Switch to {isDemo ? 'Live API' : 'Demo Mode'}
          </button>
        </div>

        {/* ─── Push Notifications Test ───────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div>
            <div className="font-semibold text-xs text-slate-900">Browser Push Notifications</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Verify desktop and mobile alerts for urgent maintenance tickets.
            </div>
          </div>

          <button
            onClick={handleTestNotification}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-semibold transition-colors shadow-xs"
          >
            🔔 Test Alert
          </button>
        </div>

        {/* ─── Demo Data Reset ───────────────────────────────────────────────── */}
        {isDemo && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <div className="font-semibold text-xs text-slate-900">Reset Demo Database</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Restores default properties, tickets, and chat messages.
              </div>
            </div>

            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors shadow-xs"
            >
              Reset Data
            </button>
          </div>
        )}

        {/* ─── CSV Export Action ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div>
            <div className="font-semibold text-xs text-slate-900">Export Complete Repair Logs</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Download all maintenance tickets formatted for auditing and spreadsheets.
            </div>
          </div>

          <button
            onClick={handleExportRepairLogs}
            disabled={isExporting}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
          >
            <span>📥</span>
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* ─── Reset Confirmation Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="Reset Demo Data"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Are you sure you want to reset the IndexedDB demo storage? All custom properties and
            tickets will be restored to their original demonstration state.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsResetConfirmOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleResetData}
              disabled={isResetting}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-50 shadow-xs"
            >
              {isResetting ? 'Resetting...' : 'Confirm Reset'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
