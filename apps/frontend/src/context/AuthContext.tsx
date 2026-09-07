/**
 * Authentication Context
 * Manages user session, active role, and demo mode switching
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { User, UserRole } from '@domus-flow/shared';
import { authService, isDemoMode, setDemoModeOverride } from '../services/dataService';
import { DEMO_USERS, seedDexieIfEmpty } from '../services/db';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isDemo: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithInvite: (inviteCode: string) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  toggleDemoMode: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const demoActive = isDemoMode();

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    try {
      if (demoActive) {
        await seedDexieIfEmpty();
        const user = await authService.getCurrentUser();
        setCurrentUser(user || DEMO_USERS.landlord);
      } else {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [demoActive]);

  useEffect(() => {
    loadUser();

    const handleUnauthorized = () => {
      setCurrentUser(null);
    };
    window.addEventListener('domus_auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('domus_auth_unauthorized', handleUnauthorized);
  }, [loadUser]);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const user = await authService.login(email, password);
      setCurrentUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithInvite = async (inviteCode: string) => {
    setIsLoading(true);
    try {
      const user = await authService.loginWithInviteCode(inviteCode);
      setCurrentUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      const user = await authService.loginAsDemoRole(targetRole);
      setCurrentUser(user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  const toggleDemoMode = () => {
    setDemoModeOverride(!demoActive);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        isDemo: demoActive,
        isLoading,
        login,
        loginWithInvite,
        switchRole,
        logout,
        toggleDemoMode,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
