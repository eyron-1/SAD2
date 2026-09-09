import { useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';

export default function PublicBudget() {
  const { slug } = useParams();
  const { barangay, loading: bLoading } = usePublicBarangay(slug);
  const { rows: allocations, loading: l1, error: e1 } = useSupabaseTable('budget_allocations', barangay?.id);
  const { rows: expenses, loading: l2, error: e2 } = useSupabaseTable('expenses', barangay?.id, { orderBy: 'date_incurred' });
  const { rows: skAllocations, loading: l3, error: e3 } = useSupabaseTable('sk_budget', barangay?.id);
  const { rows: skFunds, loading: l4, error: e4 } = useSupabaseTable('sk_fund_sources', barangay?.id);
  const { rows: skExpenses, loading: l5, error: e5 } = useSupabaseTable('sk_expenses', barangay?.id, { orderBy: 'date_incurred' });

  if (bLoading) return <p className="text-civic-slate text-sm">Loading…</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-display">Barangay & SK Budget and Expenses</h1>
      <ErrorBanner message={e1 || e2 || e3 || e4 || e5} />

      <section>
        <h2 className="font-medium mb-3">Barangay Government Budget Allocations</h2>
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-civic-navy/5 text-civic-slate text-left">
              <tr><th className="px-4 py-2">Fiscal Year</th><th className="px-4 py-2">Category</th><th className="px-4 py-2 text-right">Amount</th></tr>
            </thead>
            <tbody>
              {l1 && <tr><td colSpan={3} className="px-4 py-6 text-center text-civic-slate">Loading…</td></tr>}
              {!l1 && allocations.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-civic-slate">No allocations published yet.</td></tr>}
              {allocations.map((row) => (
                <tr key={row.id} className="border-t border-civic-navy/5">
                  <td className="px-4 py-2">{row.fiscal_year}</td>
                  <td className="px-4 py-2">{row.category}</td>
                  <td className="px-4 py-2 text-right">₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-3">SK Funds and Budget Allocations</h2>
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50 text-civic-slate text-left">
              <tr><th className="px-4 py-2">Record Type</th><th className="px-4 py-2">Fiscal Year</th><th className="px-4 py-2">Category / Source</th><th className="px-4 py-2 text-right">Amount</th></tr>
            </thead>
            <tbody>
              {(l3 || l4) && <tr><td colSpan={4} className="px-4 py-6 text-center text-civic-slate">Loading SK funds and allocations…</td></tr>}
              {!l3 && !l4 && skAllocations.length === 0 && skFunds.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-civic-slate">No SK funds or allocations published yet.</td></tr>}
              {!l3 && skFunds.map((row) => <tr key={`fund-${row.id}`} className="border-t border-civic-navy/5"><td className="px-4 py-2">Fund Source</td><td className="px-4 py-2">{row.fiscal_year}</td><td className="px-4 py-2">{row.name}</td><td className="px-4 py-2 text-right">₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>)}
              {!l4 && skAllocations.map((row) => <tr key={`allocation-${row.id}`} className="border-t border-civic-navy/5"><td className="px-4 py-2">Allocation</td><td className="px-4 py-2">{row.fiscal_year}</td><td className="px-4 py-2">{row.category}</td><td className="px-4 py-2 text-right">₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-3">SK Recorded Expenses</h2>
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-emerald-50 text-civic-slate text-left"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Category</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2">Status</th></tr></thead>
            <tbody>
              {l5 && <tr><td colSpan={4} className="px-4 py-6 text-center text-civic-slate">Loading SK expenses…</td></tr>}
              {!l5 && skExpenses.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-civic-slate">No SK expenses published yet.</td></tr>}
              {skExpenses.map((row) => <tr key={row.id} className="border-t border-civic-navy/5"><td className="px-4 py-2">{row.date_incurred}</td><td className="px-4 py-2">{row.category}</td><td className="px-4 py-2 text-right">₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td className="px-4 py-2"><Badge status={row.status} /></td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-3">Barangay Government Recorded Expenses</h2>
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-civic-navy/5 text-civic-slate text-left">
              <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Category</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Receipt</th></tr>
            </thead>
            <tbody>
              {l2 && <tr><td colSpan={5} className="px-4 py-6 text-center text-civic-slate">Loading…</td></tr>}
              {!l2 && expenses.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-civic-slate">No expenses published yet.</td></tr>}
              {expenses.map((row) => (
                <tr key={row.id} className="border-t border-civic-navy/5">
                  <td className="px-4 py-2">{row.date_incurred}</td>
                  <td className="px-4 py-2">{row.category}</td>
                  <td className="px-4 py-2 text-right">₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2"><Badge status={row.status} /></td>
                  <td className="px-4 py-2">{row.receipt_url ? <a href={row.receipt_url} target="_blank" rel="noreferrer" className="text-civic-navy underline text-xs">View</a> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
