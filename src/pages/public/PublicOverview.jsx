import { useParams, Link } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { Building2, PieChart, Receipt, FolderKanban, MessageSquare, Users, ShieldCheck, ArrowRight } from 'lucide-react';

export default function PublicOverview() {
  const { slug } = useParams();
  const { barangay, loading: bLoading, error: bError } = usePublicBarangay(slug);
  const { rows: allocations, error: e1 } = useSupabaseTable('budget_allocations', barangay?.id);
  const { rows: expenses, error: e2 } = useSupabaseTable('expenses', barangay?.id);
  const { rows: programs, error: e3 } = useSupabaseTable('programs', barangay?.id);

  if (bLoading) return <p className="text-slate-400 text-center py-12">Loading barangay profile…</p>;
  if (bError || !barangay) return <ErrorBanner message={bError || 'Barangay not found.'} />;

  const totalBudget = allocations.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalSpent = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
  const ongoingPrograms = programs.filter((p) => p.status === 'ongoing').length;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="card bg-civic-navy text-white p-6 sm:p-8 rounded-xl flex flex-col sm:flex-row items-center gap-6">
        {barangay.logo_url ? (
          <img
            src={barangay.logo_url}
            alt={`${barangay.name} Seal`}
            className="w-20 h-20 rounded-full object-cover border-2 border-white/20 bg-white/10 shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center shrink-0">
            <Building2 className="w-10 h-10 text-white" />
          </div>
        )}

        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-white/10 text-white border border-white/15">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified Public LGU Disclosure Portal
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{barangay.name}</h1>
          <p className="text-civic-cream/80 text-sm">
            {[barangay.municipality, barangay.province].filter(Boolean).join(', ')} · Official Open Data Portal
          </p>
        </div>
      </div>

      <ErrorBanner message={e1 || e2 || e3} />

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card space-y-1 hover:border-slate-300 transition-all">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-civic-emerald" /> Total Budget Allocated
          </span>
          <p className="text-2xl font-extrabold text-civic-navy">
            ₱{totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="card space-y-1 hover:border-slate-300 transition-all">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-amber-600" /> Total Recorded Expenses
          </span>
          <p className="text-2xl font-extrabold text-civic-navy">
            ₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="card space-y-1 hover:border-slate-300 transition-all">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FolderKanban className="w-4 h-4 text-blue-600" /> Active Programs
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

