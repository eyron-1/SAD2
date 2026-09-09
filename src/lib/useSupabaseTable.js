import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { friendlySupabaseError } from './validation';

// Scopes every query to the current barangay_id automatically, and
// gives every CRUD page the exact same loading/error/refetch shape.
export function useSupabaseTable(table, barangayId, { orderBy = 'created_at', ascending = false, select = '*', filter = {} } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    if (!barangayId) return;
    setLoading(true);
    setError('');
    let query = supabase
      .from(table)
      .select(select)
      .eq('barangay_id', barangayId);
    Object.entries(filter).forEach(([column, value]) => { query = query.eq(column, value); });
    const { data, error: qError } = await query.order(orderBy, { ascending });

    if (qError) {
      setError(friendlySupabaseError(qError));
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }, [table, barangayId, orderBy, ascending, select, JSON.stringify(filter)]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const insertRow = async (payload) => {
    const { data, error: iError } = await supabase
      .from(table)
      .insert([{ ...payload, barangay_id: barangayId }])
      .select()
      .single();
    if (iError) return { error: friendlySupabaseError(iError) };
    setRows((prev) => [data, ...prev]);
    return { data };
  };

  const updateRow = async (id, payload) => {
    const { data, error: uError } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (uError) return { error: friendlySupabaseError(uError) };
    setRows((prev) => prev.map((r) => (r.id === id ? data : r)));
    return { data };
  };

  const deleteRow = async (id) => {
    const { error: dError } = await supabase.from(table).delete().eq('id', id);
    if (dError) return { error: friendlySupabaseError(dError) };
    setRows((prev) => prev.filter((r) => r.id !== id));
    return {};
  };

  return { rows, loading, error, refetch, insertRow, updateRow, deleteRow };
}
