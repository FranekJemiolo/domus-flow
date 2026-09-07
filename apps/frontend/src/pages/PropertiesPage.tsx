/**
 * Properties Management Page
 * Allows landlords to list properties, add new units, and bulk-import via CSV
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { propertyService, userService } from '../services/dataService';
import { parsePropertyCsv, PropertyCsvRow } from '../services/csv';
import { Property, User } from '@domus-flow/shared';
import { Modal } from '../components/common/Modal';

export const PropertiesPage: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Add Property Form State
  const [newAddress, setNewAddress] = useState('');
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Bulk CSV Import State
  const [csvPreviewRows, setCsvPreviewRows] = useState<PropertyCsvRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Tenant Invite Modal State
  const [inviteProperty, setInviteProperty] = useState<Property | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [props, allTenants] = await Promise.all([
        propertyService.getAll(),
        userService.getTenants(),
      ]);
      setProperties(props);
      setTenants(allTenants);
    } catch (err) {
      console.error('Failed to load properties', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (searchParams.get('action') === 'new') {
      setIsAddModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim()) return;
    setIsSaving(true);
    try {
      await propertyService.create({
        address: newAddress.trim(),
        unitNumber: newUnitNumber.trim() || undefined,
      });
      setNewAddress('');
      setNewUnitNumber('');
      setIsAddModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to create property', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parsePropertyCsv(file);
      if (parsed.length === 0) {
        setCsvError('No valid property rows found in CSV. Please verify column headers.');
      } else {
        setCsvPreviewRows(parsed);
      }
    } catch (err: unknown) {
      setCsvError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    }
  };

  const handleConfirmBulkImport = async () => {
    if (csvPreviewRows.length === 0) return;
    setIsImporting(true);
    try {
      await propertyService.bulkImport(csvPreviewRows);
      setCsvPreviewRows([]);
      setIsImportModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setCsvError(err instanceof Error ? err.message : 'Failed to import properties');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredProperties = properties.filter(
    (p) =>
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.unitNumber && p.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Header & Actions ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Property Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your buildings, units, and resident lease links
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
            id="bulk-import-button"
          >
            <span>📄</span>
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow transition-all flex items-center gap-1.5"
            id="add-property-button"
          >
            <span>+</span>
            <span>Add Property</span>
          </button>
        </div>
      </div>

      {/* ─── Search Filter ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search properties by street or unit..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-400">
          Showing {filteredProperties.length} of {properties.length} units
        </span>
      </div>

      {/* ─── Property Cards Grid ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading properties...</div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
          <span className="text-4xl">🏠</span>
          <h2 className="text-base font-bold text-slate-200 mt-3">No Properties Found</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Get started by adding your first unit or importing your portfolio via CSV.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            + Add First Property
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProperties.map((property) => {
            const propertyTenants = tenants.filter((t) => t.linkedPropertyId === property.id);

            return (
              <div
                key={property.id}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-lg">🏢</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-indigo-300 border border-slate-700">
                      {property.unitNumber ? property.unitNumber : 'Main'}
                    </span>
                  </div>
                  <h2 className="font-bold text-sm text-slate-100 leading-snug">
                    {property.address}
                  </h2>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400 mb-1">
                      Residents ({propertyTenants.length}):
                    </div>
                    {propertyTenants.length === 0 ? (
                      <span className="text-xs text-slate-500 italic">
                        Vacant / No linked tenants
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {propertyTenants.map((t) => (
                          <span
                            key={t.id}
                            className="px-2 py-0.5 rounded-md text-[11px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setInviteProperty(property)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-[11px] font-semibold border border-indigo-500/30 transition-colors shrink-0"
                    title="Generate direct onboarding link for tenant"
                  >
                    🔑 Invite
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Add Property Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Property"
      >
        <form onSubmit={handleAddProperty} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Street Address *
            </label>
            <input
              type="text"
              required
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="e.g. 120 West End Avenue"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Unit / Suite Number (Optional)
            </label>
            <input
              type="text"
              value={newUnitNumber}
              onChange={(e) => setNewUnitNumber(e.target.value)}
              placeholder="e.g. Apt 4B or Suite 101"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !newAddress.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
            >
              {isSaving ? 'Adding...' : 'Add Property'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Bulk CSV Import Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setCsvPreviewRows([]);
          setCsvError(null);
        }}
        title="Bulk Import Properties (CSV)"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Upload a CSV file containing columns for{' '}
            <code className="text-indigo-300">Address</code> and optional{' '}
            <code className="text-indigo-300">Unit</code>.
          </p>

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
          />

          {csvError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              ⚠️ {csvError}
            </div>
          )}

          {csvPreviewRows.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Preview: {csvPreviewRows.length} properties detected
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 pb-1">
                      <th className="py-1">Address</th>
                      <th className="py-1">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreviewRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-900 last:border-0">
                        <td className="py-1 text-slate-200">{row.address}</td>
                        <td className="py-1 text-slate-400">{row.unitNumber || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsImportModalOpen(false);
                setCsvPreviewRows([]);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmBulkImport}
              disabled={isImporting || csvPreviewRows.length === 0}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
            >
              {isImporting ? 'Importing...' : `Import ${csvPreviewRows.length} Properties`}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Tenant Invite Link Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(inviteProperty)}
        onClose={() => setInviteProperty(null)}
        title="Tenant Onboarding & Invite Link"
      >
        {inviteProperty &&
          (() => {
            const tenant = tenants.find((t) => t.linkedPropertyId === inviteProperty.id);
            const inviteCode =
              tenant?.inviteCode || `UNIT-${inviteProperty.unitNumber || 'A'}-2026`;
            const inviteUrl = `${window.location.origin}${window.location.pathname}#/login?invite=${inviteCode}`;

            return (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="font-semibold text-slate-200">{inviteProperty.address}</div>
                  <div className="text-slate-400">Unit: {inviteProperty.unitNumber || 'Main'}</div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Tenant Invite Code
                  </label>
                  <div className="font-mono text-sm p-2.5 bg-slate-950 border border-indigo-500/40 rounded-xl text-indigo-300 font-bold flex justify-between items-center">
                    <span>{inviteCode}</span>
                    <span className="text-[10px] text-slate-500 font-sans">1-click access</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Direct Onboarding Link
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 font-mono text-[11px]"
                  />
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>{copiedLink ? '✓ Copied to Clipboard!' : '📋 Copy Direct Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteProperty(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
      </Modal>
    </div>
  );
};
