import { useParams, Link } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SystemLogo from '../../components/ui/SystemLogo';
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

  if (bLoading) return <p className="text-slate-400 text-center py-12">Loading barangay profile…</p>;
  if (bError || !barangay) return <ErrorBanner message={bError || 'Barangay not found.'} />;

  const totalBudget = sumAmounts(allocations);
  const totalSpent = sumActiveAmounts(expenses);
  const ongoingPrograms = programs.filter((p) => p.status === 'ongoing').length;
  const totalSkFunds = sumAmounts(skFunds);
  const totalSkBudget = sumAmounts(skAllocations);
  const totalSkExpenses = sumActiveAmounts(skExpenses);
  const remainingBudget = totalBudget - totalSpent;
  const publicStatus = remainingBudget < 0
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
          <div className="text-center"><div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 p-1 overflow-hidden flex items-center justify-center">{barangay.logo_url ? <img src={barangay.logo_url} alt="Barangay logo" className="w-full h-full object-cover rounded-full" /> : <SystemLogo className="w-full h-full object-cover rounded-full" />}</div><span className="text-[10px] text-slate-300 mt-1 block">Barangay</span></div>
          <div className="text-center"><div className="w-14 h-14 rounded-full bg-emerald-400/10 border border-emerald-300/40 p-1 overflow-hidden flex items-center justify-center">{barangay.sk_logo_url ? <img src={barangay.sk_logo_url} alt="SK logo" className="w-full h-full object-cover rounded-full" /> : <Users className="w-7 h-7 text-emerald-300" />}</div><span className="text-[10px] text-emerald-200 mt-1 block">SK</span></div>
        </div>
      </div>

      <div className="card border-slate-200 space-y-4">
        <div><p className="text-xs font-bold uppercase tracking-wider text-civic-emerald">Public Transparency Overview</p><h2 className="text-xl font-bold text-civic-navy mt-1">Barangay and SK financial disclosure</h2><p className="text-sm text-slate-500 mt-1">Residents can compare the funds received, budgets allocated, expenses recorded, and programs published by both offices.</p></div>

        <div className={`rounded-xl border p-4 ${publicStatus.tone === 'rose' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]">Budget Snapshot</p>
              <h3 className="text-base font-bold mt-1">{publicStatus.title}</h3>
            </div>
            <div className="text-2xl">{publicStatus.tone === 'rose' ? '⚠️' : '✅'}</div>
          </div>
          <p className="text-sm mt-2 leading-relaxed">{publicStatus.message}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-full bg-civic-navy/10 flex items-center justify-center overflow-hidden">{barangay.logo_url ? <img src={barangay.logo_url} alt="Barangay logo" className="w-full h-full object-cover" /> : <SystemLogo className="w-full h-full object-cover" />}</div><h3 className="font-bold text-civic-navy">Barangay Government</h3></div><div className="grid grid-cols-3 gap-2 text-xs"><div><p className="text-slate-400">Budget</p><p className="font-bold text-civic-navy">{formatCurrency(totalBudget)}</p></div><div><p className="text-slate-400">Expenses</p><p className="font-bold text-civic-navy">{formatCurrency(totalSpent)}</p></div><div><p className="text-slate-400">Programs</p><p className="font-bold text-civic-navy">{programs.length}</p></div></div></div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden">{barangay.sk_logo_url ? <img src={barangay.sk_logo_url} alt="SK logo" className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-emerald-700" />}</div><h3 className="font-bold text-emerald-900">Sangguniang Kabataan (SK)</h3></div><div className="grid grid-cols-3 gap-2 text-xs"><div><p className="text-emerald-700/70">Funds</p><p className="font-bold text-emerald-900">{formatCurrency(totalSkFunds)}</p></div><div><p className="text-emerald-700/70">Budget</p><p className="font-bold text-emerald-900">{formatCurrency(totalSkBudget)}</p></div><div><p className="text-emerald-700/70">Expenses</p><p className="font-bold text-emerald-900">{formatCurrency(totalSkExpenses)}</p></div></div></div>
        </div>
      </div>

      <ErrorBanner message={e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10 || e11} />

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
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">Budget allocated</span>
                <p className="text-xl font-extrabold text-civic-navy tabular-nums">
                  {formatCurrency(totalBudget)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">Expenses recorded</span>
                <p className="text-xl font-extrabold text-civic-navy tabular-nums">
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
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-800">Funds sourced</span>
                <p className="text-xl font-extrabold text-emerald-900 tabular-nums">
                  {formatCurrency(totalSkFunds)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-800">Budget allocated</span>
                <p className="text-xl font-extrabold text-emerald-900 tabular-nums">
                  {formatCurrency(totalSkBudget)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-800">Expenses recorded</span>
                <p className="text-xl font-extrabold text-emerald-900 tabular-nums">
                  {formatCurrency(totalSkExpenses)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card min-h-32 border-slate-200 bg-white space-y-2 hover:border-civic-emerald/50 hover:shadow-sm transition-all">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-start gap-1.5 leading-5">
            <FolderKanban className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" /> Published Barangay Programs
          </span>
          <p className="text-2xl font-extrabold text-civic-navy tabular-nums">{programs.length}</p>
          <p className="text-xs text-slate-500">{ongoingPrograms} currently ongoing</p>
        </div>

        <div className="card min-h-32 border-emerald-200 bg-emerald-50/40 space-y-2 hover:border-emerald-300 hover:shadow-sm transition-all">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-start gap-1.5 leading-5">
            <Users className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" /> Published SK Programs
          </span>
          <p className="text-2xl font-extrabold text-emerald-900 tabular-nums">{skPrograms.length}</p>
          <p className="text-xs text-emerald-800">Youth programs published by the SK</p>
        </div>

        <div className="card min-h-32 border-slate-200 bg-white space-y-2 hover:border-civic-emerald/50 hover:shadow-sm transition-all">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-start gap-1.5 leading-5">
            <ShieldCheck className="w-4 h-4 text-civic-emerald shrink-0 mt-0.5" /> Public access
          </span>
          <p className="text-2xl font-extrabold text-civic-navy">Open to residents</p>
          <p className="text-xs text-slate-500">No account required to browse</p>
        </div>
      </div>

      <section className="space-y-4">
        <div><p className="text-xs font-bold uppercase tracking-wider text-civic-emerald">Community updates</p><h2 className="mt-1 text-xl font-bold text-civic-navy">Activities, documents, and response updates</h2></div>
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
