import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { friendlySupabaseError } from '../../lib/validation';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SystemLogo from '../../components/ui/SystemLogo';
import { supabase } from '../../lib/supabaseClient';

export default function SignupCompletion() {
  const navigate = useNavigate();
  const { session, loading, loadProfile, signOut } = useAuth();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');
  const pendingHandover = useRef(false);

  useEffect(() => {
    if (loading) return undefined;

    let active = true;

    const completeSignup = async () => {
      if (!session?.user) {
        if (pendingHandover.current) return;
        setStatus('error');
        setError('This confirmation link is invalid or expired. Please sign up again or sign in.');
        return;
      }

      try {
        const existingProfile = await loadProfile(session.user.id, true);
        if (existingProfile) {
          navigate('/', { replace: true });
          return;
        }

        const registration = session.user.user_metadata?.signup_registration;
        if (!registration) {
          throw new Error('Registration details were not found. Please contact an administrator to finish setting up this account.');
        }

        const { data: profile, error: profileError } = await supabase.rpc(
          'complete_official_signup',
          { p_registration: registration },
        );
        if (profileError) throw profileError;

        if (!profile.is_active) {
          pendingHandover.current = true;
          await signOut();
          if (active) setStatus('pending-handover');
          return;
        }

        const loadedProfile = await loadProfile(session.user.id, true);
        if (!loadedProfile) {
          throw new Error('Your account was created, but its official profile could not be loaded. Please sign in again.');
        }

        if (active) navigate('/', { replace: true });
      } catch (completionError) {
        if (!active) return;
        setStatus('error');
        setError(friendlySupabaseError(completionError));
      }
    };

    completeSignup();
    return () => {
      active = false;
    };
  }, [loading, loadProfile, navigate, session, signOut]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-civic-cream flex items-center justify-center px-4 py-12 font-body">
      <section className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card sm:p-8">
        <Link to="/" className="mx-auto inline-flex h-14 w-14 overflow-hidden rounded-2xl shadow-md">
          <SystemLogo className="h-full w-full object-cover" />
        </Link>
        <h1 className="font-display text-2xl font-bold text-civic-navy">
          {status === 'pending-handover' ? 'Registration received' : 'Confirming your account'}
        </h1>
        {status === 'processing' && (
          <p role="status" className="text-sm text-slate-600">
            Your email is confirmed. We’re finishing your official profile…
          </p>
        )}
        {status === 'pending-handover' && (
          <div role="status" className="space-y-3 text-sm text-slate-600">
            <p>Your incoming Captain account is inactive until a current barangay editor records the handover and selects your account.</p>
            <Link to="/" className="inline-flex font-semibold text-civic-leaf hover:underline">Go to the public portal</Link>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-4 text-left">
            <ErrorBanner message={error} />
            <div className="flex justify-center gap-4 text-sm">
              <Link to="/signup" className="font-semibold text-civic-leaf hover:underline">Return to sign up</Link>
              <Link to="/" className="font-semibold text-civic-leaf hover:underline">Public portal</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
