import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { supabase } from '../../lib/supabaseClient';
import { isBarangayEditor } from '../../utils/roles';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';
import {
  Activity, Archive, CalendarDays, Check, ClipboardCheck, Download,
  FileText, Package, Plus, ShieldCheck, Siren, Trash2, X,
} from 'lucide-react';

const TABS = [
  { id: 'approvals', label: 'Approvals', icon: ClipboardCheck },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'projects', label: 'Project milestones', icon: Activity },
  { id: 'inventory', label: 'Property', icon: Package },
  { id: 'relief', label: 'Disaster response', icon: Siren },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'backup', label: 'Backup', icon: Archive },
];

const INITIAL_FORM = {
  title: '', details: '', request_type: 'expense', amount: '', starts_at: '',
  location: '', is_public: true, program_id: '', due_date: '', progress_percent: 0,
  item_name: '', category: '', quantity: 1, unit: 'unit', condition: 'good',
  acquired_on: '', estimated_value: '', incident_type: 'Flood', incident_date: new Date().toISOString().slice(0, 10),
  incident_id: '', distributed_on: new Date().toISOString().slice(0, 10),
  document_type: 'minutes', document_date: new Date().toISOString().slice(0, 10),
  document_url: '', summary: '',
};

const formatCurrency = (amount) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 2,
}).format(Number(amount || 0));

function TextField({ name, label, type = 'text', value, onChange, ...props }) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      <input className="input-field" name={name} type={type} value={value ?? ''} onChange={onChange} {...props} />
    </label>
  );
}

function SelectField({ name, label, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      <select className="input-field" name={name} value={value ?? ''} onChange={onChange}>
        {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    </label>
  );
}

export default function OperationsCenter() {
  const { profile, user } = useAuth();
  const canEdit = isBarangayEditor(profile?.role);
  const tabs = TABS.filter(({ id }) => canEdit || !['inventory', 'backup'].includes(id));
  const [tab, setTab] = useState('approvals');
  const [form, setForm] = useState(INITIAL_FORM);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const approvals = useSupabaseTable('approval_requests', profile?.barangay_id);
  const activities = useSupabaseTable('activity_calendar', profile?.barangay_id, { orderBy: 'starts_at', ascending: true });
  const programs = useSupabaseTable('programs', profile?.barangay_id);
  const milestones = useSupabaseTable('program_milestones', profile?.barangay_id, { orderBy: 'due_date', ascending: true });
  const inventory = useSupabaseTable('inventory_items', profile?.barangay_id);
  const incidents = useSupabaseTable('disaster_incidents', profile?.barangay_id, { orderBy: 'incident_date' });
  const distributions = useSupabaseTable('relief_distributions', profile?.barangay_id, { orderBy: 'distributed_on' });
  const documents = useSupabaseTable('official_documents', profile?.barangay_id, { orderBy: 'document_date' });

  const queryError = [
    approvals.error, activities.error, programs.error, milestones.error, inventory.error,
    incidents.error, distributions.error, documents.error,
  ].find(Boolean);

  const setField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => setForm(INITIAL_FORM);
  const closeForm = () => {
    resetForm();
    setIsFormOpen(false);
  };

  const createRecord = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    const requiredFields = {
      approvals: ['title', 'details'],
      calendar: ['title', 'starts_at'],
      projects: ['program_id', 'title', 'progress_percent'],
      inventory: ['item_name', 'category', 'quantity'],
      relief: form.incident_type === 'distribution' ? ['item_name', 'quantity', 'distributed_on'] : ['title', 'incident_date'],
      documents: ['title'],
    }[tab] || [];
    if (requiredFields.some((fieldName) => String(form[fieldName] ?? '').trim() === '')) {
      setError('Complete all required fields before saving.');
      return;
    }
    setSaving(true);
    let result;
    const created_by = user.id;

    if (tab === 'approvals') {
      result = await approvals.insertRow({
        request_type: form.request_type,
        title: form.title.trim(),
        details: form.details.trim(),
        amount: form.amount === '' ? null : Number(form.amount),
        created_by,
      });
    } else if (tab === 'calendar') {
      result = await activities.insertRow({
        title: form.title.trim(), description: form.details.trim(),
        starts_at: new Date(form.starts_at).toISOString(), ends_at: null,
        location: form.location.trim(), is_public: form.is_public, created_by,
      });
    } else if (tab === 'projects') {
      const progress = Number(form.progress_percent);
      result = await milestones.insertRow({
        program_id: form.program_id,
        title: form.title.trim(), due_date: form.due_date || null,
        progress_percent: progress, status: progress === 100 ? 'complete' : progress > 0 ? 'in_progress' : 'pending',
        notes: form.details.trim(), created_by,
      });
    } else if (tab === 'inventory') {
      result = await inventory.insertRow({
        item_name: form.item_name.trim(), category: form.category.trim(), quantity: Number(form.quantity),
        unit: form.unit.trim() || 'unit', condition: form.condition, location: form.location.trim(),
        acquired_on: form.acquired_on || null, estimated_value: Number(form.estimated_value || 0),
        notes: form.details.trim(), created_by,
      });
    } else if (tab === 'relief' && form.incident_type !== 'distribution') {
      result = await incidents.insertRow({
        title: form.title.trim(), incident_type: form.incident_type, status: 'active',
        incident_date: form.incident_date, location: form.location.trim(), details: form.details.trim(),
        is_public: form.is_public, created_by,
      });
    } else if (tab === 'relief') {
      result = await distributions.insertRow({
        incident_id: form.incident_id || null, item_name: form.item_name.trim(),
        quantity: Number(form.quantity), unit: form.unit.trim() || 'pack',
        distributed_on: form.distributed_on, location: form.location.trim(), notes: form.details.trim(),
        is_public: form.is_public, created_by,
      });
    } else if (tab === 'documents') {
      result = await documents.insertRow({
        title: form.title.trim(), document_type: form.document_type,
        document_date: form.document_date || null, summary: form.summary.trim(),
        document_url: form.document_url.trim() || null, is_public: form.is_public, created_by,
      });
    }

    setSaving(false);
    if (result?.error) setError(result.error);
    else {
      setNotice('Record saved.');
      resetForm();
      setIsFormOpen(false);
    }
  };

  const decideRequest = async (request, status) => {
    const decision_note = status === 'rejected' ? (window.prompt('Reason for rejection (optional):') || '') : '';
    const { error: updateError } = await supabase.from('approval_requests')
      .update({ status, decision_note }).eq('id', request.id).eq('barangay_id', profile.barangay_id);
    if (updateError) setError(updateError.message);
    else {
      setNotice(`Request ${status}.`);
      approvals.refetch();
      notifications.refetch();
    }
  };

  const updateRecord = async (api, row, changes) => {
    const result = await api.updateRow(row.id, changes);
    if (result.error) setError(result.error);
  };

  const deleteRecord = async (api, id) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    const result = await api.deleteRow(id);
    if (result.error) setError(result.error);
    else setNotice('Record deleted.');
  };

  const exportBackup = async () => {
    setError('');
    const tableNames = [
      'fund_sources', 'budget_allocations', 'expenses', 'programs', 'program_milestones',
      'officials_transitions',
      'activity_calendar', 'inventory_items', 'disaster_incidents', 'relief_distributions',
      'official_documents', 'approval_requests', 'audit_logs',
    ];
    const responses = await Promise.all(tableNames.map(async (tableName) => {
      const { data, error: requestError } = await supabase.from(tableName).select('*').eq('barangay_id', profile.barangay_id);
      return { tableName, data, error: requestError };
    }));
    const failed = responses.find((response) => response.error);
    if (failed) {
      setError(`Backup could not read ${failed.tableName}: ${failed.error.message}`);
      return;
    }
    const snapshot = {
      format: 'barangay-transparency-backup-v1',
      barangay_id: profile.barangay_id,
      exported_at: new Date().toISOString(),
      tables: Object.fromEntries(responses.map(({ tableName, data }) => [tableName, data || []])),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `barangay-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Tenant-scoped backup exported. Store it in an access-controlled location.');
  };

  const renderForm = () => {
    if (tab === 'projects' && !programs.rows.length) return <p className="text-sm text-slate-500">Add a Barangay program before creating milestones.</p>;
    if (!isFormOpen) return null;
    if (tab === 'backup') return null;
    if (!canEdit && tab !== 'approvals') return null;

    const text = (name, label, type = 'text', props = {}) => <TextField key={name} name={name} label={label} type={type} value={form[name]} onChange={setField} {...props} />;
    const select = (name, label, options) => <SelectField key={name} name={name} label={label} value={form[name]} onChange={setField} options={options} />;
    const notes = (name, label = 'Details') => <label className="block sm:col-span-2"><span className="label">{label}</span><textarea name={name} value={form[name]} onChange={setField} rows="3" maxLength="5000" className="input-field" /></label>;
    const publish = <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="is_public" checked={form.is_public} onChange={setField} /> Publish public summary</label>;
    let fields = null;

    if (tab === 'approvals') fields = <div className="grid sm:grid-cols-2 gap-3">{select('request_type', 'Request type', [['expense', 'Expense'], ['budget', 'Budget'], ['procurement', 'Procurement'], ['document', 'Document'], ['other', 'Other']])}{text('title', 'Request title', 'text', { required: true, maxLength: 200 })}{text('amount', 'Amount (PHP)', 'number', { min: 0, step: '0.01' })}{notes('details', 'Supporting details')}</div>;
    if (tab === 'calendar') fields = <div className="grid sm:grid-cols-2 gap-3">{text('title', 'Activity', 'text', { required: true, maxLength: 200 })}{text('starts_at', 'Starts at', 'datetime-local', { required: true })}{text('location', 'Location')}{publish}{notes('details')}</div>;
    if (tab === 'projects') {
      fields = <div className="grid sm:grid-cols-2 gap-3">{select('program_id', 'Barangay program', [['', 'Choose a program'], ...programs.rows.map((program) => [program.id, program.title])])}{text('title', 'Milestone', 'text', { required: true, maxLength: 200 })}{text('due_date', 'Due date', 'date')}{text('progress_percent', 'Progress (%)', 'number', { min: 0, max: 100, step: 1, required: true })}{notes('details', 'Progress notes')}</div>;
    }
    if (tab === 'inventory') fields = <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{text('item_name', 'Property / item', 'text', { required: true, maxLength: 200 })}{text('category', 'Category', 'text', { required: true })}{text('quantity', 'Quantity', 'number', { min: 0, step: '0.01', required: true })}{text('unit', 'Unit')}{select('condition', 'Condition', [['new', 'New'], ['good', 'Good'], ['fair', 'Fair'], ['poor', 'Poor'], ['disposed', 'Disposed']])}{text('location', 'Location')}{text('acquired_on', 'Acquired on', 'date')}{text('estimated_value', 'Estimated value (PHP)', 'number', { min: 0, step: '0.01' })}{text('details', 'Notes')}</div>;
    if (tab === 'relief') fields = <div className="grid sm:grid-cols-2 gap-3">{select('incident_type', 'Record type', [['Flood', 'Flood incident'], ['Typhoon', 'Typhoon incident'], ['Fire', 'Fire incident'], ['Earthquake', 'Earthquake incident'], ['Other', 'Other incident'], ['distribution', 'Relief distribution']])}{form.incident_type !== 'distribution' ? <>{text('title', 'Incident name', 'text', { required: true, maxLength: 200 })}{text('incident_date', 'Incident date', 'date', { required: true })}{text('location', 'Affected area')}{notes('details', 'Situation / response notes')}</> : <>{select('incident_id', 'Related incident', [['', 'No linked incident'], ...incidents.rows.map((incident) => [incident.id, incident.title])])}{text('item_name', 'Relief item', 'text', { required: true })}{text('quantity', 'Quantity', 'number', { min: 0.01, step: '0.01', required: true })}{text('unit', 'Unit', 'text', { required: true })}{text('distributed_on', 'Distribution date', 'date', { required: true })}{text('location', 'Distribution site')}{notes('details', 'Notes')}</>}{publish}</div>;
    if (tab === 'documents') fields = <div className="grid sm:grid-cols-2 gap-3">{text('title', 'Document title', 'text', { required: true, maxLength: 200 })}{select('document_type', 'Document type', [['minutes', 'Meeting minutes'], ['resolution', 'Resolution'], ['ordinance', 'Ordinance'], ['memo', 'Memo'], ['report', 'Report'], ['other', 'Other']])}{text('document_date', 'Document date', 'date')}{text('document_url', 'HTTPS file URL', 'url', { pattern: 'https://.*', placeholder: 'https://…' })}{notes('summary', 'Summary')}{publish}</div>;

    return (
      <form onSubmit={createRecord} className="card space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-civic-navy">New record</h2><button type="button" onClick={closeForm} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Cancel</button></div>
        {fields}
        <div className="flex justify-end"><button className="btn-emerald" disabled={saving}><Plus className="h-4 w-4" />{saving ? 'Saving…' : 'Save record'}</button></div>
      </form>
    );
  };

  const renderRows = (rows, renderRow, api, deletable = canEdit) => (
    <div className="card p-0 divide-y divide-slate-100 overflow-hidden">
      {rows.length === 0 ? <p className="p-5 text-sm text-slate-500">No records yet.</p> : rows.map((row) => (
        <article key={row.id} className="flex items-start justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0 flex-1">{renderRow(row)}</div>
          {deletable && <button type="button" title="Delete record" onClick={() => deleteRecord(api, row.id)} className="p-2 rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
        </article>
      ))}
    </div>
  );

  const renderContent = () => {
    if (tab === 'approvals') return renderRows(approvals.rows, (row) => <div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-800">{row.title}</h3><Badge status={row.status} /><span className="text-xs capitalize text-slate-500">{row.request_type}</span></div><p className="text-sm text-slate-600 whitespace-pre-wrap">{row.details}</p>{row.amount !== null && <p className="text-sm font-semibold text-civic-navy">{formatCurrency(row.amount)}</p>}<p className="text-xs text-slate-400">Submitted {new Date(row.created_at).toLocaleString()}</p>{canEdit && row.status === 'pending' && <div className="flex gap-2"><button className="btn-emerald py-1.5 text-xs" onClick={() => decideRequest(row, 'approved')}><Check className="h-3.5 w-3.5" />Approve</button><button className="btn-secondary py-1.5 text-xs" onClick={() => decideRequest(row, 'rejected')}><X className="h-3.5 w-3.5" />Reject</button></div>}{row.decision_note && <p className="text-xs text-slate-500">Decision note: {row.decision_note}</p>}</div>, approvals, false);

    if (tab === 'calendar') return renderRows(activities.rows, (row) => <div><div className="flex items-center gap-2"><h3 className="font-semibold text-slate-800">{row.title}</h3>{row.is_public && <Badge status="published" />}</div><p className="text-sm text-slate-500">{new Date(row.starts_at).toLocaleString()}{row.location ? ` · ${row.location}` : ''}</p>{row.description && <p className="mt-1 text-sm text-slate-600">{row.description}</p>}</div>, activities);

    if (tab === 'projects') return renderRows(milestones.rows, (row) => {
      const program = programs.rows.find((item) => item.id === row.program_id);
      return <div className="space-y-2"><div className="flex items-center gap-2"><h3 className="font-semibold text-slate-800">{row.title}</h3><Badge status={row.status} /></div><p className="text-xs text-slate-500">{program?.title || 'Program'}{row.due_date ? ` · Due ${row.due_date}` : ''}</p><div className="h-2 max-w-xl overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-civic-emerald" style={{ width: `${row.progress_percent}%` }} /></div><p className="text-xs font-semibold text-civic-navy">{row.progress_percent}% complete</p>{row.notes && <p className="text-sm text-slate-600">{row.notes}</p>}{canEdit && row.progress_percent < 100 && <button className="btn-secondary py-1.5 text-xs" onClick={() => updateRecord(milestones, row, { progress_percent: Math.min(100, row.progress_percent + 10), status: row.progress_percent >= 90 ? 'complete' : 'in_progress' })}>Update progress +10%</button>}</div>;
    }, milestones);

    if (tab === 'inventory') return renderRows(inventory.rows, (row) => <div className="flex flex-wrap justify-between gap-4"><div><h3 className="font-semibold text-slate-800">{row.item_name}</h3><p className="text-sm text-slate-500">{row.category} · {row.quantity} {row.unit} · {row.condition}{row.location ? ` · ${row.location}` : ''}</p>{row.estimated_value > 0 && <p className="mt-1 text-xs text-slate-500">Estimated value {formatCurrency(row.estimated_value)}</p>}</div>{canEdit && <label className="text-xs text-slate-500">Quantity<input aria-label={`Quantity for ${row.item_name}`} type="number" min="0" step="0.01" className="input-field mt-1 w-28" value={row.quantity} onChange={(event) => updateRecord(inventory, row, { quantity: Number(event.target.value) })} /></label>}</div>, inventory);

    if (tab === 'relief') return <div className="space-y-5"><section><h2 className="mb-3 font-bold text-civic-navy">Incident log</h2>{renderRows(incidents.rows, (row) => <div><div className="flex items-center gap-2"><h3 className="font-semibold text-slate-800">{row.title}</h3><Badge status={row.status} />{row.is_public && <Badge status="published" />}</div><p className="text-sm text-slate-500">{row.incident_type} · {row.incident_date}{row.location ? ` · ${row.location}` : ''}</p><p className="mt-1 text-sm text-slate-600">{row.details}</p>{canEdit && row.status !== 'closed' && <button className="btn-secondary mt-2 py-1.5 text-xs" onClick={() => updateRecord(incidents, row, { status: 'closed' })}>Close incident</button>}</div>, incidents)}</section><section><h2 className="mb-3 font-bold text-civic-navy">Relief distributions</h2>{renderRows(distributions.rows, (row) => <div><h3 className="font-semibold text-slate-800">{row.item_name}: {row.quantity} {row.unit}</h3><p className="text-sm text-slate-500">{row.distributed_on}{row.location ? ` · ${row.location}` : ''}{row.is_public ? ' · Public summary' : ''}</p>{row.notes && <p className="mt-1 text-sm text-slate-600">{row.notes}</p>}</div>, distributions)}</section></div>;

    if (tab === 'documents') return renderRows(documents.rows, (row) => <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-800">{row.title}</h3><Badge status={row.document_type} />{row.is_public && <Badge status="published" />}</div><p className="text-sm text-slate-500">{row.document_date || 'Undated'}{row.summary ? ` · ${row.summary}` : ''}</p>{row.document_url && <a className="mt-2 inline-flex text-sm font-semibold text-civic-emerald hover:underline" href={row.document_url} target="_blank" rel="noreferrer">Open document</a>}{canEdit && <button className="btn-secondary ml-2 mt-2 py-1.5 text-xs" onClick={() => updateRecord(documents, row, { is_public: !row.is_public })}>{row.is_public ? 'Make private' : 'Publish'}</button>}</div>, documents);

    return <div className="card space-y-3"><h2 className="text-lg font-bold text-civic-navy">Tenant backup</h2><p className="text-sm text-slate-600">Export a JSON snapshot of this barangay’s financial data, projects, operations, approvals, and audit history.</p><button onClick={exportBackup} className="btn-emerald"><Download className="h-4 w-4" />Download JSON backup</button><p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Store exports securely. Recovery must be performed by an authorized database administrator; this client cannot safely restore rows using the public API key.</p></div>;
  };

  return (
    <div className="max-w-6xl space-y-6">
      <header><h1 className="flex items-center gap-3 text-3xl font-bold text-civic-navy"><ShieldCheck className="h-8 w-8 text-civic-emerald" />Operations & Accountability</h1><p className="mt-1 text-sm text-slate-600">Approvals, project delivery, public activities, property, preparedness, records, and audit history.</p></header>
      <ErrorBanner message={error || queryError} />
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      <nav aria-label="Operations sections" className="overflow-x-auto border-b border-slate-200"><div className="flex min-w-max gap-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setTab(id); closeForm(); setError(''); }} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${tab === id ? 'border-civic-emerald text-civic-navy' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Icon className="h-4 w-4" />{label}{id === 'notifications' && notifications.rows.some((row) => !row.read_at) && <span className="h-2 w-2 rounded-full bg-rose-500" />}</button>)}</div></nav>
      {!isFormOpen && tab !== 'backup' && (canEdit || tab === 'approvals') && !(tab === 'projects' && !programs.rows.length) && <button type="button" onClick={() => setIsFormOpen(true)} className="btn-emerald"><Plus className="h-4 w-4" />Add a record</button>}
      {renderForm()}
      {renderContent()}
    </div>
  );
}