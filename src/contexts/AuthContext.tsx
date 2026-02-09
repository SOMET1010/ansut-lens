import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = useCallback(async (userId: string): Promise<AppRole> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('[Auth] Error fetching role:', error.message);
        return 'user';
      }
      return (data?.role as AppRole) || 'user';
    } catch (err) {
      console.error('[Auth] Error fetching role:', err);
      return 'user';
    }
  }, []);

  const trackActivity = useCallback(async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() } as any)
        .eq('id', userId);
    } catch {
      // Silently ignore tracking errors
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Initialize from existing session
    const initSession = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (existingSession?.user) {
          setSession(existingSession);
          setUser(existingSession.user);
          const userRole = await fetchUserRole(existingSession.user.id);
          if (mounted) setRole(userRole);
        }
      } catch (err) {
        console.error('[Auth] Init error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initSession();

    // 2. Listen for auth changes AFTER init
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('[Auth] Event:', event);

        // PASSWORD_RECOVERY: just update session state, let ResetPasswordPage handle it
        if (event === 'PASSWORD_RECOVERY') {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Fetch role without blocking
          fetchUserRole(newSession.user.id).then(r => {
            if (mounted) setRole(r);
          });

          // Track activity only for real logins (not recovery/invite sessions)
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // Check if user has set their password before tracking
            supabase
              .from('profiles')
              .select('password_set_at')
              .eq('id', newSession.user.id)
              .single()
              .then(({ data }) => {
                if (data?.password_set_at) {
                  trackActivity(newSession.user.id);
                }
              });
          }
        } else {
          setRole(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole, trackActivity]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  }, []);

  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ user, session, role, isLoading, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
