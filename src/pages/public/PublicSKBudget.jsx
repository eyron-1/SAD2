import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';
import { activeRows, sumAmounts, sumActiveAmounts } from '../../lib/financial';
import {
  Users,
  Wallet,
  Receipt,
  Calendar,
  PieChart,
  CheckCircle2,
  Search,
  DollarSign,
  ShieldCheck,
  Info
} from 'lucide-react';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function PublicSKBudget() {
  const { slug } = useParams();
  const { barangay, loading } = usePublicBarangay(slug);
  const { rows: funds, error: fundsError, loading: lFunds } = useSupabaseTable('sk_fund_sources', barangay?.id);
  const { rows: allocations, error: allocationsError, loading: lAlloc } = useSupabaseTable('sk_budget', barangay?.id);
  const { rows: expenses, error: expensesError, loading: lExp } = useSupabaseTable('sk_expenses', barangay?.id, { orderBy: 'date_incurred' });

  const [subTab, setSubTab] = useState('funds'); // 'funds' | 'expenses'
  const [selectedYear, setSelectedYear] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Collect distinct fiscal years
  const availableYears = useMemo(() => {
    const years = new Set();
    funds.forEach((r) => r.fiscal_year && years.add(String(r.fiscal_year)));
    allocations.forEach((r) => r.fiscal_year && years.add(String(r.fiscal_year)));
    expenses.forEach((r) => r.date_incurred && years.add(r.date_incurred.slice(0, 4)));
    return Array.from(years).sort().reverse();
  }, [funds, allocations, expenses]);

  // Filters
  const filteredFunds = useMemo(() => {
    return funds.filter((item) => {
      const matchYear = selectedYear === 'all' || String(item.fiscal_year) === selectedYear;
      const matchSearch = !searchTerm || item.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchYear && matchSearch;
    });
  }, [funds, selectedYear, searchTerm]);

  const filteredAllocations = useMemo(() => {
    return allocations.filter((item) => {
      const matchYear = selectedYear === 'all' || String(item.fiscal_year) === selectedYear;
      const matchSearch = !searchTerm || item.category?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchYear && matchSearch;
    });
  }, [allocations, selectedYear, searchTerm]);

  const filteredExpenses = useMemo(() => {
    return activeRows(expenses).filter((item) => {
      const year = item.date_incurred?.slice(0, 4);
      const matchYear = selectedYear === 'all' || year === selectedYear;
      const matchSearch =
        !searchTerm ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchYear && matchSearch;
    });
  }, [expenses, selectedYear, searchTerm]);

  // Financial calculations
  const totalFunds = useMemo(() => sumAmounts(filteredFunds), [filteredFunds]);
  const totalBudget = useMemo(() => sumAmounts(filteredAllocations), [filteredAllocations]);
  const totalSpent = useMemo(() => sumActiveAmounts(filteredExpenses), [filteredExpenses]);
  const effectiveBudget = totalBudget > 0 ? totalBudget : totalFunds;
  const remaining = effectiveBudget - totalSpent;
  const utilizationRate = effectiveBudget > 0 ? Math.min(100, Math.round((totalSpent / effectiveBudget) * 100)) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading SK youth financial records…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Sangguniang Kabataan Transparency
            </div>
            <h1 className="text-2xl sm:text-3xl font-display text-emerald-950 font-bold">
              SK Budget, Funds & Expenses
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Track the statutory 10% youth fund allocation, operational budgets, and verified disbursements for youth programs in{' '}
              <span className="font-semibold text-emerald-900">{barangay?.name || 'the barangay'}</span>.
            </p>
          </div>

          {/* Fiscal Year Filter */}
          <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200/70 rounded-xl px-3 py-1.5 text-xs text-emerald-900 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <label htmlFor="sk-year-select" className="font-semibold">Fiscal Year:</label>
            <select
              id="sk-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-bold text-emerald-950 focus:outline-none cursor-pointer"
            >
              <option value="all">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>FY {yr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="mt-6 pt-5 border-t border-emerald-100 flex items-center gap-3 text-xs text-slate-600 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
          <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
            <Info className="w-3.5 h-3.5" />
          </div>
          <p>
            Under RA 10742 (SK Reform Act), ten percent (10%) of the general fund of the barangay is earmarked for youth development and managed transparently by the Sangguniang Kabataan.
          </p>
        </div>
      </div>

      <ErrorBanner message={fundsError || allocationsError || expensesError} />

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total SK Budget</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-950">{formatCurrency(effectiveBudget)}</div>
          <p className="text-[11px] text-slate-500">{selectedYear === 'all' ? 'All recorded years' : `Fiscal Year ${selectedYear}`}</p>
        </div>

        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Youth Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalSpent)}</div>
          <p className="text-[11px] text-slate-500"><span className="font-semibold text-slate-700">{utilizationRate}%</span> utilized</p>
        </div>

        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining Balance</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${remaining < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${remaining < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {formatCurrency(remaining)}
          </div>
          <p className="text-[11px] text-slate-500">{remaining < 0 ? '⚠️ Over recorded budget' : 'Available youth funds'}</p>
        </div>

        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${remaining < 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {remaining < 0 ? 'BUDGET WATCH' : 'ON TRACK'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${utilizationRate > 90 ? 'bg-rose-500' : 'bg-emerald-600'}`}
              style={{ width: `${utilizationRate}%` }}
            />
          </div>
        </div>
      </section>

      {/* Records Section with Search and Sub-tabs */}
      <section className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-emerald-100 bg-emerald-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-emerald-100/70 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setSubTab('funds')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                subTab === 'funds' ? 'bg-white text-emerald-950 shadow-xs' : 'text-emerald-800 hover:text-emerald-950'
              }`}
            >
              Funds & Allocations ({filteredFunds.length + filteredAllocations.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('expenses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                subTab === 'expenses' ? 'bg-white text-emerald-950 shadow-xs' : 'text-emerald-800 hover:text-emerald-950'
              }`}
            >
              Recorded Expenses ({filteredExpenses.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search category or name…"
              className="w-full pl-9 pr-3 py-2 bg-white border border-emerald-200/70 rounded-xl text-xs sm:text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {subTab === 'funds' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-50/50 text-emerald-900 text-xs uppercase tracking-wider border-b border-emerald-100">
                <tr>
                  <th className="px-5 py-3.5">Record Type</th>
                  <th className="px-5 py-3.5">Fiscal Year</th>
                  <th className="px-5 py-3.5">Category / Source</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {(lFunds || lAlloc) && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">Loading SK records…</td>
                  </tr>
                )}
                {!lFunds && !lAlloc && filteredFunds.length === 0 && filteredAllocations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                      No SK funds or allocations found matching this criteria.
                    </td>
                  </tr>
                )}
                {filteredFunds.map((row) => (
                  <tr key={`fund-${row.id}`} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        Fund Source
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-700">FY {row.fiscal_year}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{row.name}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))}
                {filteredAllocations.map((row) => (
                  <tr key={`allocation-${row.id}`} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
                        Budget Allocation
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-700">FY {row.fiscal_year}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{row.category}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {(filteredFunds.length > 0 || filteredAllocations.length > 0) && (
                <tfoot className="bg-emerald-50/40 border-t border-emerald-100 font-semibold text-xs text-slate-700">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right">Total Funds / Allocations:</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-emerald-900">{formatCurrency(effectiveBudget)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-50/50 text-emerald-900 text-xs uppercase tracking-wider border-b border-emerald-100">
                <tr>
                  <th className="px-5 py-3.5">Date Incurred</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {lExp && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading SK expenses…</td>
                  </tr>
                )}
                {!lExp && filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                      No SK expenses found matching this criteria.
                    </td>
                  </tr>
                )}
                {filteredExpenses.map((row) => (
                  <tr key={row.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {formatDate(row.date_incurred)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-emerald-950">{row.category}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs max-w-xs truncate">{row.description || '—'}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredExpenses.length > 0 && (
                <tfoot className="bg-emerald-50/40 border-t border-emerald-100 font-semibold text-xs text-slate-700">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right">Total Recorded Expenses:</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-rose-700">{formatCurrency(totalSpent)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
