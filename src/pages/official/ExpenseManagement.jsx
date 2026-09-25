import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { supabase } from '../../lib/supabaseClient';
import { validateRequired, validateCurrency, runValidators, friendlySupabaseError, formatCurrencyInput, parseCurrencyValue } from '../../lib/validation';
import { isBarangayEditor } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';
import { Receipt, Plus, Search, Filter, Edit3, Trash2, X, FileText, Calendar, ExternalLink, Upload, PieChart, Wallet } from 'lucide-react';

const CATEGORIES = ['Infrastructure', 'Health Services', 'Peace & Order', 'Education', 'Social Services', 'Administration', 'Disaster Preparedness', 'Honoraria', 'Utilities', 'Other'];
const EMPTY = { category: CATEGORIES[0], amount: '', description: '', date_incurred: '', budget_allocation_id: '' };
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export default function ExpenseManagement() {
  const { profile } = useAuth();
  const canEdit = isBarangayEditor(profile?.role);
  const { rows, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable('expenses', profile?.barangay_id, { orderBy: 'date_incurred' });
  const { rows: allocations } = useSupabaseTable('budget_allocations', profile?.barangay_id);

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const validators = {
    category: (v) => validateRequired(v, 'Category'),
    amount: (v) => validateCurrency(v, 'Amount'),
    date_incurred: (v) => validateRequired(v, 'Date incurred'),
    budget_allocation_id: (v) => validateRequired(v, 'Budget allocation'),
  };

  const getAvailableAmount = (allocation) => {
    const committed = rows
      .filter((row) => row.status !== 'voided' && row.budget_allocation_id === allocation.id && row.id !== editingId)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return Number(allocation.amount || 0) - committed;
  };
  const selectedAllocation = allocations.find((allocation) => allocation.id === form.budget_allocation_id);
  const availableAmount = selectedAllocation ? getAvailableAmount(selectedAllocation) : 0;

  const openModal = (row = null) => {
    if (row) {
      setForm({
        category: row.category,
        amount: String(row.amount),
        description: row.description || '',
        date_incurred: row.date_incurred || '',
        budget_allocation_id: row.budget_allocation_id || '',
      });
      setEditingId(row.id);
    } else {
      setForm({ ...EMPTY, date_incurred: new Date().toISOString().split('T')[0] });
      setEditingId(null);
    }
    setFieldErrors({});
    setSubmitError('');
    setReceiptFile(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setReceiptFile(null);
    setFieldErrors({});
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setSubmitError('Receipt must be a JPG, PNG, WEBP image or PDF.');
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
    if (!receiptFile) return { url: null };
    try {
      const path = `${profile.barangay_id}/${Date.now()}-${receiptFile.name.replace(/\s+/g, '-')}`;
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, receiptFile);
      if (!upErr) {
        const { data } = supabase.storage.from('receipts').getPublicUrl(path);
        if (data?.publicUrl) return { url: data.publicUrl };
      }
    } catch (e) {
      console.warn('Storage upload error, using data url fallback', e);
    }

    // Fallback convert image to Base64 Data URL if bucket upload is blocked
    if (receiptFile.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ url: reader.result });
        reader.onerror = () => resolve({ url: null });
        reader.readAsDataURL(receiptFile);
      });
    }

    return { url: null };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors, isValid } = runValidators(form, validators);
    const numericAmount = parseCurrencyValue(form.amount);
    if (selectedAllocation && numericAmount > availableAmount) {
      errors.amount = `Amount exceeds the remaining allocation balance of ₱${Math.max(availableAmount, 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
    }
    setFieldErrors(errors);
    if (!isValid || Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError('');

    const upload = await uploadReceipt();
    const payload = {
      category: form.category,
      description: form.description.trim(),
      date_incurred: form.date_incurred,
      amount: numericAmount,
      budget_allocation_id: form.budget_allocation_id,
      ...(upload.url ? { receipt_url: upload.url } : {}),
    };

    const result = editingId ? await updateRow(editingId, payload) : await insertRow(payload);
    setSubmitting(false);
    if (result.error) setSubmitError(result.error);
    else closeModal();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense record? Action cannot be undone.')) return;
    const result = await deleteRow(id);
    if (result.error) setSubmitError(result.error);
  };

  const filteredRows = rows.filter((r) => {
    const matchesSearch = r.category?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.date_incurred?.includes(search);
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalSpent = rows
    .filter((r) => r.status !== 'voided')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalAllocated = allocations.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const remainingBudget = totalAllocated - totalSpent;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-civic-navy flex items-center gap-3">
            <Receipt className="w-8 h-8 text-civic-emerald" /> Expense Management & Vouchers
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Record, verify, and document itemized barangay expenditures with receipts.
          </p>
        </div>

        {canEdit && (
          <button onClick={() => openModal()} className="btn-emerald shrink-0">
            <Plus className="w-4 h-4" /> Record New Expense
          </button>
        )}
      </div>

      <ErrorBanner message={error} />

      {/* Financial Telemetry KPI Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-amber-600" /> Total Recorded Expenses
          </span>
          <p className="text-2xl font-bold text-civic-navy">
            ₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="card space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-blue-600" /> Total Allocated Budget
          </span>
          <p className="text-2xl font-bold text-civic-navy">
            ₱{totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="card space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-emerald-600" /> Unspent Budget Balance
          </span>
          <p className={`text-2xl font-bold ${remainingBudget < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            ₱{remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search expenses by category, date, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field text-xs font-semibold text-slate-700 sm:w-48"
          >
            <option value="all">All Categories ({rows.length})</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Modal Dialog Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-card-hover border border-slate-200 p-6 max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-civic-navy flex items-center gap-2">
                <Receipt className="w-5 h-5 text-civic-emerald" />
                {editingId ? 'Edit Expense Record' : 'Record New Expense'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Category (from allocation)"
                  value={selectedAllocation?.category || ''}
                  placeholder="Select a budget allocation"
                  readOnly
                  disabled
                  error={fieldErrors.category}
                />
                <FormField
                  type="text"
                  inputMode="decimal"
                  label="Amount (₱)"
                  placeholder="e.g. 12,500.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: formatCurrencyInput(e.target.value) })}
                  error={fieldErrors.amount}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  type="date"
                  label="Date Incurred"
                  value={form.date_incurred}
                  onChange={(e) => setForm({ ...form, date_incurred: e.target.value })}
                  error={fieldErrors.date_incurred}
                />
                <FormField
                  as="select"
                  label="Linked Budget Allocation"
                  value={form.budget_allocation_id}
                  onChange={(e) => {
                    const allocation = allocations.find((item) => item.id === e.target.value);
                    setForm({
                      ...form,
                      budget_allocation_id: e.target.value,
                      category: allocation?.category || '',
                    });
                  }}
                  error={fieldErrors.budget_allocation_id}
                >
                  <option value="">Select an allocation</option>
                  {allocations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.fiscal_year} · {a.category} · ₱{getAvailableAmount(a).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining
                    </option>
                  ))}
                </FormField>
              </div>

              <FormField
                as="textarea"
                rows={3}
                label="Expense Description / Payee"
                placeholder="Details of item purchased, vendor, or official voucher number..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <div>
                <label className="label">Upload Receipt Attachment (JPG, PNG, PDF max 5MB)</label>
                <label className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-colors border border-slate-200">
                  <Upload className="w-4 h-4 text-civic-emerald" /> Choose Receipt File…
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileChange} className="hidden" />
                </label>
                {receiptFile && <span className="text-xs text-slate-600 font-medium block mt-1">Selected: {receiptFile.name}</span>}
              </div>

              <ErrorBanner message={submitError} />

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-emerald">
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Table Card */}
      <div className="card p-0 overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5"><div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-civic-emerald" /> Date Incurred</div></th>
                <th className="px-6 py-3.5">Category & Linked Allocation</th>
                <th className="px-6 py-3.5 text-right"><div className="flex items-center justify-end gap-1.5">Amount</div></th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Receipt</th>
                {canEdit && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Loading expenses…</td></tr>}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    No expenses found matching filter criteria.
                  </td>
                </tr>
              )}
              {filteredRows.map((row) => {
                const linked = allocations.find((a) => a.id === row.budget_allocation_id);
                return (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-civic-navy">{row.date_incurred}</td>
                    <td className="px-6 py-4 space-y-1">
                      <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {row.category}
                      </span>
                      {linked && (
                        <span className="block text-[11px] text-slate-500 font-medium">
                          Linked: {linked.fiscal_year} · {linked.category}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-amber-700">
                      ₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4"><Badge status={row.status} /></td>
                    <td className="px-6 py-4">
                      {row.receipt_url ? (
                        <a href={row.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-civic-emerald hover:underline">
                          <FileText className="w-3.5 h-3.5" /> View Receipt <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openModal(row)} className="p-1.5 rounded-lg text-slate-600 hover:text-civic-navy hover:bg-slate-100 transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(row.id)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


