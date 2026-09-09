import { useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';

import { Users, Calendar, DollarSign, Tag } from 'lucide-react';

const parseBeneficiary = (row) => {
  let cat = row.beneficiary_category || '';
  let desc = row.description || '';
  if (!cat && desc.startsWith('[Beneficiary: ')) {
    const match = desc.match(/^\[Beneficiary:\s*([^\]]+)\]\s*/);
    if (match) {
      cat = match[1];
      desc = desc.slice(match[0].length);
    }
  }
  return {
    beneficiary_category: cat || (row.beneficiaries_count ? 'General Residents' : ''),
    clean_description: desc,
  };
};

function ProgramCard({ row }) {
  const { beneficiary_category, clean_description } = parseBeneficiary(row);

  return (
    <div className="card space-y-3 hover:border-slate-300 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-civic-navy text-base">{row.title}</h3>
        <Badge status={row.status} />
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">{clean_description || 'No description provided.'}</p>

      <div className="flex flex-wrap items-center gap-2.5 text-xs pt-2 border-t border-slate-100">
        {row.category && (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-medium border border-slate-200">
            <Tag className="w-3 h-3 text-civic-emerald" /> {row.category}
          </span>
        )}

        {(row.beneficiaries_count > 0 || beneficiary_category) && (
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-md font-medium border border-blue-200/60">
            <Users className="w-3 h-3 text-blue-600" />
            <span>{row.beneficiaries_count ? Number(row.beneficiaries_count).toLocaleString() : '0'}</span>
            {beneficiary_category && (
              <>
                <span className="text-blue-300">·</span>
                <span className="font-semibold">{beneficiary_category}</span>
              </>
            )}
          </span>
        )}

        <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
          <DollarSign className="w-3 h-3 text-emerald-600" />
          ₱{Number(row.budget_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>

        {(row.start_date || row.end_date) && (
          <span className="inline-flex items-center gap-1 text-slate-500 ml-auto text-xs">
            <Calendar className="w-3 h-3 text-slate-400" />
            {row.start_date || 'TBD'} {row.end_date && `– ${row.end_date}`}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PublicPrograms() {
  const { slug } = useParams();
  const { barangay, loading: bLoading } = usePublicBarangay(slug);
  const { rows: programs, loading: l1, error: e1 } = useSupabaseTable('programs', barangay?.id);
  const { rows: skPrograms, loading: l2, error: e2 } = useSupabaseTable('sk_programs', barangay?.id);

  if (bLoading) return <p className="text-civic-slate text-sm">Loading…</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-display">Barangay & SK Programs</h1>
      <ErrorBanner message={e1 || e2} />

      <section>
        <h2 className="font-medium mb-3">Barangay Government Programs</h2>
        <div className="grid gap-3">
          {l1 && <p className="text-civic-slate text-sm">Loading…</p>}
          {!l1 && programs.length === 0 && <p className="text-civic-slate text-sm">No programs published yet.</p>}
          {programs.map((row) => <ProgramCard key={row.id} row={row} />)}
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-3 text-emerald-800">SK Youth Programs (Sangguniang Kabataan)</h2>
        <div className="grid gap-3">
          {l2 && <p className="text-civic-slate text-sm">Loading…</p>}
          {!l2 && skPrograms.length === 0 && <p className="text-civic-slate text-sm">No SK programs published yet.</p>}
          {skPrograms.map((row) => <ProgramCard key={row.id} row={row} />)}
        </div>
      </section>
    </div>
  );
}
