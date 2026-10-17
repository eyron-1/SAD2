import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { isSkEditor } from '../../utils/roles';
import ErrorBanner from '../../components/ui/ErrorBanner';
import AuditLogList from '../../components/ui/AuditLogList';
import { Activity, Bell, Check, CheckCircle2, ClipboardList, Plus, ShieldCheck } from 'lucide-react';

const EMPTY_FORM = {
  sk_program_id: '',
  title: '',
  due_date: '',
  progress_percent: 0,
  notes: '',
};

export default function SKOperationsCenter() {
  const { profile, user } = useAuth();
  const canEdit = isSkEditor(profile?.role);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tab, setTab] = useState('milestones');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState('');

  const programs = useSupabaseTable('sk_programs', profile?.barangay_id);
  const milestones = useSupabaseTable('program_milestones', profile?.barangay_id, { orderBy: 'due_date', ascending: true });
  const audit = useSupabaseTable('audit_logs', profile?.barangay_id);
  const notifications = useSupabaseTable('notifications', profile?.barangay_id, { filter: { user_id: user?.id } });
  const queryError = [programs.error, milestones.error, audit.error, notifications.error].find(Boolean);

  const completedCount = milestones.rows.filter((row) => Number(row.progress_percent) === 100).length;
  const averageProgress = milestones.rows.length
    ? Math.round(milestones.rows.reduce((sum, row) => sum + Number(row.progress_percent || 0), 0) / milestones.rows.length)
    : 0;
  const overdueCount = milestones.rows.filter((row) => row.due_date && row.due_date < new Date().toISOString().slice(0, 10) && Number(row.progress_percent) < 100).length;
  const unreadCount = notifications.rows.filter((row) => !row.read_at).length;

  const createMilestone = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!form.sk_program_id || !form.title.trim()) {
      setError('Select an SK program and enter a milestone title.');
      return;
    }
    setSaving(true);
    const progress = Number(form.progress_percent);
    const result = await milestones.insertRow({
      program_id: null,
      sk_program_id: form.sk_program_id,
      title: form.title.trim(),
      due_date: form.due_date || null,
      progress_percent: progress,
      status: progress === 100 ? 'complete' : progress > 0 ? 'in_progress' : 'pending',
      notes: form.notes.trim(),
      created_by: user.id,
    });
    setSaving(false);
    if (result.error) setError(result.error);
    else {
      setNotice('SK milestone recorded.');
      setForm(EMPTY_FORM);
    }
  };

  const updateProgress = async (row) => {
    setError('');
    const progress = Math.min(100, Number(row.progress_percent) + 10);
    setUpdatingId(row.id);
    const result = await milestones.updateRow(row.id, {
      progress_percent: progress,
      status: progress === 100 ? 'complete' : 'in_progress',
    });
    setUpdatingId('');
    if (result.error) setError(result.error);
  };

  const markRead = async (notification) => {
    const result = await notifications.updateRow(notification.id, { read_at: new Date().toISOString() });
    if (result.error) setError(result.error);
  };

  const milestoneRows = milestones.rows.map((row) => {
    const program = programs.rows.find((item) => item.id === row.sk_program_id);
    return { ...row, programTitle: program?.title || 'SK program' };
  });

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-civic-navy"><Activity className="h-8 w-8 text-civic-emerald" />SK Project Monitoring</h1>
        <p className="mt-1 text-sm text-slate-600">Track Sangguniang Kabataan milestones, progress updates, and audit history in a separate workspace.</p>
      </header>

      <ErrorBanner message={error || queryError} />
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card"><p className="text-xs font-bold uppercase text-slate-500">SK programs</p><p className="mt-2 text-2xl font-bold text-civic-navy">{programs.rows.length}</p></div>
        <div className="card"><p className="text-xs font-bold uppercase text-slate-500">Milestones</p><p className="mt-2 text-2xl font-bold text-civic-navy">{milestones.rows.length}</p></div>
        <div className="card"><p className="text-xs font-bold uppercase text-slate-500">Average progress</p><p className="mt-2 text-2xl font-bold text-civic-navy">{averageProgress}%</p></div>
        <div className="card"><p className="text-xs font-bold uppercase text-slate-500">Overdue milestones</p><p className={`mt-2 text-2xl font-bold ${overdueCount ? 'text-rose-700' : 'text-civic-navy'}`}>{overdueCount}</p></div>
      </div>

      <nav aria-label="SK operations sections" className="overflow-x-auto border-b border-slate-200">
        <div className="flex min-w-max gap-1">
          <button onClick={() => setTab('milestones')} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${tab === 'milestones' ? 'border-civic-emerald text-civic-navy' : 'border-transparent text-slate-500'}`}><ClipboardList className="h-4 w-4" />Project milestones</button>
          <button onClick={() => setTab('audit')} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${tab === 'audit' ? 'border-civic-emerald text-civic-navy' : 'border-transparent text-slate-500'}`}><ShieldCheck className="h-4 w-4" />SK audit trail</button>
          <button onClick={() => setTab('notifications')} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${tab === 'notifications' ? 'border-civic-emerald text-civic-navy' : 'border-transparent text-slate-500'}`}><Bell className="h-4 w-4" />Notifications{unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-rose-500" />}</button>
        </div>
      </nav>

      {tab === 'milestones' && <div className="space-y-5">
        <section className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-civic-navy">Milestone progress</h2>
              <p className="mt-1 text-sm text-slate-600">
                {milestones.rows.length} total · {completedCount} completed · {overdueCount} overdue
              </p>
            </div>
            <div className="min-w-36 rounded-lg bg-civic-navy/5 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500">Average progress</p>
              <p className="mt-1 text-xl font-bold text-civic-navy">{averageProgress}%</p>
            </div>
          </div>
        </section>

        {canEdit && <form onSubmit={createMilestone} className="card space-y-4">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-civic-navy"><Plus className="h-4 w-4 text-civic-emerald" />Add a milestone</h2>
            <p className="mt-1 text-sm text-slate-600">Choose a program, name the deliverable, and set its progress.</p>
          </div>
          {programs.rows.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Add an SK program before creating milestones.
            </p>
          ) : <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="label">SK program <span className="text-rose-600">*</span></span>
                <select className="input-field" value={form.sk_program_id} onChange={(event) => setForm((current) => ({ ...current, sk_program_id: event.target.value }))} required>
                  <option value="">Choose a program</option>
                  {programs.rows.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}
                </select>
              </label>
              <label className="block min-w-0">
                <span className="label">Milestone name <span className="text-rose-600">*</span></span>
                <input className="input-field" placeholder="e.g. Complete community sports clinic" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} maxLength={200} required />
              </label>
              <label className="block min-w-0">
                <span className="label">Due date</span>
                <input type="date" className="input-field" value={form.due_date} onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))} />
              </label>
              <label className="block min-w-0">
                <span className="label">Current progress (%)</span>
                <input type="number" className="input-field" min="0" max="100" step="1" value={form.progress_percent} onChange={(event) => setForm((current) => ({ ...current, progress_percent: event.target.value }))} required />
                <span className="mt-1 block text-xs text-slate-500">Enter a number from 0 to 100.</span>
              </label>
              <label className="block min-w-0 sm:col-span-2">
                <span className="label">Notes <span className="font-normal normal-case tracking-normal">(optional)</span></span>
                <textarea className="input-field" placeholder="Add a short progress update or useful context" rows="2" maxLength={5000} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            <div className="flex justify-end">
              <button className="btn-emerald" disabled={saving || programs.rows.length === 0}>
                <Plus className="h-4 w-4" />{saving ? 'Saving…' : 'Add milestone'}
              </button>
            </div>
          </>}
        </form>}

        <section className="space-y-3" aria-label="SK milestones">
          {milestoneRows.length === 0 ? (
            <div className="card py-8 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
              <h3 className="mt-3 font-semibold text-civic-navy">No milestones yet</h3>
              <p className="mt-1 text-sm text-slate-500">{canEdit ? 'Add a milestone above to start tracking a program.' : 'Milestones will appear here when they are added.'}</p>
            </div>
          ) : milestoneRows.map((row) => {
            const progress = Math.max(0, Math.min(100, Number(row.progress_percent) || 0));
            const isOverdue = row.due_date && row.due_date < new Date().toISOString().slice(0, 10) && progress < 100;
            return <article key={row.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-civic-emerald">{row.programTitle}</p>
                  <h3 className="mt-1 font-semibold text-slate-800">{row.title}</h3>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isOverdue ? 'bg-rose-50 text-rose-700' : progress === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {isOverdue ? 'Overdue' : progress === 100 ? <><CheckCircle2 className="h-3.5 w-3.5" />Complete</> : progress === 0 ? 'Not started' : 'In progress'}
                </span>
              </div>
              {row.due_date && <p className={`text-sm ${isOverdue ? 'font-medium text-rose-700' : 'text-slate-500'}`}>Due {new Date(`${row.due_date}T00:00:00`).toLocaleDateString()}</p>}
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-medium text-slate-600">Progress</span>
                  <span className="font-semibold text-civic-navy">{progress}%</span>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label={`${row.title} progress`}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={progress}
                >
                  <div className="h-full rounded-full bg-civic-emerald transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
              {row.notes && <p className="text-sm text-slate-600">{row.notes}</p>}
              {canEdit && progress < 100 && <button className="btn-secondary py-1.5 text-xs" disabled={updatingId === row.id} onClick={() => updateProgress(row)}>
                <Check className="h-3.5 w-3.5" />{updatingId === row.id ? 'Updating…' : 'Add 10% progress'}
              </button>}
            </article>;
          })}
        </section>
      </div>}

      {tab === 'audit' && <AuditLogList
        rows={audit.rows.filter((row) => row.entity_table.startsWith('sk_') || (row.entity_table === 'program_milestones' && (row.after_data?.sk_program_id || row.before_data?.sk_program_id)))}
        loading={audit.loading}
        emptyMessage="No SK audit events yet."
      />}

      {tab === 'notifications' && <div className="card p-0 divide-y divide-slate-100 overflow-hidden">
        {notifications.rows.length === 0 ? <p className="p-5 text-sm text-slate-500">No notifications yet.</p> : notifications.rows.map((row) => <article key={row.id} className="flex flex-wrap justify-between gap-3 p-4"><div><h3 className={`font-semibold ${row.read_at ? 'text-slate-600' : 'text-civic-navy'}`}>{row.title}</h3><p className="mt-1 text-sm text-slate-600">{row.message}</p><p className="mt-1 text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</p></div>{!row.read_at && <button className="btn-secondary py-1.5 text-xs" onClick={() => markRead(row)}><Check className="h-3.5 w-3.5" />Mark read</button>}</article>)}
      </div>}
    </div>
  );
}