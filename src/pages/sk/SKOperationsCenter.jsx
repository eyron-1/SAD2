import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { isSkEditor } from '../../utils/roles';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';
import { Activity, Bell, CalendarDays, Check, ClipboardList, Plus, ShieldCheck } from 'lucide-react';

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

  const programs = useSupabaseTable('sk_programs', profile?.barangay_id);
  const milestones = useSupabaseTable('program_milestones', profile?.barangay_id, { orderBy: 'due_date', ascending: true });
  const audit = useSupabaseTable('audit_logs', profile?.barangay_id);
  const notifications = useSupabaseTable('notifications', profile?.barangay_id, { filter: { user_id: user?.id } });
  const queryError = [programs.error, milestones.error, audit.error, notifications.error].find(Boolean);

  const completedCount = milestones.rows.filter((row) => row.progress_percent === 100).length;
  const averageProgress = milestones.rows.length
    ? Math.round(milestones.rows.reduce((sum, row) => sum + Number(row.progress_percent || 0), 0) / milestones.rows.length)
    : 0;
  const overdueCount = milestones.rows.filter((row) => row.due_date && row.due_date < new Date().toISOString().slice(0, 10) && row.progress_percent < 100).length;
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
    const progress = Math.min(100, row.progress_percent + 10);
    const result = await milestones.updateRow(row.id, {
      progress_percent: progress,
      status: progress === 100 ? 'complete' : 'in_progress',
    });
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
        {canEdit && <form onSubmit={createMilestone} className="card space-y-4">
          <h2 className="flex items-center gap-2 font-bold text-civic-navy"><Plus className="h-4 w-4 text-civic-emerald" />Add an SK milestone</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block"><span className="label">SK program</span><select className="input-field" value={form.sk_program_id} onChange={(event) => setForm({ ...form, sk_program_id: event.target.value })} required><option value="">Select an SK program</option>{programs.rows.map((program) => <option key={program.id} value={program.id}>{program.title}</option>)}</select></label>
            <label className="block"><span className="label">Milestone</span><input className="input-field" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={200} required /></label>
            <label className="block"><span className="label">Due date</span><input type="date" className="input-field" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} /></label>
            <label className="block"><span className="label">Progress (%)</span><input type="number" className="input-field" min="0" max="100" step="1" value={form.progress_percent} onChange={(event) => setForm({ ...form, progress_percent: event.target.value })} required /></label>
            <label className="block sm:col-span-2"><span className="label">Update notes</span><textarea className="input-field" rows="2" maxLength={5000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
          </div>
          <div className="flex justify-end"><button className="btn-emerald" disabled={saving}><Plus className="h-4 w-4" />{saving ? 'Saving…' : 'Save SK milestone'}</button></div>
        </form>}

        <div className="card p-0 divide-y divide-slate-100 overflow-hidden">
          {milestoneRows.length === 0 ? <p className="p-5 text-sm text-slate-500">No SK milestones yet.</p> : milestoneRows.map((row) => <article key={row.id} className="space-y-2 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-800">{row.title}</h3><Badge status={row.status} /></div>
            <p className="text-xs text-slate-500">{row.programTitle}{row.due_date ? ` · Due ${row.due_date}` : ''}</p>
            <div className="h-2 max-w-xl overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-civic-emerald" style={{ width: `${row.progress_percent}%` }} /></div>
            <p className="text-xs font-semibold text-civic-navy">{row.progress_percent}% complete</p>
            {row.notes && <p className="text-sm text-slate-600">{row.notes}</p>}
            {canEdit && row.progress_percent < 100 && <button className="btn-secondary py-1.5 text-xs" onClick={() => updateProgress(row)}><Check className="h-3.5 w-3.5" />Update progress +10%</button>}
          </article>)}
        </div>
      </div>}

      {tab === 'audit' && <div className="card p-0 divide-y divide-slate-100 overflow-hidden">
        {audit.rows.filter((row) => row.entity_table.startsWith('sk_') || (row.entity_table === 'program_milestones' && (row.after_data?.sk_program_id || row.before_data?.sk_program_id))).length === 0
          ? <p className="p-5 text-sm text-slate-500">No SK audit events yet.</p>
          : audit.rows.filter((row) => row.entity_table.startsWith('sk_') || (row.entity_table === 'program_milestones' && (row.after_data?.sk_program_id || row.before_data?.sk_program_id))).map((row) => <article key={row.id} className="flex flex-wrap items-center gap-2 p-4"><Badge status={row.action.toLowerCase()} /><span className="text-sm font-semibold text-slate-800">{row.entity_table}</span><span className="text-xs text-slate-500">Record {row.record_id || '—'}</span><span className="ml-auto text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</span><details className="basis-full text-xs text-slate-500"><summary className="cursor-pointer">View change details</summary><pre className="mt-2 whitespace-pre-wrap break-all">{JSON.stringify({ before: row.before_data, after: row.after_data }, null, 2)}</pre></details></article>)}
      </div>}

      {tab === 'notifications' && <div className="card p-0 divide-y divide-slate-100 overflow-hidden">
        {notifications.rows.length === 0 ? <p className="p-5 text-sm text-slate-500">No notifications yet.</p> : notifications.rows.map((row) => <article key={row.id} className="flex flex-wrap justify-between gap-3 p-4"><div><h3 className={`font-semibold ${row.read_at ? 'text-slate-600' : 'text-civic-navy'}`}>{row.title}</h3><p className="mt-1 text-sm text-slate-600">{row.message}</p><p className="mt-1 text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</p></div>{!row.read_at && <button className="btn-secondary py-1.5 text-xs" onClick={() => markRead(row)}><Check className="h-3.5 w-3.5" />Mark read</button>}</article>)}
      </div>}
    </div>
  );
}