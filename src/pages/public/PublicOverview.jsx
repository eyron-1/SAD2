import { useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../hooks/usePublicBarangay';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SystemLogo from '../../components/ui/SystemLogo';
import PublicMetricCard from '../../components/public/PublicMetricCard';
import { sumAmounts, sumActiveAmounts } from '../../lib/financial';
import { FolderKanban, Landmark, PieChart, Receipt, CalendarDays, Siren, Package, ShieldCheck, ArrowUpRight } from 'lucide-react';

const formatCurrency = (value) => new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

export default function PublicOverview() {
  const { slug } = useParams();
  const { barangay, loading: bLoading, error: bError } = usePublicBarangay(slug);
  const { rows: funds, error: e12 } = useSupabaseTable('fund_sources', barangay?.id);
  const { rows: allocations, error: e1 } = useSupabaseTable('budget_allocations', barangay?.id);
  const { rows: expenses, error: e2 } = useSupabaseTable('expenses', barangay?.id);
  const { rows: programs, error: e3 } = useSupabaseTable('programs', barangay?.id);
  const { rows: activities, error: e8 } = useSupabaseTable('activity_calendar', barangay?.id, { orderBy: 'starts_at', ascending: true });
  const { rows: incidents, error: e10 } = useSupabaseTable('disaster_incidents', barangay?.id, { orderBy: 'incident_date' });
  const { rows: distributions, error: e11 } = useSupabaseTable('relief_distributions', barangay?.id, { orderBy: 'distributed_on' });

  if (bLoading) return <p role="status" className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm font-medium text-slate-500">Loading barangay profile…</p>;
  if (bError || !barangay) return <ErrorBanner message={bError || 'Barangay not found.'} />;

  const totalBudget = sumAmounts(allocations);
  const totalFunds = sumAmounts(funds);
  const totalSpent = sumActiveAmounts(expenses);
  const ongoingPrograms = programs.filter((p) => p.status === 'ongoing').length;
  const upcomingActivities = activities.filter((item) => new Date(item.starts_at) >= new Date()).slice(0, 4);
  const publicIncidents = incidents.filter((item) => item.is_public).slice(0, 4);
  const publicDistributions = distributions.filter((item) => item.is_public).slice(0, 4);
  const utilization = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  return (
    <div className="space-y-7 sm:space-y-9">
      <section className="relative overflow-hidden rounded-3xl border border-civic-navy/10 bg-gradient-to-br from-civic-navy via-[#153a59] to-civic-slate p-6 text-white shadow-[0_16px_40px_-20px_rgba(15,45,74,0.55)] sm:p-9">
        <div className="pointer-events-none absolute -right-14 -top-20 h-64 w-64 rounded-full border-[36px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-52 w-52 rounded-full bg-civic-emerald/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1 sm:h-20 sm:w-20">
              {barangay.logo_url ? <img src={barangay.logo_url} alt={`${barangay.name} logo`} className="h-full w-full rounded-xl object-cover" /> : <SystemLogo className="h-full w-full rounded-xl object-cover" />}
            </div>
            <div className="min-w-0 space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Public transparency dashboard
              </div>
              <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">{barangay.name}</h1>
              <p className="text-sm leading-relaxed text-blue-100/80">
                {[barangay.municipality, barangay.province].filter(Boolean).join(', ') || 'Official open data portal'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <ErrorBanner message={e12 || e1 || e2 || e3 || e8 || e10 || e11} />

      <section aria-label="Barangay public summary" className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-civic-emerald">Financial and community snapshot</p>
          <h2 className="mt-1 text-xl font-bold text-civic-navy">Barangay activity at a glance</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PublicMetricCard label="Funds sourced" value={formatCurrency(totalFunds)} detail={`${funds.length} published ${funds.length === 1 ? 'source' : 'sources'}`} icon={Landmark} tone="violet" />
          <PublicMetricCard label="Budget allocated" value={formatCurrency(totalBudget)} detail={`${allocations.length} published ${allocations.length === 1 ? 'allocation' : 'allocations'}`} icon={PieChart} tone="blue" />
          <PublicMetricCard label="Expenses recorded" value={formatCurrency(totalSpent)} detail={`${expenses.length} expense ${expenses.length === 1 ? 'record' : 'records'}`} icon={Receipt} tone="amber" />
          <PublicMetricCard label="Ongoing programs" value={ongoingPrograms} detail={`${programs.length} published ${programs.length === 1 ? 'program' : 'programs'}`} icon={FolderKanban} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]" aria-label="Upcoming activities and budget status">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-civic-emerald">Community calendar</p>
              <h2 className="mt-1 text-xl font-bold text-civic-navy">Upcoming activities</h2>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CalendarDays className="h-5 w-5" /></span>
          </div>
          <div className="mt-5 divide-y divide-slate-100">
            {upcomingActivities.map((item) => (
              <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-bold text-slate-800">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(item.starts_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                  {item.location ? ` · ${item.location}` : ''}
                </p>
              </div>
            ))}
            {upcomingActivities.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No upcoming public activities posted.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-civic-navy/10 bg-gradient-to-br from-civic-navy to-civic-slate p-5 text-white shadow-sm sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-200">Budget status</p>
              <h2 className="mt-1 font-display text-xl font-bold">{utilization}% utilized</h2>
            </div>
            <ArrowUpRight className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${utilization}%` }} /></div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-blue-200/70">Expenses</p><p className="mt-1 font-bold tabular-nums">{formatCurrency(totalSpent)}</p></div>
            <div><p className="text-blue-200/70">Allocated</p><p className="mt-1 font-bold tabular-nums">{formatCurrency(totalBudget)}</p></div>
          </div>
          <p className="mt-5 border-t border-white/10 pt-4 text-xs text-blue-100/80">Based on published allocations and recorded expenses.</p>
        </article>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-civic-emerald">Public updates</p>
          <h2 className="mt-1 text-xl font-bold text-civic-navy">Community response and support</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="flex items-center gap-2 font-bold text-civic-navy"><Siren className="h-4 w-4 text-amber-600" />Incident updates</h3>
            <div className="mt-4 space-y-3">
              {publicIncidents.map((item) => (
                <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.incident_type} · {item.status} · {item.incident_date}{item.location ? ` · ${item.location}` : ''}</p>
                </div>
              ))}
              {publicIncidents.length === 0 && <p className="text-sm text-slate-500">No public incident updates posted.</p>}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="flex items-center gap-2 font-bold text-civic-navy"><Package className="h-4 w-4 text-civic-emerald" />Relief distributions</h3>
            <div className="mt-4 space-y-3">
              {publicDistributions.map((item) => (
                <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">{item.item_name}: {item.quantity} {item.unit}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.distributed_on}{item.location ? ` · ${item.location}` : ''}</p>
                </div>
              ))}
              {publicDistributions.length === 0 && <p className="text-sm text-slate-500">No relief distributions posted.</p>}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
