import { useAuth } from '../../context/AuthContext';
import DocumentLibrary from '../../components/documents/DocumentLibrary';
import { isBarangayEditor, isSkDocumentEditor } from '../../utils/roles';

export default function OfficialDocuments({ scope }) {
  const { profile } = useAuth();
  const canManage = profile?.is_active !== false && (
    scope === 'sk'
      ? isSkDocumentEditor(profile?.role)
      : isBarangayEditor(profile?.role)
  );

  return (
    <DocumentLibrary
      barangay={{ id: profile?.barangay_id, name: profile?.barangays?.name || 'Your barangay' }}
      scope={scope}
      canManage={canManage}
      uploadedBy={profile?.id}
      accountRole={profile?.role}
    />
  );
}
