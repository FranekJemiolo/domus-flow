/**
 * DomusFlow Application Root
 * Configures HashRouter, AuthProvider, and Role-Aware Route Protection
 */

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PropertiesPage } from './pages/PropertiesPage';
import { TicketsPage } from './pages/TicketsPage';
import { MessagesPage } from './pages/MessagesPage';
import { SettingsPage } from './pages/SettingsPage';
import { UserRole } from '@domus-flow/shared';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mr-3" />
        Initializing DomusFlow...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const HomeRedirect: React.FC = () => {
  const { role } = useAuth();
  if (role === UserRole.LANDLORD) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/tickets" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
