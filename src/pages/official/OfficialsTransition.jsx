import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { supabase } from '../../lib/supabaseClient';
import { validateRequired, validateDateRange, runValidators, friendlySupabaseError } from '../../lib/validation';
import { getPhilippineDateString } from '../../lib/programStatus';
import { isBarangayEditor, isSkEditor, isSkRole, roleLabel, ROLES, ROLE_SEAT_LIMITS } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import {
  Users,
  Plus,
  ShieldCheck,
  UserMinus,
  History,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  CalendarDays,
  ClipboardCheck,
  UserRound,
} from 'lucide-react';

const EMPTY = { position_role: ROLES.CAPTAIN, outgoing_official_id: '', incoming_official_id: '', term_start: '', term_end: '', notes: '' };
const BARANGAY_ROLES = [ROLES.CAPTAIN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.KAGAWAD, ROLES.STAFF];
const SK_OFFICIAL_ROLES = [ROLES.SK_CHAIRPERSON, ROLES.SK_TREASURER, ROLES.SK_KAGAWAD];
const SEAT_DETAILS = {
  [ROLES.CAPTAIN]: { label: 'Captain', limit: 1 },
  [ROLES.KAGAWAD]: { label: 'Kagawads', limit: 7 },
  [ROLES.SECRETARY]: { label: 'Secretary', limit: 1 },
  [ROLES.TREASURER]: { label: 'Treasurer', limit: 1 },
  [ROLES.STAFF]: { label: 'Staff', limit: 1 },
  [ROLES.SK_CHAIRPERSON]: { label: 'SK Chairperson', limit: 1 },
  [ROLES.SK_TREASURER]: { label: 'SK Treasurer', limit: 1 },
  [ROLES.SK_KAGAWAD]: { label: 'SK Kagawad', limit: 7 },
};

export default function OfficialsTransition() {
  const { profile } = useAuth();
  const [scope, setScope] = useState(() => isSkRole(profile?.role) ? 'sk' : 'barangay');
  const { rows: officials, loading: officialsLoading, error: officialsError, refetch: refetchOfficials } = useSupabaseTable('profiles', profile?.barangay_id, { select: '*' });
  const { rows: transitions, loading, error, refetch: refetchTransitions } = useSupabaseTable('officials_transitions', profile?.barangay_id);

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deactivating, setDeactivating] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const scopeRoles = scope === 'sk' ? SK_OFFICIAL_ROLES : BARANGAY_ROLES;
  const canEdit = scope === 'sk'
    ? isSkEditor(profile?.role)
    : isBarangayEditor(profile?.role) || profile?.role === ROLES.STAFF;

  useEffect(() => {
    if (isSkRole(profile?.role)) setScope('sk');
  }, [profile?.role]);

  const validators = {
    position_role: (v) => validateRequired(v, 'Position role'),
    incoming_official_id: (v) => validateRequired(v, 'Incoming official account'),
    term_start: (v) => validateRequired(v, 'Term start date'),
    term_end: () => validateDateRange(form.term_start, form.term_end),
  };

  const openModal = () => {
    setForm({
      ...EMPTY,
      position_role: scopeRoles[0],
      term_start: getPhilippineDateString(),
    });
    setFieldErrors({});
    setSubmitError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
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

    try {
      const { error: handoverError } = await supabase.rpc('complete_officials_handover', {
        p_barangay_id: profile.barangay_id,
        p_position_role: form.position_role,
        p_outgoing_official_id: form.outgoing_official_id || null,
        p_incoming_official_id: form.incoming_official_id,
        p_term_start: form.term_start,
        p_term_end: form.term_end || null,
        p_notes: form.notes.trim() || null,
      });

      if (handoverError) {
        setSubmitError(friendlySupabaseError(handoverError));
        return;
      }

      await Promise.all([refetchOfficials(), refetchTransitions()]);
      closeModal();
    } catch (handoverError) {
      setSubmitError(friendlySupabaseError(handoverError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`End term for ${name}? Marking them inactive will free up their seat quota for a new official turnover.`)) return;
    setDeactivating(id);
    try {
      const { error: dErr } = await supabase.rpc('end_official_term', {
        p_barangay_id: profile.barangay_id,
        p_official_id: id,
        p_term_end: getPhilippineDateString(),
      });
      if (dErr) setSubmitError(friendlySupabaseError(dErr));
      else refetchOfficials();
    } catch (deactivationError) {
      setSubmitError(friendlySupabaseError(deactivationError));
    } finally {
      setDeactivating(null);
    }
  };

  const scopedOfficials = officials.filter((o) => scopeRoles.includes(o.role));
  const activeOfficials = scopedOfficials.filter((o) => o.is_active !== false);
  const scopedTransitions = transitions.filter((transition) => (
    transition.position_title?.startsWith('SK ') === (scope === 'sk')
  ));

  const getSeatCount = (r) => activeOfficials.filter((o) => o.role === r).length;
  const getOfficialName = (id) => officials.find((official) => official.id === id)?.full_name || 'Not specified';
  const filledSeatCount = scopeRoles.filter((role) => getSeatCount(role) > 0).length;
  const setScopeView = (nextScope) => {
    setScope(nextScope);
    setForm({ ...EMPTY, position_role: nextScope === 'sk' ? SK_OFFICIAL_ROLES[0] : BARANGAY_ROLES[0] });
    setModalOpen(false);
    setSubmitError('');
  };

  return (
    <div className="max-w-6xl space-y-8">
      <section className="relative isolate overflow-hidden rounded-2xl bg-civic-navy px-6 py-7 text-white shadow-lg sm:px-8 sm:py-9">
        <div className="absolute -right-10 -top-20 -z-10 h-64 w-64 rounded-full border-[32px] border-white/5" />
        <div className="absolute -bottom-24 right-28 -z-10 h-48 w-48 rounded-full bg-civic-leaf/40 blur-3xl" />
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              Council administration
            </span>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">{scope === 'sk' ? 'SK officials & handover' : 'Barangay officials & handover'}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">
              {scope === 'sk'
                ? 'Manage the SK roster separately and keep its term transitions on record.'
                : 'Manage Barangay Council seats separately and keep their term transitions on record.'}
            </p>
          </div>
          {canEdit && (
            <button onClick={openModal} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-civic-leaf px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-white">
              <Plus className="h-4 w-4" />
              Record a handover
            </button>
          )}
        </div>
      </section>

      <ErrorBanner message={error} />
      <ErrorBanner message={officialsError} />

      <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Officials handover type">
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'barangay'}
          onClick={() => setScopeView('barangay')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${scope === 'barangay' ? 'bg-white text-civic-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Barangay officials
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'sk'}
          onClick={() => setScopeView('sk')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${scope === 'sk' ? 'bg-white text-civic-navy shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          SK officials
        </button>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        {scope === 'sk'
          ? 'SK handovers are managed by active SK Chairpersons and SK Treasurers.'
          : 'Barangay handovers can be managed by active Barangay editors and Barangay Staff.'}
      </p>

      <section aria-label="Official seat capacity">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-civic-navy">Seat capacity</h2>
            <p className="mt-1 text-sm text-slate-500">Current seats filled against the permitted limit.</p>
          </div>
          <span className="text-xs font-medium text-slate-500">{filledSeatCount} of {scopeRoles.length} position types represented</span>
        </div>
        <div className={`grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 ${scope === 'sk' ? 'sm:grid-cols-3' : 'sm:grid-cols-3 xl:grid-cols-5'}`}>
        {scopeRoles.map((role) => {
          const item = { role, ...SEAT_DETAILS[role] };
          const current = getSeatCount(item.role);
          const isFull = current >= item.limit;
          return (
            <div key={item.role} className="rounded-xl border border-civic-navy/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card-hover">
              <div className="flex items-start justify-between gap-2">
                <span className="block truncate text-xs font-semibold text-slate-500">{item.label}</span>
                <span className={`rounded-full p-1.5 ${isFull ? 'bg-emerald-50 text-civic-leaf' : 'bg-amber-50 text-amber-600'}`}>
                  {isFull ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${isFull ? 'text-civic-navy' : 'text-civic-leaf'}`}>{current}</span>
                <span className="text-sm text-slate-400">/ {item.limit}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${isFull ? 'bg-civic-leaf' : 'bg-amber-400'}`} style={{ width: `${Math.min((current / item.limit) * 100, 100)}%` }} />
              </div>
              <span className="mt-2 block text-[11px] font-medium text-slate-400">{isFull ? 'All seats filled' : `${item.limit - current} ${item.limit - current === 1 ? 'seat' : 'seats'} available`}</span>
            </div>
          );
        })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-civic-navy">
              <ShieldCheck className="h-5 w-5 text-civic-leaf" /> Active officials
            </h2>
            <p className="mt-1 text-sm text-slate-500">The officials currently serving in their registered seats.</p>
          </div>
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-civic-leaf">{activeOfficials.length} active</span>
        </div>

        {officialsLoading ? (
          <div className="rounded-xl border border-civic-navy/10 bg-white px-5 py-10 text-center text-sm text-slate-500">Loading officials…</div>
        ) : activeOfficials.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-5 py-10 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">No active officials yet</p>
            <p className="mt-1 text-sm text-slate-500">Once officials are assigned, they’ll appear in this roster.</p>
          </div>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activeOfficials.map((o) => (
            <article key={o.id} className="group flex min-w-0 items-start justify-between gap-3 rounded-xl border border-civic-navy/10 bg-white p-4 shadow-sm transition hover:border-civic-leaf/30 hover:shadow-card-hover sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                {o.photo_url ? (
                  <img src={o.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-full border-2 border-emerald-50 object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-civic-navy/10 bg-civic-navy/5 text-base font-bold text-civic-navy">
                    {o.full_name?.charAt(0) || <UserRound className="h-5 w-5" />}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-slate-800">{o.full_name || 'Unnamed official'}</h3>
                  <p className="mt-0.5 truncate text-xs font-semibold text-civic-leaf">{roleLabel(o.role)}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {o.term_start || 'Term start not set'} {o.term_end && `– ${o.term_end}`}
                  </p>
                </div>
              </div>

              {canEdit && (
                <button
                  disabled={deactivating === o.id}
                  onClick={() => handleDeactivate(o.id, o.full_name)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-wait disabled:opacity-50"
                  title="End Official Term (Deactivate Seat)"
                  aria-label={`End term for ${o.full_name}`}
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              )}
            </article>
          ))}
        </div>
        )}
      </section>

      {/* Modal Dialog Form for Official Turnover */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4">
          <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-7">
              <div>
                <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-civic-leaf">
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Official records
                </span>
                <h2 className="text-xl font-bold text-civic-navy">Record a handover</h2>
                <p className="mt-1 text-sm text-slate-500">Transfer a seat and save the term details.</p>
              </div>
              <button onClick={closeModal} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close handover form">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-sm leading-relaxed text-emerald-950">
                <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-civic-leaf" />
                <p>Completing a handover updates the outgoing and incoming accounts and records this transition in the history below.</p>
              </div>

              <FormField
                as="select"
                label="Position seat"
                value={form.position_role}
                onChange={(e) => setForm({ ...form, position_role: e.target.value, outgoing_official_id: '' })}
                error={fieldErrors.position_role}
              >
                {scopeRoles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)} (Max {ROLE_SEAT_LIMITS[r] || 1} seat)
                  </option>
                ))}
              </FormField>

              <div className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2">
                <FormField
                  as="select"
                  label="Outgoing official"
                  value={form.outgoing_official_id}
                  onChange={(e) => setForm({ ...form, outgoing_official_id: e.target.value })}
                >
                  <option value="">None / new seat</option>
                  {activeOfficials.filter((o) => o.role === form.position_role).map((o) => (
                    <option key={o.id} value={o.id}>{o.full_name} ({roleLabel(o.role)})</option>
                  ))}
                </FormField>

                <FormField
                  as="select"
                  label="Incoming official"
                  value={form.incoming_official_id}
                  onChange={(e) => setForm({ ...form, incoming_official_id: e.target.value })}
                  error={fieldErrors.incoming_official_id}
                >
                  <option value="">Select registered account</option>
                  {scopedOfficials.map((o) => (
                    o.id !== form.outgoing_official_id && (
                      <option key={o.id} value={o.id}>
                        {o.full_name} ({roleLabel(o.role)}) {o.is_active === false ? '(Inactive)' : ''}
                      </option>
                    )
                  ))}
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  type="date"
                  label="New term start date"
                  value={form.term_start}
                  onChange={(e) => setForm({ ...form, term_start: e.target.value })}
                  error={fieldErrors.term_start}
                />
                <FormField
                  type="date"
                  label="Term end date (optional)"
                  value={form.term_end}
                  onChange={(e) => setForm({ ...form, term_end: e.target.value })}
                  error={fieldErrors.term_end}
                />
              </div>

              <FormField
                as="textarea"
                rows={3}
                label="Handover remarks & clearance notes"
                placeholder="Add resolution numbers, clearance status, or election notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />

              <ErrorBanner message={submitError} />

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-emerald">
                  {submitting ? 'Saving handover…' : 'Complete handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-civic-navy">
              <History className="h-5 w-5 text-civic-leaf" /> Handover history
            </h2>
            <p className="mt-1 text-sm text-slate-500">A chronological audit trail of leadership and term changes.</p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{scopedTransitions.length} {scopedTransitions.length === 1 ? 'record' : 'records'}</span>
        </div>

        <div className="space-y-3">
          {loading && <p className="rounded-xl border border-civic-navy/10 bg-white py-8 text-center text-sm text-slate-500">Loading handover history…</p>}
          {!loading && scopedTransitions.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-5 py-10 text-center">
              <History className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">No handovers recorded</p>
              <p className="mt-1 text-sm text-slate-500">Completed transitions will be saved here for future reference.</p>
            </div>
          )}

          {scopedTransitions.map((t) => (
            <article key={t.id} className="relative overflow-hidden rounded-xl border border-civic-navy/10 bg-white p-4 shadow-sm sm:p-5">
              <div className="absolute inset-y-0 left-0 w-1 bg-civic-leaf" />
              <div className="flex flex-col gap-4 pl-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-civic-navy">{t.position_title}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-civic-leaf">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {t.term_start || 'Start date not set'} {t.term_end && `– ${t.term_end}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600">
                      <span className="mr-1 text-xs text-slate-400">FROM</span>{getOfficialName(t.outgoing_official_id)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-civic-leaf" />
                    <span className="rounded-lg bg-emerald-50 px-3 py-2 font-medium text-emerald-900">
                      <span className="mr-1 text-xs text-emerald-700/70">TO</span>{getOfficialName(t.incoming_official_id)}
                    </span>
                  </div>
                  {t.notes && <p className="max-w-3xl border-l-2 border-slate-200 pl-3 text-sm leading-relaxed text-slate-600">{t.notes}</p>}
                </div>
                <time className="shrink-0 text-xs text-slate-400 sm:pt-1">
                  Logged {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'date unavailable'}
                </time>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
