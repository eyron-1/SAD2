import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { BarChart3, Download, PieChart as PieIcon, Landmark, Receipt, Percent, FolderKanban, FileSpreadsheet } from 'lucide-react';

const COLORS = ['#0F2D4A', '#0D9488', '#D97706', '#B4472B', '#1E4258', '#6D28D9'];

function toCSV(rows, headers) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(([, label]) => escape(label)).join(',')];
  rows.forEach((row) => {
    lines.push(headers.map(([key]) => escape(row[key])).join(','));
  });
  return lines.join('\n');
}

function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsAnalytics() {
  const { profile } = useAuth();
  const { rows: allocations, error: e1 } = useSupabaseTable('budget_allocations', profile?.barangay_id);
  const { rows: expenses, error: e2 } = useSupabaseTable('expenses', profile?.barangay_id);
  const { rows: funds, error: e3 } = useSupabaseTable('fund_sources', profile?.barangay_id);
  const { rows: programs, error: e4 } = useSupabaseTable('programs', profile?.barangay_id);

  const totalBudget = allocations.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalFunds = funds.reduce((s, r) => s + Number(r.amount || 0), 0);
  const utilization = totalBudget > 0 ? ((totalExpenses / totalBudget) * 100).toFixed(1) : '0.0';

  const expenseByCategory = useMemo(() => {
    const map = {};
    expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const budgetVsExpense = useMemo(() => {
    const byYear = {};
    allocations.forEach((a) => {
      byYear[a.fiscal_year] = byYear[a.fiscal_year] || { fiscal_year: a.fiscal_year, budget: 0, expenses: 0 };
      byYear[a.fiscal_year].budget += Number(a.amount || 0);
    });
    expenses.forEach((e) => {
      const fy = e.date_incurred ? e.date_incurred.slice(0, 4) : 'Unspecified';
      byYear[fy] = byYear[fy] || { fiscal_year: fy, budget: 0, expenses: 0 };
      byYear[fy].expenses += Number(e.amount || 0);
    });
    return Object.values(byYear);
  }, [allocations, expenses]);

  const programStatusCounts = useMemo(() => {
    const map = {};
    programs.forEach((p) => { map[p.status] = (map[p.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [programs]);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-civic-navy flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-civic-emerald" /> Reports & Financial Analytics
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Executive summaries, expenditure breakdowns, and official DILG export datasets.
        </p>
      </div>

      <ErrorBanner message={e1 || e2 || e3 || e4} />

      {/* Metric Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-civic-emerald" /> Total Funds Sourced
          </span>
          <p className="text-2xl font-bold text-civic-navy">₱{totalFunds.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="card space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <PieIcon className="w-4 h-4 text-blue-600" /> Total Allocated
          </span>
          <p className="text-2xl font-bold text-civic-navy">₱{totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="card space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-amber-600" /> Total Spent
          </span>
          <p className="text-2xl font-bold text-civic-navy">₱{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="card space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Percent className="w-4 h-4 text-emerald-600" /> Budget Utilization
          </span>
          <p className="text-2xl font-bold text-civic-navy">{utilization}%</p>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="text-base font-bold text-civic-navy flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-civic-emerald" /> Expenses by Category
          </h2>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="value" nameKey="name" outerRadius={95} innerRadius={45} paddingAngle={4}>
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `₱${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 py-12 text-center">No expense categories recorded yet.</p>
          )}
        </div>

        <div className="card space-y-4">
          <h2 className="text-base font-bold text-civic-navy flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-civic-emerald" /> Budget vs. Expenses by Year
          </h2>
          {budgetVsExpense.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={budgetVsExpense}>
                <XAxis dataKey="fiscal_year" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => `₱${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="budget" fill="#0F2D4A" name="Allocated" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#0D9488" name="Spent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 py-12 text-center">No yearly allocation data available.</p>
          )}
        </div>
      </div>

      {/* Program Summary */}
      <div className="card space-y-3">
        <h2 className="text-base font-bold text-civic-navy flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-civic-emerald" /> Program Execution Breakdown
        </h2>
        <div className="flex gap-3 flex-wrap">
          {programStatusCounts.map((p) => (
            <div key={p.name} className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
              <span className="font-bold text-civic-navy text-sm mr-1">{p.value}</span> {p.name}
            </div>
          ))}
        </div>
      </div>

      {/* Export Raw Data */}
      <div className="card space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-civic-navy flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-civic-emerald" /> Export DILG Audit Data (CSV)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Download full transparent record spreadsheets for offline reporting.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="btn-secondary text-xs"
            onClick={() => downloadCSV('budget_allocations.csv', toCSV(allocations, [['fiscal_year', 'Fiscal Year'], ['category', 'Category'], ['amount', 'Amount'], ['description', 'Description']]))}
          >
            <Download className="w-3.5 h-3.5 text-civic-emerald" /> Export Budget Allocations
          </button>
          <button
            className="btn-secondary text-xs"
            onClick={() => downloadCSV('expenses.csv', toCSV(expenses, [['date_incurred', 'Date'], ['category', 'Category'], ['amount', 'Amount'], ['status', 'Status']]))}
          >
            <Download className="w-3.5 h-3.5 text-civic-emerald" /> Export Recorded Expenses
          </button>
          <button
            className="btn-secondary text-xs"
            onClick={() => downloadCSV('fund_sources.csv', toCSV(funds, [['name', 'Name'], ['source_type', 'Type'], ['fiscal_year', 'FY'], ['amount', 'Amount']]))}
          >
            <Download className="w-3.5 h-3.5 text-civic-emerald" /> Export Fund Sources
          </button>
          <button
            className="btn-secondary text-xs"
            onClick={() => {
              const formatted = programs.map((p) => {
                let sector = p.beneficiary_category || '';
                if (!sector && p.description?.startsWith('[Beneficiary: ')) {
                  const match = p.description.match(/^\[Beneficiary:\s*([^\]]+)\]/);
                  if (match) sector = match[1];
                }
                return { ...p, beneficiary_category: sector || 'General Residents' };
              });
              downloadCSV('programs.csv', toCSV(formatted, [
                ['title', 'Title'],
                ['status', 'Status'],
                ['category', 'Category'],
                ['beneficiary_category', 'Beneficiary Sector'],
                ['budget_amount', 'Budget'],
                ['beneficiaries_count', 'Beneficiaries Count'],
              ]));
            }}
          >
            <Download className="w-3.5 h-3.5 text-civic-emerald" /> Export Programs & Projects
          </button>
        </div>
      </div>
    </div>
  );
}

