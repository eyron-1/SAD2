import { useAuth } from '../../context/AuthContext';
import DocumentLibrary from '../../components/documents/DocumentLibrary';
import { isBarangayEditor, isSkEditor } from '../../utils/roles';

export default function OfficialDocuments({ scope }) {
  const { profile } = useAuth();
  const canManage = scope === 'sk'
    ? isSkEditor(profile?.role)
    : isBarangayEditor(profile?.role);

  return (
    <DocumentLibrary
      barangay={{ id: profile?.barangay_id, name: profile?.barangays?.name || 'Your barangay' }}
      scope={scope}
      canManage={canManage}
      uploadedBy={profile?.id}
    />
  );
}
