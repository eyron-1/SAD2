import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { supabase } from '../../lib/supabaseClient';
import { validateRequired, validateCurrency, validateFiscalYear, runValidators, formatCurrencyInput, finalizeCurrencyInput, parseCurrencyValue, friendlySupabaseError } from '../../lib/validation';
import { isSkEditor } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { sumAmounts, sumActiveAmounts } from '../../lib/financial';
import { PieChart, Plus, Search, Filter, Edit3, Trash2, X, Receipt, Wallet } from 'lucide-react';

const CATEGORIES = ['Youth Development', 'CBYDP (Comprehensive Barangay Youth Development Plan)', 'ABYIP (Annual Barangay Youth Investment Program)', 'Sports & Recreation', 'Education & Training', 'Environment', 'Health Awareness', 'Livelihood', 'Leadership & Governance', 'Other'];
const EMPTY = { sk_fund_source_id: '', fiscal_year: '', category: CATEGORIES[0], amount: '', description: '' };

export default function SKBudget() {
  const { profile } = useAuth();
  const canEdit = isSkEditor(profile?.role);
  const { rows, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable('sk_budget', profile?.barangay_id);
  const { rows: funds, loading: fundsLoading, error: fundsError } = useSupabaseTable('sk_fund_sources', profile?.barangay_id);
  const { rows: expenses, error: expensesError } = useSupabaseTable('sk_expenses', profile?.barangay_id);
  const financialLoading = loading || fundsLoading;
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  const validators = { sk_fund_source_id: (value) => validateRequired(value, 'SK fund source'), fiscal_year: validateFiscalYear, category: (value) => validateRequired(value, 'Category'), amount: (value) => validateCurrency(value, 'Amount') };
  const getAvailableFunding = (fiscalYear) => {
    const sourced = sumAmounts(funds.filter((fund) => String(fund.fiscal_year) === String(fiscalYear)));
    const allocated = sumAmounts(rows.filter((row) => String(row.fiscal_year) === String(fiscalYear) && row.id !== editingId));
    return sourced - allocated;
  };
  const getAvailableFromSource = (fundSourceId) => {
    const source = funds.find((fund) => fund.id === fundSourceId);
    if (!source) return 0;
    const allocated = sumAmounts(rows.filter(
      (row) => row.sk_fund_source_id === fundSourceId && row.id !== editingId,
    ));
    return Number(source.amount || 0) - allocated;
  };
  const sourcesForYear = funds.filter(
    (fund) => String(fund.fiscal_year) === String(form.fiscal_year),
  );
  const openModal = (row = null) => {
    setForm(row ? { sk_fund_source_id: row.sk_fund_source_id || '', fiscal_year: row.fiscal_year, category: row.category, amount: finalizeCurrencyInput(row.amount), description: row.description || '' } : { ...EMPTY, fiscal_year: String(new Date().getFullYear()) });
    setEditingId(row?.id || null); setFieldErrors({}); setSubmitError(''); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(EMPTY); setFieldErrors({}); setSubmitError(''); };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || financialLoading) return;
    const { errors } = runValidators(form, validators);
    const numericAmount = parseCurrencyValue(form.amount);
    if (numericAmount <= 0) errors.amount = 'Allocation amount must be greater than zero.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    setSubmitError('');

    const [{ data: liveFunds, error: fundsQueryError }, { data: liveAllocations, error: allocationsQueryError }] =
      await Promise.all([
        supabase
          .from('sk_fund_sources')
          .select('id,amount,fiscal_year')
          .eq('barangay_id', profile.barangay_id),
        supabase
          .from('sk_budget')
          .select('id,amount,fiscal_year,sk_fund_source_id')
          .eq('barangay_id', profile.barangay_id),
      ]);

    if (fundsQueryError || allocationsQueryError) {
      setSubmitting(false);
      setSubmitError(friendlySupabaseError(fundsQueryError || allocationsQueryError));
      return;
    }

    const liveSourced = (liveFunds || [])
      .filter((fund) => String(fund.fiscal_year) === String(form.fiscal_year))
      .reduce((sum, fund) => sum + Number(fund.amount || 0), 0);
    const liveAllocated = (liveAllocations || [])
      .filter((allocation) =>
        String(allocation.fiscal_year) === String(form.fiscal_year) &&
        allocation.id !== editingId,
      )
      .reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
    const liveAvailable = liveSourced - liveAllocated;
    const liveFundSource = (liveFunds || []).find(
      (fund) =>
        fund.id === form.sk_fund_source_id &&
        String(fund.fiscal_year) === String(form.fiscal_year),
    );
    const liveSourceAvailable = liveFundSource
      ? Number(liveFundSource.amount || 0) -
        (liveAllocations || [])
          .filter(
            (allocation) =>
              allocation.sk_fund_source_id === form.sk_fund_source_id &&
              allocation.id !== editingId,
          )
          .reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0)
      : 0;

    if (liveSourced <= 0) {
      setSubmitting(false);
      setFieldErrors({ ...errors, fiscal_year: `No SK fund source is recorded for fiscal year ${form.fiscal_year}.` });
      return;
    }
    if (numericAmount > liveAvailable) {
      setSubmitting(false);
      setFieldErrors({
        ...errors,
        amount: `Allocation exceeds the available SK funds for ${form.fiscal_year} by ₱${(numericAmount - liveAvailable).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
      });
      return;
    }
    if (!liveFundSource) {
      setSubmitting(false);
      setFieldErrors({ ...errors, sk_fund_source_id: 'Choose an SK fund source for the selected fiscal year.' });
      return;
    }
    if (numericAmount > liveSourceAvailable) {
      setSubmitting(false);
      setFieldErrors({
        ...errors,
        sk_fund_source_id: `Only ₱${Math.max(liveSourceAvailable, 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remains in the selected SK fund source.`,
      });
      return;
    }

    const payload = { ...form, amount: numericAmount, created_by: profile.id };
    const result = editingId ? await updateRow(editingId, payload) : await insertRow(payload); setSubmitting(false);
    if (result.error) {
      setSubmitError(typeof result.error === 'string'
        ? friendlySupabaseError({ message: result.error })
        : friendlySupabaseError(result.error));
    } else closeModal();
  };
  const handleDelete = async (id) => { if (!window.confirm('Delete this SK budget allocation?')) return; const result = await deleteRow(id); if (result.error) setSubmitError(result.error); };
  const years = Array.from(new Set(rows.map((row) => row.fiscal_year).filter(Boolean))).sort().reverse();
  const filteredRows = rows.filter((row) => (row.fiscal_year?.toLowerCase().includes(search.toLowerCase()) || row.category?.toLowerCase().includes(search.toLowerCase()) || row.description?.toLowerCase().includes(search.toLowerCase())) && (categoryFilter === 'all' || row.category === categoryFilter) && (yearFilter === 'all' || row.fiscal_year === yearFilter));
  const totalSourced = sumAmounts(funds);
  const totalAllocated = sumAmounts(rows);
  const totalSpent = sumActiveAmounts(expenses);
  const remainingBudget = totalAllocated - totalSpent;
  const unallocatedFunds = totalSourced - totalAllocated;
  const utilization = totalAllocated > 0 ? Math.min((totalSpent / totalAllocated) * 100, 100) : 0;
  const budgetStatus = remainingBudget < 0
    ? { tone: 'rose', title: 'Overspending alert', message: `Expenses exceed the allocated SK budget by ₱${Math.abs(remainingBudget).toLocaleString('en-PH', { minimumFractionDigits: 2 })}.` }
    : unallocatedFunds < 0
      ? { tone: 'amber', title: 'Budget exceeds available funding', message: `SK allocations exceed current fund sources by ₱${Math.abs(unallocatedFunds).toLocaleString('en-PH', { minimumFractionDigits: 2 })}.` }
      : { tone: 'emerald', title: 'Budget is within available funding', message: 'Current SK allocations are backed by sourced funds.' };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-civic-navy flex items-center gap-3"><PieChart className="w-8 h-8 text-civic-emerald" /> SK Budget Allocations</h1><p className="text-slate-600 text-sm mt-1">Manage youth budget allocations by category and fiscal year.</p></div>{canEdit && <button onClick={() => openModal()} className="btn-emerald shrink-0"><Plus className="w-4 h-4" /> Add New SK Allocation</button>}</div>
      <ErrorBanner message={error || fundsError || expensesError} />
      <div className={`rounded-xl border p-4 ${budgetStatus.tone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-800' : budgetStatus.tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
        <p className="text-xs font-bold uppercase tracking-wider">SK Budget Status</p>
        <h2 className="mt-1 text-base font-bold">{budgetStatus.title}</h2>
        <p className="mt-2 text-sm">{budgetStatus.message}</p>
      </div>
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Budget Utilization</p>
            <h3 className="mt-1 text-xl font-bold text-civic-navy">{totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : '0.0'}%</h3>
          </div>
          <p className="text-right text-sm font-semibold text-slate-600">₱{totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 2 })} spent of ₱{totalAllocated.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full rounded-full ${remainingBudget < 0 ? 'bg-rose-500' : utilization > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${utilization}%` }} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"><div className="card"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">SK Funds Sourced</span><p className="text-2xl font-bold text-civic-navy">₱{totalSourced.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div><div className="card"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">SK Budget Allocated</span><p className="text-2xl font-bold text-civic-navy">₱{totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div><div className="card"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider"><Receipt className="w-4 h-4 inline text-amber-600" /> SK Expenses Spent</span><p className="text-2xl font-bold text-civic-navy">₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div><div className="card"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider"><Wallet className="w-4 h-4 inline text-emerald-600" /> Remaining SK Budget</span><p className={`text-2xl font-bold ${remainingBudget < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>₱{remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div></div>
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-3"><div className="relative flex-1 w-full"><Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" /><input className="input-field pl-10" placeholder="Search SK fiscal year, category, description..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="flex items-center gap-2 w-full sm:w-auto"><Filter className="w-4 h-4 text-slate-400" /><select className="input-field text-xs font-semibold" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}><option value="all">All Years</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select><select className="input-field text-xs font-semibold" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All SK Categories</option>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div></div>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-6 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-card-hover sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-civic-navy">
                <PieChart className="inline h-5 w-5 text-civic-emerald" />{" "}
                {editingId ? "Edit SK Allocation" : "Add New SK Allocation"}
              </h2>
              <button type="button" onClick={closeModal} className="text-slate-400" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Fiscal Year"
                  value={form.fiscal_year}
                  onChange={(event) => setForm({
                    ...form,
                    fiscal_year: event.target.value,
                    sk_fund_source_id: "",
                  })}
                  error={fieldErrors.fiscal_year}
                />
                <FormField
                  as="select"
                  label="Youth Budget Category"
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  error={fieldErrors.category}
                >
                  {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </FormField>
              </div>
              <FormField
                as="select"
                label="SK Fund Source"
                value={form.sk_fund_source_id}
                onChange={(event) => setForm({ ...form, sk_fund_source_id: event.target.value })}
                error={fieldErrors.sk_fund_source_id}
              >
                <option value="">Choose an SK fund source</option>
                {sourcesForYear.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {fund.name} · ₱{getAvailableFromSource(fund.id).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} available
                  </option>
                ))}
              </FormField>
              <FormField
                type="text"
                inputMode="decimal"
                label="Allocated Amount (₱)"
                placeholder="e.g. 50,000.00"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: formatCurrencyInput(event.target.value) })}
                onBlur={(event) => setForm({ ...form, amount: finalizeCurrencyInput(event.target.value) })}
                error={fieldErrors.amount}
              />
              <p className="text-xs text-slate-500">
                Total available for FY {form.fiscal_year || "—"}: ₱{Math.max(getAvailableFunding(form.fiscal_year), 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {sourcesForYear.length === 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p className="font-semibold">No SK fund source recorded for this fiscal year.</p>
                  <Link to="/sk/funds" className="mt-2 inline-flex text-xs font-bold underline">Go to SK Fund Sourcing</Link>
                </div>
              )}
              <FormField
                as="textarea"
                rows={3}
                label="Description / Resolution Reference"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
              <ErrorBanner message={submitError} />
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting || financialLoading} className="btn-emerald">
                  {submitting ? "Saving…" : editingId ? "Save Changes" : "Save SK Allocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="card p-0 overflow-hidden border border-slate-200"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]"><tr><th className="px-6 py-3.5">Fiscal Year</th><th className="px-6 py-3.5">Youth Category</th><th className="px-6 py-3.5 text-right">Allocated Amount</th><th className="px-6 py-3.5">Description</th>{canEdit && <th className="px-6 py-3.5 text-right">Actions</th>}</tr></thead><tbody className="divide-y divide-slate-100">{loading && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading SK allocations…</td></tr>}{!loading && filteredRows.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No SK allocations found.</td></tr>}{filteredRows.map((row) => <tr key={row.id} className="hover:bg-slate-50/80"><td className="px-6 py-4 font-semibold text-civic-navy">{row.fiscal_year}</td><td className="px-6 py-4"><span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{row.category}</span></td><td className="px-6 py-4 text-right font-bold text-emerald-700">₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td className="px-6 py-4 text-slate-500">{row.description || '—'}</td>{canEdit && <td className="px-6 py-4 text-right"><button onClick={() => openModal(row)} className="p-1.5 text-slate-600"><Edit3 className="w-4 h-4" /></button><button onClick={() => handleDelete(row.id)} className="p-1.5 text-rose-500"><Trash2 className="w-4 h-4" /></button></td>}</tr>)}</tbody></table></div></div>
    </div>
  );
}
