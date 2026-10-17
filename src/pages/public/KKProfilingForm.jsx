import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileCheck2, LockKeyhole, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { supabase } from '../../lib/supabaseClient';
import { friendlySupabaseError, validateMobile, validateRequired, validateName, runValidators } from '../../lib/validation';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';

const MAX_ID_DOCUMENT_BYTES = 5 * 1024 * 1024;
const ID_DOCUMENT_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const submissionErrorMessage = (error, action) => {
  if (
    error?.code === '42501'
    || error?.message?.includes('row-level security')
    || error?.message?.includes('permission denied')
  ) {
    return `${action} is blocked by the database permissions. Ask the administrator to run supabase/migration_kk_id_documents.sql in the Supabase SQL Editor, then try again.`;
  }
  return friendlySupabaseError(error);
};

const INITIAL_FORM = {
  kk_name: '',
  age: '',
  sex: '',
  purok: '',
  contact_number: '',
  education_level: '',
  employment_status: '',
  youth_classification: '',
  consent_given: false,
  guardian_consent: false,
};

export default function KKProfilingForm() {
  const { slug } = useParams();
  const { barangay, loading, error } = usePublicBarangay(slug);
  const [form, setForm] = useState(INITIAL_FORM);
  const [idDocument, setIdDocument] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const age = Number(form.age);
  const isMinor = age >= 15 && age < 18;
  const validators = {
    kk_name: (value) => validateName(value, 'Full name'),
    age: (value) => {
      const required = validateRequired(value, 'Age');
      if (required) return required;
      return Number(value) >= 15 && Number(value) <= 30 ? '' : 'KK profiling is for ages 15 to 30.';
    },
    sex: (value) => validateRequired(value, 'Sex'),
    education_level: (value) => validateRequired(value, 'Education level'),
    employment_status: (value) => validateRequired(value, 'Employment status'),
    youth_classification: (value) => validateRequired(value, 'Youth classification'),
    contact_number: (value) => validateMobile(value, { required: false }),
  };

  const handleIdDocumentChange = (event) => {
    const file = event.target.files?.[0] || null;
    setIdDocument(file);
    setFieldErrors((current) => ({ ...current, id_document: '' }));
    setSubmitError('');

    if (file && !Object.hasOwn(ID_DOCUMENT_EXTENSIONS, file.type)) {
      setFieldErrors((current) => ({ ...current, id_document: 'Upload an ID as a JPG, PNG, WEBP, or PDF file.' }));
    } else if (file && file.size > MAX_ID_DOCUMENT_BYTES) {
      setFieldErrors((current) => ({ ...current, id_document: 'The ID file must be 5MB or smaller.' }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { errors, isValid } = runValidators(form, validators);
    if (!form.consent_given) errors.consent_given = 'Consent is required to submit this profile.';
    if (isMinor && !form.guardian_consent) errors.guardian_consent = 'Parent or guardian consent is required for ages 15 to 17.';
    if (!idDocument) errors.id_document = 'Upload a valid ID document to submit your profile.';
    else if (!Object.hasOwn(ID_DOCUMENT_EXTENSIONS, idDocument.type)) errors.id_document = 'Upload an ID as a JPG, PNG, WEBP, or PDF file.';
    else if (idDocument.size > MAX_ID_DOCUMENT_BYTES) errors.id_document = 'The ID file must be 5MB or smaller.';
    setFieldErrors(errors);
    if (!isValid || Object.keys(errors).length > 0 || !barangay) return;

    setSubmitting(true);
    setSubmitError('');
    const idDocumentPath = `${barangay.id}/${crypto.randomUUID()}.${ID_DOCUMENT_EXTENSIONS[idDocument.type]}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from('kk-id-documents')
        .upload(idDocumentPath, idDocument, { contentType: idDocument.type });
      if (uploadError) {
        setSubmitError(submissionErrorMessage(uploadError, 'ID upload'));
        return;
      }

      const { error: insertError } = await supabase.from('kk_monitoring').insert([{
        barangay_id: barangay.id,
        kk_name: form.kk_name.trim(),
        age,
        sex: form.sex,
        purok: form.purok.trim() || null,
        contact_number: form.contact_number.trim() || null,
        education_level: form.education_level,
        employment_status: form.employment_status,
        youth_classification: form.youth_classification,
        participation_status: 'registered',
        profile_status: 'pending_review',
        consent_given: true,
        guardian_consent: isMinor,
        id_document_path: idDocumentPath,
        created_by: null,
        sk_program_id: null,
        notes: null,
      }]);

      if (insertError) {
        const { error: cleanupError } = await supabase.storage.from('kk-id-documents').remove([idDocumentPath]);
        setSubmitError(
          cleanupError
            ? `${submissionErrorMessage(insertError, 'KK profile submission')} The uploaded ID could not be removed automatically; please contact the SK office.`
            : submissionErrorMessage(insertError, 'KK profile submission'),
        );
      } else {
        setSubmitted(true);
      }
    } catch (error) {
      setSubmitError(friendlySupabaseError(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-slate-500 text-center py-12">Loading profiling form…</p>;
  if (error || !barangay) return <ErrorBanner message={error || 'Barangay not found.'} />;

  if (submitted) {
    return (
      <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-emerald-200 bg-white text-center shadow-sm">
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-700 px-6 py-10 text-white sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">Application received</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Thank you for registering!</h1>
        </div>
        <div className="px-6 py-8 sm:px-10">
          <p className="text-sm leading-6 text-slate-600">Your KK profile has been sent to {barangay.name} SK. The SK team will review your information and proof of age before verifying your profile.</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Pending SK verification
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
      <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-civic-dark via-civic-navy to-emerald-950 px-6 py-8 text-white shadow-lg shadow-civic-navy/10 sm:px-9 sm:py-10">
        <div aria-hidden="true" className="absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full border-[32px] border-white/[0.04]" />
        <div aria-hidden="true" className="absolute -bottom-24 right-28 -z-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-2xl" />
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
          <UsersRound className="h-4 w-4" />
          Katipunan ng Kabataan · {barangay.name}
        </div>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">KK Youth Profiling</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
          Register as a member of the Katipunan ng Kabataan. This form is for residents of {barangay.name} ages 15 to 30.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
            <UserRound className="h-3.5 w-3.5 text-emerald-300" /> Ages 15–30
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
            <LockKeyhole className="h-3.5 w-3.5 text-emerald-300" /> Private profile
          </span>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-950 sm:px-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
        <p className="leading-6">Your information is sent directly to {barangay.name} SK for verification. Only authorized SK officials can view your profile and ID.</p>
      </div>

      <form onSubmit={handleSubmit} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-800">01</span>
            <div>
              <h2 className="font-semibold text-civic-navy">Personal information</h2>
              <p className="mt-0.5 text-xs text-slate-500">Enter the required information below.</p>
            </div>
          </div>
        </div>

        <div className="space-y-7 px-5 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <FormField label="Full name" autoComplete="name" maxLength={80} value={form.kk_name} onChange={(event) => setForm({ ...form, kk_name: event.target.value })} error={fieldErrors.kk_name} />
          <FormField label="Age" type="number" min="15" max="30" inputMode="numeric" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} error={fieldErrors.age} />
          <FormField as="select" label="Sex" value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })} error={fieldErrors.sex}>
            <option value="">Select one</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </FormField>
          <FormField label="Purok / Sitio" autoComplete="address-level3" maxLength={100} value={form.purok} onChange={(event) => setForm({ ...form, purok: event.target.value })} />
          <FormField label="Mobile number (optional)" type="tel" autoComplete="tel" placeholder="09XXXXXXXXX" value={form.contact_number} onChange={(event) => setForm({ ...form, contact_number: event.target.value })} error={fieldErrors.contact_number} />
          <FormField as="select" label="Highest education level" value={form.education_level} onChange={(event) => setForm({ ...form, education_level: event.target.value })} error={fieldErrors.education_level}>
            <option value="">Select one</option>
            <option value="elementary">Elementary</option>
            <option value="junior_high">Junior high school</option>
            <option value="senior_high">Senior high school</option>
            <option value="college">College</option>
            <option value="vocational">Technical / vocational</option>
            <option value="not_in_school">Not currently in school</option>
          </FormField>
          <FormField as="select" label="Employment status" value={form.employment_status} onChange={(event) => setForm({ ...form, employment_status: event.target.value })} error={fieldErrors.employment_status}>
            <option value="">Select one</option>
            <option value="employed">Employed</option>
            <option value="self_employed">Self-employed</option>
            <option value="unemployed">Unemployed</option>
            <option value="not_applicable">Not applicable</option>
          </FormField>
          <FormField as="select" label="Youth classification" value={form.youth_classification} onChange={(event) => setForm({ ...form, youth_classification: event.target.value })} error={fieldErrors.youth_classification}>
            <option value="">Select one</option>
            <option value="in_school">In-school youth</option>
            <option value="out_of_school">Out-of-school youth</option>
            <option value="working">Working youth</option>
            <option value="youth_with_disability">Youth with disability</option>
            <option value="indigenous_youth">Indigenous youth</option>
            <option value="other">Other</option>
          </FormField>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-800">02</span>
              <div>
                <h2 className="font-semibold text-civic-navy">Proof of identity or age</h2>
                <p className="mt-0.5 text-xs text-slate-500">Required para ma-verify ang iyong edad.</p>
              </div>
            </div>
            <label htmlFor="kk-id-document" className={`group flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed bg-white px-4 py-6 text-center transition-colors hover:border-emerald-500 hover:bg-emerald-50/40 ${fieldErrors.id_document ? 'border-rose-300' : 'border-slate-300'}`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 transition-transform group-hover:-translate-y-0.5">
                <FileCheck2 className="h-6 w-6" />
              </span>
              <span className="mt-3 text-sm font-semibold text-civic-navy">{idDocument ? idDocument.name : 'Choose an ID file'}</span>
              <span className="mt-1 text-xs text-slate-500">Click to browse · JPG, PNG, WEBP, or PDF · up to 5MB</span>
              <input
                id="kk-id-document"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleIdDocumentChange}
                className="sr-only"
                aria-describedby="kk-id-document-help"
              />
            </label>
            <p id="kk-id-document-help" className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
              <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
              Your ID is private and will only be used by the SK team for verification.
            </p>
            {fieldErrors.id_document && <p className="error-text">{fieldErrors.id_document}</p>}
          </section>

          <section className="space-y-3">
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6 transition-colors ${fieldErrors.consent_given ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" checked={form.consent_given} onChange={(event) => setForm({ ...form, consent_given: event.target.checked })} />
              <span className="text-slate-700">I consent to the SK collecting and using this information and my ID for KK profiling, age verification, and youth-program planning. I understand that only authorized SK officials can access these records.</span>
            </label>
            {fieldErrors.consent_given && <p className="error-text">{fieldErrors.consent_given}</p>}
            {isMinor && (
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6 transition-colors ${fieldErrors.guardian_consent ? 'border-rose-200 bg-rose-50/50' : 'border-amber-200 bg-amber-50/60'}`}>
                <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" checked={form.guardian_consent} onChange={(event) => setForm({ ...form, guardian_consent: event.target.checked })} />
                <span className="text-slate-700">My parent or legal guardian has reviewed and approved this registration for a KK member ages 15–17.</span>
              </label>
            )}
            {fieldErrors.guardian_consent && <p className="error-text">{fieldErrors.guardian_consent}</p>}
          </section>

          <ErrorBanner message={submitError} />
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Please make sure your information is correct before submitting.</p>
            <button type="submit" disabled={submitting} className="btn-emerald w-full sm:w-auto">
              {submitting ? 'Submitting…' : 'Submit KK profile'}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
