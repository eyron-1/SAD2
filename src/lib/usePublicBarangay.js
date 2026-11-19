import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { friendlySupabaseError } from './validation';

export function usePublicBarangay(slug) {
  const [barangay, setBarangay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    if (!slug) {
      if (active) {
        setBarangay(null);
        setError('');
        setLoading(false);
      }
      return;
    }

    setBarangay(null);
    setError('');
    setLoading(true);
    supabase
      .from('barangays')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error: qError }) => {
        if (!active) return;
        if (qError) setError(friendlySupabaseError(qError));
        else setBarangay(data);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  return { barangay, loading, error };
}
