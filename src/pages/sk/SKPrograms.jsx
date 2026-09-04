import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { validateRequired, validateCurrency, validateDateRange, runValidators } from '../../lib/validation';
import { isSkEditor } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';

const STATUSES = ['planned', 'ongoing', 'completed', 'cancelled'];
const EMPTY = { title: '', description: '', budget_amount: '', start_date: '', end_date: '', status: 'planned' };

export default function SKPrograms() {
  const { profile } = useAuth();
  const canEdit = isSkEditor(profile?.role);
  const { rows, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable('sk_programs', profile?.barangay_id);

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validators = { title: (v) => validateRequired(v, 'Title'), budget_amount: (v) => (v ? validateCurrency(v, 'Budget') : '') };

  const resetForm = () => { setForm(EMPTY); setFieldErrors({}); setEditingId(null); setSubmitError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors, isValid } = runValidators(form, validators);
    const dateErr = validateDateRange(form.start_date, form.end_date);
    if (dateErr) errors.end_date = dateErr;
    setFieldErrors(errors);
    if (!isValid || dateErr) return;
    setSubmitting(true);
    setSubmitError('');
    const payload = { ...form, budget_amount: form.budget_amount ? Number(String(form.budget_amount).replace(/,/g, '')) : 0, created_by: profile.id };
    const result = editingId ? await updateRow(editingId, payload) : await insertRow(payload);
    setSubmitting(false);
    if (result.error) setSubmitError(result.error); else resetForm();
  };

  const handleEdit = (row) => {
    setForm({ title: row.title, description: row.description || '', budget_amount: row.budget_amount ? String(row.budget_amount) : '', start_date: row.start_date || '', end_date: row.end_date || '', status: row.status });
    setEditingId(row.id);
    setFieldErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this SK program?')) return;
    const result = await deleteRow(id);
    if (result.error) setSubmitError(result.error);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">SK Programs</h1>
      <ErrorBanner message={error} />

      {canEdit && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="font-medium">{editingId ? 'Edit program' : 'New SK program'}</h2>
          <FormField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} error={fieldErrors.title} />
          <FormField as="textarea" rows={2} label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Budget (₱)" value={form.budget_amount} onChange={(e) => setForm({ ...form, budget_amount: e.target.value })} error={fieldErrors.budget_amount} />
            <FormField type="date" label="Start Date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <FormField type="date" label="End Date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} error={fieldErrors.end_date} />
          </div>
          <FormField as="select" label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </FormField>
          <ErrorBanner message={submitError} />
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving…' : editingId ? 'Save changes' : 'Add program'}</button>
            {editingId && <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>}
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {loading && <p className="text-civic-slate text-sm">Loading…</p>}
        {!loading && rows.length === 0 && <p className="text-civic-slate text-sm">No SK programs recorded yet.</p>}
        {rows.map((row) => (
          <div key={row.id} className="card flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2"><h3 className="font-medium">{row.title}</h3><Badge status={row.status} /></div>
              <p className="text-sm text-civic-slate mt-1">{row.description}</p>
              <p className="text-xs text-civic-slate/70 mt-2">{row.start_date} {row.end_date && `– ${row.end_date}`} · ₱{Number(row.budget_amount || 0).toLocaleString()}</p>
            </div>
            {canEdit && (
              <div className="flex gap-3 shrink-0 ml-4">
                <button onClick={() => handleEdit(row)} className="text-civic-navy hover:underline text-xs">Edit</button>
                <button onClick={() => handleDelete(row.id)} className="text-civic-clay hover:underline text-xs">Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
