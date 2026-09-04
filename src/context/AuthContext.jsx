import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { friendlySupabaseError } from '../lib/validation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // includes role + barangay_id
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*, barangays(name, slug, logo_url)')
        .eq('id', userId)
        .single();

      if (profileError) {
        // Fallback without relation join in case barangays table or relation has an issue
        const { data: fallback } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (fallback) {
          setProfile(fallback);
          setError('');
          return fallback;
        }

        setError(friendlySupabaseError(profileError));
        setProfile(null);
        return null;
      } else {
        setProfile(data);
        setError('');
        return data;
      }
    } catch (err) {
      console.error('loadProfile error:', err);
      setError(String(err));
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user?.id) {
          await loadProfile(data.session.user.id);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user?.id) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    error,
    signOut,
    loadProfile,
    refreshProfile: () => loadProfile(session?.user?.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

