import { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { validateRequired, validateCurrency, validateDateRange, runValidators } from '../../lib/validation';
import { isBarangayEditor } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  X,
  Users,
  Calendar,
  DollarSign,
  Tag,
  CheckCircle2,
  Clock,
  HeartHandshake
} from 'lucide-react';

export const BENEFICIARY_CATEGORIES = [
  'General Residents',
  'Senior Citizens',
  'Persons with Disabilities (PWD)',
  'Children & Youth (SK/KK)',
  'Solo Parents',
  'Indigent Families / 4Ps',
  'Women & Maternal (GAD)',
  'Farmers & Fisherfolk',
  'Transport Sector (TODA / Drivers)',
  'Micro-entrepreneurs & Market Vendors',
  'Barangay Tanods & Frontliners',
  'Other / Custom Sector',
];

export const PROGRAM_PRESET_CATEGORIES = [
  'Health & Sanitation',
  'Peace & Order / Public Safety',
  'Infrastructure & Public Works',
  'Disaster Risk Reduction (DRRM)',
  'Education & Skills Training',
  'Social Welfare & Assistance',
  'Livelihood & Agriculture',
  'Sports & Youth Development',
  'Environmental & Cleanliness',
  'Senior Citizens & PWD Affairs',
  'Administrative & General Services',
];

const STATUSES = ['planned', 'ongoing', 'completed', 'cancelled'];
const EMPTY = {
  title: '',
  description: '',
  category: '',
  budget_amount: '',
  start_date: '',
  end_date: '',
  status: 'planned',
  beneficiary_category: 'General Residents',
  custom_beneficiary_category: '',
};

export const parseBeneficiaryData = (row) => {
  let cat = row.beneficiary_category || '';
  let desc = row.description || '';
  if (!cat && desc.startsWith('[Beneficiary: ')) {
    const match = desc.match(/^\[Beneficiary:\s*([^\]]+)\]\s*/);
    if (match) {
      cat = match[1];
      desc = desc.slice(match[0].length);
    }
  }
  return {
    beneficiary_category: cat || 'General Residents',
    clean_description: desc,
  };
};

export default function ProgramManagement() {
  const { profile } = useAuth();
  const canEdit = isBarangayEditor(profile?.role);
  const { rows, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable('programs', profile?.barangay_id);

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [beneficiaryFilter, setBeneficiaryFilter] = useState('all');

  const validators = {
    title: (v) => validateRequired(v, 'Title'),
    budget_amount: (v) => (v ? validateCurrency(v, 'Budget') : ''),
  };

  const openModal = (row = null) => {
    if (row) {
      const parsed = parseBeneficiaryData(row);
      const isPreset = BENEFICIARY_CATEGORIES.includes(parsed.beneficiary_category);
      setForm({
        title: row.title,
        description: parsed.clean_description,
        category: row.category || '',
        budget_amount: row.budget_amount ? String(row.budget_amount) : '',
        start_date: row.start_date || '',
        end_date: row.end_date || '',
        status: row.status || 'planned',
        beneficiary_category: isPreset ? parsed.beneficiary_category : 'Other / Custom Sector',
        custom_beneficiary_category: isPreset ? '' : parsed.beneficiary_category,
      });
      setEditingId(row.id);
    } else {
      setForm(EMPTY);
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
    const dateErr = validateDateRange(form.start_date, form.end_date);
    if (dateErr) errors.end_date = dateErr;
    setFieldErrors(errors);
    if (!isValid || dateErr) return;

    setSubmitting(true);
    setSubmitError('');

    const resolvedBeneficiaryCategory =
      form.beneficiary_category === 'Other / Custom Sector'
        ? (form.custom_beneficiary_category.trim() || 'Other')
        : (form.beneficiary_category || 'General Residents');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      budget_amount: form.budget_amount ? Number(String(form.budget_amount).replace(/,/g, '')) : 0,
      beneficiaries_count: 0,
      beneficiary_category: resolvedBeneficiaryCategory,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      created_by: profile.id,
    };

    let result = editingId ? await updateRow(editingId, payload) : await insertRow(payload);

    // Fallback if column does not exist in database yet:
    if (result.error && (result.error.toLowerCase().includes('beneficiary_category') || result.error.includes('column'))) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.beneficiary_category;
      fallbackPayload.description = `[Beneficiary: ${resolvedBeneficiaryCategory}] ${form.description.trim()}`.trim();
      result = editingId ? await updateRow(editingId, fallbackPayload) : await insertRow(fallbackPayload);
    }

    setSubmitting(false);
    if (result.error) setSubmitError(result.error);
    else closeModal();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this program? Action cannot be undone.')) return;
    const result = await deleteRow(id);
    if (result.error) setSubmitError(result.error);
  };

  // Metrics summary
  const stats = useMemo(() => {
    const totalPrograms = rows.length;
    const ongoingPrograms = rows.filter((r) => r.status === 'ongoing').length;
    const completedPrograms = rows.filter((r) => r.status === 'completed').length;
    const totalBudget = rows.reduce((acc, r) => acc + (Number(r.budget_amount) || 0), 0);
    const activeSectorsCount = new Set(
      rows.map((r) => parseBeneficiaryData(r).beneficiary_category).filter(Boolean)
    ).size;
    return { totalPrograms, ongoingPrograms, completedPrograms, totalBudget, activeSectorsCount };
  }, [rows]);

  const filteredRows = rows.filter((r) => {
    const parsed = parseBeneficiaryData(r);
    const matchesSearch =
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      parsed.clean_description?.toLowerCase().includes(search.toLowerCase()) ||
      r.category?.toLowerCase().includes(search.toLowerCase()) ||
      parsed.beneficiary_category?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesBeneficiary =
      beneficiaryFilter === 'all' || parsed.beneficiary_category === beneficiaryFilter;

    return matchesSearch && matchesStatus && matchesBeneficiary;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-civic-navy flex items-center gap-3">
            <FolderKanban className="w-8 h-8 text-civic-emerald" /> Program & Project Management
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Track community programs, timelines, budget allocations, and categorized resident sectors.
          </p>
        </div>

        {canEdit && (
          <button onClick={() => openModal()} className="btn-emerald shrink-0">
            <Plus className="w-4 h-4" /> Add New Program
          </button>
        )}
      </div>

      <ErrorBanner message={error} />

      {/* Program Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-civic-navy/10 text-civic-navy flex items-center justify-center shrink-0">
            <FolderKanban className="w-5 h-5 text-civic-navy" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Programs</p>
            <p className="text-2xl font-bold text-civic-navy mt-0.5">{stats.totalPrograms}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ongoing</p>
            <p className="text-2xl font-bold text-emerald-700 mt-0.5">{stats.ongoingPrograms}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Beneficiary Sectors</p>
            <p className="text-2xl font-bold text-blue-900 mt-0.5">{stats.activeSectorsCount} Reached</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Allocated Budget</p>
            <p className="text-xl font-bold text-amber-900 mt-0.5">
              ₱{stats.totalBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search programs by title, sector, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field text-xs font-semibold text-slate-700 capitalize sm:w-36"
              >
                <option value="all">All Statuses ({rows.length})</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <select
              value={beneficiaryFilter}
              onChange={(e) => setBeneficiaryFilter(e.target.value)}
              className="input-field text-xs font-semibold text-slate-700 sm:w-48"
            >
              <option value="all">All Beneficiary Sectors</option>
              {BENEFICIARY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Modal Dialog Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-card-hover border border-slate-200 p-6 max-w-xl w-full space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-civic-navy flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-civic-emerald" />
                  {editingId ? 'Edit Program Record' : 'Add New Program'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define program objectives, budget, timeline, and target beneficiary group.
                </p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                label="Program / Project Title"
                placeholder="e.g. Barangay Health & Nutrition Drive 2026"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                error={fieldErrors.title}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Program Category</label>
                  <input
                    list="program-categories"
                    type="text"
                    placeholder="e.g. Health & Sanitation"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input-field"
                  />
                  <datalist id="program-categories">
                    {PROGRAM_PRESET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <FormField
                  label="Budget (₱)"
                  placeholder="e.g. 50,000.00"
                  value={form.budget_amount}
                  onChange={(e) => setForm({ ...form, budget_amount: e.target.value })}
                  error={fieldErrors.budget_amount}
                />
              </div>

              {/* Categorized Beneficiary Group */}
              {/* Categorized Beneficiary Group */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-civic-navy font-semibold text-xs uppercase tracking-wider">
                  <HeartHandshake className="w-4 h-4 text-civic-emerald" />
                  <span>Target Beneficiary Sector</span>
                </div>

                <div>
                  <label className="label">Beneficiary Demographic Sector</label>
                  <select
                    value={form.beneficiary_category}
                    onChange={(e) => setForm({ ...form, beneficiary_category: e.target.value })}
                    className="input-field text-xs font-semibold text-slate-800"
                  >
                    {BENEFICIARY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {form.beneficiary_category === 'Other / Custom Sector' && (
                  <FormField
                    label="Specify Custom Sector"
                    placeholder="e.g. Out-of-school Youth, Daycare Children..."
                    value={form.custom_beneficiary_category}
                    onChange={(e) => setForm({ ...form, custom_beneficiary_category: e.target.value })}
                  />
                )}

                <p className="text-[11px] text-slate-500">
                  Specifying the demographic sector ensures programs reach priority community groups (Senior Citizens, PWDs, Solo Parents, Youth, etc.).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  type="date"
                  label="Start Date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
                <FormField
                  type="date"
                  label="End Date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  error={fieldErrors.end_date}
                />
                <FormField
                  as="select"
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </FormField>
              </div>

              <FormField
                as="textarea"
                rows={3}
                label="Description & Objectives"
                placeholder="Scope, planned activities, location, and community outcomes..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <ErrorBanner message={submitError} />

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-emerald">
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Save Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Program Cards Grid */}
      <div className="grid gap-4">
        {loading && <p className="text-slate-400 text-center py-8">Loading programs…</p>}
        {!loading && filteredRows.length === 0 && (
          <div className="card text-center py-12 text-slate-500 space-y-2">
            <FolderKanban className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">No programs match your search criteria.</p>
            <p className="text-xs text-slate-400">Try adjusting your keywords, status, or sector filters.</p>
          </div>
        )}

        {filteredRows.map((row) => {
          const parsed = parseBeneficiaryData(row);
          return (
            <div key={row.id} className="card hover:border-slate-200 transition-all space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-bold text-civic-navy">{row.title}</h3>
                  <Badge status={row.status} />
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => openModal(row)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-civic-navy hover:bg-slate-100 transition-colors text-xs flex items-center gap-1 font-semibold"
                    >
                      <Edit3 className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors text-xs flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                {parsed.clean_description || 'No description provided.'}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold pt-2 border-t border-slate-100">
                {row.category && (
                  <span className="flex items-center gap-1 text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    <Tag className="w-3.5 h-3.5 text-civic-emerald" /> {row.category}
                  </span>
                )}

                {/* Categorized Beneficiary Badge */}
                <span className="flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200/80 px-2.5 py-1 rounded-md font-semibold">
                  <HeartHandshake className="w-3.5 h-3.5 text-blue-600" />
                  <span>{parsed.beneficiary_category}</span>
                </span>

                <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <DollarSign className="w-3.5 h-3.5 text-civic-emerald" />
                  ₱{Number(row.budget_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>

                <span className="flex items-center gap-1 text-slate-500 ml-auto">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {row.start_date || 'TBD'} {row.end_date && `– ${row.end_date}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

