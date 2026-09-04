import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  validateEmail, validatePassword, validateName, validateMobile,
  validateRequired, PATTERNS, runValidators, friendlySupabaseError,
} from '../../lib/validation';
import { ROLES, roleLabel, ROLE_SEAT_LIMITS } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';

export default function Signup() {
  const navigate = useNavigate();
  const [barangays, setBarangays] = useState([]);
  const [tenantMode, setTenantMode] = useState('existing'); // 'existing' | 'new'

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', contact_number: '', role: ROLES.STAFF,
    barangay_id: '', new_barangay_name: '', new_barangay_slug: '', new_barangay_municipality: '', new_barangay_province: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from('barangays').select('id, name').order('name').then(({ data }) => setBarangays(data || []));
  }, []);

  const validators = {
    full_name: (v) => validateName(v, 'Full name'),
    email: validateEmail,
    password: validatePassword,
    contact_number: (v) => validateMobile(v, { required: false }),
    role: (v) => validateRequired(v, 'Role'),
    ...(tenantMode === 'existing'
      ? { barangay_id: (v) => validateRequired(v, 'Barangay') }
      : {
          new_barangay_name: (v) => validateRequired(v, 'Barangay name'),
          new_barangay_slug: (v) => {
            const req = validateRequired(v, 'URL slug');
            if (req) return req;
            return PATTERNS.slug.test(v) ? '' : 'Slug must be lowercase letters, numbers, and hyphens only (e.g. san-isidro).';
          },
        }),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors, isValid } = runValidators(form, validators);
    setFieldErrors(errors);
    if (!isValid) return;

    setSubmitting(true);
    setSubmitError('');

    // Sign up FIRST — every insert below is protected by permission rules
    // that check who's logged in, so they only work once a session exists.
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });
    if (authErr) {
      setSubmitError(friendlySupabaseError(authErr));
      setSubmitting(false);
      return;
    }

    if (!authData.session) {
      setSubmitError(
        'Account created, but your Supabase project requires email confirmation before you can log in. ' +
        'Go to Supabase → Authentication → Providers → Email and turn off "Confirm email", then sign up again.'
      );
      setSubmitting(false);
      return;
    }

    let barangayId = form.barangay_id;

    if (tenantMode === 'new') {
      const { data: newBarangay, error: bErr } = await supabase
        .from('barangays')
        .insert([{
          name: form.new_barangay_name,
          slug: form.new_barangay_slug,
          municipality: form.new_barangay_municipality || null,
          province: form.new_barangay_province || null,
        }])
        .select()
        .single();
      if (bErr) {
        setSubmitError(friendlySupabaseError(bErr));
        setSubmitting(false);
        return;
      }
      barangayId = newBarangay.id;
    } else {
      // Check active seat quota for existing barangay
      const limit = ROLE_SEAT_LIMITS[form.role] || 1;
      const { data: existingProfiles, error: checkErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('barangay_id', barangayId)
        .eq('role', form.role)
        .neq('is_active', false);

      if (checkErr) {
        console.warn('Seat quota check warning', checkErr);
      } else if (existingProfiles && existingProfiles.length >= limit) {
        setSubmitError(
          `Official Seat Limit Reached: This barangay already has ${existingProfiles.length}/${limit} active ${roleLabel(form.role)}(s). An official turnover/handover must be logged to free up this seat.`
        );
        setSubmitting(false);
        return;
      }
    }

    const { error: profileErr } = await supabase.from('profiles').insert([{
      id: authData.user.id,
      barangay_id: barangayId,
      full_name: form.full_name,
      role: form.role,
      contact_number: form.contact_number || null,
      is_active: true,
    }]);

    setSubmitting(false);
    if (profileErr) {
      setSubmitError(friendlySupabaseError(profileErr));
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-civic-cream flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl">Official Sign Up</h1>
          <p className="text-civic-slate text-sm mt-1">Create your barangay or SK official account.</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <FormField label="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} error={fieldErrors.full_name} />
          <FormField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={fieldErrors.email} />
          <FormField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={fieldErrors.password} />
          <FormField label="Contact Number (optional)" placeholder="09171234567" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} error={fieldErrors.contact_number} />

          <FormField as="select" label="Role / Position" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} error={fieldErrors.role}>
            {Object.values(ROLES).map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </FormField>

          <div>
            <label className="label">Barangay</label>
            <div className="flex gap-2 mb-2 text-xs">
              <button type="button" onClick={() => setTenantMode('existing')} className={`px-2 py-1 rounded border ${tenantMode === 'existing' ? 'bg-civic-navy text-white border-civic-navy' : 'border-civic-navy/20'}`}>Join existing</button>
              <button type="button" onClick={() => setTenantMode('new')} className={`px-2 py-1 rounded border ${tenantMode === 'new' ? 'bg-civic-navy text-white border-civic-navy' : 'border-civic-navy/20'}`}>Set up new barangay</button>
            </div>

            {tenantMode === 'existing' ? (
              <FormField as="select" value={form.barangay_id} onChange={(e) => setForm({ ...form, barangay_id: e.target.value })} error={fieldErrors.barangay_id}>
                <option value="">— select your barangay —</option>
                {barangays.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </FormField>
            ) : (
              <div className="space-y-3">
                <FormField label="Barangay Name" value={form.new_barangay_name} onChange={(e) => setForm({ ...form, new_barangay_name: e.target.value })} error={fieldErrors.new_barangay_name} />
                <FormField label="URL Slug" placeholder="san-isidro" value={form.new_barangay_slug} onChange={(e) => setForm({ ...form, new_barangay_slug: e.target.value.toLowerCase() })} error={fieldErrors.new_barangay_slug} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Municipality/City" value={form.new_barangay_municipality} onChange={(e) => setForm({ ...form, new_barangay_municipality: e.target.value })} />
                  <FormField label="Province" value={form.new_barangay_province} onChange={(e) => setForm({ ...form, new_barangay_province: e.target.value })} />
                </div>
              </div>
            )}
          </div>

          <ErrorBanner message={submitError} />
          <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? 'Creating account…' : 'Create account'}</button>
        </form>

        <p className="text-center text-sm text-civic-slate">
          Already have an account? <Link to="/login" className="text-civic-navy hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}