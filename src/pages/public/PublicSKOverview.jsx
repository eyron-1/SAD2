import { Link, useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { DollarSign, FolderKanban, MessageSquare, PieChart, Receipt, Users, ArrowRight } from 'lucide-react';

export default function PublicSKOverview() {
  const { slug } = useParams();
  const { barangay, loading: barangayLoading, error: barangayError } = usePublicBarangay(slug);
  const { rows: funds, error: fundsError } = useSupabaseTable('sk_fund_sources', barangay?.id);
  const { rows: allocations, error: allocationsError } = useSupabaseTable('sk_budget', barangay?.id);
  const { rows: expenses, error: expensesError } = useSupabaseTable('sk_expenses', barangay?.id);
  const { rows: programs, error: programsError } = useSupabaseTable('sk_programs', barangay?.id);

  if (barangayLoading) return <p className="text-slate-400 text-center py-12">Loading SK youth portal…</p>;
  if (barangayError || !barangay) return <ErrorBanner message={barangayError || 'Barangay not found.'} />;

  const totalFunds = funds.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalBudget = allocations.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const activePrograms = programs.filter((row) => row.status === 'ongoing').length;

  return (
    <div className="space-y-8">
      <div className="card bg-emerald-900 text-white p-6 sm:p-8 rounded-xl flex flex-col sm:flex-row items-center gap-6">
        {barangay.sk_logo_url ? <img src={barangay.sk_logo_url} alt={`${barangay.name} SK logo`} className="w-20 h-20 rounded-full object-cover border-2 border-emerald-200/40 bg-white/10 shrink-0" /> : <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-emerald-200/40 flex items-center justify-center shrink-0"><Users className="w-10 h-10 text-emerald-200" /></div>}
        <div className="space-y-2 text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-white/10 border border-white/15">Sangguniang Kabataan (SK)</span>
          <h1 className="text-3xl font-bold tracking-tight">{barangay.name} SK Youth Governance Portal</h1>
          <p className="text-emerald-100/80 text-sm">Youth programs, SK funds, budget allocations, expenses, and public accountability.</p>
        </div>
      </div>

      <ErrorBanner message={fundsError || allocationsError || expensesError || programsError} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-emerald-600" /> SK Funds Sourced</span><p className="text-2xl font-extrabold text-civic-navy mt-2">₱{totalFunds.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
        <div className="card"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><PieChart className="w-4 h-4 text-blue-600" /> SK Budget Allocated</span><p className="text-2xl font-extrabold text-civic-navy mt-2">₱{totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
        <div className="card"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Receipt className="w-4 h-4 text-amber-600" /> SK Expenses</span><p className="text-2xl font-extrabold text-civic-navy mt-2">₱{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
        <div className="card"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><FolderKanban className="w-4 h-4 text-blue-600" /> Youth Programs</span><p className="text-2xl font-extrabold text-civic-navy mt-2">{activePrograms} Ongoing</p></div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Link to={`/b/${slug}/sk/budget`} className="card border-emerald-200 hover:border-emerald-500 transition-colors"><PieChart className="w-6 h-6 text-emerald-700 mb-3" /><h2 className="font-bold text-civic-navy">SK Budget & Expenses</h2><p className="text-xs text-slate-500 mt-1">View youth fund sources, allocations, and expenses.</p><ArrowRight className="w-4 h-4 text-emerald-700 mt-3" /></Link>
        <Link to={`/b/${slug}/sk/programs`} className="card border-emerald-200 hover:border-emerald-500 transition-colors"><FolderKanban className="w-6 h-6 text-emerald-700 mb-3" /><h2 className="font-bold text-civic-navy">SK Youth Programs</h2><p className="text-xs text-slate-500 mt-1">Review youth-focused projects and program budgets.</p><ArrowRight className="w-4 h-4 text-emerald-700 mt-3" /></Link>
        <Link to={`/b/${slug}/sk/feedback`} className="card border-emerald-200 hover:border-emerald-500 transition-colors"><MessageSquare className="w-6 h-6 text-emerald-700 mb-3" /><h2 className="font-bold text-civic-navy">Send SK Feedback</h2><p className="text-xs text-slate-500 mt-1">Send a concern or suggestion directly to SK officials.</p><ArrowRight className="w-4 h-4 text-emerald-700 mt-3" /></Link>
      </div>
    </div>
  );
}
