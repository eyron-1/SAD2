import { Link, useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import PublicMetricCard from '../../components/public/PublicMetricCard';
import { sumAmounts, sumActiveAmounts } from '../../lib/financial';
import { ArrowRight, ClipboardList, FolderKanban, Landmark, MessageSquare, PieChart, Receipt, Users } from 'lucide-react';

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
          <Link to={`/b/${slug}/sk/programs`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-50 focus-visible:outline-white">
            Explore programs <ArrowRight className="h-4 w-4" />
          </Link>
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

      <section className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-civic-emerald">Get involved</p>
          <h2 className="mt-1 text-xl font-bold text-civic-navy">Explore SK services</h2>
          <p className="mt-1 text-sm text-slate-500">Find records, take part in youth programs, or share feedback.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { to: `/b/${slug}/sk/profiling`, title: 'KK Youth Profiling', text: 'Submit your profile to the SK for verification.', icon: ClipboardList },
            { to: `/b/${slug}/sk/budget`, title: 'SK Budget & Expenses', text: 'Review fund sources, allocations, and expenses.', icon: PieChart },
            { to: `/b/${slug}/sk/programs`, title: 'SK Youth Programs', text: 'Explore youth-focused projects and budgets.', icon: FolderKanban },
            { to: `/b/${slug}/sk/feedback`, title: 'Send SK Feedback', text: 'Share a concern or suggestion with SK officials.', icon: MessageSquare },
          ].map(({ to, title, text, icon: Icon }) => (
            <Link key={to} to={to} className="group flex min-h-36 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-civic-emerald/50 hover:shadow-md focus-visible:outline-offset-4">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-civic-emerald"><Icon className="h-5 w-5" /></span>
              <h3 className="font-bold text-civic-navy">{title}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500">{text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-civic-emerald">Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
