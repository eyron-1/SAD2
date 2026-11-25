import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { sumAmounts, sumActiveAmounts, activeRows } from '../../lib/financial';
import ReportPrintTable from '../../components/reports/ReportPrintTable';
import {
  BarChart3, Download, PieChart as PieIcon, Landmark, Receipt,
  Percent, FolderKanban, FileSpreadsheet, TrendingUp, TrendingDown,
  Minus, CalendarRange, CheckCircle2, Clock, XCircle, AlertCircle,
  FileText, Printer, FileDown,
} from 'lucide-react';

/* ─── Colour palette ───────────────────────────────────────────── */
const PALETTE = ['#0F2D4A', '#2F6B4F', '#C9A24B', '#B4472B', '#1E4258', '#6D28D9', '#0369A1', '#059669'];

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
  const [exportError, setExportError] = useState('');
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
  const periodFunds = fyFilter === 'all' ? funds : funds.filter((f) => String(f.fiscal_year) === fyFilter);
  const periodPrograms = fyFilter === 'all'
    ? programs
    : programs.filter((p) => p.start_date?.startsWith(fyFilter) || p.end_date?.startsWith(fyFilter));
  const exportPrograms = periodPrograms.map((p) => {
    let sector = p.beneficiary_category || '';
    if (!sector && p.description?.startsWith('[Beneficiary: ')) {
      const match = p.description.match(/^\[Beneficiary:\s*([^\]]+)\]/);
      if (match) sector = match[1];
    }
    return { ...p, beneficiary_category: sector || 'General Residents' };
  });
  const orgName = profile?.barangays?.name ? `Barangay ${profile.barangays.name}` : 'Barangay';
  const periodLabel = fyFilter === 'all' ? 'All Fiscal Years' : `Fiscal Year ${fyFilter}`;

  const defaultSignatories = [
    { role: 'Prepared by:', name: 'BARANGAY TREASURER', title: 'Custodian of Public Funds' },
    { role: 'Certified Correct:', name: 'BARANGAY SECRETARY', title: 'Keeper of Official Records' },
    { role: 'Approved by:', name: 'PUNONG BARANGAY', title: 'Head of Local Government' },
  ];

  const handleExcelExport = (options) => {
    setExportError('');
    import('../../lib/excelExport').then(({ downloadExcel }) => downloadExcel({
      ...options,
      organization: orgName,
      period: periodLabel,
      signatories: defaultSignatories,
    })).catch((error) => {
      console.error('Excel report export failed:', error);
      setExportError('Unable to create the Excel file. Please try again.');
    });
  };

  const handleWordExport = (options) => {
    setExportError('');
    import('../../lib/documentExport').then(({ downloadWordDocument }) => downloadWordDocument({
      organization: orgName,
      lguDetails: {
        barangay: profile?.barangays?.name || '',
        province: profile?.barangays?.province || '',
        municipality: profile?.barangays?.municipality || '',
        office: 'OFFICE OF THE SANGGUNIANG BARANGAY',
      },
      period: periodLabel,
      signatories: defaultSignatories,
      ...options,
    })).catch((error) => {
      console.error('Word report export failed:', error);
      setExportError('Unable to create the Word Document. Please try again.');
    });
  };

  const handleFullWordReport = () => {
    handleWordExport({
      filename: `full_audit_report_${fyFilter}.doc`,
      title: 'ANNUAL FINANCIAL & AUDIT ANALYTICS REPORT',
      summaryCards: [
        { label: 'Total Funds Sourced', value: phpFmt(totalFunds), sub: `${periodFunds.length} sources recorded` },
        { label: 'Total Budget Allocated', value: phpFmt(totalBudget), sub: `${filteredAllocations.length} budget items` },
        { label: 'Total Expenses Incurred', value: phpFmt(totalExpenses), sub: `${filteredExpenses.length} transactions` },
        { label: 'Budget Utilization', value: `${utilization.toFixed(1)}%`, sub: `${phpFmt(remaining)} remaining` },
      ],
      tables: [
        {
          title: 'Budget Allocations',
          subtitle: 'Detailed appropriations per sector and category',
          columns: [
            { key: 'fiscal_year', label: 'Fiscal Year', align: 'center' },
            { key: 'category', label: 'Category' },
            { key: 'description', label: 'Description' },
            { key: 'amount', label: 'Amount', format: 'currency', align: 'right' },
          ],
          rows: filteredAllocations,
        },
        {
          title: 'Recorded Expenses',
          subtitle: 'Actual community and governance expenditures',
          columns: [
            { key: 'date_incurred', label: 'Date', align: 'center' },
            { key: 'category', label: 'Category' },
            { key: 'status', label: 'Status', align: 'center' },
            { key: 'amount', label: 'Amount', format: 'currency', align: 'right' },
          ],
          rows: filteredExpenses,
        },
        {
          title: 'Fund Sources',
          subtitle: 'Government subsidies, local revenues, and grants',
          columns: [
            { key: 'name', label: 'Fund Name' },
            { key: 'source_type', label: 'Type' },
            { key: 'fiscal_year', label: 'Fiscal Year', align: 'center' },
            { key: 'amount', label: 'Amount', format: 'currency', align: 'right' },
          ],
          rows: periodFunds,
        },
        {
          title: 'Programs & Projects Accomplishments',
          subtitle: 'Community development initiatives and sectors served',
          columns: [
            { key: 'title', label: 'Title' },
            { key: 'category', label: 'Category' },
            { key: 'status', label: 'Status', align: 'center' },
            { key: 'beneficiary_category', label: 'Beneficiary Sector' },
            { key: 'budget_amount', label: 'Budget', format: 'currency', align: 'right' },
          ],
          rows: exportPrograms,
        },
      ],
    });
  };

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
    <div className="report-page space-y-8 max-w-6xl">

      {/* Print-only Official Philippine LGU Header */}
      <div data-print="show" className="hidden print-official-header">
        <p className="print-republic">Republic of the Philippines</p>
        <p className="print-province-city">
          {profile?.barangays?.province ? `Province of ${profile.barangays.province}` : 'Department of the Interior and Local Government'}
          {profile?.barangays?.municipality ? ` · ${profile.barangays.municipality}` : ''}
        </p>
        <p className="print-barangay">
          BARANGAY {profile?.barangays?.name?.toUpperCase() || 'PORTAL'}
        </p>
        <p className="print-office">OFFICE OF THE SANGGUNIANG BARANGAY</p>
        <div className="print-title-banner">
          <h1>ANNUAL FINANCIAL &amp; AUDIT ANALYTICS REPORT</h1>
        </div>
        <div className="print-meta-grid">
          <div><strong>Coverage:</strong> {fyFilter === 'all' ? 'All Fiscal Years' : `Fiscal Year ${fyFilter}`}</div>
          <div><strong>Generated on:</strong> {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div><strong>Compliance:</strong> DILG Full Disclosure Policy &amp; Public Transparency</div>
        </div>
      </div>

      <section className="hidden print-report-section print-summary" data-print="show">
        <h2>Executive Summary</h2>
        <div className="print-summary-grid">
          <div><span>Total Funds Sourced</span><strong>{phpFmt(totalFunds)}</strong></div>
          <div><span>Total Budget Allocated</span><strong>{phpFmt(totalBudget)}</strong></div>
          <div><span>Total Expenses Incurred</span><strong>{phpFmt(totalExpenses)}</strong></div>
          <div><span>Budget Utilization</span><strong>{utilization.toFixed(1)}%</strong></div>
        </div>
      </section>

      <ReportPrintTable
        title="Budget Allocations"
        columns={[
          { key: 'fiscal_year', label: 'Fiscal Year', align: 'center' },
          { key: 'category', label: 'Category' },
          { key: 'description', label: 'Description' },
          { key: 'amount', label: 'Allocated Amount', format: 'currency', align: 'right' },
        ]}
        rows={filteredAllocations}
      />
      <ReportPrintTable
        title="Recorded Expenses"
        columns={[
          { key: 'date_incurred', label: 'Date', align: 'center' },
          { key: 'category', label: 'Category' },
          { key: 'status', label: 'Status', align: 'center' },
          { key: 'amount', label: 'Amount', format: 'currency', align: 'right' },
        ]}
        rows={filteredExpenses}
      />
      <ReportPrintTable
        title="Fund Sources"
        columns={[
          { key: 'name', label: 'Fund Name' },
          { key: 'source_type', label: 'Type' },
          { key: 'fiscal_year', label: 'Fiscal Year', align: 'center' },
          { key: 'amount', label: 'Amount', format: 'currency', align: 'right' },
        ]}
        rows={periodFunds}
      />
      <ReportPrintTable
        title="Programs &amp; Projects Accomplishments"
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'category', label: 'Category' },
          { key: 'status', label: 'Status', align: 'center' },
          { key: 'beneficiary_category', label: 'Beneficiary Sector' },
          { key: 'budget_amount', label: 'Budget', format: 'currency', align: 'right' },
        ]}
        rows={exportPrograms}
      />

      {/* Print-only Official Signatory Block */}
      <section data-print="show" className="hidden print-signatories-section">
        <p className="print-signatories-intro">
          I hereby certify on official oath that the financial allocations, actual disbursements, fund receipts, and program statuses indicated herein are true, correct, and completely reflected from the official ledgers of Barangay {profile?.barangays?.name || ''}.
        </p>
        <div className="print-signatories-grid">
          <div className="print-signatory-col">
            <span className="print-sig-role">Prepared by:</span>
            <div className="print-sig-space" />
            <div className="print-sig-line">
              <strong>BARANGAY TREASURER</strong>
              <span>Custodian of Public Funds</span>
            </div>
          </div>
          <div className="print-signatory-col">
            <span className="print-sig-role">Certified Correct:</span>
            <div className="print-sig-space" />
            <div className="print-sig-line">
              <strong>BARANGAY SECRETARY</strong>
              <span>Keeper of Official Records</span>
            </div>
          </div>
          <div className="print-signatory-col">
            <span className="print-sig-role">Approved by:</span>
            <div className="print-sig-space" />
            <div className="print-sig-line">
              <strong>PUNONG BARANGAY</strong>
              <span>Head of Local Government</span>
            </div>
          </div>
        </div>
        <div className="print-footer-notice">
          <span>Barangay Transparency Portal · Official Public Audit Record</span>
          <span>In Compliance with DILG &amp; COA Public Disclosure Guidelines</span>
        </div>
      </section>

      <div data-print="screen">
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

      </div>

      {/* Export panel */}
      <div data-print="no-print" className="card space-y-6">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-civic-navy/5">
            <Download className="w-4 h-4 text-civic-navy" />
          </span>
          <div>
            <h2 className="text-base font-bold text-civic-navy">Download &amp; Export Audit Reports</h2>
            <p className="text-xs text-slate-500 mt-0.5">PDF, Word, and Excel exports.</p>
          </div>
        </div>

        {/* Format category 1: PDF Document */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Printer className="w-3.5 h-3.5 text-rose-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Official PDF Printout</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-left transition hover:border-rose-300 hover:bg-rose-50 hover:shadow-sm active:scale-[0.98]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                <Printer className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-civic-navy">Print / Save as PDF</span>
                <span className="block text-xs text-slate-500 mt-0.5">Official report with LGU letterhead, KPIs & signatures</span>
              </span>
            </button>
          </div>
        </div>

        {/* Format category 2: Word Documents */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Official Word Documents (.doc)</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleFullWordReport}
              className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm active:scale-[0.98]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <FileText className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-civic-navy">Full Audit Report (Word Doc)</span>
                <span className="block text-xs text-slate-500 mt-0.5">Executive summary, ledgers & signature blocks</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleWordExport({
                filename: `budget_expenses_summary_${fyFilter}.doc`,
                title: 'BUDGET ALLOCATIONS & EXPENSES REPORT',
                summaryCards: [
                  { label: 'Total Allocated', value: phpFmt(totalBudget) },
                  { label: 'Total Spent', value: phpFmt(totalExpenses) },
                  { label: 'Utilization', value: `${utilization.toFixed(1)}%` },
                  { label: 'Remaining', value: phpFmt(remaining) },
                ],
                tables: [
                  {
                    title: 'Budget Allocations',
                    columns: [
                      { key: 'fiscal_year', label: 'Fiscal Year', align: 'center' },
                      { key: 'category', label: 'Category' },
                      { key: 'description', label: 'Description' },
                      { key: 'amount', label: 'Amount', format: 'currency', align: 'right' },
                    ],
                    rows: filteredAllocations,
                  },
                  {
                    title: 'Recorded Expenses',
                    columns: [
                      { key: 'date_incurred', label: 'Date', align: 'center' },
                      { key: 'category', label: 'Category' },
                      { key: 'status', label: 'Status', align: 'center' },
                      { key: 'amount', label: 'Amount', format: 'currency', align: 'right' },
                    ],
                    rows: filteredExpenses,
                  },
                ],
              })}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-white hover:shadow-sm active:scale-[0.98]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <FileDown className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-civic-navy">Budget &amp; Expenses Doc</span>
                <span className="block text-xs text-slate-500 mt-0.5">Budget & expenses for council presentations</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleWordExport({
                filename: `programs_accomplishments_${fyFilter}.doc`,
                title: 'PROGRAMS & PROJECTS ACCOMPLISHMENT REPORT',
                tables: [
                  {
                    title: 'Community Programs & Beneficiaries',
                    columns: [
                      { key: 'title', label: 'Title' },
                      { key: 'category', label: 'Category' },
                      { key: 'status', label: 'Status', align: 'center' },
                      { key: 'beneficiary_category', label: 'Beneficiary Sector' },
                      { key: 'budget_amount', label: 'Budget', format: 'currency', align: 'right' },
                      { key: 'beneficiaries_count', label: 'Beneficiaries', format: 'number', align: 'right' },
                    ],
                    rows: exportPrograms,
                  },
                ],
              })}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-white hover:shadow-sm active:scale-[0.98]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <FileDown className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-civic-navy">Programs Accomplishment Doc</span>
                <span className="block text-xs text-slate-500 mt-0.5">Programs & sector reach for DILG filing</span>
              </span>
            </button>
          </div>
        </div>

        {/* Format category 3: Excel Workbooks */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Formatted Excel Spreadsheets (.xlsx)</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Budget Allocations',
                desc: 'Fiscal year, category, allocations',
                onClick: () => handleExcelExport({
                  filename: 'budget_allocations.xlsx',
                  title: 'Budget Allocations Report',
                  summary: `${filteredAllocations.length} allocations  |  Total: ${phpFmt(totalBudget)}`,
                  rows: filteredAllocations,
                  columns: [
                    { key: 'fiscal_year', label: 'Fiscal Year', align: 'center' },
                    { key: 'category', label: 'Category' },
                    { key: 'amount', label: 'Amount', format: 'currency' },
                    { key: 'description', label: 'Description', width: 38 },
                  ],
                }),
              },
              {
                label: 'Recorded Expenses',
                desc: 'Date, category, status, amounts',
                onClick: () => handleExcelExport({
                  filename: 'expenses.xlsx',
                  title: 'Recorded Expenses Report',
                  summary: `${filteredExpenses.length} transactions  |  Total: ${phpFmt(totalExpenses)}`,
                  rows: filteredExpenses,
                  columns: [
                    { key: 'date_incurred', label: 'Date', align: 'center' },
                    { key: 'category', label: 'Category' },
                    { key: 'amount', label: 'Amount', format: 'currency' },
                    { key: 'status', label: 'Status', align: 'center' },
                  ],
                }),
              },
              {
                label: 'Fund Sources',
                desc: 'Source name, type, fiscal year',
                onClick: () => handleExcelExport({
                  filename: 'fund_sources.xlsx',
                  title: 'Fund Sources Report',
                  summary: `${periodFunds.length} sources  |  Total: ${phpFmt(totalFunds)}`,
                  rows: periodFunds,
                  columns: [
                    { key: 'name', label: 'Source Name', width: 28 },
                    { key: 'source_type', label: 'Type' },
                    { key: 'fiscal_year', label: 'Fiscal Year', align: 'center' },
                    { key: 'amount', label: 'Amount', format: 'currency' },
                  ],
                }),
              },
              {
                label: 'Programs & Projects',
                desc: 'Title, budget, beneficiaries',
                onClick: () => handleExcelExport({
                  filename: 'programs.xlsx',
                  title: 'Programs & Projects Accomplishment',
                  rows: exportPrograms,
                  columns: [
                    { key: 'title', label: 'Title', width: 30 },
                    { key: 'status', label: 'Status', align: 'center' },
                    { key: 'category', label: 'Category' },
                    { key: 'beneficiary_category', label: 'Beneficiary Sector', width: 22 },
                    { key: 'budget_amount', label: 'Budget', format: 'currency' },
                    { key: 'beneficiaries_count', label: 'Beneficiaries', format: 'number' },
                  ],
                }),
              },
            ].map(({ label, desc, onClick }) => (
              <button
                key={label}
                type="button"
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left transition hover:border-emerald-300 hover:bg-white hover:shadow-sm active:scale-[0.98]"
                onClick={onClick}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-civic-navy">{label}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">{desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <ErrorBanner message={exportError} />
      </div>
    </div>
  );
}
