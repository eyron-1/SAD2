import { Link, useParams } from 'react-router-dom';
import DocumentLibrary from '../../components/documents/DocumentLibrary';
import { usePublicBarangay } from '../../lib/usePublicBarangay';

export default function PublicDocuments({ scope }) {
  const { slug } = useParams();
  const { barangay, loading } = usePublicBarangay(slug);

  if (loading) {
    return <p className="py-12 text-center text-sm text-slate-500">Loading barangay information…</p>;
  }

  if (!barangay) {
    return <p className="py-12 text-center text-sm text-slate-500">This barangay portal could not be found.</p>;
  }

  const documentPortals = [
    { scope: 'barangay', label: 'Barangay documents', to: `/b/${slug}/documents` },
    { scope: 'sk', label: 'SK documents', to: `/b/${slug}/sk/documents` },
  ];

  return (
    <div className="space-y-5">
      <nav aria-label="Choose public document collection" className="flex flex-wrap gap-2">
        {documentPortals.map((portal) => (
          <Link
            key={portal.scope}
            to={portal.to}
            aria-current={scope === portal.scope ? 'page' : undefined}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
              scope === portal.scope
                ? 'border-civic-emerald bg-civic-emerald text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-civic-emerald hover:text-civic-emerald'
            }`}
          >
            {portal.label}
          </Link>
        ))}
      </nav>
      <DocumentLibrary barangay={barangay} scope={scope} isResidentPortal />
    </div>
  );
}
