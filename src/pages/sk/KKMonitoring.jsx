import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { validateRequired, validateName, runValidators } from '../../lib/validation';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';
import { supabase } from '../../lib/supabaseClient';
import { isSkEditor } from '../../utils/roles';
import { Check, CircleCheck, Clock3, Eye, FileCheck2, Filter, MapPin, Plus, Search, ShieldCheck, Trash2, UserRound, UsersRound, X } from 'lucide-react';

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
  const [formOpen, setFormOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingDocumentId, setLoadingDocumentId] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReview, setFilterReview] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!formOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') resetForm();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [formOpen]);

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

  const resetForm = () => { setForm(EMPTY); setFieldErrors({}); setEditingId(null); setFormOpen(false); setSubmitError(''); };

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
    setFormOpen(true);
    setFieldErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this KK member record?')) return;
    const row = rows.find((item) => item.id === id);
    const result = await deleteRow(id);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    if (row?.id_document_path) {
      const { error: storageError } = await supabase.storage
        .from('kk-id-documents')
        .remove([row.id_document_path]);
      if (storageError) {
        setSubmitError(`The KK record was removed, but its uploaded ID could not be deleted: ${storageError.message}`);
      }
    }
  };

  const handleReview = async (row, profileStatus) => {
    const result = await updateRow(row.id, { profile_status: profileStatus });
    if (result.error) setSubmitError(result.error);
  };

  const handleViewId = async (row) => {
    setSubmitError('');
    setLoadingDocumentId(row.id);
    try {
      const { data, error: storageError } = await supabase.storage
        .from('kk-id-documents')
        .createSignedUrl(row.id_document_path, 60);
      if (storageError) setSubmitError(storageError.message);
      else setDocumentPreview({
        url: data.signedUrl,
        isPdf: row.id_document_path.toLowerCase().endsWith('.pdf'),
        name: row.kk_name,
      });
    } catch (previewError) {
      setSubmitError(previewError.message || 'Unable to open the uploaded ID document.');
    } finally {
      setLoadingDocumentId(null);
    }
  };

  const filtered = rows.filter((row) => (
    (filterReview === 'all' || row.profile_status === filterReview)
    && (filterStatus === 'all' || row.participation_status === filterStatus)
    && (!search || [row.kk_name, row.contact_number, row.purok].some((value) => value?.toLowerCase().includes(search.toLowerCase())))
  ));

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((row) => row.profile_status === 'pending_review').length,
    verified: rows.filter((row) => row.profile_status === 'verified').length,
    active: rows.filter((row) => row.participation_status === 'active').length,
  }), [rows]);

  const reviewFilters = [
    { value: 'pending_review', label: 'For review', count: stats.pending },
    { value: 'verified', label: 'Verified', count: stats.verified },
    { value: 'rejected', label: 'Rejected', count: rows.filter((row) => row.profile_status === 'rejected').length },
    { value: 'all', label: 'All profiles', count: stats.total },
  ];

  const renderActions = (row) => (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && row.profile_status === 'pending_review' && (
        <>
          <button type="button" onClick={() => handleReview(row, 'verified')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 transition-colors hover:bg-emerald-100">
            <Check className="h-3.5 w-3.5" /> Approve
          </button>
          <button type="button" onClick={() => handleReview(row, 'rejected')} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition-colors hover:bg-rose-100">
            <X className="h-3.5 w-3.5" /> Reject
          </button>
        </>
      )}
      {canEdit && (
        <>
          <button type="button" onClick={() => handleEdit(row)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-civic-navy transition-colors hover:bg-slate-100">Edit</button>
          <button type="button" onClick={() => handleDelete(row.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </>
      )}
    </div>
  );

  const profileStatusClass = {
    pending_review: 'bg-amber-50 text-amber-800 ring-amber-200',
    verified: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-civic-dark via-civic-navy to-emerald-950 px-5 py-6 text-white shadow-lg shadow-civic-navy/10 sm:px-8 sm:py-8">
        <div aria-hidden="true" className="absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full border-[32px] border-white/[0.04]" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100">
              <ShieldCheck className="h-3.5 w-3.5" /> SK Youth Services
            </div>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">KK Monitoring</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">Review youth registrations, verify submitted proof of age, and manage KK participation for residents ages 15–30.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200"><UsersRound className="h-5 w-5" /></span>
            <div>
              <p className="text-2xl font-bold leading-none text-white">{stats.total}</p>
              <p className="mt-1 text-xs font-medium text-slate-300">Youth profiles</p>
            </div>
          </div>
        </div>
      </header>

      <ErrorBanner message={error} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total profiles', value: stats.total, icon: UsersRound, color: 'text-civic-navy', iconStyle: 'bg-slate-100' },
          { label: 'Awaiting review', value: stats.pending, icon: Clock3, color: 'text-amber-700', iconStyle: 'bg-amber-50' },
          { label: 'Verified youth', value: stats.verified, icon: CircleCheck, color: 'text-emerald-700', iconStyle: 'bg-emerald-50' },
          { label: 'Active members', value: stats.active, icon: UserRound, color: 'text-sky-700', iconStyle: 'bg-sky-50' },
        ].map(({ label, value, icon: Icon, color, iconStyle }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconStyle} ${color}`}><Icon className="h-5 w-5" /></span>
            </div>
            <p className={`mt-3 text-3xl font-bold tracking-tight ${color}`}>{value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-civic-navy">Youth profiles</h2>
              <p className="mt-1 text-xs text-slate-500">{filtered.length} {filtered.length === 1 ? 'profile' : 'profiles'} shown · ID documents are private to authorized SK officials.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:w-auto">
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  aria-label="Search KK profiles"
                  placeholder="Search name, contact, or purok"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="input-field pl-10"
                />
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    if (formOpen) resetForm();
                    else setFormOpen(true);
                  }}
                  className="btn-emerald shrink-0"
                >
                  {formOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {formOpen ? 'Close form' : 'Register member'}
                </button>
              )}
            </div>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter profile review status">
            {reviewFilters.map(({ value, label, count }) => (
              <button key={value} type="button" onClick={() => setFilterReview(value)} aria-pressed={filterReview === value} className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${filterReview === value ? 'border-civic-navy bg-civic-navy text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                {label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filterReview === value ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="kk-participation-filter" className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Filter className="h-3.5 w-3.5" /> Participation
            </label>
            <select id="kk-participation-filter" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="input-field w-full py-2 text-xs sm:w-auto sm:min-w-48">
              {['all', ...STATUSES].map((status) => <option key={status} value={status}>{status === 'all' ? 'All participation statuses' : status.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><UsersRound className="h-7 w-7" /></span>
            <h3 className="mt-4 font-semibold text-civic-navy">{search ? 'No matching profiles' : 'No profiles in this view'}</h3>
            <p className="mt-1 text-sm text-slate-500">{search ? 'Try another name, contact number, or purok.' : 'When youth submit their public KK form, their profiles will appear here.'}</p>
            {(search || filterReview !== 'all' || filterStatus !== 'all') && (
              <button type="button" onClick={() => { setSearch(''); setFilterReview('all'); setFilterStatus('all'); }} className="mt-4 text-xs font-semibold text-emerald-800 hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5 2xl:grid-cols-3">
            {filtered.map((row) => (
              <article key={row.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800"><UserRound className="h-6 w-6" /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-lg font-bold leading-snug text-civic-navy">{row.kk_name}</h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">Age {row.age}{row.contact_number ? ` · ${row.contact_number}` : ''}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ${profileStatusClass[row.profile_status] || profileStatusClass.pending_review}`}>{row.profile_status?.replaceAll('_', ' ') || 'pending review'}</span>
                  <Badge status={row.participation_status} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 text-sm">
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Purok / Sitio</dt>
                    <dd className="mt-1 flex items-center gap-1.5 break-words font-medium text-slate-700"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />{row.purok || '—'}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sex</dt>
                    <dd className="mt-1 break-words font-medium capitalize text-slate-700">{row.sex?.replaceAll('_', ' ') || '—'}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Education</dt>
                    <dd className="mt-1 break-words font-medium capitalize text-slate-700">{row.education_level?.replaceAll('_', ' ') || '—'}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employment</dt>
                    <dd className="mt-1 break-words font-medium capitalize text-slate-700">{row.employment_status?.replaceAll('_', ' ') || '—'}</dd>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Youth classification</dt>
                    <dd className="mt-1 break-words font-medium capitalize text-slate-700">{row.youth_classification?.replaceAll('_', ' ') || '—'}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  {row.id_document_path ? (
                    <button type="button" onClick={() => handleViewId(row)} disabled={loadingDocumentId === row.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-civic-navy transition-colors hover:bg-slate-50 disabled:opacity-50">
                      <Eye className="h-3.5 w-3.5" /> {loadingDocumentId === row.id ? 'Opening…' : 'View ID proof'}
                    </button>
                  ) : <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><FileCheck2 className="h-3.5 w-3.5" /> No ID on file</span>}
                </div>
                {canEdit && <div className="mt-3">{renderActions(row)}</div>}
              </article>
            ))}
          </div>
        )}
      </section>

      {!formOpen && <ErrorBanner message={submitError} />}

      {canEdit && formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
          onClick={resetForm}
          role="presentation"
        >
          <form
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kk-member-form-title"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Plus className="h-5 w-5" /></span>
                <div>
                  <h2 id="kk-member-form-title" className="font-semibold text-civic-navy">{editingId ? 'Edit KK member' : 'Register KK member'}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Add a member manually or update an existing profile.</p>
                </div>
              </div>
              <button type="button" onClick={resetForm} aria-label="Close form" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <ErrorBanner message={submitError} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Full Name" autoFocus value={form.kk_name} onChange={(e) => setForm({ ...form, kk_name: e.target.value })} error={fieldErrors.kk_name} />
                <FormField label="Age" type="number" min="15" max="30" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} error={fieldErrors.age} />
                <FormField label="Purok / Zone" value={form.purok} onChange={(e) => setForm({ ...form, purok: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField as="select" label="Linked SK Program (optional)" value={form.sk_program_id} onChange={(e) => setForm({ ...form, sk_program_id: e.target.value })}>
                  <option value="">— none —</option>
                  {skPrograms.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </FormField>
                <FormField as="select" label="Participation Status" value={form.participation_status} onChange={(e) => setForm({ ...form, participation_status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </FormField>
              </div>
              <FormField as="textarea" rows={2} label="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-emerald">{submitting ? 'Saving…' : editingId ? 'Save changes' : 'Add KK member'}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {documentPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={`ID document for ${documentPreview.name}`}>
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Private document</p>
                <h2 className="mt-0.5 font-semibold text-civic-navy">ID proof · {documentPreview.name}</h2>
              </div>
              <button type="button" onClick={() => setDocumentPreview(null)} className="btn-secondary px-3 py-2">Close</button>
            </div>
            <div className="bg-slate-100 p-3 sm:p-5">
              {documentPreview.isPdf ? (
                <iframe title={`ID document for ${documentPreview.name}`} src={documentPreview.url} className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white" />
              ) : (
                <img src={documentPreview.url} alt={`Uploaded ID document for ${documentPreview.name}`} className="mx-auto max-h-[70vh] max-w-full rounded-xl object-contain shadow-sm" />
              )}
            </div>
            <p className="flex items-center gap-1.5 px-4 py-3 text-xs text-slate-500 sm:px-6"><ShieldCheck className="h-3.5 w-3.5 text-emerald-700" /> This private preview link expires after one minute.</p>
          </div>
        </div>
      )}
    </div>
  );
}
