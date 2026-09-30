import { useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { roleLabel } from '../../utils/roles';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { ShieldCheck, Info } from 'lucide-react';

export default function PublicOfficials() {
  const { slug } = useParams();
  const { barangay, loading: bLoading } = usePublicBarangay(slug);
  const { rows: officials, loading, error } = useSupabaseTable('profiles', barangay?.id);

  if (bLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <div className="w-10 h-10 border-4 border-civic-navy/20 border-t-civic-navy rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading officials…</p>
      </div>
    );
  }

  const active = officials.filter((o) => o.is_active);

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
              Elected Officials
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Meet the dedicated community leaders and representatives of{' '}
              <span className="font-semibold text-civic-navy">{barangay?.name || 'the barangay'}</span>.
            </p>
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
              This directory lists the actively serving members of the <strong>Barangay Council</strong> and the <strong>Sangguniang Kabataan (SK)</strong>.
            </span>
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && <p className="text-civic-slate text-sm">Loading…</p>}
          {!loading && active.length === 0 && <p className="text-civic-slate text-sm">No officials published yet.</p>}
          {active.map((o) => (
            <div key={o.id} className="card flex items-center gap-4 hover:border-civic-navy/30 transition-colors p-4">
              {o.photo_url ? (
                <img src={o.photo_url} alt="" className="w-14 h-14 rounded-full object-cover border border-slate-200" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-civic-navy/10 flex items-center justify-center font-display text-civic-navy text-lg font-semibold">
                  {o.full_name?.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-civic-navy truncate">{o.full_name}</p>
                <p className="text-xs text-emerald-700 font-medium truncate">{roleLabel(o.role)}</p>
                {o.term_start && <p className="text-[11px] text-slate-500 mt-1">Term: {o.term_start} {o.term_end && `– ${o.term_end}`}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
