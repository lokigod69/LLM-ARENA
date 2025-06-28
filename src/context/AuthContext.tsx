// This file has been updated to remove all Supabase dependencies.
// The original authentication logic has been replaced with a placeholder
// to ensure the application builds without requiring Supabase environment variables.
// The user is considered "logged in" by default for testing purposes.

'use client';

import React, { createContext, useContext, ReactNode } from 'react';

// Define a minimal user and session object to avoid breaking components
interface MockUser {
  id: string;
  email: string;
}

interface MockSession {
  user: MockUser | null;
}

interface AuthContextType {
  session: MockSession | null;
  user: MockUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

// Create a context with a default "logged in" state
export const AuthContext = createContext<AuthContextType>({
  session: { user: { id: 'test-user', email: 'test@example.com' } },
  user: { id: 'test-user', email: 'test@example.com' },
  loading: false,
  logout: async () => { console.log("Logout triggered"); },
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const value = {
    session: { user: { id: 'test-user', email: 'test@example.com' } },
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
    logout: async () => {
      // In the future, this could clear the access code from state
      console.log("Mock logout successful");
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 