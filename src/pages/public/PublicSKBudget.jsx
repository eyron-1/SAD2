import { useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';

export default function PublicSKBudget() {
  const { slug } = useParams();
  const { barangay, loading } = usePublicBarangay(slug);
  const { rows: funds, error: fundsError } = useSupabaseTable('sk_fund_sources', barangay?.id);
  const { rows: allocations, error: allocationsError } = useSupabaseTable('sk_budget', barangay?.id);
  const { rows: expenses, error: expensesError } = useSupabaseTable('sk_expenses', barangay?.id, { orderBy: 'date_incurred' });

  if (loading) return <p className="text-civic-slate text-sm">Loading SK budget…</p>;
  return <div className="space-y-8"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Sangguniang Kabataan (SK)</p><h1 className="text-2xl font-display">SK Budget, Funds & Expenses</h1></div><ErrorBanner message={fundsError || allocationsError || expensesError} />
    <section><h2 className="font-medium mb-3">SK Fund Sources and Budget Allocations</h2><div className="card p-0 overflow-hidden"><table className="w-full text-sm"><thead className="bg-emerald-50 text-slate-700 text-left"><tr><th className="px-4 py-2">Record Type</th><th className="px-4 py-2">Fiscal Year</th><th className="px-4 py-2">Category / Source</th><th className="px-4 py-2 text-right">Amount</th></tr></thead><tbody>{funds.map((row) => <tr key={`fund-${row.id}`} className="border-t border-slate-100"><td className="px-4 py-2">Fund Source</td><td className="px-4 py-2">{row.fiscal_year}</td><td className="px-4 py-2">{row.name}</td><td className="px-4 py-2 text-right">₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>)}{allocations.map((row) => <tr key={`allocation-${row.id}`} className="border-t border-slate-100"><td className="px-4 py-2">Budget Allocation</td><td className="px-4 py-2">{row.fiscal_year}</td><td className="px-4 py-2">{row.category}</td><td className="px-4 py-2 text-right">₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>)}{funds.length === 0 && allocations.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No SK funds or allocations published yet.</td></tr>}</tbody></table></div></section>
    <section><h2 className="font-medium mb-3">SK Recorded Expenses</h2><div className="card p-0 overflow-hidden"><table className="w-full text-sm"><thead className="bg-emerald-50 text-slate-700 text-left"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Category</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2">Status</th></tr></thead><tbody>{expenses.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-2">{row.date_incurred}</td><td className="px-4 py-2">{row.category}</td><td className="px-4 py-2 text-right">₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td className="px-4 py-2"><Badge status={row.status} /></td></tr>)}{expenses.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No SK expenses published yet.</td></tr>}</tbody></table></div></section>
  </div>;
}
