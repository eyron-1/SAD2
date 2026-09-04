import { useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { roleLabel } from '../../utils/roles';
import ErrorBanner from '../../components/ui/ErrorBanner';

export default function PublicOfficials() {
  const { slug } = useParams();
  const { barangay, loading: bLoading } = usePublicBarangay(slug);
  const { rows: officials, loading, error } = useSupabaseTable('profiles', barangay?.id);

  if (bLoading) return <p className="text-civic-slate text-sm">Loading…</p>;

  const active = officials.filter((o) => o.is_active);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display">Elected Officials</h1>
      <ErrorBanner message={error} />
      <div className="grid sm:grid-cols-2 gap-4">
        {loading && <p className="text-civic-slate text-sm">Loading…</p>}
        {!loading && active.length === 0 && <p className="text-civic-slate text-sm">No officials published yet.</p>}
        {active.map((o) => (
          <div key={o.id} className="card flex items-center gap-3">
            {o.photo_url ? (
              <img src={o.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-civic-navy/10 flex items-center justify-center font-display text-civic-navy">
                {o.full_name?.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-medium">{o.full_name}</p>
              <p className="text-xs text-civic-slate">{roleLabel(o.role)}</p>
              {o.term_start && <p className="text-xs text-civic-slate/70">Term: {o.term_start} {o.term_end && `– ${o.term_end}`}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
