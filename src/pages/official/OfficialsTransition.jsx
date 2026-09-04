import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { supabase } from '../../lib/supabaseClient';
import { validateRequired, runValidators, friendlySupabaseError } from '../../lib/validation';
import { isBarangayEditor, roleLabel, ROLES, ROLE_SEAT_LIMITS } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { Users, Plus, ShieldCheck, UserMinus, History, Calendar, FileText, X, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

const EMPTY = { position_role: ROLES.CAPTAIN, outgoing_official_id: '', incoming_official_id: '', term_start: '', term_end: '', notes: '' };

export default function OfficialsTransition() {
  const { profile } = useAuth();
  const canEdit = isBarangayEditor(profile?.role);
  const { rows: officials, refetch: refetchOfficials } = useSupabaseTable('profiles', profile?.barangay_id, { select: '*' });
  const { rows: transitions, loading, error, insertRow } = useSupabaseTable('officials_transitions', profile?.barangay_id);

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deactivating, setDeactivating] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const validators = {
    position_role: (v) => validateRequired(v, 'Position role'),
    incoming_official_id: (v) => validateRequired(v, 'Incoming official account'),
    term_start: (v) => validateRequired(v, 'Term start date'),
  };

  const openModal = () => {
    setForm({ ...EMPTY, term_start: new Date().toISOString().split('T')[0] });
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

    const positionTitle = roleLabel(form.position_role);

    // 1. Log transition record
    const payload = {
      position_title: positionTitle,
      outgoing_official_id: form.outgoing_official_id || null,
      incoming_official_id: form.incoming_official_id,
      term_start: form.term_start,
      term_end: form.term_end || null,
      notes: form.notes || null,
      created_by: profile.id,
    };

    const result = await insertRow(payload);

    if (result.error) {
      setSubmitError(result.error);
      setSubmitting(false);
      return;
    }

    // 2. Deactivate outgoing official (if specified)
    if (form.outgoing_official_id) {
      await supabase
        .from('profiles')
        .update({ is_active: false, term_end: form.term_start })
        .eq('id', form.outgoing_official_id);
    }

    // 3. Activate incoming official and set their role & term_start
    if (form.incoming_official_id) {
      await supabase
        .from('profiles')
        .update({
          is_active: true,
          role: form.position_role,
          position_title: positionTitle,
          term_start: form.term_start,
          term_end: form.term_end || null,
        })
        .eq('id', form.incoming_official_id);
    }

    refetchOfficials();
    setSubmitting(false);
    closeModal();
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`End term for ${name}? Marking them inactive will free up their seat quota for a new official turnover.`)) return;
    setDeactivating(id);
    const { error: dErr } = await supabase.from('profiles').update({ is_active: false, term_end: new Date().toISOString().split('T')[0] }).eq('id', id);
    setDeactivating(null);
    if (dErr) setSubmitError(friendlySupabaseError(dErr));
    else refetchOfficials();
  };

  const activeOfficials = officials.filter((o) => o.is_active !== false);

  // Quota breakdown calculations
  const getSeatCount = (r) => activeOfficials.filter((o) => o.role === r).length;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-civic-navy flex items-center gap-3">
            <Users className="w-8 h-8 text-civic-leaf" /> Officials Turnover & Roster
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Manage active official seats, end-of-term turnovers, and transparent handover trails.
          </p>
        </div>

        {canEdit && (
          <button onClick={openModal} className="btn-emerald shrink-0">
            <Plus className="w-4 h-4" /> Log Official Turnover
          </button>
        )}
      </div>

      <ErrorBanner message={error} />

      {/* Seat Quota Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { role: ROLES.CAPTAIN, label: 'Captain', limit: 1 },
          { role: ROLES.KAGAWAD, label: 'Kagawads', limit: 7 },
          { role: ROLES.SK_CHAIRPERSON, label: 'SK Chairman', limit: 1 },
          { role: ROLES.SK_KAGAWAD, label: 'SK Kagawad', limit: 7 },
          { role: ROLES.SECRETARY, label: 'Secretary', limit: 1 },
          { role: ROLES.TREASURER, label: 'Treasurer', limit: 1 },
          { role: ROLES.STAFF, label: 'Staff', limit: 1 },
        ].map((item) => {
          const current = getSeatCount(item.role);
          const isFull = current >= item.limit;
          return (
            <div key={item.role} className={`card p-3 space-y-1 ${isFull ? 'bg-slate-50' : 'bg-white'}`}>
              <span className="text-[11px] font-bold text-slate-500 block truncate">{item.label}</span>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${isFull ? 'text-civic-navy' : 'text-civic-leaf'}`}>
                  {current} / {item.limit}
                </span>
                {isFull ? <CheckCircle2 className="w-4 h-4 text-civic-leaf" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
              </div>
              <span className="text-[10px] text-slate-400 block">{isFull ? 'Seat Filled' : 'Slot Available'}</span>
            </div>
          );
        })}
      </div>

      {/* Active Roster Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-civic-navy flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-civic-leaf" /> Active Barangay Officials Roster ({activeOfficials.length})
        </h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {activeOfficials.map((o) => (
            <div key={o.id} className="card flex items-start justify-between gap-3 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-3">
                {o.photo_url ? (
                  <img src={o.photo_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-slate-200" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-civic-navy/10 text-civic-navy font-bold text-base flex items-center justify-center border border-slate-200">
                    {o.full_name?.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{o.full_name}</h3>
                  <p className="text-xs text-civic-leaf font-semibold">{roleLabel(o.role)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {o.term_start || 'TBD'} {o.term_end && `– ${o.term_end}`}
                  </p>
                </div>
              </div>

              {canEdit && (
                <button
                  disabled={deactivating === o.id}
                  onClick={() => handleDeactivate(o.id, o.full_name)}
                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                  title="End Official Term (Deactivate Seat)"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal Dialog Form for Official Turnover */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-civic-navy flex items-center gap-2">
                <History className="w-5 h-5 text-civic-leaf" /> Log Official Turnover / End of Term
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                Turnover process: Deactivates the outgoing official, sets their term end, activates the incoming official account, and updates official seat quotas.
              </p>

              <FormField
                as="select"
                label="Position Seat for Turnover"
                value={form.position_role}
                onChange={(e) => setForm({ ...form, position_role: e.target.value })}
                error={fieldErrors.position_role}
              >
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)} (Max {ROLE_SEAT_LIMITS[r] || 1} seat)
                  </option>
                ))}
              </FormField>

              <FormField
                as="select"
                label="Outgoing Official (Term Ended)"
                value={form.outgoing_official_id}
                onChange={(e) => setForm({ ...form, outgoing_official_id: e.target.value })}
              >
                <option value="">— none / new term seat —</option>
                {activeOfficials.map((o) => (
                  <option key={o.id} value={o.id}>{o.full_name} ({roleLabel(o.role)})</option>
                ))}
              </FormField>

              <FormField
                as="select"
                label="Incoming Official (Newly Taking Seat)"
                value={form.incoming_official_id}
                onChange={(e) => setForm({ ...form, incoming_official_id: e.target.value })}
                error={fieldErrors.incoming_official_id}
              >
                <option value="">— select registered user account —</option>
                {officials.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name} {o.is_active === false ? '(Inactive User)' : `(${roleLabel(o.role)})`}
                  </option>
                ))}
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  type="date"
                  label="New Term Start Date"
                  value={form.term_start}
                  onChange={(e) => setForm({ ...form, term_start: e.target.value })}
                  error={fieldErrors.term_start}
                />
                <FormField
                  type="date"
                  label="Term End Date (optional)"
                  value={form.term_end}
                  onChange={(e) => setForm({ ...form, term_end: e.target.value })}
                />
              </div>

              <FormField
                as="textarea"
                rows={3}
                label="Handover Remarks & Clearance Notes"
                placeholder="Turnover document resolution number, inventory clearance status, or election notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />

              <ErrorBanner message={submitError} />

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-emerald">
                  {submitting ? 'Executing Turnover...' : 'Complete Official Turnover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transition History Trail */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-civic-navy flex items-center gap-2">
          <History className="w-5 h-5 text-civic-leaf" /> Election & Term Handover Trail
        </h2>

        <div className="space-y-3">
          {loading && <p className="text-slate-400 text-center py-6">Loading handover trail…</p>}
          {!loading && transitions.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-6 border border-dashed border-slate-200 rounded-xl">
              No transition records logged yet.
            </p>
          )}

          {transitions.map((t) => (
            <div key={t.id} className="card flex items-start justify-between gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-civic-navy text-base">{t.position_title}</span>
                  <span className="text-xs text-slate-500 font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                    Term: {t.term_start} {t.term_end && `– ${t.term_end}`}
                  </span>
                </div>
                {t.notes && <p className="text-slate-600 text-xs mt-1">"{t.notes}"</p>}
              </div>

              <div className="text-right text-xs text-slate-400 shrink-0">
                Logged on {new Date(t.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


