import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { validateRequired, validateCurrency, runValidators } from '../../lib/validation';
import { isSkEditor } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { Receipt, Plus, Pencil, Trash2, Upload, FileText, ExternalLink, X } from 'lucide-react';

const CATEGORIES = ['Youth Development', 'Sports & Recreation', 'Education & Training', 'Environment', 'Health Awareness', 'Livelihood', 'Other'];
const EMPTY = { category: CATEGORIES[0], amount: '', description: '', date_incurred: '', sk_budget_id: '', status: 'recorded' };
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export default function SKExpenseManagement() {
  const { profile } = useAuth();
  const canEdit = isSkEditor(profile?.role);
  const { rows, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable('sk_expenses', profile?.barangay_id, { orderBy: 'date_incurred' });
  const { rows: allocations } = useSupabaseTable('sk_budget', profile?.barangay_id);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const resetForm = () => { setForm(EMPTY); setEditingId(null); setFieldErrors({}); setSubmitError(''); setReceiptFile(null); setModalOpen(false); };
  const openModal = (row = null) => { if (row) { handleEdit(row); } else { setForm({ ...EMPTY, date_incurred: new Date().toISOString().split('T')[0] }); setEditingId(null); setReceiptFile(null); setModalOpen(true); } };

  const handleReceiptChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setSubmitError('Receipt must be a JPG, PNG, WEBP image, or PDF.');
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setSubmitError('Receipt file must be under 5MB.');
      return;
    }
    setSubmitError('');
    setReceiptFile(file);
  };

  const uploadReceipt = async () => {
    if (!receiptFile) return null;
    const path = `${profile.barangay_id}/sk-${Date.now()}-${receiptFile.name.replace(/\s+/g, '-')}`;
    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, receiptFile);
    if (uploadError) return null;
    const { data } = supabase.storage.from('receipts').getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { errors, isValid } = runValidators(form, {
      category: (value) => validateRequired(value, 'Category'),
      amount: (value) => validateCurrency(value, 'Amount'),
      date_incurred: (value) => validateRequired(value, 'Date incurred'),
    });
    setFieldErrors(errors);
    if (!isValid) return;
    setSubmitting(true);
    setSubmitError('');
    const receiptUrl = await uploadReceipt();
    const payload = {
      ...form,
      amount: Number(String(form.amount).replace(/,/g, '')),
      sk_budget_id: form.sk_budget_id || null,
      created_by: profile.id,
      ...(receiptUrl ? { receipt_url: receiptUrl } : {}),
    };
    const result = editingId ? await updateRow(editingId, payload) : await insertRow(payload);
    setSubmitting(false);
    if (result.error) setSubmitError(result.error); else resetForm();
  };

  const handleEdit = (row) => {
    setForm({
      category: row.category,
      amount: String(row.amount),
      description: row.description || '',
      date_incurred: row.date_incurred || '',
      sk_budget_id: row.sk_budget_id || '',
      status: row.status || 'recorded',
    });
    setEditingId(row.id);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this SK expense?')) return;
    const result = await deleteRow(id);
    if (result.error) setSubmitError(result.error);
  };

  const totalSpent = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
        <h1 className="text-3xl font-bold text-civic-navy flex items-center gap-3"><Receipt className="w-8 h-8 text-civic-emerald" /> SK Expenses</h1>
        <p className="text-slate-600 text-sm mt-1">Record and monitor Sangguniang Kabataan expenditures separately from barangay expenses.</p>
        </div>
        {canEdit && <button onClick={() => openModal()} className="btn-emerald"><Plus className="w-4 h-4" /> Record New SK Expense</button>}
      </div>
      <ErrorBanner message={error || submitError} />
      <div className="card bg-civic-navy text-white p-5 rounded-xl">
        <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Total SK Expenses</p>
        <p className="text-2xl font-extrabold mt-1">₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        <p className="text-xs text-white/50 mt-1">{rows.length} expense record{rows.length !== 1 ? 's' : ''}</p>
      </div>

      {canEdit && modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"><form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card-hover border border-slate-200 p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4"><h2 className="font-bold text-civic-navy flex items-center gap-2"><Plus className="w-4 h-4 text-civic-emerald" />{editingId ? 'Edit SK Expense' : 'Record SK Expense'}</h2><button type="button" onClick={resetForm} aria-label="Close expense form" className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button></div>
          <div className="grid sm:grid-cols-3 gap-4">
            <FormField as="select" label="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} error={fieldErrors.category}>
              {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </FormField>
            <FormField label="Amount (₱)" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} error={fieldErrors.amount} />
            <FormField type="date" label="Date Incurred" value={form.date_incurred} onChange={(event) => setForm({ ...form, date_incurred: event.target.value })} error={fieldErrors.date_incurred} />
          </div>
          <FormField as="select" label="SK Budget Allocation (optional)" value={form.sk_budget_id} onChange={(event) => setForm({ ...form, sk_budget_id: event.target.value })}>
            <option value="">— unlinked expense —</option>
            {allocations.map((allocation) => <option key={allocation.id} value={allocation.id}>{allocation.fiscal_year} · {allocation.category} · ₱{Number(allocation.amount).toLocaleString()}</option>)}
          </FormField>
          <FormField as="textarea" rows={2} label="Description / Notes (optional)" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <div>
            <label className="label">Upload Receipt Attachment (JPG, PNG, PDF, max 5MB)</label>
            <label className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-colors border border-slate-200">
              <Upload className="w-4 h-4 text-civic-emerald" /> Choose Receipt File…
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleReceiptChange} className="hidden" />
            </label>
            {receiptFile && <span className="text-xs text-slate-600 block mt-1 font-medium">Selected: {receiptFile.name}</span>}
          </div>
          <div className="flex gap-2"><button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Record Expense'}</button>{editingId && <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>}</div>
        </form></div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><Receipt className="w-4 h-4 text-civic-emerald" /><h2 className="font-bold text-sm text-civic-navy">SK Expense Records</h2></div>
        <table className="w-full text-sm"><thead className="bg-civic-navy/5 text-civic-slate text-left"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Receipt</th>{canEdit && <th className="px-4 py-3" />}</tr></thead><tbody>
          {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading SK expenses…</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No SK expenses recorded yet.</td></tr>}
          {rows.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3">{row.date_incurred}</td><td className="px-4 py-3">{row.category}</td><td className="px-4 py-3">{row.description || '—'}</td><td className="px-4 py-3 text-right">₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td className="px-4 py-3">{row.receipt_url ? <a href={row.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-civic-emerald hover:underline"><FileText className="w-3.5 h-3.5" /> View <ExternalLink className="w-3 h-3" /></a> : '—'}</td>{canEdit && <td className="px-4 py-3 text-right whitespace-nowrap"><button onClick={() => handleEdit(row)} className="text-civic-navy hover:underline mr-3 text-xs"><Pencil className="w-3 h-3 inline" /> Edit</button><button onClick={() => handleDelete(row.id)} className="text-civic-clay hover:underline text-xs"><Trash2 className="w-3 h-3 inline" /> Delete</button></td>}</tr>)}
        </tbody></table>
      </div>
    </div>
  );
}
