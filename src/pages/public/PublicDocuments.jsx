import { useParams } from 'react-router-dom';
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

  return <DocumentLibrary barangay={barangay} scope={scope} isResidentPortal />;
}
