import { useParams, Link } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { Building2, PieChart, Receipt, FolderKanban, MessageSquare, Users, ShieldCheck, ArrowRight, DollarSign } from 'lucide-react';

export default function PublicOverview() {
  const { slug } = useParams();
  const { barangay, loading: bLoading, error: bError } = usePublicBarangay(slug);
  const { rows: allocations, error: e1 } = useSupabaseTable('budget_allocations', barangay?.id);
  const { rows: expenses, error: e2 } = useSupabaseTable('expenses', barangay?.id);
  const { rows: programs, error: e3 } = useSupabaseTable('programs', barangay?.id);
  const { rows: skFunds, error: e4 } = useSupabaseTable('sk_fund_sources', barangay?.id);
  const { rows: skPrograms, error: e5 } = useSupabaseTable('sk_programs', barangay?.id);
  const { rows: skAllocations, error: e6 } = useSupabaseTable('sk_budget', barangay?.id);
  const { rows: skExpenses, error: e7 } = useSupabaseTable('sk_expenses', barangay?.id);

  if (bLoading) return <p className="text-slate-400 text-center py-12">Loading barangay profile…</p>;
  if (bError || !barangay) return <ErrorBanner message={bError || 'Barangay not found.'} />;

  const totalBudget = allocations.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalSpent = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
  const ongoingPrograms = programs.filter((p) => p.status === 'ongoing').length;
  const totalSkFunds = skFunds.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalSkBudget = skAllocations.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalSkExpenses = skExpenses.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="card bg-civic-navy text-white p-6 sm:p-8 rounded-xl flex flex-col sm:flex-row items-center gap-6">
        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-white/10 text-white border border-white/15">
            <ShieldCheck className="w-3.5 h-3.5" /> Barangay Government Transparency Portal
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{barangay.name}</h1>
          <p className="text-civic-cream/80 text-sm">
            {[barangay.municipality, barangay.province].filter(Boolean).join(', ')} · Official Open Data Portal
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0" aria-label="Barangay and SK logos">
          <div className="text-center"><div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 p-1 overflow-hidden flex items-center justify-center">{barangay.logo_url ? <img src={barangay.logo_url} alt="Barangay logo" className="w-full h-full object-cover rounded-full" /> : <Building2 className="w-7 h-7 text-civic-emerald" />}</div><span className="text-[10px] text-slate-300 mt-1 block">Barangay</span></div>
          <div className="text-center"><div className="w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-300/40 p-1 overflow-hidden flex items-center justify-center">{barangay.sk_logo_url ? <img src={barangay.sk_logo_url} alt="SK logo" className="w-full h-full object-cover rounded-full" /> : <Users className="w-7 h-7 text-emerald-300" />}</div><span className="text-[10px] text-emerald-200 mt-1 block">SK</span></div>
        </div>
      </div>

      <div className="card border-slate-200 space-y-4">
        <div><p className="text-xs font-bold uppercase tracking-wider text-civic-emerald">Public Transparency Overview</p><h2 className="text-xl font-bold text-civic-navy mt-1">Barangay and SK financial disclosure</h2><p className="text-sm text-slate-500 mt-1">Residents can compare the funds received, budgets allocated, expenses recorded, and programs published by both offices.</p></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-full bg-civic-navy/10 flex items-center justify-center overflow-hidden">{barangay.logo_url ? <img src={barangay.logo_url} alt="Barangay logo" className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 text-civic-navy" />}</div><h3 className="font-bold text-civic-navy">Barangay Government</h3></div><div className="grid grid-cols-3 gap-2 text-xs"><div><p className="text-slate-400">Budget</p><p className="font-bold text-civic-navy">₱{totalBudget.toLocaleString()}</p></div><div><p className="text-slate-400">Expenses</p><p className="font-bold text-civic-navy">₱{totalSpent.toLocaleString()}</p></div><div><p className="text-slate-400">Programs</p><p className="font-bold text-civic-navy">{programs.length}</p></div></div></div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden">{barangay.sk_logo_url ? <img src={barangay.sk_logo_url} alt="SK logo" className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-emerald-700" />}</div><h3 className="font-bold text-emerald-900">Sangguniang Kabataan (SK)</h3></div><div className="grid grid-cols-3 gap-2 text-xs"><div><p className="text-emerald-700/70">Funds</p><p className="font-bold text-emerald-900">₱{totalSkFunds.toLocaleString()}</p></div><div><p className="text-emerald-700/70">Budget</p><p className="font-bold text-emerald-900">₱{totalSkBudget.toLocaleString()}</p></div><div><p className="text-emerald-700/70">Expenses</p><p className="font-bold text-emerald-900">₱{totalSkExpenses.toLocaleString()}</p></div></div></div>
        </div>
      </div>

      <ErrorBanner message={e1 || e2 || e3 || e4 || e5 || e6 || e7} />

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card space-y-1 hover:border-slate-300 transition-all">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-civic-emerald" /> Barangay Budget Allocated
          </span>
          <p className="text-2xl font-extrabold text-civic-navy">
            ₱{totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="card space-y-1 hover:border-slate-300 transition-all">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" /> SK Funds Sourced
          </span>
          <p className="text-2xl font-extrabold text-civic-navy">₱{totalSkFunds.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-slate-500">{skPrograms.length} SK program{skPrograms.length === 1 ? '' : 's'} published</p>
        </div>

        <div className="card space-y-1 hover:border-slate-300 transition-all">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-amber-600" /> Barangay Expenses
          </span>
          <p className="text-2xl font-extrabold text-civic-navy">
            ₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="card space-y-1 hover:border-slate-300 transition-all">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FolderKanban className="w-4 h-4 text-blue-600" /> Barangay Programs
          </span>
          <p className="text-2xl font-extrabold text-civic-navy">{ongoingPrograms} Ongoing</p>
        </div>
      </div>

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
            <div className="p-3 bg-purple-100/60 text-purple-700 rounded-xl group-hover:scale-105 transition-transform">
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

