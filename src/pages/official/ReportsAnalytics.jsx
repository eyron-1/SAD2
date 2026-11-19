import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { sumAmounts, sumActiveAmounts, activeRows } from '../../lib/financial';
import {
  BarChart3, Download, PieChart as PieIcon, Landmark, Receipt,
  Percent, FolderKanban, FileSpreadsheet, TrendingUp, TrendingDown,
  Minus, CalendarRange, CheckCircle2, Clock, XCircle, AlertCircle,
} from 'lucide-react';

/* ─── Colour palette ───────────────────────────────────────────── */
const PALETTE = ['#0F2D4A', '#2F6B4F', '#C9A24B', '#B4472B', '#1E4258', '#6D28D9', '#0369A1', '#059669'];

/* ─── CSV helpers ───────────────────────────────────────────────── */
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
    trend === 'up' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> :
    trend === 'down' ? <TrendingDown className="w-3.5 h-3.5 text-rose-500" /> :
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
export default function ReportsAnalytics() {
  const { profile } = useAuth();
  const { rows: allocations, error: e1 } = useSupabaseTable('budget_allocations', profile?.barangay_id);
  const { rows: expenses,    error: e2 } = useSupabaseTable('expenses',           profile?.barangay_id);
  const { rows: funds,       error: e3 } = useSupabaseTable('fund_sources',       profile?.barangay_id);
  const { rows: programs,    error: e4 } = useSupabaseTable('programs',           profile?.barangay_id);

  /* Fiscal-year filter */
  const allYears = useMemo(() => {
    const s = new Set();
    allocations.forEach((a) => a.fiscal_year && s.add(String(a.fiscal_year)));
    activeRows(expenses).forEach((e) => e.date_incurred && s.add(e.date_incurred.slice(0, 4)));
    funds.forEach((f) => f.fiscal_year && s.add(String(f.fiscal_year)));
    return ['all', ...Array.from(s).sort((a, b) => b.localeCompare(a))];
  }, [allocations, expenses, funds]);

  const [fyFilter, setFyFilter] = useState('all');
  const filteredAllocations = useMemo(
    () => fyFilter === 'all' ? allocations : allocations.filter((a) => String(a.fiscal_year) === fyFilter),
    [allocations, fyFilter],
  );
  const filteredExpenses = useMemo(
    () => fyFilter === 'all'
      ? activeRows(expenses)
      : activeRows(expenses).filter((e) => e.date_incurred?.startsWith(fyFilter)),
    [expenses, fyFilter],
  );

  /* KPIs */
  const totalBudget   = sumAmounts(filteredAllocations);
  const totalExpenses = sumAmounts(filteredExpenses);
  const totalFunds    = sumAmounts(fyFilter === 'all' ? funds : funds.filter((f) => String(f.fiscal_year) === fyFilter));
  const utilization   = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;
  const remaining     = totalBudget - totalExpenses;

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
    filteredAllocations.forEach((a) => {
      byYear[a.fiscal_year] ??= { fiscal_year: a.fiscal_year, budget: 0, expenses: 0 };
      byYear[a.fiscal_year].budget += Math.round(Number(a.amount || 0) * 100);
    });
    filteredExpenses.forEach((e) => {
      const fy = e.date_incurred ? e.date_incurred.slice(0, 4) : 'N/A';
      byYear[fy] ??= { fiscal_year: fy, budget: 0, expenses: 0 };
      byYear[fy].expenses += Math.round(Number(e.amount || 0) * 100);
    });
    return Object.values(byYear)
      .map((r) => ({ ...r, budget: r.budget / 100, expenses: r.expenses / 100 }))
      .sort((a, b) => String(a.fiscal_year).localeCompare(String(b.fiscal_year)));
  }, [filteredAllocations, filteredExpenses]);

  /* Chart: monthly spend trend (filtered year or all-time monthly) */
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

  /* Program status breakdown */
  const programStatusCounts = useMemo(() => {
    const map = {};
    programs.forEach((p) => { map[p.status] = (map[p.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [programs]);

  /* Tooltip formatter */
  const phpFmt = (v) => `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8 max-w-6xl">

      {/* Print-only header — hidden on screen */}
      <div data-print="show" className="hidden border-b-2 border-civic-navy pb-4 mb-2">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
          {profile?.barangays?.name || 'Barangay'} · Official Report
        </p>
        <h1 className="text-2xl font-bold text-civic-navy">Reports &amp; Financial Analytics</h1>
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
            Reports &amp; Financial Analytics
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Executive summaries, expenditure breakdowns, and DILG export datasets.
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

      <ErrorBanner message={e1 || e2 || e3 || e4} />

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Funds Sourced"
          value={`₱${totalFunds.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          icon={Landmark}
          iconClass="bg-violet-50 text-violet-700"
          sub={`${fyFilter === 'all' ? funds.length : funds.filter((f) => String(f.fiscal_year) === fyFilter).length} sources recorded`}
        />
        <StatCard
          label="Total Allocated"
          value={`₱${totalBudget.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          icon={PieIcon}
          iconClass="bg-blue-50 text-blue-700"
          sub={`${filteredAllocations.length} allocation records`}
        />
        <StatCard
          label="Total Spent"
          value={`₱${totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          icon={Receipt}
          iconClass="bg-amber-50 text-amber-700"
          sub={`₱${remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })} remaining`}
          progressPct={utilization}
        />
        <StatCard
          label="Budget Utilization"
          value={`${utilization.toFixed(1)}%`}
          icon={Percent}
          iconClass={utilization >= 85 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}
          sub={utilization >= 100 ? 'Over budget!' : utilization >= 85 ? 'High utilization' : 'Within target'}
          trend={utilization >= 85 ? 'up' : 'neutral'}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Pie — Expenses by category */}
        <div className="card space-y-4">
          <SectionHeader icon={PieIcon} title="Expenses by Category" subtitle="Distribution of all recorded expenses" />
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
          ) : <EmptyChart message="No expense categories recorded yet." />}
        </div>

        {/* Bar — Budget vs Expenses by Year */}
        <div className="card space-y-4">
          <SectionHeader icon={BarChart3} title="Budget vs. Expenses by Year" subtitle="Compare allocations against actual spending" />
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
          ) : <EmptyChart message="No yearly allocation data available." />}
        </div>
      </div>

      {/* Chart row 2 — Monthly spend trend */}
      <div className="card space-y-4">
        <SectionHeader
          icon={TrendingUp}
          title="Monthly Spending Trend"
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
                type="monotone" dataKey="amount" name="Expenses"
                stroke="#2F6B4F" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : <EmptyChart message="No expense data to show for this period." />}
      </div>

      {/* Program breakdown */}
      <div className="card space-y-4">
        <SectionHeader icon={FolderKanban} title="Program Execution Breakdown" subtitle={`${programs.length} total programs across all statuses`} />
        {programStatusCounts.length > 0 ? (
          <div className="flex flex-wrap gap-3">
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
          <p className="text-xs text-slate-400 py-6 text-center">No program data recorded yet.</p>
        )}
      </div>

      {/* Export panel */}
      <div data-print="no-print" className="card space-y-5">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-civic-navy/5">
            <FileSpreadsheet className="w-4 h-4 text-civic-navy" />
          </span>
          <div>
            <h2 className="text-base font-bold text-civic-navy">Export DILG Audit Data</h2>
            <p className="text-xs text-slate-500 mt-0.5">Download CSV files compatible with Excel, or save this page as PDF.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              label: 'Print / Save PDF',
              icon: Download,
              onClick: () => window.print(),
              desc: 'Full report as a printable PDF',
            },
            {
              label: 'Budget Allocations',
              icon: Download,
              desc: 'Fiscal year, category, amount',
              onClick: () => downloadCSV('budget_allocations.csv', toCSV(filteredAllocations, [
                ['fiscal_year', 'Fiscal Year'], ['category', 'Category'], ['amount', 'Amount'], ['description', 'Description'],
              ])),
            },
            {
              label: 'Recorded Expenses',
              icon: Download,
              desc: 'Date, category, amount, status',
              onClick: () => downloadCSV('expenses.csv', toCSV(filteredExpenses, [
                ['date_incurred', 'Date'], ['category', 'Category'], ['amount', 'Amount'], ['status', 'Status'],
              ])),
            },
            {
              label: 'Fund Sources',
              icon: Download,
              desc: 'Name, type, fiscal year, amount',
              onClick: () => downloadCSV('fund_sources.csv', toCSV(
                fyFilter === 'all' ? funds : funds.filter((f) => String(f.fiscal_year) === fyFilter),
              [
                ['name', 'Name'], ['source_type', 'Type'], ['fiscal_year', 'FY'], ['amount', 'Amount'],
              ])),
            },
            {
              label: 'Programs & Projects',
              icon: Download,
              desc: 'Title, status, budget, beneficiaries',
              onClick: () => {
                const filteredPrograms = fyFilter === 'all'
                  ? programs
                  : programs.filter((p) =>
                    p.start_date?.startsWith(fyFilter) || p.end_date?.startsWith(fyFilter),
                  );
                const formatted = filteredPrograms.map((p) => {
                  let sector = p.beneficiary_category || '';
                  if (!sector && p.description?.startsWith('[Beneficiary: ')) {
                    const m = p.description.match(/^\[Beneficiary:\s*([^\]]+)\]/);
                    if (m) sector = m[1];
                  }
                  return { ...p, beneficiary_category: sector || 'General Residents' };
                });
                downloadCSV('programs.csv', toCSV(formatted, [
                  ['title', 'Title'], ['status', 'Status'], ['category', 'Category'],
                  ['beneficiary_category', 'Beneficiary Sector'],
                  ['budget_amount', 'Budget'], ['beneficiaries_count', 'Beneficiaries'],
                ]));
              },
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
