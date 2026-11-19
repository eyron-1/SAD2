import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';
import { Calendar, FolderKanban, Search, Tag } from 'lucide-react';

export default function PublicSKPrograms() {
  const { slug } = useParams();
  const { barangay, loading: barangayLoading, error: barangayError } = usePublicBarangay(slug);
  const {
    rows,
    loading: programsLoading,
    error: programsError,
  } = useSupabaseTable('sk_programs', barangay?.id);
  const [searchTerm, setSearchTerm] = useState('');
  const filteredPrograms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((row) =>
      !query
      || row.title?.toLowerCase().includes(query)
      || row.category?.toLowerCase().includes(query),
    );
  }, [rows, searchTerm]);

  if (barangayLoading) {
    return <p role="status" className="py-12 text-center text-sm text-slate-500">Loading SK programs…</p>;
  }
  if (barangayError || !barangay) {
    return <ErrorBanner message={barangayError || 'Barangay not found.'} />;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          {barangay.name} · Sangguniang Kabataan
        </p>
        <h1 className="mt-1 text-2xl font-display text-emerald-950">
          SK Youth Programs & Projects
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse projects and activities published by the SK.
        </p>
      </header>

      <ErrorBanner message={programsError} />

      <div className="relative w-full sm:ml-auto sm:w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          aria-label="Search SK programs"
          placeholder="Search programs…"
          className="input-field pl-9"
        />
      </div>

      <div className="grid gap-3">
        {programsLoading && (
          <p role="status" className="py-8 text-center text-sm text-slate-500">
            Loading programs…
          </p>
        )}
        {!programsLoading && filteredPrograms.map((row) => (
          <article key={row.id} className="card space-y-3 border-emerald-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-civic-navy">{row.title}</h2>
              <Badge status={row.status} />
            </div>
            <p className="text-sm text-slate-600">
              {row.description || 'No description provided.'}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {row.category && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">
                  <Tag className="h-3 w-3" />
                  {row.category}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">
                ₱{Number(row.budget_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
              {(row.start_date || row.end_date) && (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Calendar className="h-3 w-3" />
                  {row.start_date || 'TBD'} {row.end_date && `– ${row.end_date}`}
                </span>
              )}
            </div>
          </article>
        ))}
        {!programsLoading && filteredPrograms.length === 0 && (
          <div className="card py-8 text-center text-slate-500">
            <FolderKanban className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            {searchTerm
              ? 'No SK programs match your search.'
              : 'No SK youth programs published yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
