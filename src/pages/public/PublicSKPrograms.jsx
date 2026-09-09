import { useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';
import { Calendar, DollarSign, FolderKanban, Tag } from 'lucide-react';

export default function PublicSKPrograms() {
  const { slug } = useParams();
  const { barangay, loading } = usePublicBarangay(slug);
  const { rows, error } = useSupabaseTable('sk_programs', barangay?.id);
  if (loading) return <p className="text-civic-slate text-sm">Loading SK programs…</p>;
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Sangguniang Kabataan (SK)</p><h1 className="text-2xl font-display">SK Youth Programs & Projects</h1><p className="text-sm text-slate-500 mt-1">Youth-focused programs published by the Sangguniang Kabataan.</p></div><ErrorBanner message={error} /><div className="grid gap-3">{rows.map((row) => <article key={row.id} className="card space-y-3 border-emerald-100"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-civic-navy">{row.title}</h2><Badge status={row.status} /></div><p className="text-sm text-slate-600">{row.description || 'No description provided.'}</p><div className="flex flex-wrap gap-2 text-xs">{row.category && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 px-2 py-1"><Tag className="w-3 h-3" />{row.category}</span>}<span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 px-2 py-1"><DollarSign className="w-3 h-3" />₱{Number(row.budget_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>{(row.start_date || row.end_date) && <span className="inline-flex items-center gap-1 text-slate-500"><Calendar className="w-3 h-3" />{row.start_date || 'TBD'} {row.end_date && `– ${row.end_date}`}</span>}</div></article>)}{rows.length === 0 && <div className="card text-center py-8 text-slate-500"><FolderKanban className="w-8 h-8 mx-auto mb-2 text-slate-300" />No SK youth programs published yet.</div>}</div></div>;
}
