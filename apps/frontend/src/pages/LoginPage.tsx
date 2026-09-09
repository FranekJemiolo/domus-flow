/**
 * Login, Registration & SSO Page
 * Supports 1-Click Demo Personas, Registration with Role Selection,
 * SSO via Apple, Google & Facebook, and Invite Code Redemption
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEMO_ACCOUNTS } from '../services/mockAuth';
import { RoleBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { UserRole, AuthProvider } from '@domus-flow/shared';

type AuthTab = 'signin' | 'register' | 'invite';

export const LoginPage: React.FC = () => {
  const { switchRole, loginWithInvite, login, register, loginWithSso } = useAuth();
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');

  // Sign in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>(UserRole.TENANT);
  const [regInviteCode, setRegInviteCode] = useState('');

  // Invite state
  const [inviteCode, setInviteCode] = useState('');

  // SSO Modal State
  const [isSsoModalOpen, setIsSsoModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AuthProvider>(AuthProvider.GOOGLE);
  const [ssoName, setSsoName] = useState('');
  const [ssoEmail, setSsoEmail] = useState('');
  const [ssoRole, setSsoRole] = useState<UserRole>(UserRole.TENANT);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // ─── 1-Click Demo Personas ──────────────────────────────────────────────────
  const handleSelectDemoAccount = async (account: (typeof DEMO_ACCOUNTS)[0]) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await switchRole(account.role);
      navigate(account.role === UserRole.LANDLORD ? '/dashboard' : '/tickets');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to switch role');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Sign In Submit ─────────────────────────────────────────────────────────
  const handleSignInSubmit = async (e: React.FormEvent) => {
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

  // ─── Register Submit ────────────────────────────────────────────────────────
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        inviteCode: regInviteCode.trim() || undefined,
      });
      navigate(regRole === UserRole.LANDLORD ? '/dashboard' : '/tickets');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Invite Code Submit ─────────────────────────────────────────────────────
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

  // ─── SSO Trigger ────────────────────────────────────────────────────────────
  const openSsoDialog = (provider: AuthProvider) => {
    setSelectedProvider(provider);
    if (provider === AuthProvider.GOOGLE) {
      setSsoName('Alex Turner');
      setSsoEmail('alex.turner@gmail.com');
      setSsoRole(UserRole.TENANT);
    } else if (provider === AuthProvider.APPLE) {
      setSsoName('Elena Rostova');
      setSsoEmail('elena.rostova@icloud.com');
      setSsoRole(UserRole.LANDLORD);
    } else {
      setSsoName('Carlos Mendez');
      setSsoEmail('carlos.mendez@facebook.com');
      setSsoRole(UserRole.CONTRACTOR);
    }
    setIsSsoModalOpen(true);
  };

  const handleSsoConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ssoEmail.trim() || !ssoName.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithSso(selectedProvider, {
        name: ssoName.trim(),
        email: ssoEmail.trim(),
        role: ssoRole,
      });
      setIsSsoModalOpen(false);
      navigate(ssoRole === UserRole.LANDLORD ? '/dashboard' : '/tickets');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'SSO authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-10 sm:px-6 lg:px-8 text-slate-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-indigo-100 mb-4 text-white">
          🏠
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">DomusFlow</h1>
        <p className="mt-2 text-sm text-slate-500">
          Maintenance & Communication Hub for Landlords, Tenants & Contractors
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 border border-slate-200/80 rounded-3xl shadow-xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 animate-fade-in">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* ─── Navigation Tabs ──────────────────────────────────────────────── */}
          <div className="flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all text-center ${
                activeTab === 'signin'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all text-center ${
                activeTab === 'register'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('invite');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all text-center ${
                activeTab === 'invite'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Join with Code
            </button>
          </div>

          {/* ─── SSO Quick Connect ────────────────────────────────────────────── */}
          {activeTab !== 'invite' && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Instant Single Sign-On (SSO)
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => openSsoDialog(AuthProvider.GOOGLE)}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => openSsoDialog(AuthProvider.APPLE)}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
                >
                  <svg className="w-4 h-4 fill-slate-900" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.79-11.97-14.24-6.44-9.69-11.45-20.91-15.02-33.66-3.57-12.75-5.36-24.3-5.36-34.64 0-14.67 3.8-27.15 11.4-37.45 7.6-10.29 17.15-15.54 28.65-15.75 4.9.11 10.35 1.45 16.34 4.02 6 2.58 10.02 3.87 12.06 3.87 1.83 0 6.08-1.37 12.75-4.12 6.66-2.75 12.3-3.97 16.92-3.68 12.63.78 22.81 5.22 30.56 13.32-11 6.66-16.38 15.82-16.14 27.49.25 9.17 3.73 16.89 10.45 23.16 6.72 6.27 14.69 9.9 23.9 10.89-2.03 6.1-4.41 12.44-7.14 19.03zM119.22 33.15c0-7.39 2.65-14.28 7.95-20.67 5.3-6.39 11.96-10.4 19.98-12.04.22 1.34.33 2.56.33 3.68 0 7.39-2.73 14.38-8.18 20.97-5.46 6.58-12.19 10.47-20.2 11.66.07-1.12.12-2.32.12-3.6z" />
                  </svg>
                  <span>Apple</span>
                </button>

                <button
                  type="button"
                  onClick={() => openSsoDialog(AuthProvider.FACEBOOK)}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
                >
                  <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-medium">Or continue with</span>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 1: Sign In ──────────────────────────────────────────────── */}
          {activeTab === 'signin' && (
            <div className="space-y-6">
              {/* 1-Click Demo Personas */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    ⚡ 1-Click Demo Personas
                  </h2>
                  <span className="text-[11px] text-slate-400">Instant offline access</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEMO_ACCOUNTS.map((account) => (
                    <button
                      key={account.user.id}
                      onClick={() => handleSelectDemoAccount(account)}
                      disabled={isSubmitting}
                      className="p-3 rounded-xl bg-slate-50/80 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-300 text-left transition-all group flex flex-col justify-between shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-semibold text-xs text-slate-900 group-hover:text-indigo-700 transition-colors">
                          {account.label}
                        </span>
                        <RoleBadge role={account.role} />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {account.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Standard Email/Password Form */}
              <form
                onSubmit={handleSignInSubmit}
                className="space-y-3.5 pt-2 border-t border-slate-100"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  🔐 Email & Password
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="landlord@domusflow.demo"
                    required
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
                    required
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
            </div>
          )}

          {/* ─── TAB 2: Register New Account ──────────────────────────────────── */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="jane.doe@example.com"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Password (min 8 chars) *
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Account Role *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { role: UserRole.TENANT, label: 'Tenant', icon: '👤' },
                    { role: UserRole.LANDLORD, label: 'Landlord', icon: '🔑' },
                    { role: UserRole.CONTRACTOR, label: 'Contractor', icon: '🛠️' },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.role}
                      onClick={() => setRegRole(item.role)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        regRole === item.role
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs'
                          : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Invite Code (Optional)
                </label>
                <input
                  type="text"
                  value={regInviteCode}
                  onChange={(e) => setRegInviteCode(e.target.value)}
                  placeholder="e.g. UNIT4B-2026 or leave blank for auto"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 uppercase font-mono tracking-wider focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 shadow-xs mt-2"
              >
                Create Account & Sign In
              </button>
            </form>
          )}

          {/* ─── TAB 3: Invite Code ──────────────────────────────────────────── */}
          {activeTab === 'invite' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                If your property manager or landlord provided you with a personal invite code, enter
                it below for instant access.
              </p>
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
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs tracking-wide transition-colors disabled:opacity-50 shadow-xs"
                >
                  Join
                </button>
              </form>

              <div className="pt-3 border-t border-slate-100">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Sample Demo Invite Codes:
                </div>
                <div className="flex flex-wrap gap-2">
                  {['UNIT4B-2026', 'UNIT2A-2026', 'CONTRACTOR-01'].map((code) => (
                    <button
                      type="button"
                      key={code}
                      onClick={() => setInviteCode(code)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-xs font-mono text-slate-600 transition-colors"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── SSO Identity Simulation Modal ────────────────────────────────────── */}
      <Modal
        isOpen={isSsoModalOpen}
        onClose={() => setIsSsoModalOpen(false)}
        title={`Continue with ${selectedProvider}`}
        maxWidth="md"
      >
        <form onSubmit={handleSsoConfirm} className="space-y-4">
          <p className="text-xs text-slate-500">
            Simulate an OAuth single sign-on response with your provider account details:
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
            <input
              type="text"
              value={ssoName}
              onChange={(e) => setSsoName(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Verified Email</label>
            <input
              type="email"
              value={ssoEmail}
              onChange={(e) => setSsoEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Assigned Role</label>
            <select
              value={ssoRole}
              onChange={(e) => setSsoRole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value={UserRole.TENANT}>Tenant</option>
              <option value={UserRole.LANDLORD}>Landlord</option>
              <option value={UserRole.CONTRACTOR}>Contractor</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsSsoModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
            >
              Authorize & Sign In
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
