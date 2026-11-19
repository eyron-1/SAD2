import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { friendlySupabaseError, validateEmail } from '../../lib/validation';
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
        setSubmitError(friendlySupabaseError(error));
        return;
      }
      setSent(true);
    } catch (error) {
      setSubmitError(friendlySupabaseError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-civic-cream flex items-center justify-center px-4 py-12 font-body">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <Link to="/" className="mx-auto inline-flex h-14 w-14 overflow-hidden rounded-2xl shadow-md">
            <SystemLogo className="h-full w-full object-cover" />
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
            Secure Official Access
          </div>
          <h1 className="font-display text-2xl font-bold text-civic-navy">Reset your password</h1>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-slate-500">
            Enter your account email and we’ll send instructions to reset your password.
          </p>
        </div>

        <section className="card space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          {sent ? (
            <div role="status" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Check your email</p>
              <p>If an account matches that email address, password reset instructions have been sent. Check your inbox and spam folder.</p>
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
                {submitting ? 'Sending instructions…' : 'Send reset instructions'}
              </button>
            </form>
          )}
        </section>

        <p className="text-center text-xs text-slate-500">
          <Link to="/login" className="font-semibold text-civic-leaf hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
