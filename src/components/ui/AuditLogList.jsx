import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

const ACTION_LABELS = {
  INSERT: 'Added',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
};

const ACTION_STYLES = {
  INSERT: 'bg-emerald-50 text-emerald-700',
  UPDATE: 'bg-amber-50 text-amber-700',
  DELETE: 'bg-rose-50 text-rose-700',
};

const TABLE_LABELS = {
  activity_calendar: 'Calendar activities',
  approval_requests: 'Approval requests',
  disaster_incidents: 'Disaster incidents',
  inventory_items: 'Property items',
  official_documents: 'Official documents',
  program_milestones: 'Project milestones',
  relief_distributions: 'Relief distributions',
  sk_budget: 'SK budget',
  sk_expenses: 'SK expenses',
  sk_fund_sources: 'SK funding sources',
  sk_programs: 'SK programs',
};

const formatLabel = (value = '') => value
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())
  .replace(/\bSk\b/g, 'SK');

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

function ChangeDetails({ data, emptyLabel }) {
  if (!data || !Object.keys(data).length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <dl className="space-y-2">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="grid gap-1 sm:grid-cols-[minmax(8rem,0.7fr)_minmax(0,1.3fr)]">
          <dt className="text-xs font-semibold text-slate-500">{formatLabel(key)}</dt>
          <dd className="break-words text-sm text-slate-700">{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AuditLogList({ rows, loading = false, emptyMessage = 'No audit events yet.' }) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const actions = useMemo(
    () => [...new Set(rows.map((row) => row.action).filter(Boolean))].sort(),
    [rows],
  );
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (actionFilter !== 'all' && row.action !== actionFilter) return false;
      if (!query) return true;
      return [
        row.action,
        row.entity_table,
        row.record_id,
        row.actor_role,
        JSON.stringify(row.before_data || {}),
        JSON.stringify(row.after_data || {}),
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [rows, search, actionFilter]);

  return (
    <section className="space-y-4" aria-label="Audit history">
      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-bold text-civic-navy">Audit history</h2>
          <p className="mt-1 text-sm text-slate-600">Review who changed records and what was updated.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="relative block">
            <span className="sr-only">Search audit history</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-9"
              type="search"
              placeholder="Search records or changes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="sr-only">Filter by action</span>
            <select className="input-field" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
              <option value="all">All actions</option>
              {actions.map((action) => <option key={action} value={action}>{ACTION_LABELS[action] || formatLabel(action)}</option>)}
            </select>
          </label>
        </div>
        {!loading && rows.length > 0 && (
          <p className="text-xs text-slate-500" aria-live="polite">
            Showing {filteredRows.length} of {rows.length} {rows.length === 1 ? 'event' : 'events'}
          </p>
        )}
      </div>

      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-civic-navy/10 bg-white shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-slate-500" role="status">Loading audit history…</p>
        ) : filteredRows.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">{rows.length ? 'No audit events match your search.' : emptyMessage}</p>
        ) : filteredRows.map((row) => (
          <article key={row.id} className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ACTION_STYLES[row.action] || 'bg-slate-100 text-slate-700'}`}>
                {ACTION_LABELS[row.action] || formatLabel(row.action)}
              </span>
              <h3 className="font-semibold text-slate-800">
                {TABLE_LABELS[row.entity_table] || formatLabel(row.entity_table)}
              </h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                Record {row.record_id || '—'}
              </span>
              <time className="ml-auto text-xs text-slate-500" dateTime={row.created_at}>
                {new Date(row.created_at).toLocaleString()}
              </time>
            </div>
            <p className="text-xs text-slate-500">{row.actor_role ? formatLabel(row.actor_role) : 'Official'}</p>
            <details className="group rounded-lg border border-slate-200 bg-slate-50">
              <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-civic-navy after:float-right after:content-['+'] group-open:after:content-['−']">
                View changes
              </summary>
              <div className="grid gap-4 border-t border-slate-200 p-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Before</h4>
                  <ChangeDetails data={row.before_data} emptyLabel="No previous values" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">After</h4>
                  <ChangeDetails data={row.after_data} emptyLabel="No new values" />
                </div>
              </div>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
