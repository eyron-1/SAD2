import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { validateRequired, validateCurrency, validateFiscalYear, runValidators, formatCurrencyInput, parseCurrencyValue } from '../../lib/validation';
import { isBarangayEditor } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { PieChart, Plus, Search, Filter, Edit3, Trash2, X, Calendar, Layers, Landmark, Receipt, Wallet } from 'lucide-react';

const CATEGORIES = ['Infrastructure', 'Health Services', 'Peace & Order', 'Education', 'Social Services', 'Administration', 'Disaster Preparedness', 'Other'];
const EMPTY = { fiscal_year: '', category: CATEGORIES[0], amount: '', description: '' };

const formatCurrency = (value) => new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

export default function BudgetManagement() {
  const { profile } = useAuth();
  const canEdit = isBarangayEditor(profile?.role);
  const { rows, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable('budget_allocations', profile?.barangay_id);
  const { rows: funds } = useSupabaseTable('fund_sources', profile?.barangay_id);
  const { rows: expenses } = useSupabaseTable('expenses', profile?.barangay_id);

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Search and filter states
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  const validators = {
    fiscal_year: validateFiscalYear,
    category: (v) => validateRequired(v, 'Category'),
    amount: (v) => validateCurrency(v, 'Amount'),
  };

  const openModal = (row = null) => {
    if (row) {
      setForm({ fiscal_year: row.fiscal_year, category: row.category, amount: String(row.amount), description: row.description || '' });
      setEditingId(row.id);
    } else {
      setForm({ ...EMPTY, fiscal_year: new Date().getFullYear().toString() });
      setEditingId(null);
    }
    setFieldErrors({});
    setSubmitError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setFieldErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors, isValid } = runValidators(form, validators);
    setFieldErrors(errors);
    if (!isValid) return;

    setSubmitting(true);
    setSubmitError('');
    const numericAmount = parseCurrencyValue(form.amount);
    const payload = { ...form, amount: numericAmount, created_by: profile.id };

    const result = editingId ? await updateRow(editingId, payload) : await insertRow(payload);
    setSubmitting(false);

    if (result.error) {
      setSubmitError(result.error);
    } else {
      closeModal();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget allocation? This action cannot be undone.')) return;
    const result = await deleteRow(id);
    if (result.error) setSubmitError(result.error);
  };

  const years = Array.from(new Set(rows.map((r) => r.fiscal_year).filter(Boolean))).sort().reverse();

  const filteredRows = rows.filter((r) => {
    const matchesSearch = r.fiscal_year?.toLowerCase().includes(search.toLowerCase()) ||
      r.category?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesYear = yearFilter === 'all' || r.fiscal_year === yearFilter;
    return matchesSearch && matchesCategory && matchesYear;
  });

  const totalSourced = funds.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalAllocated = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalSpent = expenses
    .filter((r) => r.status !== 'voided')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const unallocatedFund = totalSourced - totalAllocated;
  const remainingBudget = totalAllocated - totalSpent;

  const budgetStatus = remainingBudget < 0
    ? {
        tone: 'rose',
        title: 'Overspending Alert',
        message: `Expenses exceed allocated budget by ${formatCurrency(Math.abs(remainingBudget))}. Immediate review is recommended.`,
      }
    : unallocatedFund < 0
      ? {
          tone: 'amber',
          title: 'Budget exceeds available funding',
          message: `Allocated amount exceeds current fund sources by ${formatCurrency(Math.abs(unallocatedFund))}.`,
        }
      : {
          tone: 'emerald',
          title: 'Budget is within target',
          message: `Current allocations remain within available funding and spending is still under control.`,
        };

  const budgetUtilization = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  const utilizationTone = budgetUtilization > 100 ? 'rose' : budgetUtilization > 80 ? 'amber' : 'emerald';
  const utilizationWidth = Math.min(Math.max(budgetUtilization, 0), 100);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-civic-navy flex items-center gap-3">
            <PieChart className="w-8 h-8 text-civic-emerald" /> Budget Allocations
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Manage statutory allocations per category and fiscal year.
          </p>
        </div>

        {canEdit && (
          <button onClick={() => openModal()} className="btn-emerald shrink-0">
            <Plus className="w-4 h-4" /> Add New Allocation
          </button>
        )}
      </div>

      <ErrorBanner message={error} />

      <div className={`rounded-xl border p-4 ${budgetStatus.tone === 'rose' ? 'bg-rose-50 border-rose-200 text-rose-800' : budgetStatus.tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Budget Status</p>
            <h2 className="text-base font-bold mt-1">{budgetStatus.title}</h2>
          </div>
          <div className="text-2xl">{budgetStatus.tone === 'rose' ? '⚠️' : budgetStatus.tone === 'amber' ? '📊' : '✅'}</div>
        </div>
        <p className="text-sm mt-2 leading-relaxed">{budgetStatus.message}</p>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Budget Utilization</p>
            <h3 className="text-xl font-bold text-civic-navy mt-1">
              {budgetUtilization.toFixed(1)}%
            </h3>
          </div>
          <div className="text-sm font-semibold text-slate-600">
            {formatCurrency(totalSpent)} spent of {formatCurrency(totalAllocated)}
          </div>
        </div>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${utilizationTone === 'rose' ? 'bg-rose-500' : utilizationTone === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${utilizationWidth}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>0%</span>
          <span>{budgetUtilization > 100 ? 'Above allocated limit' : 'Current usage'}</span>
          <span>100%</span>
        </div>
      </div>

      {/* Financial Telemetry KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-civic-emerald" /> Total Funds Sourced
          </span>
          <p className="text-2xl font-bold text-civic-navy">
            {formatCurrency(totalSourced)}
          </p>
        </div>

        <div className="card space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-blue-600" /> Total Budget Allocated
          </span>
          <p className="text-2xl font-bold text-civic-navy">
            {formatCurrency(totalAllocated)}
          </p>
        </div>

        <div className="card space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-amber-600" /> Total Expenses Spent
          </span>
          <p className="text-2xl font-bold text-civic-navy">
            {formatCurrency(totalSpent)}
          </p>
        </div>

        <div className="card space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-emerald-600" /> Remaining Unspent Budget
          </span>
          <p className={`text-2xl font-bold ${remainingBudget < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {formatCurrency(remainingBudget)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by fiscal year, category, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="input-field text-xs font-semibold text-slate-700 sm:w-36"
          >
            <option value="all">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field text-xs font-semibold text-slate-700 sm:w-44"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Modal Dialog Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-card-hover border border-slate-200 p-6 max-w-lg w-full space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-civic-navy flex items-center gap-2">
                <PieChart className="w-5 h-5 text-civic-emerald" />
                {editingId ? 'Edit Budget Allocation' : 'Add New Budget Allocation'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Fiscal Year"
                  placeholder="e.g. 2026"
                  value={form.fiscal_year}
                  onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })}
                  error={fieldErrors.fiscal_year}
                />
                <FormField
                  as="select"
                  label="Category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  error={fieldErrors.category}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </FormField>
              </div>

              <FormField
                type="text"
                inputMode="decimal"
                label="Allocation Amount (₱)"
                placeholder="e.g. 250,000.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: formatCurrencyInput(e.target.value) })}
                error={fieldErrors.amount}
              />

              <FormField
                as="textarea"
                rows={3}
                label="Description / Purpose (optional)"
                placeholder="Specify purpose or official resolution number..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <ErrorBanner message={submitError} />

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-emerald">
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Save Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table Data Card */}
      <div className="card p-0 overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5"><div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-civic-emerald" /> Fiscal Year</div></th>
                <th className="px-6 py-3.5"><div className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-civic-emerald" /> Category</div></th>
                <th className="px-6 py-3.5 text-right"><div className="flex items-center justify-end gap-1.5">Allocated Amount</div></th>
                <th className="px-6 py-3.5">Description</th>
                {canEdit && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading allocations…</td></tr>
              )}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <PieChart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    No budget allocations found matching your search.
                  </td>
                </tr>
              )}
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-semibold text-civic-navy">{row.fiscal_year}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {row.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-700">
                    ₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{row.description || '—'}</td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(row)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-civic-navy hover:bg-slate-100 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


