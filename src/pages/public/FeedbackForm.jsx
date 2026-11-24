import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../hooks/usePublicBarangay';
import { supabase } from '../../lib/supabaseClient';
import { validateRequired, validateName, validateMobile, runValidators, friendlySupabaseError } from '../../lib/validation';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { ArrowLeft, CheckCircle2, ImagePlus, Landmark, MessageSquare, ShieldCheck, Users, X } from 'lucide-react';

const CATEGORIES = ['Complaint', 'Suggestion', 'Request', 'Compliment'];
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function FeedbackForm() {
  const { slug } = useParams();
  const location = useLocation();
  const isSkPortal = location.pathname.includes(`/b/${slug}/sk`);
  const { barangay, loading: bLoading } = usePublicBarangay(slug);
  const previewUrls = useRef(new Set());

  const [form, setForm] = useState({ resident_name: '', contact_number: '', addressed_to: isSkPortal ? 'sk' : 'barangay', category: CATEGORIES[0], message: '' });
  const [photos, setPhotos] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    setForm((current) => ({ ...current, addressed_to: isSkPortal ? 'sk' : 'barangay' }));
  }, [isSkPortal]);

  const validators = {
    resident_name: (v) => validateName(v, 'Your name'),
    message: (v) => validateRequired(v, 'Message'),
    contact_number: (v) => validateMobile(v, { required: false }),
  };

  const recipientLabel = form.addressed_to === 'sk' ? 'Sangguniang Kabataan (SK)' : 'Barangay Officials';
  const recipientName = form.addressed_to === 'sk' ? `${barangay?.name || 'Barangay'} SK` : `Barangay ${barangay?.name || ''}`;
  const accentClasses = isSkPortal
    ? 'from-emerald-950 via-emerald-900 to-civic-slate'
    : 'from-civic-navy via-[#153a59] to-civic-slate';
  const accentText = isSkPortal ? 'text-emerald-700' : 'text-civic-emerald';
  const accentSoft = isSkPortal ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-civic-navy';

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > MAX_PHOTOS) {
      setSubmitError(`You can attach up to ${MAX_PHOTOS} photos.`);
      e.target.value = '';
      return;
    }
    for (const f of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        setSubmitError('Photos must be JPG, PNG, or WEBP.');
        e.target.value = '';
        return;
      }
      if (f.size > MAX_PHOTO_BYTES) {
        setSubmitError('Each photo must be under 5MB.');
        e.target.value = '';
        return;
      }
    }
    setSubmitError('');
    const selectedPhotos = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      return { file, previewUrl };
    });
    setPhotos((current) => [...current, ...selectedPhotos]);
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    const photo = photos[idx];
    if (photo) {
      URL.revokeObjectURL(photo.previewUrl);
      previewUrls.current.delete(photo.previewUrl);
    }
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors, isValid } = runValidators(form, validators);
    setFieldErrors(errors);
    if (!isValid) return;

    setSubmitting(true);
    setSubmitError('');

    const photoUrls = [];
    for (const { file } of photos) {
      const path = `${barangay.id}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const { error: upErr } = await supabase.storage.from('feedback-photos').upload(path, file);
      if (upErr) {
        setSubmitError(friendlySupabaseError(upErr));
        setSubmitting(false);
        return;
      }
      const { data } = supabase.storage.from('feedback-photos').getPublicUrl(path);
      photoUrls.push(data.publicUrl);
    }

    const { error: insertErr } = await supabase.from('feedback').insert([{
      barangay_id: barangay.id,
      resident_name: form.resident_name,
      contact_number: form.contact_number || null,
      addressed_to: form.addressed_to,
      category: form.category,
      message: form.message,
      photo_urls: photoUrls,
    }]);

    setSubmitting(false);
    if (insertErr) setSubmitError(friendlySupabaseError(insertErr));
    else setSubmitted(true);
  };

  if (bLoading) return <p role="status" className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm font-medium text-slate-500">Loading barangay profile…</p>;
  if (!barangay) return <ErrorBanner message="This public portal could not be found." />;

  if (submitted) {
    return (
      <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white text-center shadow-sm">
        <div className={`bg-gradient-to-br ${accentClasses} px-6 py-10 text-white sm:px-10`}>
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-300" strokeWidth={1.6} />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">Feedback sent</p>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Thank you for speaking up.</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/80">
            Your message has been sent to {recipientName}. The officials will review it.
          </p>
        </div>
        <div className="px-6 py-6 sm:px-10">
          <p className="text-sm text-slate-500">Your feedback helps make the community better.</p>
          <Link to={isSkPortal ? `/b/${slug}/sk` : `/b/${slug}`} className="btn-secondary mx-auto mt-5 w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4" /> Back to {isSkPortal ? 'SK' : 'Barangay'} Portal
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-7">
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${accentClasses} px-5 py-7 text-white shadow-[0_16px_40px_-20px_rgba(15,45,74,0.55)] sm:px-8 sm:py-9`}>
        <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full border-[30px] border-white/5" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
            <MessageSquare className="h-6 w-6 text-emerald-200" />
          </span>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
              {isSkPortal ? <Users className="h-3.5 w-3.5" /> : <Landmark className="h-3.5 w-3.5" />}
              {isSkPortal ? 'SK COMMUNITY' : 'BARANGAY COMMUNITY'}
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Send Feedback</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
              Share a concern, idea, request, or kind word with {recipientName}. No account is needed.
            </p>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-civic-navy">Your message</h2>
            <p className="mt-1 text-sm text-slate-500">Fields marked <span className="font-semibold text-civic-clay">*</span> are required.</p>
          </div>

          <fieldset disabled={submitting} className="space-y-5 disabled:opacity-70">
            <FormField
              label={<>Your Name <span className="text-civic-clay">*</span></>}
              autoComplete="name"
              placeholder="Enter your full name"
              value={form.resident_name}
              onChange={(e) => setForm({ ...form, resident_name: e.target.value })}
              error={fieldErrors.resident_name}
              required
            />
            <div>
              <FormField
                label="Contact Number (optional)"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="e.g. 0917 123 4567"
                value={form.contact_number}
                onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                error={fieldErrors.contact_number}
              />
              <p className="mt-1.5 text-xs text-slate-500">Leave this blank if you prefer not to share it.</p>
            </div>

            {!isSkPortal && (
              <FormField
                as="select"
                label="Send feedback to"
                value={form.addressed_to}
                onChange={(e) => setForm({ ...form, addressed_to: e.target.value })}
              >
                <option value="barangay">Barangay Officials</option>
                <option value="sk">Sangguniang Kabataan (SK)</option>
              </FormField>
            )}

            <FormField
              as="select"
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </FormField>

            <div>
              <FormField
                as="textarea"
                rows={6}
                label={<>Your Message <span className="text-civic-clay">*</span></>}
                placeholder="Tell us what happened or how we can help…"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                error={fieldErrors.message}
                required
              />
              <p className="mt-1.5 text-xs text-slate-500">Please be as clear and specific as you can.</p>
            </div>

            <div>
              <label className="label" htmlFor="feedback-photos">Photos <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></label>
              <label
                htmlFor="feedback-photos"
                className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-center transition-colors hover:border-civic-emerald hover:bg-emerald-50/40 focus-within:ring-4 focus-within:ring-civic-emerald/10"
              >
                <ImagePlus className={`h-5 w-5 ${accentText}`} />
                <span className="mt-1.5 text-sm font-semibold text-civic-navy">
                  {photos.length ? 'Add more photos' : 'Choose photos to attach'}
                </span>
                <span className="mt-1 text-xs text-slate-500">JPG, PNG, or WEBP · Up to {MAX_PHOTOS} photos · 5MB each</span>
                <input
                  id="feedback-photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePhotoChange}
                  className="sr-only"
                />
              </label>
              {photos.length > 0 && (
                <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Attached photos">
                  {photos.map(({ file, previewUrl }, i) => (
                    <li key={previewUrl} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-2">
                      <img src={previewUrl} alt={`Preview of ${file.name}`} className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover" />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700" title={file.name}>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        aria-label={`Remove ${file.name}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-civic-clay focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-civic-clay"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </fieldset>

          <div className="mt-5 space-y-3">
            <ErrorBanner message={submitError} />
            <button type="submit" disabled={submitting} className="btn-primary w-full !bg-civic-gold !text-civic-navy hover:!bg-[#d8b456]">
              <MessageSquare className="h-4 w-4" />
              {submitting ? 'Sending your feedback…' : 'Send Feedback'}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-civic-emerald" />
              Your feedback will be sent directly to {recipientLabel}.
            </p>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentSoft}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-sm font-bold text-civic-navy">A safe space to be heard</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Your message goes to {recipientLabel} for review. A contact number is optional.
            </p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-civic-navy">A few helpful tips</h2>
            <ul className="mt-3 space-y-3 text-sm text-slate-600">
              <li className="flex gap-2.5"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${accentSoft}`}>1</span><span>Choose the category that best fits your message.</span></li>
              <li className="flex gap-2.5"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${accentSoft}`}>2</span><span>Include useful details so officials can understand your concern.</span></li>
              <li className="flex gap-2.5"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${accentSoft}`}>3</span><span>Attach a photo if it helps explain the situation.</span></li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
