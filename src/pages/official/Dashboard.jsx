import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { roleLabel } from '../../utils/roles';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { PieChart, Receipt, FolderKanban, MessageSquare, ArrowUpRight, BarChart3, Bot, Users, Landmark, Building2, Sparkles } from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
  const { rows: allocations, error: e1 } = useSupabaseTable('budget_allocations', profile?.barangay_id);
  const { rows: expenses, error: e2 } = useSupabaseTable('expenses', profile?.barangay_id);
  const { rows: programs, error: e3 } = useSupabaseTable('programs', profile?.barangay_id);
  const { rows: feedback, error: e4 } = useSupabaseTable('feedback', profile?.barangay_id);

  const totalBudget = allocations.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalSpent = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
  const ongoingPrograms = programs.filter((p) => p.status === 'ongoing').length;
  const newFeedback = feedback.filter((f) => f.status === 'new').length;

  const spendPercentage = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const logoUrl = profile?.barangays?.logo_url;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Welcome Banner */}
      <div className="bg-civic-navy rounded-xl p-6 md:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 text-white text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Official Executive Dashboard
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Welcome back, {profile?.full_name}
          </h1>
          <p className="text-civic-cream/80 text-sm flex items-center gap-2">
            <span>{roleLabel(profile?.role)}</span>
            <span>·</span>
            <span className="font-semibold text-white">{profile?.barangays?.name || 'Barangay'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-white/20" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
          )}
        </div>
      </div>

      <ErrorBanner message={e1 || e2 || e3 || e4} />

      {/* KPI Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link to="budget" className="card hover:border-civic-emerald/40 group transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Allocated</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-civic-navy mt-3">₱{totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
            <span>{allocations.length} records logged</span>
          </div>
        </Link>

        <Link to="expenses" className="card hover:border-civic-emerald/40 group transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Spent</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-civic-navy mt-3">₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          {/* Spending Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${spendPercentage}%` }}></div>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 mt-1 block">{spendPercentage}% of total budget spent</span>
        </Link>

        <Link to="programs" className="card hover:border-civic-emerald/40 group transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ongoing Programs</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-civic-navy mt-3">{ongoingPrograms}</p>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
            <span>{programs.length} total projects</span>
          </div>
        </Link>

        <Link to="feedback" className="card hover:border-civic-emerald/40 group transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">New Resident Feedback</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-civic-navy mt-3">{newFeedback}</p>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
            <span>{feedback.length} total responses</span>
          </div>
        </Link>
      </div>

      {/* Quick Action Hub */}
      <div className="card space-y-4">
        <h2 className="text-lg font-bold text-civic-navy">Quick Official Operations</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to="reports"
            className="p-4 rounded-xl border border-slate-200 hover:border-civic-emerald hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-civic-emerald" />
              <span className="text-sm font-semibold text-slate-800">Reports & Export</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-civic-emerald transition-colors" />
          </Link>

          <Link
            to="ai-assistant"
            className="p-4 rounded-xl border border-slate-200 hover:border-civic-emerald hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-civic-emerald" />
              <span className="text-sm font-semibold text-slate-800">Groq AI Assistant</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-civic-emerald transition-colors" />
          </Link>

          <Link
            to="funds"
            className="p-4 rounded-xl border border-slate-200 hover:border-civic-emerald hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Landmark className="w-5 h-5 text-civic-emerald" />
              <span className="text-sm font-semibold text-slate-800">Record Fund Source</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-civic-emerald transition-colors" />
          </Link>

          <Link
            to="officials"
            className="p-4 rounded-xl border border-slate-200 hover:border-civic-emerald hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-civic-emerald" />
              <span className="text-sm font-semibold text-slate-800">Officials Handover</span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-civic-emerald transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}

