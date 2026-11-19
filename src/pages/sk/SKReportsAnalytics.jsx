import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { sumAmounts, activeRows } from '../../lib/financial';
import {
  BarChart3, Download, PieChart as PieIcon, Landmark, Receipt,
  Percent, FolderKanban, FileSpreadsheet, TrendingUp, TrendingDown,
  Minus, CalendarRange, CheckCircle2, Clock, XCircle, AlertCircle,
  Users,
} from 'lucide-react';

/* ─── Colour palette ─────────────────────────────────────────────── */
const PALETTE = ['#0F2D4A', '#2F6B4F', '#C9A24B', '#B4472B', '#6D28D9', '#0369A1', '#059669', '#1E4258'];

/* ─── CSV helpers ─────────────────────────────────────────────────── */
function toCSV(rows, headers) {
  const esc = (v) => {
    let s = String(v ?? '');
    if (/^[\t\r ]*[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [
    headers.map(([, label]) => esc(label)).join(','),
    ...rows.map((r) => headers.map(([k]) => esc(r[k])).join(',')),
  ].join('\n');
}
function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* ─── Sub-components ─────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, iconClass, sub, trend, progressPct }) {
  const trendIcon =
    trend === 'up'   ? <TrendingUp   className="w-3.5 h-3.5 text-emerald-500" /> :
    trend === 'down' ? <TrendingDown className="w-3.5 h-3.5 text-rose-500" />   :
    <Minus className="w-3.5 h-3.5 text-slate-400" />;

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider leading-tight">{label}</span>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="text-2xl font-bold text-civic-navy leading-none">{value}</p>
      {progressPct !== undefined && (
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500"
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
      )}
      {sub && (
        <p className="flex items-center gap-1 text-xs text-slate-500">
          {trend && trendIcon}
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-civic-navy/5">
        <Icon className="w-4 h-4 text-civic-navy" />
      </span>
      <div>
        <h2 className="text-base font-bold text-civic-navy">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

const EmptyChart = ({ message }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400">
    <BarChart3 className="w-8 h-8 opacity-30" />
    <p className="text-xs">{message}</p>
  </div>
);

const programStatusMeta = {
  ongoing:   { label: 'Ongoing',   icon: Clock,         cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', icon: CheckCircle2,  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', icon: XCircle,       cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  planned:   { label: 'Planned',   icon: CalendarRange, cls: 'bg-violet-50 text-violet-700 border-violet-200' },
};
const defaultMeta = { label: 'Other', icon: AlertCircle, cls: 'bg-slate-100 text-slate-600 border-slate-200' };

/* ─── Main page ──────────────────────────────────────────────────── */
export default function SKReportsAnalytics() {
  const { profile } = useAuth();
  const { rows: budget,    error: e1 } = useSupabaseTable('sk_budget',       profile?.barangay_id);
  const { rows: expenses,  error: e2 } = useSupabaseTable('sk_expenses',     profile?.barangay_id);
  const { rows: funds,     error: e3 } = useSupabaseTable('sk_fund_sources', profile?.barangay_id);
  const { rows: programs,  error: e4 } = useSupabaseTable('sk_programs',     profile?.barangay_id);
  const { rows: kk,        error: e5 } = useSupabaseTable('kk_monitoring',   profile?.barangay_id);

  /* Fiscal-year filter */
  const allYears = useMemo(() => {
    const s = new Set();
    budget.forEach((b) => b.fiscal_year && s.add(String(b.fiscal_year)));
    activeRows(expenses).forEach((e) => e.date_incurred && s.add(e.date_incurred.slice(0, 4)));
    funds.forEach((f) => f.fiscal_year && s.add(String(f.fiscal_year)));
    return ['all', ...Array.from(s).sort((a, b) => b.localeCompare(a))];
  }, [budget, expenses, funds]);

  const [fyFilter, setFyFilter] = useState('all');
  const filteredBudget = useMemo(
    () => fyFilter === 'all' ? budget : budget.filter((b) => String(b.fiscal_year) === fyFilter),
    [budget, fyFilter],
  );
  const filteredExpenses = useMemo(
    () => fyFilter === 'all'
      ? activeRows(expenses)
      : activeRows(expenses).filter((e) => e.date_incurred?.startsWith(fyFilter)),
    [expenses, fyFilter],
  );

  /* KPIs */
  const totalBudget   = sumAmounts(filteredBudget);
  const totalExpenses = sumAmounts(filteredExpenses);
  const totalFunds    = sumAmounts(fyFilter === 'all' ? funds : funds.filter((f) => String(f.fiscal_year) === fyFilter));
  const utilization   = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;
  const remaining     = totalBudget - totalExpenses;
  const activeKK      = kk.filter((m) => m.participation_status === 'active').length;

  /* Chart: expenses by category */
  const expenseByCategory = useMemo(() => {
    const map = {};
    filteredExpenses.forEach((e) => {
      const category = String(e.category || 'Uncategorized').trim() || 'Uncategorized';
      map[category] = (map[category] || 0) + Math.round(Number(e.amount || 0) * 100);
    });
    return Object.entries(map)
      .map(([name, cents]) => ({ name, value: cents / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  /* Chart: budget vs expenses by year */
  const budgetVsExpense = useMemo(() => {
    const byYear = {};
    filteredBudget.forEach((b) => {
      byYear[b.fiscal_year] ??= { fiscal_year: b.fiscal_year, budget: 0, expenses: 0 };
      byYear[b.fiscal_year].budget += Math.round(Number(b.amount || 0) * 100);
    });
    filteredExpenses.forEach((e) => {
      const fy = e.date_incurred ? e.date_incurred.slice(0, 4) : 'N/A';
      byYear[fy] ??= { fiscal_year: fy, budget: 0, expenses: 0 };
      byYear[fy].expenses += Math.round(Number(e.amount || 0) * 100);
    });
    return Object.values(byYear)
      .map((r) => ({ ...r, budget: r.budget / 100, expenses: r.expenses / 100 }))
      .sort((a, b) => String(a.fiscal_year).localeCompare(String(b.fiscal_year)));
  }, [filteredBudget, filteredExpenses]);

  /* Chart: monthly spend trend */
  const monthlyTrend = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(0, i).toLocaleString('en', { month: 'short' }),
      amount: 0,
    }));
    filteredExpenses.forEach((e) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(e.date_incurred || '');
      const idx = match ? Number(match[2]) - 1 : -1;
      if (idx >= 0) months[idx].amount += Number(e.amount || 0);
    });
    return months;
  }, [filteredExpenses]);

  /* KK participation */
  const kkByStatus = useMemo(() => {
    const map = {};
    kk.forEach((m) => { map[m.participation_status] = (map[m.participation_status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [kk]);

  /* Program status breakdown */
  const programStatusCounts = useMemo(() => {
    const map = {};
    programs.forEach((p) => { map[p.status] = (map[p.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [programs]);

  const phpFmt = (v) => `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8 max-w-6xl">

      {/* Print-only header — hidden on screen */}
      <div data-print="show" className="hidden border-b-2 border-civic-navy pb-4 mb-2">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
          {profile?.barangays?.name || 'Barangay'} · Sangguniang Kabataan Official Report
        </p>
        <h1 className="text-2xl font-bold text-civic-navy">SK Reports &amp; Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">
          Printed on {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
          {fyFilter !== 'all' ? ` · Fiscal Year ${fyFilter}` : ' · All Fiscal Years'}
        </p>
      </div>

      {/* Screen-only page header */}
      <div data-print="no-print" className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-civic-navy flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-civic-emerald" />
            SK Reports &amp; Analytics
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Youth fund summaries, program performance, and KK participation insights.
          </p>
        </div>

        {/* Fiscal year filter */}
        <div className="flex items-center gap-2 shrink-0">
          <CalendarRange className="w-4 h-4 text-slate-400" />
          <select
            value={fyFilter}
            onChange={(e) => setFyFilter(e.target.value)}
            className="input-field py-2 w-36 text-sm"
          >
            {allYears.map((y) => (
              <option key={y} value={y}>{y === 'all' ? 'All years' : `FY ${y}`}</option>
            ))}
          </select>
        </div>
      </div>

      <ErrorBanner message={e1 || e2 || e3 || e4 || e5} />

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="SK Funds Sourced"
          value={`₱${totalFunds.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          icon={Landmark}
          iconClass="bg-violet-50 text-violet-700"
          sub={`${fyFilter === 'all' ? funds.length : funds.filter((f) => String(f.fiscal_year) === fyFilter).length} sources`}
        />
        <StatCard
          label="SK Budget Allocated"
          value={`₱${totalBudget.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          icon={PieIcon}
          iconClass="bg-blue-50 text-blue-700"
          sub={`${filteredBudget.length} allocation records`}
        />
        <StatCard
          label="SK Total Spent"
          value={`₱${totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          icon={Receipt}
          iconClass="bg-amber-50 text-amber-700"
          sub={`₱${remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })} remaining`}
          progressPct={utilization}
        />
        <StatCard
          label="Active KK Members"
          value={activeKK}
          icon={Users}
          iconClass="bg-emerald-50 text-emerald-700"
          sub={`${kk.length} youth profiles total`}
        />
      </div>

      {/* Utilization card */}
      <div className={`card flex flex-col sm:flex-row sm:items-center gap-5 border-l-4 ${
        utilization >= 100 ? 'border-l-rose-500 bg-rose-50/30' :
        utilization >= 85  ? 'border-l-amber-500 bg-amber-50/30' :
        'border-l-emerald-500 bg-emerald-50/20'
      }`}>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5" /> Budget Utilization
          </p>
          <p className={`text-3xl font-bold mt-1 ${
            utilization >= 100 ? 'text-rose-600' : utilization >= 85 ? 'text-amber-600' : 'text-civic-navy'
          }`}>
            {utilization.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {utilization >= 100
              ? 'Expenses exceed the allocated budget — review immediately.'
              : utilization >= 85
              ? 'More than 85% of the SK budget has been spent.'
              : 'Spending is within the allocated SK budget.'}
          </p>
        </div>
        <div className="w-full sm:w-56 shrink-0">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>₱{totalExpenses.toLocaleString('en-PH', { maximumFractionDigits: 0 })} spent</span>
            <span>₱{totalBudget.toLocaleString('en-PH', { maximumFractionDigits: 0 })} budget</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                utilization >= 100 ? 'bg-rose-500' : utilization >= 85 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, utilization)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Pie — Expenses by category */}
        <div className="card space-y-4">
          <SectionHeader icon={PieIcon} title="SK Expenses by Category" subtitle="Distribution of all recorded SK expenses" />
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={expenseByCategory} dataKey="value" nameKey="name"
                  outerRadius={95} innerRadius={48} paddingAngle={3}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip formatter={phpFmt} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="No SK expense categories recorded yet." />}
        </div>

        {/* Bar — Budget vs Expenses by Year */}
        <div className="card space-y-4">
          <SectionHeader icon={BarChart3} title="SK Budget vs. Expenses by Year" subtitle="Compare allocations against actual spending" />
          {budgetVsExpense.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={budgetVsExpense} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="fiscal_year" fontSize={11} tick={{ fill: '#64748b' }} />
                <YAxis fontSize={11} tick={{ fill: '#64748b' }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={phpFmt} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="budget"   fill="#0F2D4A" name="Allocated" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#2F6B4F" name="Spent"     radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="No yearly SK budget data available." />}
        </div>
      </div>

      {/* Chart row 2 — Monthly spend trend */}
      <div className="card space-y-4">
        <SectionHeader
          icon={TrendingUp}
          title="Monthly SK Spending Trend"
          subtitle={fyFilter === 'all' ? 'Aggregated across all fiscal years' : `FY ${fyFilter} monthly breakdown`}
        />
        {filteredExpenses.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" fontSize={11} tick={{ fill: '#64748b' }} />
              <YAxis fontSize={11} tick={{ fill: '#64748b' }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={phpFmt} />
              <Line
                type="monotone" dataKey="amount" name="SK Expenses"
                stroke="#2F6B4F" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : <EmptyChart message="No SK expense data to show for this period." />}
      </div>

      {/* KK Participation + Program breakdown side by side */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* KK Participation */}
        <div className="card space-y-4">
          <SectionHeader icon={Users} title="KK Participation Status" subtitle={`${kk.length} total youth profiles`} />
          {kkByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={kkByStatus} dataKey="value" nameKey="name"
                  outerRadius={80} innerRadius={40} paddingAngle={3}
                >
                  {kkByStatus.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
              <Users className="w-8 h-8 opacity-30" />
              <p className="text-xs">No KK profiling data yet.</p>
            </div>
          )}
        </div>

        {/* Program breakdown */}
        <div className="card space-y-4">
          <SectionHeader icon={FolderKanban} title="SK Program Execution" subtitle={`${programs.length} total programs across all statuses`} />
          {programStatusCounts.length > 0 ? (
            <div className="flex flex-wrap gap-3 content-start">
              {programStatusCounts.map(({ name, value }) => {
                const meta = programStatusMeta[name] ?? defaultMeta;
                const StatusIcon = meta.icon;
                return (
                  <div key={name} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium ${meta.cls}`}>
                    <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-bold text-sm">{value}</span>
                    <span>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
              <FolderKanban className="w-8 h-8 opacity-30" />
              <p className="text-xs">No program data recorded yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Export panel */}
      <div data-print="no-print" className="card space-y-5">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-civic-navy/5">
            <FileSpreadsheet className="w-4 h-4 text-civic-navy" />
          </span>
          <div>
            <h2 className="text-base font-bold text-civic-navy">Export SK Audit Data</h2>
            <p className="text-xs text-slate-500 mt-0.5">Download CSV files for DILG compliance, or save this page as PDF.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              label: 'Print / Save PDF',
              icon: Download,
              desc: 'Full SK report as a printable PDF',
              onClick: () => window.print(),
            },
            {
              label: 'SK Budget Allocations',
              icon: Download,
              desc: 'Fiscal year, category, amount',
              onClick: () => downloadCSV('sk_budget_allocations.csv', toCSV(filteredBudget, [
                ['fiscal_year', 'Fiscal Year'], ['category', 'Category'], ['amount', 'Amount'], ['description', 'Description'],
              ])),
            },
            {
              label: 'SK Expenses',
              icon: Download,
              desc: 'Date, category, amount, status',
              onClick: () => downloadCSV('sk_expenses.csv', toCSV(filteredExpenses, [
                ['date_incurred', 'Date'], ['category', 'Category'], ['amount', 'Amount'], ['status', 'Status'],
              ])),
            },
            {
              label: 'SK Fund Sources',
              icon: Download,
              desc: 'Name, type, fiscal year, amount',
              onClick: () => downloadCSV('sk_fund_sources.csv', toCSV(
                fyFilter === 'all' ? funds : funds.filter((f) => String(f.fiscal_year) === fyFilter),
              [
                ['name', 'Name'], ['source_type', 'Type'], ['fiscal_year', 'FY'], ['amount', 'Amount'],
              ])),
            },
            {
              label: 'SK Programs & Projects',
              icon: Download,
              desc: 'Title, status, budget, beneficiaries',
              onClick: () => downloadCSV('sk_programs.csv', toCSV(
                fyFilter === 'all'
                  ? programs
                  : programs.filter((p) =>
                    p.start_date?.startsWith(fyFilter) || p.end_date?.startsWith(fyFilter),
                  ),
              [
                ['title', 'Title'], ['status', 'Status'], ['category', 'Category'],
                ['budget_amount', 'Budget'], ['beneficiaries_count', 'Beneficiaries'],
              ])),
            },
            {
              label: 'KK Member Profiles',
              icon: Download,
              desc: 'Name, age, status, profiling data',
              onClick: () => downloadCSV('kk_monitoring.csv', toCSV(kk, [
                ['full_name', 'Full Name'], ['age', 'Age'], ['participation_status', 'Status'],
                ['address', 'Address'], ['contact_number', 'Contact'],
              ])),
            },
          ].map(({ label, icon: Icon, desc, onClick }) => (
            <button
              key={label}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-civic-emerald/40 hover:bg-white hover:shadow-sm active:scale-[0.98]"
              onClick={onClick}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-civic-emerald/10 text-civic-emerald">
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-civic-navy">{label}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
