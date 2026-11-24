import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  friendlySupabaseError,
  isAuthUserNotFoundError,
  validateEmail,
} from '../../lib/validation';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SystemLogo from '../../components/ui/SystemLogo';

export default function ForgotPassword() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [emailError, setEmailError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateEmail(email.trim());
    setEmailError(validationError);
    if (validationError) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        if (isAuthUserNotFoundError(error)) {
          setSent(true);
          return;
        }
        setSubmitError(friendlySupabaseError(error));
        return;
      }
      setSent(true);
    } catch (error) {
      if (isAuthUserNotFoundError(error)) {
        setSent(true);
        return;
      }
      setSubmitError(friendlySupabaseError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-civic-cream flex items-center justify-center px-4 py-12 selection:bg-civic-navy selection:text-white font-body">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl shadow-md hover:scale-105 transition-transform overflow-hidden"
            >
              <SystemLogo className="h-full w-full object-cover" />
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
            Secure Official Access
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-civic-navy">Reset your password</h1>
          <p className="text-slate-500 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed">
            Enter your email to get a reset link.
          </p>
        </div>

        <section className="card p-6 sm:p-8 space-y-4 shadow-card bg-white border border-slate-200 rounded-2xl">
          {sent ? (
            <div role="status" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Check your email</p>
              <p>If your email is registered, the reset link is on its way. Check your inbox and spam.</p>
              <p>Limit: 2 emails per hour. If reached, wait 1 hour.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                label="Email Address"
                type="email"
                autoComplete="email"
                placeholder="official@barangay.gov.ph"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailError('');
                }}
                error={emailError}
              />
              <ErrorBanner message={submitError} />
              <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm font-semibold shadow-sm">
                {submitting ? 'Sending link…' : 'Send reset link'}
              </button>
            </form>
          )}
        </section>

        <p className="text-center space-y-2 text-xs text-slate-500">
          <Link to="/login" className="font-semibold text-civic-leaf hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
