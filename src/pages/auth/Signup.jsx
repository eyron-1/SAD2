import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, CheckCircle2, MapPin, ShieldCheck, UsersRound } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import {
  validateEmail, validatePassword, validateName, validateMobile,
  validateRequired, runValidators, friendlySupabaseError,
} from '../../lib/validation';
import { ROLES, roleLabel, ROLE_SEAT_LIMITS } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SystemLogo from '../../components/ui/SystemLogo';
import { PROVINCES_LIST, getCitiesMunicipalities, getBarangays, generateSlug } from '../../lib/philippineLocations';

const EXISTING_BARANGAY_SELF_REGISTERABLE_ROLES = [
  ROLES.CAPTAIN,
  ROLES.SECRETARY,
  ROLES.TREASURER,
  ROLES.KAGAWAD,
  ROLES.STAFF,
  ROLES.SK_CHAIRPERSON,
  ROLES.SK_TREASURER,
  ROLES.SK_KAGAWAD,
];

export default function Signup() {
  const navigate = useNavigate();
  const [barangays, setBarangays] = useState([]);
  const [tenantMode, setTenantMode] = useState('existing'); // 'existing' | 'new'
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [locationBarangays, setLocationBarangays] = useState([]);

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', contact_number: '', role: ROLES.STAFF,
    barangay_id: '', new_barangay_name: '', new_barangay_municipality: '', new_barangay_province: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registerForHandover, setRegisterForHandover] = useState(false);

  const selfRegisterableRoles = tenantMode === 'new'
    ? Object.values(ROLES)
    : EXISTING_BARANGAY_SELF_REGISTERABLE_ROLES;

  const changeTenantMode = (mode) => {
    setTenantMode(mode);
    setRegisterForHandover(false);
    if (mode === 'existing' && !EXISTING_BARANGAY_SELF_REGISTERABLE_ROLES.includes(form.role)) {
      setForm((prev) => ({ ...prev, role: ROLES.SK_KAGAWAD }));
    }
  };

  useEffect(() => {
    supabase.from('barangays').select('id, name').order('name').then(({ data }) => setBarangays(data || []));
  }, []);

  useEffect(() => {
    setCities([]);
    setSelectedCity(null);
    setLocationBarangays([]);
    setForm((prev) => ({ ...prev, new_barangay_municipality: '', new_barangay_province: '' }));
    if (selectedProvince) {
      getCitiesMunicipalities(selectedProvince).then(setCities);
      setForm((prev) => ({ ...prev, new_barangay_province: selectedProvince.name }));
    }
  }, [selectedProvince]);

  useEffect(() => {
    setLocationBarangays([]);
    if (selectedCity) {
      getBarangays(selectedCity.code).then(setLocationBarangays);
      setForm((prev) => ({ ...prev, new_barangay_municipality: selectedCity.name }));
    }
  }, [selectedCity]);

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
        }),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors, isValid } = runValidators(form, validators);
    setFieldErrors(errors);
    if (!isValid) return;

    setSubmitting(true);
    setSubmitError('');
    setSubmitMessage('');

    if (!selfRegisterableRoles.includes(form.role)) {
      setSubmitError('This role must be assigned by an existing barangay or SK editor. Choose a member role, or set up a new barangay for the first official account.');
      setSubmitting(false);
      return;
    }

    try {
      let barangayId = form.barangay_id;
      let pendingHandover = false;

      if (tenantMode === 'existing') {
        const limit = ROLE_SEAT_LIMITS[form.role] || 1;
        const { data: existingProfiles, error: checkErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('barangay_id', barangayId)
          .eq('role', form.role)
          .neq('is_active', false);

        if (checkErr) {
          setSubmitError(friendlySupabaseError(checkErr));
          setSubmitting(false);
          return;
        }
        if (existingProfiles && existingProfiles.length >= limit) {
          if (form.role === ROLES.CAPTAIN && registerForHandover) {
            pendingHandover = true;
          } else {
            setSubmitError(
              `Official Seat Limit Reached: This barangay already has ${existingProfiles.length}/${limit} active ${roleLabel(form.role)}(s). An official turnover/handover must be logged to free up this seat.`
            );
            setSubmitting(false);
            return;
          }
        }
      }

      // Sign up FIRST — every insert below is protected by permission rules
      // that check who's logged in, so they only work once a session exists.
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
      });
      if (authErr) {
        setSubmitError(friendlySupabaseError(authErr));
        setSubmitting(false);
        return;
      }

      if (!authData.session) {
        setSubmitError(
          'Account created, but email confirmation is required. Check your inbox before signing in.'
        );
        setSubmitting(false);
        return;
      }

      if (tenantMode === 'new') {
      const { data: newBarangay, error: bErr } = await supabase
        .from('barangays')
        .insert([{
          name: form.new_barangay_name,
          slug: generateSlug(form.new_barangay_name, form.new_barangay_municipality),
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
      }

      const { error: profileErr } = await supabase.from('profiles').insert([{
      id: authData.user.id,
      barangay_id: barangayId,
      full_name: form.full_name,
      role: form.role,
      contact_number: form.contact_number || null,
      is_active: !pendingHandover,
    }]);

      setSubmitting(false);
      if (profileErr) {
        if (profileErr.code === '42501' || profileErr.message?.includes('row-level security')) {
          setSubmitError(
            'The database signup permissions are out of date. Ask your administrator to run supabase/migration_signup_barangay_editors.sql in the Supabase SQL Editor. If this account was already created without a profile, remove that incomplete user from Supabase Authentication > Users before signing up again.'
          );
        } else {
          setSubmitError(friendlySupabaseError(profileErr));
        }
      } else {
        if (pendingHandover) {
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) {
            setSubmitError(`Your incoming Captain account was created, but sign-out failed: ${friendlySupabaseError(signOutError)} Sign out manually; the account must remain inactive until a current editor completes the handover.`);
          } else {
            setSubmitMessage('Your account is registered as an incoming Captain. It will remain inactive until a current barangay editor records the handover and selects your account. You can sign in after the handover is complete.');
          }
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setSubmitting(false);
      setSubmitError(friendlySupabaseError(err));
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-civic-cream px-4 py-6 font-body sm:px-6 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-civic-gold/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-civic-leaf/10 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-6xl items-start gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12">
        <section className="flex flex-col lg:sticky lg:top-10">
          <Link to="/" className="inline-flex w-fit items-center gap-3 rounded-xl focus-visible:outline-offset-4">
            <SystemLogo className="h-12 w-12 rounded-xl object-cover shadow-sm" />
            <span className="text-sm font-bold tracking-wide text-civic-navy">BARANGAY TRANSPARENCY</span>
          </Link>

          <div className="mt-8 space-y-5 sm:mt-12 lg:mt-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
              Official registration
            </div>
            <div className="space-y-3">
              <h1 className="max-w-lg font-display text-3xl font-bold leading-tight text-civic-navy sm:text-4xl lg:text-5xl">
                Your community work starts here.
              </h1>
              <p className="max-w-lg text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                Create an account for your barangay or SK office. Join an existing barangay or register a new one.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-10 lg:grid-cols-1">
            <div className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-civic-navy/5 text-civic-navy">
                <UsersRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-civic-navy">For barangay and SK officials</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Choose the position that matches your office.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-civic-leaf/10 text-civic-leaf">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-civic-navy">Linked to your community</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Select your barangay or set up its location.</p>
              </div>
            </div>
          </div>

          <Link to="/" className="mt-8 inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-civic-navy lg:mt-auto lg:pt-12">
            <ArrowLeft className="h-4 w-4" />
            Back to resident portal
          </Link>
        </section>

        <section className="min-w-0">
          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-32px_rgba(15,45,74,0.28)] sm:p-8">
            <div className="mb-7 border-b border-slate-100 pb-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-civic-leaf">Create an account</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-civic-navy sm:text-3xl">Official sign up</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Enter your details, position, and barangay information.</p>
            </div>

            <div className="space-y-7">
              {submitMessage && (
                <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-civic-leaf" />
                  <p>{submitMessage}</p>
                </div>
              )}
              <fieldset className="space-y-4">
                <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-civic-navy">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-civic-navy/5 text-xs">1</span>
                  Your account
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Full name" autoComplete="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} error={fieldErrors.full_name} />
                  <FormField label="Email address" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={fieldErrors.email} />
                  <FormField label="Password" type="password" autoComplete="new-password" showPasswordToggle value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={fieldErrors.password} />
                  <FormField label="Contact number (optional)" type="tel" autoComplete="tel" placeholder="09171234567" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} error={fieldErrors.contact_number} />
                </div>
              </fieldset>

              <fieldset className="space-y-4 border-t border-slate-100 pt-6">
                <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-civic-navy">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-civic-navy/5 text-xs">2</span>
                  Your position
                </legend>
                <FormField as="select" label="Role / position" value={form.role} onChange={(e) => {
                  setForm({ ...form, role: e.target.value });
                  if (e.target.value !== ROLES.CAPTAIN) setRegisterForHandover(false);
                }} error={fieldErrors.role}>
                  {selfRegisterableRoles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </FormField>
                {tenantMode === 'existing' && form.role === ROLES.CAPTAIN && (
                  <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    <input
                      type="checkbox"
                      checked={registerForHandover}
                      onChange={(e) => setRegisterForHandover(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-amber-400 text-civic-leaf focus:ring-civic-leaf"
                    />
                    <span>
                      <span className="block font-semibold">Register as incoming Captain</span>
                      <span className="mt-1 block text-xs leading-5 text-amber-900">
                        If the Captain seat is occupied, your account will stay inactive until a current barangay editor records the handover.
                      </span>
                    </span>
                  </label>
                )}
                {tenantMode === 'existing' && (
                  <p className="-mt-2 text-xs leading-5 text-slate-500">
                    Barangay Captain, Secretary, Treasurer, SK Chairperson, and SK Treasurer can register when their seat is still available.
                  </p>
                )}
              </fieldset>

              <fieldset className="space-y-4 border-t border-slate-100 pt-6">
                <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-civic-navy">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-civic-navy/5 text-xs">3</span>
                  <Building2 className="h-4 w-4" />
                  Barangay
                </legend>

                <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="Barangay registration option">
                  <button
                    type="button"
                    onClick={() => changeTenantMode('existing')}
                    aria-pressed={tenantMode === 'existing'}
                    className={`min-h-10 rounded-lg px-2 py-2 text-xs font-semibold transition-all sm:text-sm ${tenantMode === 'existing' ? 'bg-white text-civic-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Join existing
                  </button>
                  <button
                    type="button"
                    onClick={() => changeTenantMode('new')}
                    aria-pressed={tenantMode === 'new'}
                    className={`min-h-10 rounded-lg px-2 py-2 text-xs font-semibold transition-all sm:text-sm ${tenantMode === 'new' ? 'bg-white text-civic-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Set up new
                  </button>
                </div>

                {tenantMode === 'existing' ? (
                  <FormField as="select" label="Select your barangay" value={form.barangay_id} onChange={(e) => setForm({ ...form, barangay_id: e.target.value })} error={fieldErrors.barangay_id}>
                    <option value="">— select your barangay —</option>
                    {barangays.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </FormField>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField as="select" label="Province / region" value={selectedProvince?.code || ''} onChange={(e) => setSelectedProvince(PROVINCES_LIST.find((p) => p.code === e.target.value) || null)}>
                        <option value="">— select province / region —</option>
                        {PROVINCES_LIST.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
                      </FormField>
                      <FormField as="select" label="Municipality / city" value={selectedCity?.code || ''} onChange={(e) => setSelectedCity(cities.find((city) => city.code === e.target.value) || null)} disabled={!selectedProvince}>
                        <option value="">— select municipality / city —</option>
                        {cities.map((city) => <option key={city.code} value={city.code}>{city.name}</option>)}
                      </FormField>
                    </div>
                    <FormField as="select" label="Barangay name" value={locationBarangays.find((barangay) => barangay.name === form.new_barangay_name)?.code || ''} onChange={(e) => {
                      const selectedBarangay = locationBarangays.find((barangay) => barangay.code === e.target.value);
                      if (selectedBarangay) setForm((prev) => ({ ...prev, new_barangay_name: selectedBarangay.name }));
                    }} disabled={!selectedCity}>
                      <option value="">— select barangay —</option>
                      {locationBarangays.map((barangay) => <option key={barangay.code} value={barangay.code}>{barangay.name}</option>)}
                    </FormField>
                  </div>
                )}
              </fieldset>
            </div>

            <div className="mt-7 space-y-4 border-t border-slate-100 pt-6">
              <ErrorBanner message={submitError} />
              <button type="submit" disabled={submitting} className="btn-primary min-h-12 w-full rounded-xl text-sm font-semibold">
                {submitting ? 'Creating account…' : (
                  <><CheckCircle2 className="h-4 w-4" /> Create official account</>
                )}
              </button>
              <p className="text-center text-sm text-slate-500">
                Already have an account? <Link to="/login" className="font-semibold text-civic-navy hover:underline">Log in</Link>
              </p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}