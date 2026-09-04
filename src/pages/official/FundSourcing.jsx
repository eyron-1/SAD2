import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { validateRequired, validateCurrency, validateFiscalYear, runValidators } from '../../lib/validation';
import { isBarangayEditor } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { Landmark, Plus, Search, Edit3, Trash2, X, Calendar, DollarSign, Tag, PieChart, Wallet } from 'lucide-react';

const SOURCE_TYPES = ['IRA (Internal Revenue Allotment)', 'Local Revenue', 'National Grant', 'Provincial/Municipal Grant', 'Donation', 'Other'];
const EMPTY = { name: '', source_type: SOURCE_TYPES[0], amount: '', fiscal_year: '', received_date: '', description: '' };

export default function FundSourcing() {
  const { profile } = useAuth();
  const canEdit = isBarangayEditor(profile?.role);
  const { rows, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable('fund_sources', profile?.barangay_id);
  const { rows: allocations } = useSupabaseTable('budget_allocations', profile?.barangay_id);

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [search, setSearch] = useState('');

  const validators = {
    name: (v) => validateRequired(v, 'Fund source name'),
    fiscal_year: validateFiscalYear,
    amount: (v) => validateCurrency(v, 'Amount'),
  };

  const openModal = (row = null) => {
    if (row) {
      setForm({ name: row.name, source_type: row.source_type, amount: String(row.amount), fiscal_year: row.fiscal_year, received_date: row.received_date || '', description: row.description || '' });
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
    const numericAmount = Number(String(form.amount).replace(/[^0-9.]/g, ''));
    const payload = { ...form, amount: numericAmount, created_by: profile.id };
    const result = editingId ? await updateRow(editingId, payload) : await insertRow(payload);
    setSubmitting(false);

    if (result.error) setSubmitError(result.error);
    else closeModal();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this fund source record? Action cannot be undone.')) return;
    const result = await deleteRow(id);
    if (result.error) setSubmitError(result.error);
  };

  const filteredRows = rows.filter((r) =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.source_type?.toLowerCase().includes(search.toLowerCase()) ||
    r.fiscal_year?.toLowerCase().includes(search.toLowerCase())
  );

  const totalSourced = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalAllocated = allocations.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const unallocatedBalance = totalSourced - totalAllocated;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-civic-navy flex items-center gap-3">
            <Landmark className="w-8 h-8 text-civic-emerald" /> Fund Sourcing & Inflows
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Track statutory IRA, national grants, municipal subsidies, and local revenue.
          </p>
        </div>

        {canEdit && (
          <button onClick={() => openModal()} className="btn-emerald shrink-0">
            <Plus className="w-4 h-4" /> Record New Fund Source
          </button>
        )}
      </div>

      <ErrorBanner message={error} />

      {/* Financial Telemetry KPI Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-civic-emerald" /> Total Funds Sourced
          </span>
          <p className="text-2xl font-bold text-civic-navy">
            ₱{totalSourced.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="card space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-blue-600" /> Allocated to Budget
          </span>
          <p className="text-2xl font-bold text-civic-navy">
            ₱{totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="card space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-emerald-600" /> Available Unallocated Funds
          </span>
          <p className={`text-2xl font-bold ${unallocatedBalance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            ₱{unallocatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by source name, type, fiscal year..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Modal Dialog Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-card-hover border border-slate-200 p-6 max-w-lg w-full space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-civic-navy flex items-center gap-2">
                <Landmark className="w-5 h-5 text-civic-emerald" />
                {editingId ? 'Edit Fund Source' : 'Record New Fund Source'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Fund Source Name"
                  placeholder="e.g. 2026 IRA Allotment"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  error={fieldErrors.name}
                />
                <FormField
                  as="select"
                  label="Source Type"
                  value={form.source_type}
                  onChange={(e) => setForm({ ...form, source_type: e.target.value })}
                >
                  {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  label="Amount (₱)"
                  placeholder="e.g. 500,000.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  error={fieldErrors.amount}
                />
                <FormField
                  label="Fiscal Year"
                  placeholder="2026"
                  value={form.fiscal_year}
                  onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })}
                  error={fieldErrors.fiscal_year}
                />
                <FormField
                  type="date"
                  label="Date Received"
                  value={form.received_date}
                  onChange={(e) => setForm({ ...form, received_date: e.target.value })}
                />
              </div>

              <FormField
                as="textarea"
                rows={3}
                label="Description (optional)"
                placeholder="Grant terms, donor details, or resolution reference..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <ErrorBanner message={submitError} />

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-emerald">
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Save Fund Source'}
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
                <th className="px-6 py-3.5"><div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-civic-emerald" /> Fund Name</div></th>
                <th className="px-6 py-3.5">Source Type</th>
                <th className="px-6 py-3.5"><div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-civic-emerald" /> Fiscal Year</div></th>
                <th className="px-6 py-3.5 text-right"><div className="flex items-center justify-end gap-1.5"><DollarSign className="w-3.5 h-3.5 text-civic-emerald" /> Amount</div></th>
                {canEdit && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading fund sources…</td></tr>}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Landmark className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    No fund sources found.
                  </td>
                </tr>
              )}
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-semibold text-civic-navy">{row.name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {row.source_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">{row.fiscal_year}</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-700">
                    ₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


