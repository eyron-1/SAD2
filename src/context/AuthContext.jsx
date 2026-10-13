import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { friendlySupabaseError } from '../lib/validation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // includes role + barangay_id
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeUserId = useRef(null);
  const profileRequests = useRef(new Map());

  const loadProfile = useCallback((userId) => {
    if (!userId) {
      setProfile(null);
      return Promise.resolve(null);
    }

    const pendingRequest = profileRequests.current.get(userId);
    if (pendingRequest) return pendingRequest;

    const request = (async () => {
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*, barangays(name, slug, logo_url, sk_logo_url)')
          .eq('id', userId)
          .single();

        if (profileError && ['PGRST200', 'PGRST201'].includes(profileError.code)) {
          const { data: fallback, error: fallbackError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (fallbackError) {
            if (activeUserId.current === userId) {
              setError(friendlySupabaseError(profileError));
              setProfile(null);
            }
            return null;
          }

          if (activeUserId.current === userId) {
            setProfile(fallback);
            setError('');
          }
          return fallback;
        }

        if (profileError) {
          if (activeUserId.current === userId) {
            setError(friendlySupabaseError(profileError));
            setProfile(null);
          }
          return null;
        }

        if (activeUserId.current === userId) {
          setProfile(data);
          setError('');
        }
        return data;
      } catch (err) {
        console.error('loadProfile error:', err);
        if (activeUserId.current === userId) {
          setError(String(err));
          setProfile(null);
        }
        return null;
      } finally {
        profileRequests.current.delete(userId);
      }
    })();

    profileRequests.current.set(userId, request);
    return request;
  }, []);

  useEffect(() => {
    let mounted = true;
    let profileLoadTimer;

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      const userId = newSession?.user?.id ?? null;
      setSession(newSession);

      if (!userId) {
        if (profileLoadTimer) clearTimeout(profileLoadTimer);
        activeUserId.current = null;
        setProfile(null);
        setLoading(false);
        return;
      }

      const shouldLoadProfile =
        event === 'INITIAL_SESSION' ||
        event === 'USER_UPDATED' ||
        activeUserId.current !== userId;
      if (!shouldLoadProfile) return;

      if (profileLoadTimer) clearTimeout(profileLoadTimer);
      activeUserId.current = userId;
      setLoading(true);
      profileLoadTimer = setTimeout(() => {
        loadProfile(userId).finally(() => {
          if (mounted && activeUserId.current === userId) setLoading(false);
        });
      }, 0);
    });

    return () => {
      mounted = false;
      if (profileLoadTimer) clearTimeout(profileLoadTimer);
      listener?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) {
      setError(friendlySupabaseError(signOutError));
      throw signOutError;
    }
    setError('');
    setProfile(null);
    setSession(null);
  }, []);

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
