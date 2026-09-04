import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { validateRequired, validateCurrency, validateFiscalYear, runValidators } from '../../lib/validation';
import { isSkEditor } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';

const CATEGORIES = ['Youth Development', 'Sports & Recreation', 'Education & Training', 'Environment', 'Health Awareness', 'Livelihood', 'Other'];
const EMPTY = { fiscal_year: '', category: CATEGORIES[0], amount: '', description: '' };

export default function SKBudget() {
  const { profile } = useAuth();
  const canEdit = isSkEditor(profile?.role);
  const { rows, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable('sk_budget', profile?.barangay_id);

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validators = { fiscal_year: validateFiscalYear, category: (v) => validateRequired(v, 'Category'), amount: (v) => validateCurrency(v, 'Amount') };

  const resetForm = () => { setForm(EMPTY); setFieldErrors({}); setEditingId(null); setSubmitError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors, isValid } = runValidators(form, validators);
    setFieldErrors(errors);
    if (!isValid) return;
    setSubmitting(true);
    setSubmitError('');
    const payload = { ...form, amount: Number(String(form.amount).replace(/,/g, '')), created_by: profile.id };
    const result = editingId ? await updateRow(editingId, payload) : await insertRow(payload);
    setSubmitting(false);
    if (result.error) setSubmitError(result.error); else resetForm();
  };

  const handleEdit = (row) => {
    setForm({ fiscal_year: row.fiscal_year, category: row.category, amount: String(row.amount), description: row.description || '' });
    setEditingId(row.id);
    setFieldErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this SK budget entry?')) return;
    const result = await deleteRow(id);
    if (result.error) setSubmitError(result.error);
  };

  const total = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">SK Budget</h1>
        <p className="text-civic-slate text-sm mt-1">Total SK budget allocated: <span className="font-semibold text-civic-navy">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
      </div>

      <ErrorBanner message={error} />

      {canEdit && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="font-medium">{editingId ? 'Edit entry' : 'New SK budget entry'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Fiscal Year" placeholder="2026" value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })} error={fieldErrors.fiscal_year} />
            <FormField as="select" label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </FormField>
          </div>
          <FormField label="Amount (₱)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={fieldErrors.amount} />
          <FormField as="textarea" rows={2} label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <ErrorBanner message={submitError} />
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving…' : editingId ? 'Save changes' : 'Add entry'}</button>
            {editingId && <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>}
          </div>
        </form>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-civic-navy/5 text-civic-slate text-left">
            <tr><th className="px-4 py-2">FY</th><th className="px-4 py-2">Category</th><th className="px-4 py-2 text-right">Amount</th>{canEdit && <th className="px-4 py-2"></th>}</tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-civic-slate">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-civic-slate">No SK budget entries yet.</td></tr>}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-civic-navy/5">
                <td className="px-4 py-2">{row.fiscal_year}</td>
                <td className="px-4 py-2">{row.category}</td>
                <td className="px-4 py-2 text-right">₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                {canEdit && (
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => handleEdit(row)} className="text-civic-navy hover:underline mr-3 text-xs">Edit</button>
                    <button onClick={() => handleDelete(row.id)} className="text-civic-clay hover:underline text-xs">Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
