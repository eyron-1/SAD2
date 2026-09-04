import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { supabase } from '../../lib/supabaseClient';
import { validateRequired, validateName, validateMobile, runValidators, friendlySupabaseError } from '../../lib/validation';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';

const CATEGORIES = ['Complaint', 'Suggestion', 'Request', 'Compliment'];
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function FeedbackForm() {
  const { slug } = useParams();
  const { barangay, loading: bLoading } = usePublicBarangay(slug);

  const [form, setForm] = useState({ resident_name: '', contact_number: '', category: CATEGORIES[0], message: '' });
  const [photos, setPhotos] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validators = {
    resident_name: (v) => validateName(v, 'Your name'),
    message: (v) => validateRequired(v, 'Message'),
    contact_number: (v) => validateMobile(v, { required: false }),
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > MAX_PHOTOS) {
      setSubmitError(`You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }
    for (const f of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        setSubmitError('Photos must be JPG, PNG, or WEBP.');
        return;
      }
      if (f.size > MAX_PHOTO_BYTES) {
        setSubmitError('Each photo must be under 5MB.');
        return;
      }
    }
    setSubmitError('');
    setPhotos([...photos, ...files]);
  };

  const removePhoto = (idx) => setPhotos(photos.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors, isValid } = runValidators(form, validators);
    setFieldErrors(errors);
    if (!isValid) return;

    setSubmitting(true);
    setSubmitError('');

    const photoUrls = [];
    for (const file of photos) {
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
      category: form.category,
      message: form.message,
      photo_urls: photoUrls,
    }]);

    setSubmitting(false);
    if (insertErr) setSubmitError(friendlySupabaseError(insertErr));
    else setSubmitted(true);
  };

  if (bLoading) return <p className="text-civic-slate text-sm">Loading…</p>;

  if (submitted) {
    return (
      <div className="card max-w-lg mx-auto text-center py-10">
        <h1 className="text-xl font-medium">Thank you for your feedback</h1>
        <p className="text-civic-slate text-sm mt-2">Barangay {barangay.name} has received your message and will review it.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display">Send Feedback</h1>
        <p className="text-civic-slate text-sm mt-1">No account needed — your message goes directly to Barangay {barangay.name}'s officials.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <FormField label="Your Name" value={form.resident_name} onChange={(e) => setForm({ ...form, resident_name: e.target.value })} error={fieldErrors.resident_name} />
        <FormField label="Contact Number (optional)" placeholder="09171234567" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} error={fieldErrors.contact_number} />
        <FormField as="select" label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </FormField>
        <FormField as="textarea" rows={4} label="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} error={fieldErrors.message} />

        <div>
          <label className="label">Attach photos (optional, up to {MAX_PHOTOS})</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoChange} className="text-sm" />
          {photos.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {photos.map((f, i) => (
                <div key={i} className="relative">
                  <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-md border border-civic-navy/10" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute -top-1.5 -right-1.5 bg-civic-clay text-white rounded-full w-4 h-4 text-xs leading-4">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <ErrorBanner message={submitError} />
        <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? 'Submitting…' : 'Submit Feedback'}</button>
      </form>
    </div>
  );
}
