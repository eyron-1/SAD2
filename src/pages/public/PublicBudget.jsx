import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';
import ImageLightbox from '../../components/ui/ImageLightbox';
import { activeRows, sumAmounts, sumActiveAmounts } from '../../lib/financial';
import {
  Building2,
  Users,
  Wallet,
  Receipt,
  Calendar,
  PieChart,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Search,
  Layers,
  FileText,
  ExternalLink,
  ShieldCheck,
  Info,
  DollarSign,
  ArrowUpRight,
  Filter,
  Check
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

export default function PublicBudget() {
  const { slug } = useParams();
  const { barangay, loading: bLoading } = usePublicBarangay(slug);
  const { rows: allocations, loading: l1, error: e1 } = useSupabaseTable('budget_allocations', barangay?.id);
  const { rows: expenses, loading: l2, error: e2 } = useSupabaseTable('expenses', barangay?.id, { orderBy: 'date_incurred' });
  const { rows: skAllocations, loading: l3, error: e3 } = useSupabaseTable('sk_budget', barangay?.id);
  const { rows: skFunds, loading: l4, error: e4 } = useSupabaseTable('sk_fund_sources', barangay?.id);
  const { rows: skExpenses, loading: l5, error: e5 } = useSupabaseTable('sk_expenses', barangay?.id, { orderBy: 'date_incurred' });

  // Navigation & Filtering state
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'barangay' | 'sk'
  const [barangaySubTab, setBarangaySubTab] = useState('allocations'); // 'allocations' | 'expenses' | 'categories'
  const [skSubTab, setSkSubTab] = useState('funds'); // 'funds' | 'expenses'
  const [selectedYear, setSelectedYear] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Collect distinct fiscal years for filter
  const availableYears = useMemo(() => {
    const years = new Set();
    allocations.forEach((r) => r.fiscal_year && years.add(String(r.fiscal_year)));
    expenses.forEach((r) => r.date_incurred && years.add(r.date_incurred.slice(0, 4)));
    skFunds.forEach((r) => r.fiscal_year && years.add(String(r.fiscal_year)));
    skAllocations.forEach((r) => r.fiscal_year && years.add(String(r.fiscal_year)));
    skExpenses.forEach((r) => r.date_incurred && years.add(r.date_incurred.slice(0, 4)));
    return Array.from(years).sort().reverse();
  }, [allocations, expenses, skFunds, skAllocations, skExpenses]);

  // Filtered lists based on fiscal year and search term
  const filteredBarangayAllocations = useMemo(() => {
    return allocations.filter((item) => {
      const matchYear = selectedYear === 'all' || String(item.fiscal_year) === selectedYear;
      const matchSearch =
        !searchTerm ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchYear && matchSearch;
    });
  }, [allocations, selectedYear, searchTerm]);

  const filteredBarangayExpenses = useMemo(() => {
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

  const filteredSkFunds = useMemo(() => {
    return skFunds.filter((item) => {
      const matchYear = selectedYear === 'all' || String(item.fiscal_year) === selectedYear;
      const matchSearch =
        !searchTerm ||
        item.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchYear && matchSearch;
    });
  }, [skFunds, selectedYear, searchTerm]);

  const filteredSkAllocations = useMemo(() => {
    return skAllocations.filter((item) => {
      const matchYear = selectedYear === 'all' || String(item.fiscal_year) === selectedYear;
      const matchSearch =
        !searchTerm ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchYear && matchSearch;
    });
  }, [skAllocations, selectedYear, searchTerm]);

  const filteredSkExpenses = useMemo(() => {
    return activeRows(skExpenses).filter((item) => {
      const year = item.date_incurred?.slice(0, 4);
      const matchYear = selectedYear === 'all' || year === selectedYear;
      const matchSearch =
        !searchTerm ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchYear && matchSearch;
    });
  }, [skExpenses, selectedYear, searchTerm]);

  // Financial calculations
  const totalBarangayBudget = useMemo(() => sumAmounts(filteredBarangayAllocations), [filteredBarangayAllocations]);
  const totalBarangaySpent = useMemo(() => sumActiveAmounts(filteredBarangayExpenses), [filteredBarangayExpenses]);
  const remainingBarangay = totalBarangayBudget - totalBarangaySpent;
  const barangayUtilizationRate = totalBarangayBudget > 0
    ? Math.min(100, Math.round((totalBarangaySpent / totalBarangayBudget) * 100))
    : 0;

  const totalSkFundAmount = useMemo(() => sumAmounts(filteredSkFunds), [filteredSkFunds]);
  const totalSkBudget = useMemo(() => sumAmounts(filteredSkAllocations), [filteredSkAllocations]);
  const totalSkSpent = useMemo(() => sumActiveAmounts(filteredSkExpenses), [filteredSkExpenses]);
  const effectiveSkBudget = totalSkBudget > 0 ? totalSkBudget : totalSkFundAmount;
  const remainingSk = effectiveSkBudget - totalSkSpent;
  const skUtilizationRate = effectiveSkBudget > 0
    ? Math.min(100, Math.round((totalSkSpent / effectiveSkBudget) * 100))
    : 0;

  // Category breakdown comparison for Barangay (Allocated vs Spent)
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filteredBarangayAllocations.forEach((item) => {
      const cat = item.category || 'General';
      if (!map[cat]) map[cat] = { category: cat, allocated: 0, spent: 0 };
      map[cat].allocated += Number(item.amount || 0);
    });

    filteredBarangayExpenses.forEach((item) => {
      const cat = item.category || 'General';
      if (!map[cat]) map[cat] = { category: cat, allocated: 0, spent: 0 };
      map[cat].spent += Number(item.amount || 0);
    });

    return Object.values(map).sort((a, b) => b.allocated - a.allocated);
  }, [filteredBarangayAllocations, filteredBarangayExpenses]);

  // Combined totals for "All" tab
  const grandTotalBudget = totalBarangayBudget + effectiveSkBudget;
  const grandTotalSpent = totalBarangaySpent + totalSkSpent;
  const grandRemaining = grandTotalBudget - grandTotalSpent;
  const grandUtilizationRate = grandTotalBudget > 0
    ? Math.min(100, Math.round((grandTotalSpent / grandTotalBudget) * 100))
    : 0;

  const isLoading = bLoading || l1 || l2 || l3 || l4 || l5;

  if (bLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <div className="w-10 h-10 border-4 border-civic-navy/20 border-t-civic-navy rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading barangay financial records…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-civic-navy/5 via-civic-emerald/5 to-transparent rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-civic-navy/10 text-civic-navy border border-civic-navy/15">
              <ShieldCheck className="w-3.5 h-3.5 text-civic-emerald" />
              Official Full Disclosure Transparency Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-display text-civic-navy font-bold">
              Barangay & SK Budget and Expenses
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Explore how public funds, annual allocations, and youth budgets are utilized in{' '}
              <span className="font-semibold text-civic-navy">{barangay?.name || 'the barangay'}</span>. Every transaction is transparent and backed by verified records.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <label htmlFor="year-select" className="font-semibold">Fiscal Year:</label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent font-bold text-civic-navy focus:outline-none cursor-pointer"
              >
                <option value="all">All Years</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    FY {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Informational Guidance Callout */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs text-slate-600 bg-slate-50/70 p-3.5 rounded-xl border">
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Info className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-slate-800">How to read this portal:</span>{' '}
            <span className="text-slate-600">
              <strong>Allocations</strong> represent approved planned budgets for designated community services.{' '}
              <strong>Recorded Expenses</strong> reflect official disbursements made with submitted receipts.
            </span>
          </div>
        </div>
      </div>

      <ErrorBanner message={e1 || e2 || e3 || e4 || e5} />

      {/* Scope Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-civic-navy shadow-sm'
                : 'text-slate-600 hover:text-civic-navy hover:bg-white/50'
            }`}
          >
            <Layers className="w-4 h-4 text-civic-slate" />
            Combined Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('barangay')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'barangay'
                ? 'bg-white text-civic-navy shadow-sm'
                : 'text-slate-600 hover:text-civic-navy hover:bg-white/50'
            }`}
          >
            <Building2 className="w-4 h-4 text-civic-navy" />
            Barangay Government
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sk')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'sk'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-emerald-800 hover:bg-white/50'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            Sangguniang Kabataan (SK)
          </button>
        </div>

        {/* Global Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search category or item…"
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:border-civic-navy focus:ring-1 focus:ring-civic-navy/20 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Financial Health & KPI Summary Cards */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Allocated */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {activeTab === 'all'
                  ? 'Total Funds Allocated'
                  : activeTab === 'barangay'
                  ? 'Barangay Budget'
                  : 'SK Total Budget'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(
                activeTab === 'all'
                  ? grandTotalBudget
                  : activeTab === 'barangay'
                  ? totalBarangayBudget
                  : effectiveSkBudget
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {selectedYear === 'all' ? 'All recorded fiscal years' : `Fiscal Year ${selectedYear}`}
            </p>
          </div>

          {/* Card 2: Total Spent */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {activeTab === 'all'
                  ? 'Total Expenses Spent'
                  : activeTab === 'barangay'
                  ? 'Barangay Expenses'
                  : 'SK Youth Expenses'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(
                activeTab === 'all'
                  ? grandTotalSpent
                  : activeTab === 'barangay'
                  ? totalBarangaySpent
                  : totalSkSpent
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">
                {activeTab === 'all'
                  ? grandUtilizationRate
                  : activeTab === 'barangay'
                  ? barangayUtilizationRate
                  : skUtilizationRate}
                %
              </span>{' '}
              of recorded allocation spent
            </div>
          </div>

          {/* Card 3: Remaining Balance */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Remaining Balance
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  (activeTab === 'all' ? grandRemaining : activeTab === 'barangay' ? remainingBarangay : remainingSk) < 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl font-bold ${
                (activeTab === 'all' ? grandRemaining : activeTab === 'barangay' ? remainingBarangay : remainingSk) < 0
                  ? 'text-rose-600'
                  : 'text-emerald-700'
              }`}
            >
              {formatCurrency(
                activeTab === 'all'
                  ? grandRemaining
                  : activeTab === 'barangay'
                  ? remainingBarangay
                  : remainingSk
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {(activeTab === 'all' ? grandRemaining : activeTab === 'barangay' ? remainingBarangay : remainingSk) < 0
                ? '⚠️ Spending exceeds current allocation'
                : 'Available unspent budget'}
            </p>
          </div>

          {/* Card 4: Budget Status */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Financial Status
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                  (activeTab === 'all' ? grandRemaining : activeTab === 'barangay' ? remainingBarangay : remainingSk) < 0
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {(activeTab === 'all' ? grandRemaining : activeTab === 'barangay' ? remainingBarangay : remainingSk) < 0
                  ? 'BUDGET WATCH'
                  : 'ON TRACK'}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (activeTab === 'all' ? grandUtilizationRate : activeTab === 'barangay' ? barangayUtilizationRate : skUtilizationRate) > 90
                    ? 'bg-rose-500'
                    : 'bg-civic-emerald'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    activeTab === 'all'
                      ? grandUtilizationRate
                      : activeTab === 'barangay'
                      ? barangayUtilizationRate
                      : skUtilizationRate
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Spending Breakdown (Budget vs Spent) - Great for user comprehension! */}
      {(activeTab === 'all' || activeTab === 'barangay') && categoryBreakdown.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-civic-navy flex items-center gap-2">
                <PieChart className="w-5 h-5 text-civic-emerald" />
                Barangay Spending by Category (Budget vs. Actual Spent)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Compare allocated budgets against actual disbursements per sector.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {categoryBreakdown.map((item) => {
              const pct = item.allocated > 0 ? Math.min(100, Math.round((item.spent / item.allocated) * 100)) : 0;
              const isOver = item.spent > item.allocated && item.allocated > 0;
              return (
                <div key={item.category} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900">{item.category}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOver ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}`}>
                      {pct}% Used
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isOver ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-civic-leaf'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Allocated</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(item.allocated)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase">Spent</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(item.spent)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase">Remaining</span>
                      <span className={`font-semibold ${item.allocated - item.spent < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {formatCurrency(item.allocated - item.spent)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Detailed Tables Section: Barangay Government */}
      {(activeTab === 'all' || activeTab === 'barangay') && (
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-civic-navy/10 text-civic-navy flex items-center justify-center font-bold shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-civic-navy">Barangay Government Records</h2>
                <p className="text-xs text-slate-500">Official budget allocations and recorded expenditures</p>
              </div>
            </div>

            {/* Sub-tab pills for Barangay */}
            <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setBarangaySubTab('allocations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  barangaySubTab === 'allocations'
                    ? 'bg-white text-civic-navy shadow-xs'
                    : 'text-slate-600 hover:text-civic-navy'
                }`}
              >
                Budget Allocations ({filteredBarangayAllocations.length})
              </button>
              <button
                type="button"
                onClick={() => setBarangaySubTab('expenses')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  barangaySubTab === 'expenses'
                    ? 'bg-white text-civic-navy shadow-xs'
                    : 'text-slate-600 hover:text-civic-navy'
                }`}
              >
                Recorded Expenses ({filteredBarangayExpenses.length})
              </button>
            </div>
          </div>

          {/* Barangay Sub-Tab 1: Budget Allocations Table */}
          {barangaySubTab === 'allocations' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200/70">
                  <tr>
                    <th className="px-5 py-3.5">Fiscal Year</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Description / Purpose</th>
                    <th className="px-5 py-3.5 text-right">Allocated Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {l1 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                        Loading allocations…
                      </td>
                    </tr>
                  )}
                  {!l1 && filteredBarangayAllocations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center">
                        <div className="max-w-xs mx-auto text-slate-400 space-y-1">
                          <Wallet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-600 text-sm">No allocations found</p>
                          <p className="text-xs">No budget records match the selected fiscal year or search criteria.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredBarangayAllocations.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          FY {row.fiscal_year}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-civic-navy">{row.category}</td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs max-w-xs truncate">
                        {row.description || 'General allocation for community development'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filteredBarangayAllocations.length > 0 && (
                  <tfoot className="bg-slate-50/70 border-t border-slate-200 font-semibold text-xs text-slate-700">
                    <tr>
                      <td colSpan={3} className="px-5 py-3 text-right">
                        Total Allocated:
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-civic-navy">
                        {formatCurrency(totalBarangayBudget)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Barangay Sub-Tab 2: Recorded Expenses Table */}
          {barangaySubTab === 'expenses' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200/70">
                  <tr>
                    <th className="px-5 py-3.5">Date Incurred</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5 text-right">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {l2 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        Loading expenses…
                      </td>
                    </tr>
                  )}
                  {!l2 && filteredBarangayExpenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center">
                        <div className="max-w-xs mx-auto text-slate-400 space-y-1">
                          <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-semibold text-slate-600 text-sm">No expenses found</p>
                          <p className="text-xs">No recorded expenses match the current filter.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredBarangayExpenses.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap text-xs font-medium">
                        {formatDate(row.date_incurred)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-civic-navy">{row.category}</td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs max-w-xs truncate">
                        {row.description || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Badge status={row.status} />
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {row.receipt_url ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(row.receipt_url)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-civic-navy bg-civic-navy/5 hover:bg-civic-navy/10 border border-civic-navy/15 transition-colors"
                          >
                            <FileText className="w-3 h-3 text-civic-emerald" />
                            View
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filteredBarangayExpenses.length > 0 && (
                  <tfoot className="bg-slate-50/70 border-t border-slate-200 font-semibold text-xs text-slate-700">
                    <tr>
                      <td colSpan={3} className="px-5 py-3 text-right">
                        Total Recorded Expenses:
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-rose-700">
                        {formatCurrency(totalBarangaySpent)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </section>
      )}

      {/* Detailed Tables Section: Sangguniang Kabataan (SK) */}
      {(activeTab === 'all' || activeTab === 'sk') && (
        <section className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="p-5 sm:p-6 border-b border-emerald-100/80 bg-emerald-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-emerald-950">Sangguniang Kabataan (SK) Finances</h2>
                <p className="text-xs text-emerald-800/70">Youth fund sources, statutory allocations & youth project expenses</p>
              </div>
            </div>

            {/* Sub-tab pills for SK */}
            <div className="flex items-center gap-1.5 bg-emerald-100/70 p-1 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setSkSubTab('funds')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  skSubTab === 'funds'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-emerald-800 hover:text-emerald-950'
                }`}
              >
                Funds & Allocations ({filteredSkFunds.length + filteredSkAllocations.length})
              </button>
              <button
                type="button"
                onClick={() => setSkSubTab('expenses')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  skSubTab === 'expenses'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-emerald-800 hover:text-emerald-950'
                }`}
              >
                SK Expenses ({filteredSkExpenses.length})
              </button>
            </div>
          </div>

          {/* SK Sub-Tab 1: Fund Sources & Allocations Table */}
          {skSubTab === 'funds' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-emerald-50/60 text-emerald-900 text-xs uppercase tracking-wider border-b border-emerald-100">
                  <tr>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Fiscal Year</th>
                    <th className="px-5 py-3.5">Category / Source Name</th>
                    <th className="px-5 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {(l3 || l4) && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                        Loading SK funds & allocations…
                      </td>
                    </tr>
                  )}
                  {!l3 && !l4 && filteredSkFunds.length === 0 && filteredSkAllocations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center">
                        <div className="max-w-xs mx-auto text-slate-400 space-y-1">
                          <Wallet className="w-8 h-8 mx-auto text-emerald-300 mb-2" />
                          <p className="font-semibold text-slate-600 text-sm">No SK funds published</p>
                          <p className="text-xs">No SK fund records match the current filter.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredSkFunds.map((row) => (
                    <tr key={`sk-fund-${row.id}`} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Fund Source
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap text-xs">
                        FY {row.fiscal_year}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{row.name}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                  {filteredSkAllocations.map((row) => (
                    <tr key={`sk-alloc-${row.id}`} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
                          Budget Allocation
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap text-xs">
                        FY {row.fiscal_year}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{row.category}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {(filteredSkFunds.length > 0 || filteredSkAllocations.length > 0) && (
                  <tfoot className="bg-emerald-50/40 border-t border-emerald-100 font-semibold text-xs text-slate-700">
                    <tr>
                      <td colSpan={3} className="px-5 py-3 text-right">
                        Total SK Budget / Funds:
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-emerald-900">
                        {formatCurrency(effectiveSkBudget)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* SK Sub-Tab 2: Recorded Expenses Table */}
          {skSubTab === 'expenses' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-emerald-50/60 text-emerald-900 text-xs uppercase tracking-wider border-b border-emerald-100">
                  <tr>
                    <th className="px-5 py-3.5">Date Incurred</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5 text-right">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {l5 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                        Loading SK expenses…
                      </td>
                    </tr>
                  )}
                  {!l5 && filteredSkExpenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center">
                        <div className="max-w-xs mx-auto text-slate-400 space-y-1">
                          <Receipt className="w-8 h-8 mx-auto text-emerald-300 mb-2" />
                          <p className="font-semibold text-slate-600 text-sm">No SK expenses found</p>
                          <p className="text-xs">No SK expenses match the current filter.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredSkExpenses.map((row) => (
                    <tr key={row.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap text-xs font-medium">
                        {formatDate(row.date_incurred)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-emerald-950">{row.category}</td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs max-w-xs truncate">
                        {row.description || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Badge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filteredSkExpenses.length > 0 && (
                  <tfoot className="bg-emerald-50/40 border-t border-emerald-100 font-semibold text-xs text-slate-700">
                    <tr>
                      <td colSpan={3} className="px-5 py-3 text-right">
                        Total SK Expenses:
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-rose-700">
                        {formatCurrency(totalSkSpent)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </section>
      )}

      {/* Receipt Modal Preview */}
      {selectedReceipt && (
        <ImageLightbox src={selectedReceipt} alt="Expense Receipt" onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  );
}
