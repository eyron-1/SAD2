import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { friendlySupabaseError, validatePassword } from '../../lib/validation';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SystemLogo from '../../components/ui/SystemLogo';

export default function ResetPassword() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [recoverySession, setRecoverySession] = useState(false);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) {
          setSubmitError(friendlySupabaseError(error));
        } else if (data.session) {
          setRecoverySession(true);
        } else {
          setSubmitError('This password reset link is invalid or has expired. Request a new reset email.');
        }
      } catch (error) {
        if (active) setSubmitError(friendlySupabaseError(error));
      } finally {
        if (active) setCheckingSession(false);
      }
    };

    checkSession();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = {};
    const passwordError = validatePassword(form.password);
    if (passwordError) errors.password = passwordError;
    if (!form.confirmPassword) errors.confirmPassword = 'Confirm your new password.';
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: form.password });
      if (error) {
        setSubmitError(friendlySupabaseError(error));
        return;
      }
      setUpdated(true);
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
          <h1 className="font-display text-2xl font-bold text-civic-navy">Choose a new password</h1>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-slate-500">
            Set a new password for your official account.
          </p>
        </div>

        <section className="card space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          {checkingSession ? (
            <p className="text-center text-sm text-slate-500">Checking your reset link…</p>
          ) : updated ? (
            <div role="status" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Password updated</p>
              <p>Your password has been changed. You can now sign in with your new password.</p>
              <Link to="/login" className="inline-flex font-semibold text-civic-leaf hover:underline">Go to sign in</Link>
            </div>
          ) : recoverySession ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                label="New Password"
                type="password"
                autoComplete="new-password"
                showPasswordToggle
                value={form.password}
                onChange={(event) => {
                  setForm({ ...form, password: event.target.value });
                  setFieldErrors((current) => ({ ...current, password: '' }));
                }}
                error={fieldErrors.password}
              />
              <FormField
                label="Confirm New Password"
                type="password"
                autoComplete="new-password"
                showPasswordToggle
                value={form.confirmPassword}
                onChange={(event) => {
                  setForm({ ...form, confirmPassword: event.target.value });
                  setFieldErrors((current) => ({ ...current, confirmPassword: '' }));
                }}
                error={fieldErrors.confirmPassword}
              />
              <p className="text-xs text-slate-500">Use at least 8 characters, including uppercase, lowercase, and a number.</p>
              <ErrorBanner message={submitError} />
              <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm font-semibold shadow-sm">
                {submitting ? 'Updating password…' : 'Update password'}
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <ErrorBanner message={submitError} />
              <Link to="/forgot-password" className="inline-flex font-semibold text-civic-leaf hover:underline">Request a new reset email</Link>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-slate-500">
          <Link to="/login" className="font-semibold text-civic-leaf hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
