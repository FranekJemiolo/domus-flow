/**
 * Login & Persona Selection Page
 * Supports 1-click demo personas, invite codes, and email/password authentication
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEMO_ACCOUNTS } from '../services/mockAuth';
import { RoleBadge } from '../components/common/Badge';

export const LoginPage: React.FC = () => {
  const { isDemo, switchRole, loginWithInvite, login } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSelectDemoAccount = async (account: (typeof DEMO_ACCOUNTS)[0]) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await switchRole(account.role);
      navigate(account.role === 'LANDLORD' ? '/dashboard' : '/tickets');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to switch role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithInvite(inviteCode);
      navigate('/tickets');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid invite code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-indigo-100 mb-4 text-white">
          🏠
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">DomusFlow</h1>
        <p className="mt-2 text-sm text-slate-500">
          Cross-platform Maintenance Management for Landlords, Tenants & Contractors
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 border border-slate-200/80 rounded-3xl shadow-xl space-y-8">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 animate-fade-in">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* ─── 1-Click Demo Personas ────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-600">
                ⚡ 1-Click Demo Personas
              </h2>
              <span className="text-[11px] text-slate-400">No password required</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.user.id}
                  onClick={() => handleSelectDemoAccount(account)}
                  disabled={isSubmitting}
                  className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-300 text-left transition-all group flex flex-col justify-between shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm text-slate-900 group-hover:text-indigo-700 transition-colors">
                      {account.label}
                    </span>
                    <RoleBadge role={account.role} />
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">{account.description}</p>
                  {account.inviteCode && (
                    <div className="mt-2 text-[10px] font-mono text-slate-400">
                      Code:{' '}
                      <span className="text-slate-700 font-semibold">{account.inviteCode}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-medium">Or log in with</span>
            </div>
          </div>

          {/* ─── Invite Code Entry ────────────────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              🎫 Tenant / Contractor Invite Code
            </h2>
            <form onSubmit={handleInviteSubmit} className="flex gap-2">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. UNIT4B-2026 or CONTRACTOR-01"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white uppercase tracking-wider font-mono transition-colors"
              />
              <button
                type="submit"
                disabled={isSubmitting || !inviteCode.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs tracking-wide transition-colors disabled:opacity-50 shadow-xs"
              >
                Join
              </button>
            </form>
          </div>

          {/* ─── Standard Email / Password Login (For live mode) ──────────────── */}
          {!isDemo && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                🔐 Account Credentials
              </h2>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="landlord@domusflow.demo"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 shadow-xs"
              >
                Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
