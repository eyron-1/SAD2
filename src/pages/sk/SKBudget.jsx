import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { validateRequired, validateCurrency, validateFiscalYear, runValidators } from '../../lib/validation';
import { isSkEditor } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { PieChart, Plus, Search, Filter, Edit3, Trash2, X, Receipt, Wallet } from 'lucide-react';

const CATEGORIES = ['Youth Development', 'Sports & Recreation', 'Education & Training', 'Environment', 'Health Awareness', 'Livelihood', 'Leadership & Governance', 'Other'];
const EMPTY = { fiscal_year: '', category: CATEGORIES[0], amount: '', description: '' };

export default function SKBudget() {
  const { profile } = useAuth();
  const canEdit = isSkEditor(profile?.role);
  const { rows, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable('sk_budget', profile?.barangay_id);
  const { rows: funds } = useSupabaseTable('sk_fund_sources', profile?.barangay_id);
  const { rows: expenses } = useSupabaseTable('sk_expenses', profile?.barangay_id);
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  const validators = { fiscal_year: validateFiscalYear, category: (value) => validateRequired(value, 'Category'), amount: (value) => validateCurrency(value, 'Amount') };
  const openModal = (row = null) => {
    setForm(row ? { fiscal_year: row.fiscal_year, category: row.category, amount: String(row.amount), description: row.description || '' } : { ...EMPTY, fiscal_year: String(new Date().getFullYear()) });
    setEditingId(row?.id || null); setFieldErrors({}); setSubmitError(''); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(EMPTY); setFieldErrors({}); setSubmitError(''); };
  const handleSubmit = async (event) => {
    event.preventDefault(); const { errors, isValid } = runValidators(form, validators); setFieldErrors(errors); if (!isValid) return;
    setSubmitting(true); const payload = { ...form, amount: Number(String(form.amount).replace(/,/g, '')), created_by: profile.id };
    const result = editingId ? await updateRow(editingId, payload) : await insertRow(payload); setSubmitting(false);
    if (result.error) setSubmitError(result.error); else closeModal();
  };
  const handleDelete = async (id) => { if (!window.confirm('Delete this SK budget allocation?')) return; const result = await deleteRow(id); if (result.error) setSubmitError(result.error); };
  const years = Array.from(new Set(rows.map((row) => row.fiscal_year).filter(Boolean))).sort().reverse();
  const filteredRows = rows.filter((row) => (row.fiscal_year?.toLowerCase().includes(search.toLowerCase()) || row.category?.toLowerCase().includes(search.toLowerCase()) || row.description?.toLowerCase().includes(search.toLowerCase())) && (categoryFilter === 'all' || row.category === categoryFilter) && (yearFilter === 'all' || row.fiscal_year === yearFilter));
  const totalSourced = funds.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalAllocated = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalSpent = expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-civic-navy flex items-center gap-3"><PieChart className="w-8 h-8 text-civic-emerald" /> SK Budget Allocations</h1><p className="text-slate-600 text-sm mt-1">Manage youth budget allocations by category and fiscal year.</p></div>{canEdit && <button onClick={() => openModal()} className="btn-emerald shrink-0"><Plus className="w-4 h-4" /> Add New SK Allocation</button>}</div>
      <ErrorBanner message={error || submitError} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"><div className="card"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">SK Funds Sourced</span><p className="text-2xl font-bold text-civic-navy">₱{totalSourced.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div><div className="card"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">SK Budget Allocated</span><p className="text-2xl font-bold text-civic-navy">₱{totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div><div className="card"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider"><Receipt className="w-4 h-4 inline text-amber-600" /> SK Expenses Spent</span><p className="text-2xl font-bold text-civic-navy">₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div><div className="card"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider"><Wallet className="w-4 h-4 inline text-emerald-600" /> Remaining SK Budget</span><p className={`text-2xl font-bold ${totalAllocated - totalSpent < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>₱{(totalAllocated - totalSpent).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div></div>
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-3"><div className="relative flex-1 w-full"><Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" /><input className="input-field pl-10" placeholder="Search SK fiscal year, category, description..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="flex items-center gap-2 w-full sm:w-auto"><Filter className="w-4 h-4 text-slate-400" /><select className="input-field text-xs font-semibold" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}><option value="all">All Years</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select><select className="input-field text-xs font-semibold" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All SK Categories</option>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div></div>
      {modalOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-card-hover border border-slate-200 p-6 max-w-lg w-full space-y-6"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><h2 className="text-xl font-bold text-civic-navy"><PieChart className="w-5 h-5 inline text-civic-emerald" /> {editingId ? 'Edit SK Allocation' : 'Add New SK Allocation'}</h2><button onClick={closeModal} className="text-slate-400"><X className="w-5 h-5" /></button></div><form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-2 gap-4"><FormField label="Fiscal Year" value={form.fiscal_year} onChange={(event) => setForm({ ...form, fiscal_year: event.target.value })} error={fieldErrors.fiscal_year} /><FormField as="select" label="Youth Budget Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} error={fieldErrors.category}>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</FormField></div><FormField label="Allocated Amount (₱)" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} error={fieldErrors.amount} /><FormField as="textarea" rows={3} label="Description / Resolution Reference" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><ErrorBanner message={submitError} /><div className="flex justify-end gap-2 pt-4 border-t border-slate-100"><button type="button" onClick={closeModal} className="btn-secondary">Cancel</button><button type="submit" disabled={submitting} className="btn-emerald">{submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Save SK Allocation'}</button></div></form></div></div>}
      <div className="card p-0 overflow-hidden border border-slate-200"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]"><tr><th className="px-6 py-3.5">Fiscal Year</th><th className="px-6 py-3.5">Youth Category</th><th className="px-6 py-3.5 text-right">Allocated Amount</th><th className="px-6 py-3.5">Description</th>{canEdit && <th className="px-6 py-3.5 text-right">Actions</th>}</tr></thead><tbody className="divide-y divide-slate-100">{loading && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading SK allocations…</td></tr>}{!loading && filteredRows.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No SK allocations found.</td></tr>}{filteredRows.map((row) => <tr key={row.id} className="hover:bg-slate-50/80"><td className="px-6 py-4 font-semibold text-civic-navy">{row.fiscal_year}</td><td className="px-6 py-4"><span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{row.category}</span></td><td className="px-6 py-4 text-right font-bold text-emerald-700">₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td className="px-6 py-4 text-slate-500">{row.description || '—'}</td>{canEdit && <td className="px-6 py-4 text-right"><button onClick={() => openModal(row)} className="p-1.5 text-slate-600"><Edit3 className="w-4 h-4" /></button><button onClick={() => handleDelete(row.id)} className="p-1.5 text-rose-500"><Trash2 className="w-4 h-4" /></button></td>}</tr>)}</tbody></table></div></div>
    </div>
  );
}
