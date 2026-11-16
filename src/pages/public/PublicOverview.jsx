import { useParams, Link } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SystemLogo from '../../components/ui/SystemLogo';
import PublicMetricCard from '../../components/public/PublicMetricCard';
import { sumAmounts, sumActiveAmounts } from '../../lib/financial';
import { Building2, PieChart, FolderKanban, MessageSquare, Users, ShieldCheck, ArrowRight, CalendarDays, FileText, Siren, Package } from 'lucide-react';

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
  const { rows: skFunds, error: e4 } = useSupabaseTable('sk_fund_sources', barangay?.id);
  const { rows: skPrograms, error: e5 } = useSupabaseTable('sk_programs', barangay?.id);
  const { rows: skAllocations, error: e6 } = useSupabaseTable('sk_budget', barangay?.id);
  const { rows: skExpenses, error: e7 } = useSupabaseTable('sk_expenses', barangay?.id);
  const { rows: activities, error: e8 } = useSupabaseTable('activity_calendar', barangay?.id, { orderBy: 'starts_at', ascending: true });
  const { rows: documents, error: e9 } = useSupabaseTable('official_documents', barangay?.id, { orderBy: 'document_date' });
  const { rows: incidents, error: e10 } = useSupabaseTable('disaster_incidents', barangay?.id, { orderBy: 'incident_date' });
  const { rows: distributions, error: e11 } = useSupabaseTable('relief_distributions', barangay?.id, { orderBy: 'distributed_on' });

  if (bLoading) return <p role="status" className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm font-medium text-slate-500">Loading barangay profile…</p>;
  if (bError || !barangay) return <ErrorBanner message={bError || 'Barangay not found.'} />;

  const totalBudget = sumAmounts(allocations);
  const totalFunds = sumAmounts(funds);
  const totalSpent = sumActiveAmounts(expenses);
  const ongoingPrograms = programs.filter((p) => p.status === 'ongoing').length;
  const totalSkFunds = sumAmounts(skFunds);
  const totalSkBudget = sumAmounts(skAllocations);
  const totalSkExpenses = sumActiveAmounts(skExpenses);
  const remainingBudget = totalBudget - totalSpent;
  const spendPercentage = totalBudget > 0
    ? Math.min(100, Math.round((totalSpent / totalBudget) * 100))
    : 0;
  const publicStatus = totalBudget <= 0
    ? {
        tone: 'slate',
        title: 'No allocation published',
        message: 'A spending status will be available when a barangay budget allocation is published.',
      }
    : remainingBudget < 0
      ? {
        tone: 'rose',
        title: 'Budget watch',
        message: `Barangay spending is above the current recorded allocation by ${formatCurrency(Math.abs(remainingBudget))}.`,
      }
      : {
        tone: 'emerald',
        title: 'On track',
        message: `Barangay spending remains below the total recorded allocation by ${formatCurrency(remainingBudget)}.`,
      };
  const statusTone = {
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }[publicStatus.tone];

  return (
    <div className="space-y-7 sm:space-y-9">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-civic-navy via-[#153a59] to-civic-slate p-6 text-white shadow-lg sm:p-9">
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
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">{barangay.name}</h1>
              <p className="text-sm leading-relaxed text-blue-100/80">
                {[barangay.municipality, barangay.province].filter(Boolean).join(', ') || 'Official open data portal'}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-48">
            <Link to={`/b/${slug}/budget`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-civic-navy shadow-sm transition hover:bg-blue-50 focus-visible:outline-white">
              View budget & expenses <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to={`/b/${slug}/sk`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
              Visit SK portal <Users className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-civic-emerald">Budget transparency</p>
            <h2 className="mt-1 text-xl font-bold text-civic-navy">Barangay budget status</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">Spending compared with the total published barangay allocation.</p>
          </div>
          <Link to={`/b/${slug}/budget`} className="inline-flex items-center gap-1 text-sm font-semibold text-civic-emerald hover:text-emerald-800">
            See records <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className={`mt-5 rounded-2xl border p-4 sm:p-5 ${statusTone}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold">{publicStatus.title}</h3>
              <p className="mt-2 text-sm leading-relaxed">{publicStatus.message}</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              {publicStatus.tone === 'rose' ? 'Review' : publicStatus.tone === 'emerald' ? 'Within allocation' : 'Awaiting data'}
            </span>
          </div>
          {totalBudget > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
                <span>Allocation used</span>
                <span>{spendPercentage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/70" role="progressbar" aria-label="Budget allocation spent" aria-valuemin={0} aria-valuemax={100} aria-valuenow={spendPercentage}>
                <div className={`h-full rounded-full ${publicStatus.tone === 'rose' ? 'bg-rose-600' : 'bg-emerald-600'}`} style={{ width: `${spendPercentage}%` }} />
              </div>
            </div>
          )}
        </div>
      </section>

      <ErrorBanner message={e12 || e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10 || e11} />

      {/* Financial Summary */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-civic-emerald">Financial Summary</p>
          <h2 className="text-xl font-bold text-civic-navy mt-1">Published records at a glance</h2>
          <p className="text-sm text-slate-500 mt-1">The Barangay and SK figures are separated below so each amount has clear ownership.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-5 h-5 text-civic-navy" />
              <h3 className="font-bold text-civic-navy">Barangay Government</h3>
            </div>
            <div className="grid grid-cols-2 2xl:grid-cols-4 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">Funds sourced</span>
                <p className="whitespace-nowrap text-base font-extrabold text-civic-navy tabular-nums">
                  {formatCurrency(totalFunds)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">Budget allocated</span>
                <p className="whitespace-nowrap text-base font-extrabold text-civic-navy tabular-nums">
                  {formatCurrency(totalBudget)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">Expenses recorded</span>
                <p className="whitespace-nowrap text-base font-extrabold text-civic-navy tabular-nums">
                  {formatCurrency(totalSpent)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">Ongoing programs</span>
                <p className="text-xl font-extrabold text-civic-navy tabular-nums">{ongoingPrograms}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-emerald-200/70 pb-3">
              <Users className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-emerald-900">Sangguniang Kabataan (SK)</h3>
            </div>
            <div className="grid grid-cols-2 2xl:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-800">Funds sourced</span>
                <p className="whitespace-nowrap text-base font-extrabold text-emerald-900 tabular-nums">
                  {formatCurrency(totalSkFunds)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-800">Budget allocated</span>
                <p className="whitespace-nowrap text-base font-extrabold text-emerald-900 tabular-nums">
                  {formatCurrency(totalSkBudget)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-800">Expenses recorded</span>
                <p className="whitespace-nowrap text-base font-extrabold text-emerald-900 tabular-nums">
                  {formatCurrency(totalSkExpenses)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PublicMetricCard label="Barangay programs" value={programs.length} detail={`${ongoingPrograms} currently ongoing`} icon={FolderKanban} tone="blue" />
        <PublicMetricCard label="SK programs" value={skPrograms.length} detail="Youth programs published by the SK" icon={Users} />
        <PublicMetricCard label="Public access" value="Open to residents" detail="No account required to browse records" icon={ShieldCheck} tone="violet" />
      </div>

      <section className="space-y-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-civic-emerald">Community updates</p><h2 className="mt-1 text-xl font-bold text-civic-navy">Activities, documents, and response updates</h2><p className="mt-1 text-sm text-slate-500">Recent information published for residents.</p></div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card space-y-3"><h3 className="flex items-center gap-2 font-bold text-civic-navy"><CalendarDays className="h-4 w-4 text-civic-emerald" />Upcoming activities</h3>{activities.filter((item) => new Date(item.starts_at) >= new Date()).slice(0, 5).map((item) => <div key={item.id} className="border-t border-slate-100 pt-2"><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="text-xs text-slate-500">{new Date(item.starts_at).toLocaleString()}{item.location ? ` · ${item.location}` : ''}</p></div>)}{activities.filter((item) => new Date(item.starts_at) >= new Date()).length === 0 && <p className="text-sm text-slate-500">No upcoming public activities posted.</p>}</div>
          <div className="card space-y-3"><h3 className="flex items-center gap-2 font-bold text-civic-navy"><FileText className="h-4 w-4 text-civic-emerald" />Public documents</h3>{documents.filter((item) => item.is_public).slice(0, 5).map((item) => <div key={item.id} className="border-t border-slate-100 pt-2"><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="text-xs text-slate-500">{item.document_type} · {item.document_date || 'Undated'}</p>{item.document_url && <a className="text-xs font-semibold text-civic-emerald hover:underline" href={item.document_url} target="_blank" rel="noreferrer">Open document</a>}</div>)}{documents.filter((item) => item.is_public).length === 0 && <p className="text-sm text-slate-500">No public documents posted.</p>}</div>
          <div className="card space-y-3"><h3 className="flex items-center gap-2 font-bold text-civic-navy"><Siren className="h-4 w-4 text-amber-600" />Incident updates</h3>{incidents.filter((item) => item.is_public).slice(0, 4).map((item) => <div key={item.id} className="border-t border-slate-100 pt-2"><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="text-xs text-slate-500">{item.incident_type} · {item.status} · {item.incident_date}{item.location ? ` · ${item.location}` : ''}</p></div>)}{incidents.filter((item) => item.is_public).length === 0 && <p className="text-sm text-slate-500">No public incident updates posted.</p>}</div>
          <div className="card space-y-3"><h3 className="flex items-center gap-2 font-bold text-civic-navy"><Package className="h-4 w-4 text-civic-emerald" />Relief distributions</h3>{distributions.filter((item) => item.is_public).slice(0, 4).map((item) => <div key={item.id} className="border-t border-slate-100 pt-2"><p className="text-sm font-semibold text-slate-800">{item.item_name}: {item.quantity} {item.unit}</p><p className="text-xs text-slate-500">{item.distributed_on}{item.location ? ` · ${item.location}` : ''}</p></div>)}{distributions.filter((item) => item.is_public).length === 0 && <p className="text-sm text-slate-500">No relief distributions posted.</p>}</div>
        </div>
      </section>

      {/* Public Records Directory */}
      <div className="card space-y-4">
        <h2 className="text-lg font-bold text-civic-navy">Public Governance Transparency Portals</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            to={`/b/${slug}/budget`}
            className="p-5 rounded-xl border border-slate-200 hover:border-civic-emerald hover:bg-emerald-50/40 transition-all group flex items-start gap-4"
          >
            <div className="p-3 bg-emerald-100/60 text-civic-emerald rounded-xl group-hover:scale-105 transition-transform">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 group-hover:text-civic-navy text-sm flex items-center gap-1">
                Budget & Expenses Transparency <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-500 mt-1">Review itemized allocations, expense breakdown, and uploaded receipt documentation.</p>
            </div>
          </Link>

          <Link
            to={`/b/${slug}/programs`}
            className="p-5 rounded-xl border border-slate-200 hover:border-civic-emerald hover:bg-emerald-50/40 transition-all group flex items-start gap-4"
          >
            <div className="p-3 bg-blue-100/60 text-blue-700 rounded-xl group-hover:scale-105 transition-transform">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 group-hover:text-civic-navy text-sm flex items-center gap-1">
                Community Programs & Projects <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-500 mt-1">Track active projects, infrastructure initiatives, and resident beneficiaries.</p>
            </div>
          </Link>

          <Link
            to={`/b/${slug}/officials`}
            className="p-5 rounded-xl border border-slate-200 hover:border-civic-emerald hover:bg-emerald-50/40 transition-all group flex items-start gap-4"
          >
            <div className="p-3 bg-amber-100/60 text-amber-800 rounded-xl group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 group-hover:text-civic-navy text-sm flex items-center gap-1">
                Elected Officials Roster <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-500 mt-1">Meet your active Punong Barangay, Kagawads, and SK council members.</p>
            </div>
          </Link>

          <Link
            to={`/b/${slug}/feedback`}
            className="p-5 rounded-xl border border-slate-200 hover:border-civic-emerald hover:bg-emerald-50/40 transition-all group flex items-start gap-4"
          >
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl group-hover:scale-105 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 group-hover:text-civic-navy text-sm flex items-center gap-1">
                Submit Resident Feedback <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-500 mt-1">Directly submit community concerns, photos, or suggestions without account login.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
