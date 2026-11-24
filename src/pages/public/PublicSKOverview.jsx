import { useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../hooks/usePublicBarangay';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import PublicMetricCard from '../../components/public/PublicMetricCard';
import { sumAmounts, sumActiveAmounts } from '../../lib/financial';
import { FolderKanban, Landmark, PieChart, Receipt, Users, CalendarDays, ArrowUpRight } from 'lucide-react';

export default function PublicSKOverview() {
  const { slug } = useParams();
  const { barangay, loading: barangayLoading, error: barangayError } = usePublicBarangay(slug);
  const { rows: funds, error: fundsError } = useSupabaseTable('sk_fund_sources', barangay?.id);
  const { rows: allocations, error: allocationsError } = useSupabaseTable('sk_budget', barangay?.id);
  const { rows: expenses, error: expensesError } = useSupabaseTable('sk_expenses', barangay?.id);
  const { rows: programs, error: programsError } = useSupabaseTable('sk_programs', barangay?.id);

  if (barangayLoading) return <p role="status" className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm font-medium text-slate-500">Loading SK youth portal…</p>;
  if (barangayError || !barangay) return <ErrorBanner message={barangayError || 'Barangay not found.'} />;

  const totalFunds = sumAmounts(funds);
  const totalBudget = sumAmounts(allocations);
  const totalExpenses = sumActiveAmounts(expenses);
  const activePrograms = programs.filter((row) => row.status === 'ongoing').length;
  const recentPrograms = [...programs]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 3);
  const utilization = totalBudget > 0 ? Math.min(100, Math.round((totalExpenses / totalBudget) * 100)) : 0;
  const formatCurrency = (value) => new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

  return (
    <div className="space-y-7 sm:space-y-9">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-civic-navy p-6 text-white shadow-lg sm:p-9">
        <div className="pointer-events-none absolute -right-14 -top-20 h-64 w-64 rounded-full border-[36px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-52 w-52 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {barangay.sk_logo_url ? <img src={barangay.sk_logo_url} alt={`${barangay.name} SK logo`} className="h-16 w-16 shrink-0 rounded-2xl border border-white/20 bg-white/10 object-cover p-1 sm:h-20 sm:w-20" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 sm:h-20 sm:w-20"><Users className="h-9 w-9 text-emerald-200" /></div>}
            <div className="min-w-0 space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100">Sangguniang Kabataan · Public dashboard</span>
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">{barangay.name} SK</h1>
              <p className="max-w-xl text-sm leading-relaxed text-emerald-100/80">Explore youth programs, SK funds, budget allocations, and published expenses.</p>
            </div>
          </div>
        </div>
      </section>

      <ErrorBanner message={fundsError || allocationsError || expensesError || programsError} />

      <section aria-label="SK public summary" className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-civic-emerald">Financial and program snapshot</p>
          <h2 className="mt-1 text-xl font-bold text-civic-navy">SK activity at a glance</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PublicMetricCard label="Funds sourced" value={formatCurrency(totalFunds)} detail={`${funds.length} published ${funds.length === 1 ? 'source' : 'sources'}`} icon={Landmark} tone="violet" />
          <PublicMetricCard label="Budget allocated" value={formatCurrency(totalBudget)} detail={`${allocations.length} published ${allocations.length === 1 ? 'allocation' : 'allocations'}`} icon={PieChart} tone="blue" />
          <PublicMetricCard label="Expenses recorded" value={formatCurrency(totalExpenses)} detail={`${expenses.length} expense ${expenses.length === 1 ? 'record' : 'records'}`} icon={Receipt} tone="amber" />
          <PublicMetricCard label="Ongoing programs" value={activePrograms} detail={`${programs.length} published ${programs.length === 1 ? 'program' : 'programs'}`} icon={FolderKanban} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]" aria-label="SK program and budget details">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-civic-emerald">Youth programs</p>
              <h2 className="mt-1 text-xl font-bold text-civic-navy">Recently published</h2>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><FolderKanban className="h-5 w-5" /></span>
          </div>
          <div className="mt-5 divide-y divide-slate-100">
            {recentPrograms.map((program) => (
              <div key={program.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{program.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {program.start_date ? new Date(`${program.start_date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Schedule not specified'}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${program.status === 'ongoing' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {program.status || 'Published'}
                </span>
              </div>
            ))}
            {recentPrograms.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No SK programs have been published yet.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-950 to-civic-navy p-5 text-white shadow-sm sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-200">Budget status</p>
              <h2 className="mt-1 font-display text-xl font-bold">{utilization}% utilized</h2>
            </div>
            <ArrowUpRight className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${utilization}%` }} /></div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-emerald-200/70">Spent</p><p className="mt-1 font-bold tabular-nums">{formatCurrency(totalExpenses)}</p></div>
            <div><p className="text-emerald-200/70">Allocated</p><p className="mt-1 font-bold tabular-nums">{formatCurrency(totalBudget)}</p></div>
          </div>
        </article>
      </section>
    </div>
  );
}
