import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, validateRequired, runValidators, friendlySupabaseError } from '../../lib/validation';
import { isSkRole } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { Landmark } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { session, profile, loadProfile } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-redirect if already signed in with an active profile
  useEffect(() => {
    if (session && profile) {
      const dest = isSkRole(profile.role) ? '/sk' : '/dashboard';
      navigate(dest, { replace: true });
    }
  }, [session, profile, navigate]);

  const validators = {
    email: validateEmail,
    password: (v) => validateRequired(v, 'Password'),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors, isValid } = runValidators(form, validators);
    setFieldErrors(errors);
    if (!isValid) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });

      if (error) {
        setSubmitting(false);
        setSubmitError(friendlySupabaseError(error));
        return;
      }

      if (data?.user?.id) {
        // Await profile loading before navigating so ProtectedRoute never bounces back!
        const userProfile = await loadProfile(data.user.id);
        setSubmitting(false);

        if (!userProfile) {
          setSubmitError(
            'Signed in, but no official profile is linked to this account. If you just registered, please ensure you complete registration via Sign Up to link your account to a barangay.'
          );
          return;
        }

        const dest = isSkRole(userProfile.role) ? '/sk' : '/dashboard';
        navigate(dest, { replace: true });
      } else {
        setSubmitting(false);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setSubmitting(false);
      setSubmitError(friendlySupabaseError(err));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12 selection:bg-civic-navy selection:text-white font-body">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-civic-navy text-civic-gold shadow-sm mb-2 hover:scale-105 transition-transform"
          >
            <Landmark className="w-6 h-6" />
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-civic-navy">Official Portal Login</h1>
          <p className="text-slate-500 text-xs sm:text-sm max-w-xs mx-auto">
            Authorized access for Barangay Council and Sangguniang Kabataan officials.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-4 shadow-card bg-white border border-slate-200">
          <FormField
            label="Email Address"
            type="email"
            placeholder="official@barangay.gov.ph"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={fieldErrors.email}
          />

          <FormField
            label="Password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={fieldErrors.password}
          />

          <ErrorBanner message={submitError} />

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-2.5 text-sm font-semibold shadow-sm"
          >
            {submitting ? 'Authenticating…' : 'Sign in to Official Portal'}
          </button>
        </form>

        <div className="text-center space-y-2 text-xs text-slate-500">
          <p>
            New barangay official or council?{' '}
            <Link to="/signup" className="text-civic-leaf font-semibold hover:underline">
              Register here
            </Link>
          </p>
          <p>
            <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">
              ← Return to public resident portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
