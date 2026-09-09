/**
 * Responsive Application Layout
 * Features top navigation bar, quick role-switcher, and desktop sidebar / mobile bottom nav
 * Tailored with a clean, airy, modern pastel aesthetic
 */

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@domus-flow/shared';
import { RoleBadge } from '../common/Badge';

export const AppLayout: React.FC = () => {
  const { currentUser, role, isDemo, switchRole, logout } = useAuth();
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleRoleSwitch = async (targetRole: UserRole) => {
    setIsRoleMenuOpen(false);
    await switchRole(targetRole);
    navigate('/tickets');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    ...(role === UserRole.LANDLORD || role === UserRole.ADMIN
      ? [
          { to: '/dashboard', label: 'Dashboard', icon: '📊' },
          { to: '/properties', label: 'Properties', icon: '🏠' },
          { to: '/users', label: 'Users', icon: '👥' },
        ]
      : []),
    {
      to: '/tickets',
      label: role === UserRole.CONTRACTOR ? 'Work Orders' : 'Tickets',
      icon: '🎫',
    },
    { to: '/messages', label: 'Messages', icon: '💬' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800">
      {/* ─── Top Navigation Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 flex items-center justify-between shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-xl text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
              🏠
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                DomusFlow
              </span>
              <span className="block text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                Maintenance Hub
              </span>
            </div>
          </NavLink>

          {/* Mode Pill */}
          <span
            className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${
              isDemo
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80 shadow-xs'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-xs'
            }`}
          >
            {isDemo ? '🎭 Demo Mode' : '🔗 Live API'}
          </span>
        </div>

        {/* User & Quick Role Switcher */}
        <div className="flex items-center gap-3">
          {isDemo && (
            <div className="relative">
              <button
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
                title="Switch Active Persona"
                id="role-switch-button"
              >
                <span>Switch Persona</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${isRoleMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isRoleMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 z-50 animate-scale-in">
                  <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Demo Persona
                  </div>
                  <button
                    onClick={() => handleRoleSwitch(UserRole.LANDLORD)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      role === UserRole.LANDLORD
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">Sarah Mitchell</div>
                      <div className="text-[10px] text-slate-500">Landlord / Owner</div>
                    </div>
                    {role === UserRole.LANDLORD && <span>✓</span>}
                  </button>
                  <button
                    onClick={() => handleRoleSwitch(UserRole.TENANT)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      role === UserRole.TENANT
                        ? 'bg-teal-50 text-teal-700 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">James Chen</div>
                      <div className="text-[10px] text-slate-500">Tenant (Unit 4B)</div>
                    </div>
                    {role === UserRole.TENANT && <span>✓</span>}
                  </button>
                  <button
                    onClick={() => handleRoleSwitch(UserRole.CONTRACTOR)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      role === UserRole.CONTRACTOR
                        ? 'bg-amber-50 text-amber-800 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">Mike Rodriguez</div>
                      <div className="text-[10px] text-slate-500">Contractor / Plumber</div>
                    </div>
                    {role === UserRole.CONTRACTOR && <span>✓</span>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* User profile & Logout */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-slate-800">{currentUser?.name || 'Guest'}</div>
              {role && <RoleBadge role={role} />}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Body: Sidebar + Main Content ────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white/90 border-r border-slate-200/80 p-4 shrink-0 shadow-xs">
          <nav className="space-y-1 flex-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`
                }
              >
                <span className="text-base">{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500">
            <div className="font-bold text-slate-700 mb-0.5">DomusFlow v1.0</div>
            <div>Cross-platform PWA ready</div>
          </div>
        </aside>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ─── Mobile Bottom Navigation Bar ─────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around py-2 px-1 shadow-lg">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-xs font-medium transition-colors ${
                isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <span className="text-lg">{link.icon}</span>
            <span className="text-[11px]">{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
