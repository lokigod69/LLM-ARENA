// Task 1.4 Complete: AuthContext created to manage user session.
// This context provides session, user, loading state, and a signOut function.
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation'; // Import for redirection

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting initial session:', error);
      }
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      // Optional: Redirect on login/logout
      // if (_event === 'SIGNED_IN' && newSession) {
      //   router.push('/'); 
      // }
      // if (_event === 'SIGNED_OUT') {
      //   router.push('/login');
      // }
    });

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [router]); // Added router to dependency array if used for redirection

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      // Potentially set an error state here to show to user
    }
    // State updates (session, user to null) will be handled by onAuthStateChange
    // No need to manually set user/session to null here if onAuthStateChange is robust
    // However, explicitly clearing can be a good practice for immediate UI feedback
    setSession(null);
    setUser(null);
    router.push('/login'); // Redirect to login after sign out
    setLoading(false); // Ensure loading is false after operation
  };

  const value = {
    session,
    user,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 