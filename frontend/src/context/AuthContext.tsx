import React, { createContext, useContext, useState } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

const DEFAULT_USER: User = {
  id: 1,
  email: 'officer@metrology.gov.in',
  full_name: 'Senior Metrology Inspector',
  role: 'ADMIN',
  badge_number: 'INSP-2026-01',
  jurisdiction: 'Central Metrology Zone'
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user] = useState<User | null>(DEFAULT_USER);
  const [token] = useState<string | null>('default_token');
  const isLoading = false;

  const login = async () => {};

  const logout = () => {};

  const hasRole = (_roles: UserRole[]): boolean => {
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
