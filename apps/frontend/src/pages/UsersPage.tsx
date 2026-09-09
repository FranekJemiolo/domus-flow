/**
 * User Directory & Access Management Console
 * Allows Landlords and Admins to inspect, manage, and audit all users in the database
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Property, UserLog, UserRole, UserStatus, AuthProvider } from '@domus-flow/shared';
import { userService, propertyService } from '../services/dataService';
import { RoleBadge, UserStatusBadge, AuthProviderBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');

  // Modals state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userLogs, setUserLogs] = useState<UserLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>(UserRole.TENANT);
  const [editStatus, setEditStatus] = useState<UserStatus>(UserStatus.ACTIVE);
  const [editPropertyId, setEditPropertyId] = useState<string>('');

  // Add form state
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<UserRole>(UserRole.TENANT);
  const [addInviteCode, setAddInviteCode] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [userList, propList] = await Promise.all([
        userService.getAll(),
        propertyService.getAll(),
      ]);
      setUsers(userList);
      setProperties(propList);
    } catch (err) {
      console.error('Failed to load users data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          user.name.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          user.inviteCode.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Role match
      if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;

      // Status match
      if (statusFilter !== 'ALL' && (user.status || 'ACTIVE') !== statusFilter) return false;

      // Provider match
      if (providerFilter !== 'ALL' && (user.authProvider || 'LOCAL') !== providerFilter)
        return false;

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter, providerFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => (u.status || 'ACTIVE') === UserStatus.ACTIVE).length;
    const suspended = users.filter((u) => u.status === UserStatus.SUSPENDED).length;
    const ssoCount = users.filter(
      (u) => u.authProvider && u.authProvider !== AuthProvider.LOCAL
    ).length;
    return { total, active, suspended, ssoCount };
  }, [users]);

  // Open User Inspection
  const handleInspectUser = async (user: User) => {
    setSelectedUser(user);
    setIsInspectOpen(true);
    setIsLogsLoading(true);
    try {
      const logs = await userService.getLogs(user.id);
      setUserLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setUserLogs([]);
    } finally {
      setIsLogsLoading(false);
    }
  };

  // Open User Edit
  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditStatus(user.status || UserStatus.ACTIVE);
    setEditPropertyId(user.linkedPropertyId || '');
    setIsEditUserOpen(true);
  };

  // Save User Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const updated = await userService.update(selectedUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        status: editStatus,
        linkedPropertyId: editPropertyId || null,
      });

      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setIsEditUserOpen(false);
      showNotification(`Updated user ${updated.name} successfully.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  // Toggle Suspended Status Quick Action
  const handleToggleStatus = async (user: User) => {
    const newStatus =
      (user.status || 'ACTIVE') === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;

    try {
      const updated = await userService.update(user.id, { status: newStatus });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showNotification(
        `User ${user.name} is now ${newStatus === UserStatus.ACTIVE ? 'Active' : 'Suspended'}.`
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to change status');
    }
  };

  // Create New User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      const newUser = await userService.create({
        name: addName.trim(),
        email: addEmail.trim(),
        password: addPassword,
        role: addRole,
        inviteCode: addInviteCode.trim() || undefined,
      });

      setUsers((prev) => [newUser, ...prev]);
      setIsAddUserOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      setAddInviteCode('');
      showNotification(`Created user ${newUser.name} with code ${newUser.inviteCode}!`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  // Copy invite code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showNotification(`Copied code "${code}" to clipboard!`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ─── Notification Toast ──────────────────────────────────────────────── */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <span>✨</span>
          <span>{notification}</span>
        </div>
      )}

      {/* ─── Header & Actions ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            User Directory & Access Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Inspect, manage roles, audit authentication logs, and control access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddUserOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs tracking-wide shadow-sm shadow-indigo-100 transition-all hover:scale-105 active:scale-95"
        >
          <span>➕</span>
          <span>Add New User</span>
        </button>
      </div>

      {/* ─── Metric Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/90 p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg text-indigo-600">
            👥
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Users
            </div>
            <div className="text-xl font-bold text-slate-900">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white/90 p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg text-emerald-600">
            ✅
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Accounts
            </div>
            <div className="text-xl font-bold text-emerald-700">{stats.active}</div>
          </div>
        </div>

        <div className="bg-white/90 p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-lg text-rose-600">
            ⛔
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Suspended
            </div>
            <div className="text-xl font-bold text-rose-700">{stats.suspended}</div>
          </div>
        </div>

        <div className="bg-white/90 p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg text-blue-600">
            🌐
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              SSO Users
            </div>
            <div className="text-xl font-bold text-blue-700">{stats.ssoCount}</div>
          </div>
        </div>
      </div>

      {/* ─── Search & Filters Bar ────────────────────────────────────────────── */}
      <div className="bg-white/90 p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or invite code..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Quick Clear */}
          {(searchQuery ||
            roleFilter !== 'ALL' ||
            statusFilter !== 'ALL' ||
            providerFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setStatusFilter('ALL');
                setProviderFilter('ALL');
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Role:
          </span>
          {['ALL', UserRole.LANDLORD, UserRole.TENANT, UserRole.CONTRACTOR, UserRole.ADMIN].map(
            (r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  roleFilter === r
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {r}
              </button>
            )
          )}

          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider ml-3 mr-1">
            Provider:
          </span>
          {['ALL', 'LOCAL', 'GOOGLE', 'APPLE', 'FACEBOOK'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProviderFilter(p)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                providerFilter === p
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {p}
            </button>
          ))}

          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider ml-3 mr-1">
            Status:
          </span>
          {['ALL', 'ACTIVE', 'SUSPENDED'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Users Table ────────────────────────────────────────────────────── */}
      <div className="bg-white/95 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading user directory...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <span className="text-3xl block mb-2">👥</span>
            <span className="font-semibold">No users found matching your filters.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Auth Provider</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Invite Code</th>
                  <th className="py-3 px-4">Linked Property</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const linkedProp = properties.find((p) => p.id === user.linkedPropertyId);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {user.name}
                            </div>
                            <div className="text-[11px] text-slate-400">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <RoleBadge role={user.role} />
                      </td>

                      {/* Auth Provider */}
                      <td className="py-3.5 px-4">
                        <AuthProviderBadge provider={user.authProvider} />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <UserStatusBadge status={user.status} />
                      </td>

                      {/* Invite Code */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(user.inviteCode)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 hover:border-indigo-300 text-slate-700 font-mono text-[11px] transition-colors"
                          title="Click to copy"
                        >
                          <span>{user.inviteCode}</span>
                          <span className="text-[10px] text-slate-400">📋</span>
                        </button>
                      </td>

                      {/* Linked Property */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {linkedProp ? (
                          <span className="font-medium">
                            {linkedProp.address} (Unit {linkedProp.unitNumber})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None assigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleInspectUser(user)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs transition-colors"
                          >
                            Inspect
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className={`px-2.5 py-1 rounded-lg font-medium text-xs transition-colors ${
                              (user.status || 'ACTIVE') === UserStatus.ACTIVE
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {(user.status || 'ACTIVE') === UserStatus.ACTIVE
                              ? 'Suspend'
                              : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── INSPECT USER DRAWER / MODAL ─────────────────────────────────────── */}
      <Modal
        isOpen={isInspectOpen}
        onClose={() => setIsInspectOpen(false)}
        title="User Profile & Audit Log Trail"
        maxWidth="2xl"
      >
        {selectedUser && (
          <div className="space-y-6 text-xs text-slate-700">
            {/* Identity Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {selectedUser.avatarUrl ? (
                  <img
                    src={selectedUser.avatarUrl}
                    alt={selectedUser.name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-base">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-base font-bold text-slate-900">{selectedUser.name}</div>
                  <div className="text-slate-500">{selectedUser.email}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    ID: {selectedUser.id}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <RoleBadge role={selectedUser.role} />
                <AuthProviderBadge provider={selectedUser.authProvider} />
                <UserStatusBadge status={selectedUser.status} />
              </div>
            </div>

            {/* Timestamps & Property info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10px]">
                  Joined Date
                </div>
                <div className="font-medium text-slate-800 mt-1">
                  {new Date(selectedUser.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="text-slate-400 font-semibold uppercase text-[10px]">Last Login</div>
                <div className="font-medium text-slate-800 mt-1">
                  {selectedUser.lastLoginAt
                    ? new Date(selectedUser.lastLoginAt).toLocaleString()
                    : 'Never recorded'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 col-span-2 sm:col-span-1">
                <div className="text-slate-400 font-semibold uppercase text-[10px]">
                  Assigned Property
                </div>
                <div className="font-medium text-slate-800 mt-1 truncate">
                  {properties.find((p) => p.id === selectedUser.linkedPropertyId)?.address ||
                    'None assigned'}
                </div>
              </div>
            </div>

            {/* Audit Log Timeline */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  📜 Activity & Authentication Audit Trail
                </h3>
                <span className="text-[11px] text-slate-400">{userLogs.length} events logged</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                {isLogsLoading ? (
                  <div className="p-6 text-center text-slate-400">Loading audit history...</div>
                ) : userLogs.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No activity logs recorded for this account.
                  </div>
                ) : (
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Event</th>
                        <th className="py-2 px-3">Timestamp</th>
                        <th className="py-2 px-3">IP / Agent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {userLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-800 font-mono">
                              {log.action}
                            </span>
                            {log.details && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-xs">
                                {JSON.stringify(log.details)}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-slate-400 truncate max-w-[150px]">
                            {log.ipAddress || '127.0.0.1'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInspectOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── EDIT USER MODAL ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={isEditUserOpen}
        onClose={() => setIsEditUserOpen(false)}
        title="Edit User Details & Access"
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value={UserRole.TENANT}>Tenant</option>
                <option value={UserRole.LANDLORD}>Landlord</option>
                <option value={UserRole.CONTRACTOR}>Contractor</option>
                <option value={UserRole.ADMIN}>Admin</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value={UserStatus.ACTIVE}>Active</option>
                <option value={UserStatus.SUSPENDED}>Suspended</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Linked Property</label>
            <select
              value={editPropertyId}
              onChange={(e) => setEditPropertyId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="">None / Unassigned</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address} (Unit {p.unitNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditUserOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── ADD NEW USER MODAL ──────────────────────────────────────────────── */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Provision New User"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="e.g. Maria Garcia"
              required
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="maria@example.com"
              required
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Initial Password *</label>
            <input
              type="password"
              value={addPassword}
              onChange={(e) => setAddPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Role *</label>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value={UserRole.TENANT}>Tenant</option>
              <option value={UserRole.CONTRACTOR}>Contractor</option>
              <option value={UserRole.LANDLORD}>Landlord</option>
              <option value={UserRole.ADMIN}>Admin</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Custom Invite Code (Optional)
            </label>
            <input
              type="text"
              value={addInviteCode}
              onChange={(e) => setAddInviteCode(e.target.value)}
              placeholder="e.g. UNIT3A-2026 or leave blank for auto"
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 uppercase font-mono tracking-wider focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddUserOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
