import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { roleLabel } from '../../utils/roles';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { Sparkles, DollarSign, FolderKanban, Users, ArrowRight, Settings, Bot } from 'lucide-react';

export default function SKDashboard() {
  const { profile } = useAuth();
  const { rows: budget, error: e1 } = useSupabaseTable('sk_budget', profile?.barangay_id);
  const { rows: programs, error: e2 } = useSupabaseTable('sk_programs', profile?.barangay_id);
  const { rows: kk, error: e3 } = useSupabaseTable('kk_monitoring', profile?.barangay_id);

  const totalBudget = budget.reduce((s, r) => s + Number(r.amount || 0), 0);
  const activeKK = kk.filter((k) => k.participation_status === 'active').length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Banner */}
      <div className="card bg-civic-navy text-white p-6 sm:p-8 rounded-xl space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-white/10 text-white">
          <Sparkles className="w-3.5 h-3.5" /> Sangguniang Kabataan Portal
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Welcome, {profile?.full_name || 'SK Official'}!
        </h1>
        <p className="text-civic-cream/80 text-sm">
          {roleLabel(profile?.role)} · {profile?.barangays?.name || 'Barangay'}
        </p>
      </div>

      <ErrorBanner message={e1 || e2 || e3} />

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link to="budget" className="card hover:border-slate-300 hover:shadow-card-hover transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">SK 10% Budget Allocated</span>
            <DollarSign className="w-5 h-5 text-civic-emerald" />
          </div>
          <p className="text-2xl font-extrabold text-civic-navy mt-2">
            ₱{totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-civic-emerald font-semibold flex items-center gap-1 mt-3 group-hover:underline">
            Manage allocations <ArrowRight className="w-3 h-3" />
          </span>
        </Link>

        <Link to="programs" className="card hover:border-slate-300 hover:shadow-card-hover transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Youth Projects & Programs</span>
            <FolderKanban className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-civic-navy mt-2">{programs.length} Active</p>
          <span className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-3 group-hover:underline">
            View youth projects <ArrowRight className="w-3 h-3" />
          </span>
        </Link>

        <Link to="kk-monitoring" className="card hover:border-slate-300 hover:shadow-card-hover transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active KK Youth Roster</span>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-civic-navy mt-2">{activeKK} Registered</p>
          <span className="text-xs text-purple-600 font-semibold flex items-center gap-1 mt-3 group-hover:underline">
            Katipunan ng Kabataan <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {/* Quick Action Navigation */}
      <div className="card space-y-4">
        <h2 className="text-lg font-bold text-civic-navy">Quick Youth Governance Tools</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link to="ai-assistant" className="p-4 rounded-xl border border-slate-200 hover:border-civic-emerald hover:bg-emerald-50/50 transition-all flex items-center gap-3">
            <Bot className="w-6 h-6 text-civic-emerald shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-slate-800">SK AI Assistant</h3>
              <p className="text-xs text-slate-500">Formulate resolution drafts & proposals with Groq AI</p>
            </div>
          </Link>

          <Link to="settings" className="p-4 rounded-xl border border-slate-200 hover:border-civic-emerald hover:bg-emerald-50/50 transition-all flex items-center gap-3">
            <Settings className="w-6 h-6 text-civic-emerald shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-slate-800">Barangay Logo & Profile</h3>
              <p className="text-xs text-slate-500">Update logo, contact information, and seal</p>
            </div>
          </Link>

          <Link to="budget" className="p-4 rounded-xl border border-slate-200 hover:border-civic-emerald hover:bg-emerald-50/50 transition-all flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-civic-emerald shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-slate-800">SK Fund Sourcing</h3>
              <p className="text-xs text-slate-500">Track 10% statutory SK fund allocations</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

