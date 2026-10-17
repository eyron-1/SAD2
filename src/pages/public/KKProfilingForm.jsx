import { useState } from 'react';
import { useParams } from 'react-router-dom';
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
      <section className="max-w-2xl mx-auto border-y border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
        <h1 className="text-xl font-semibold text-emerald-950">Profile submitted</h1>
        <p className="mt-2 text-sm text-emerald-900">Your KK profile was sent to {barangay.name} SK for review. The SK team will verify it before adding it to their monitoring records.</p>
      </section>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Katipunan ng Kabataan</p>
        <h1 className="mt-1 text-2xl font-semibold text-civic-navy">KK Youth Profiling</h1>
        <p className="mt-2 text-sm text-civic-slate">Submit your profile directly to {barangay.name} SK. Profiles are private and visible only to authorized SK officials for verification and youth-program planning.</p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
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

        <div>
          <label htmlFor="kk-id-document" className="label">Upload proof of identity / age</label>
          <input
            id="kk-id-document"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleIdDocumentChange}
            className={`input-field ${fieldErrors.id_document ? 'input-error' : ''}`}
            aria-describedby="kk-id-document-help"
          />
          <p id="kk-id-document-help" className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP, or PDF; maximum 5MB. Your ID is private and can only be viewed by the SK team for verification.</p>
          {fieldErrors.id_document && <p className="error-text">{fieldErrors.id_document}</p>}
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-4">
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" className="mt-1 accent-emerald-700" checked={form.consent_given} onChange={(event) => setForm({ ...form, consent_given: event.target.checked })} />
            <span>I consent to the SK collecting and using this information and uploaded ID for KK profiling, age verification, and youth-program planning. I understand that only authorized SK officials can access these records.</span>
          </label>
          {fieldErrors.consent_given && <p className="error-text">{fieldErrors.consent_given}</p>}
          {isMinor && (
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input type="checkbox" className="mt-1 accent-emerald-700" checked={form.guardian_consent} onChange={(event) => setForm({ ...form, guardian_consent: event.target.checked })} />
              <span>My parent or legal guardian has reviewed this submission and consents to profiling for a KK member aged 15 to 17.</span>
            </label>
          )}
          {fieldErrors.guardian_consent && <p className="error-text">{fieldErrors.guardian_consent}</p>}
        </div>

        <ErrorBanner message={submitError} />
        <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">{submitting ? 'Submitting…' : 'Submit KK profile'}</button>
      </form>
    </div>
  );
}
