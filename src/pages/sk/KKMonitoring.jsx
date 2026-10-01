import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { validateRequired, validateName, runValidators } from '../../lib/validation';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';
import { isSkEditor } from '../../utils/roles';

const STATUSES = ['registered', 'active', 'completed', 'dropped'];
const EMPTY = { kk_name: '', age: '', purok: '', sk_program_id: '', participation_status: 'registered', notes: '' };

export default function KKMonitoring() {
  const { profile } = useAuth();
  const { rows, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable('kk_monitoring', profile?.barangay_id);
  const { rows: skPrograms } = useSupabaseTable('sk_programs', profile?.barangay_id);
  const canEdit = isSkEditor(profile?.role);

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReview, setFilterReview] = useState('pending_review');

  const validators = {
    kk_name: (v) => validateName(v, 'KK member name'),
    age: (v) => {
      const req = validateRequired(v, 'Age');
      if (req) return req;
      const n = Number(v);
      if (isNaN(n) || n < 15 || n > 30) return 'Age must be between 15 and 30 (Katipunan ng Kabataan range).';
      return '';
    },
  };

  const resetForm = () => { setForm(EMPTY); setFieldErrors({}); setEditingId(null); setSubmitError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors, isValid } = runValidators(form, validators);
    setFieldErrors(errors);
    if (!isValid) return;
    setSubmitting(true);
    setSubmitError('');
    const currentRow = rows.find((row) => row.id === editingId);
    const payload = { ...form, age: Number(form.age), sk_program_id: form.sk_program_id || null, profile_status: currentRow?.profile_status || 'verified', created_by: profile.id };
    const result = editingId ? await updateRow(editingId, payload) : await insertRow(payload);
    setSubmitting(false);
    if (result.error) setSubmitError(result.error); else resetForm();
  };

  const handleEdit = (row) => {
    setForm({ kk_name: row.kk_name, age: String(row.age || ''), purok: row.purok || '', sk_program_id: row.sk_program_id || '', participation_status: row.participation_status, notes: row.notes || '' });
    setEditingId(row.id);
    setFieldErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this KK member record?')) return;
    const result = await deleteRow(id);
    if (result.error) setSubmitError(result.error);
  };

  const handleReview = async (row, profileStatus) => {
    const result = await updateRow(row.id, { profile_status: profileStatus });
    if (result.error) setSubmitError(result.error);
  };

  const filtered = rows.filter((row) => (
    (filterReview === 'all' || row.profile_status === filterReview)
    && (filterStatus === 'all' || row.participation_status === filterStatus)
  ));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">KK Monitoring</h1>
        <p className="text-civic-slate text-sm mt-1">Track Katipunan ng Kabataan (ages 15–30) participation across SK programs.</p>
      </div>

      <ErrorBanner message={error} />

      {canEdit && <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="font-medium">{editingId ? 'Edit KK member' : 'Register KK member'}</h2>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Full Name" value={form.kk_name} onChange={(e) => setForm({ ...form, kk_name: e.target.value })} error={fieldErrors.kk_name} />
          <FormField label="Age" type="number" min="15" max="30" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} error={fieldErrors.age} />
          <FormField label="Purok / Zone" value={form.purok} onChange={(e) => setForm({ ...form, purok: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField as="select" label="Linked SK Program (optional)" value={form.sk_program_id} onChange={(e) => setForm({ ...form, sk_program_id: e.target.value })}>
            <option value="">— none —</option>
            {skPrograms.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </FormField>
          <FormField as="select" label="Participation Status" value={form.participation_status} onChange={(e) => setForm({ ...form, participation_status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </FormField>
        </div>
        <FormField as="textarea" rows={2} label="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <ErrorBanner message={submitError} />
        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving…' : editingId ? 'Save changes' : 'Add KK member'}</button>
          {editingId && <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>}
        </div>
      </form>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-civic-navy">Youth profiles <span className="text-sm font-normal text-civic-slate">({rows.length})</span></h2>
          <div className="flex flex-wrap gap-2" aria-label="Filter profile review status">
            {['pending_review', 'verified', 'rejected', 'all'].map((status) => (
              <button key={status} type="button" onClick={() => setFilterReview(status)} className={`text-xs px-3 py-1.5 rounded-md border capitalize ${filterReview === status ? 'bg-civic-navy text-white border-civic-navy' : 'border-civic-navy/20 hover:bg-civic-navy/5'}`}>
                {status === 'pending_review' ? 'For review' : status === 'all' ? 'All profiles' : status}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', ...STATUSES].map((status) => (
            <button key={status} type="button" onClick={() => setFilterStatus(status)} className={`text-xs px-3 py-1.5 rounded-md border capitalize ${filterStatus === status ? 'bg-emerald-800 text-white border-emerald-800' : 'border-civic-navy/20 hover:bg-civic-navy/5'}`}>{status === 'all' ? 'All participation' : status}</button>
          ))}
        </div>
      </section>

      <ErrorBanner message={submitError} />

      <div className="card p-0 overflow-x-auto">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="bg-civic-navy/5 text-civic-slate text-left">
            <tr><th className="px-4 py-2">Name / Age</th><th className="px-4 py-2">Sex</th><th className="px-4 py-2">Purok</th><th className="px-4 py-2">Education</th><th className="px-4 py-2">Employment</th><th className="px-4 py-2">Classification</th><th className="px-4 py-2">Review</th><th className="px-4 py-2">Participation</th><th className="px-4 py-2">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-4 py-6 text-center text-civic-slate">Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-civic-slate">No KK profiles match this filter.</td></tr>}
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-civic-navy/5">
                <td className="px-4 py-2 font-medium">{row.kk_name}<span className="block text-xs font-normal text-civic-slate">Age {row.age}{row.contact_number ? ` · ${row.contact_number}` : ''}</span></td>
                <td className="px-4 py-2">{row.sex?.replaceAll('_', ' ') || '—'}</td>
                <td className="px-4 py-2">{row.purok || '—'}</td>
                <td className="px-4 py-2">{row.education_level?.replaceAll('_', ' ') || '—'}</td>
                <td className="px-4 py-2">{row.employment_status?.replaceAll('_', ' ') || '—'}</td>
                <td className="px-4 py-2">{row.youth_classification?.replaceAll('_', ' ') || '—'}</td>
                <td className="px-4 py-2"><span className={`text-xs font-medium capitalize ${row.profile_status === 'verified' ? 'text-emerald-700' : row.profile_status === 'rejected' ? 'text-rose-700' : 'text-amber-700'}`}>{row.profile_status?.replaceAll('_', ' ') || 'verified'}</span></td>
                <td className="px-4 py-2"><Badge status={row.participation_status} /></td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {canEdit && row.profile_status === 'pending_review' && <>
                    <button type="button" onClick={() => handleReview(row, 'verified')} className="text-emerald-700 hover:underline mr-3 text-xs">Approve</button>
                    <button type="button" onClick={() => handleReview(row, 'rejected')} className="text-rose-700 hover:underline mr-3 text-xs">Reject</button>
                  </>}
                  {canEdit && <>
                    <button type="button" onClick={() => handleEdit(row)} className="text-civic-navy hover:underline mr-3 text-xs">Edit</button>
                    <button type="button" onClick={() => handleDelete(row.id)} className="text-civic-clay hover:underline text-xs">Remove</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
