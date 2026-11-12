import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import AuditLogList from "../../components/ui/AuditLogList";
import ErrorBanner from "../../components/ui/ErrorBanner";
import { supabase } from "../../lib/supabaseClient";
import { friendlySupabaseError } from "../../lib/validation";
import { isSkRole } from "../../utils/roles";
import { History } from "lucide-react";

const PAGE_SIZE = 50;

export default function AuditHistory() {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      if (!profile?.barangay_id) {
        setRows([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const { data, error: queryError } = await supabase
          .from("audit_logs")
          .select(
            "id, barangay_id, entity_table, record_id, action, actor_id, actor_name, actor_role, before_data, after_data, created_at",
          )
          .eq("barangay_id", profile.barangay_id)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (!active) return;
        if (queryError) {
          setError(friendlySupabaseError(queryError));
          setRows([]);
          setHasMore(false);
        } else {
          setRows(data || []);
          setHasMore((data || []).length === PAGE_SIZE);
        }
      } catch (queryError) {
        if (active) {
          setError(friendlySupabaseError(queryError));
          setRows([]);
          setHasMore(false);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, [profile?.barangay_id]);

  const loadMore = async () => {
    if (!profile?.barangay_id || loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError("");
    try {
      const { data, error: queryError } = await supabase
        .from("audit_logs")
        .select(
          "id, barangay_id, entity_table, record_id, action, actor_id, actor_name, actor_role, before_data, after_data, created_at",
        )
        .eq("barangay_id", profile.barangay_id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(rows.length, rows.length + PAGE_SIZE - 1);

      if (queryError) {
        setError(friendlySupabaseError(queryError));
      } else {
        const nextRows = data || [];
        setRows((currentRows) => [...currentRows, ...nextRows]);
        setHasMore(nextRows.length === PAGE_SIZE);
      }
    } catch (queryError) {
      setError(friendlySupabaseError(queryError));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-civic-emerald/10 text-civic-emerald">
          <History className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-civic-navy sm:text-3xl">
            Audit history
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review recorded changes made by officials in your{" "}
            {isSkRole(profile?.role) ? "SK" : "barangay"} portal.
          </p>
        </div>
      </header>

      <ErrorBanner message={error} />

      <AuditLogList
        rows={rows}
        loading={loading}
        emptyMessage="No changes have been recorded yet."
      />

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            className="btn-secondary"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading history…" : "Load older events"}
          </button>
        </div>
      )}
    </div>
  );
}
