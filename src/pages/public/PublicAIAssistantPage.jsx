import { useParams } from "react-router-dom";
import PublicAIAssistant from "../../components/ai/PublicAIAssistant";
import { usePublicBarangay } from "../../lib/usePublicBarangay";

export default function PublicAIAssistantPage() {
  const { slug } = useParams();
  const { barangay } = usePublicBarangay(slug);

  return <PublicAIAssistant barangay={barangay} variant="page" />;
}
