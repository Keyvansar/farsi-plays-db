// ===== IMPORTS & DEPENDENCIES =====
import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeFarsi } from '../utils/textUtils';

// ===== CORE BUSINESS LOGIC =====
export function useArchiveSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Safest architectural pattern for resolving race conditions across all library versions
  const requestCount = useRef(0);

  const executeSearch = useCallback(async (searchTerm) => {
    if (!supabase) {
      setError('ارتباط با پایگاه داده برقرار نیست.');
      return;
    }

    // Increment request ID for this specific call
    requestCount.current += 1;
    const currentRequest = requestCount.current;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const query = normalizeFarsi((searchTerm || '').trim());

      // Using our newly deployed, highly-optimized server-side Search RPC
      const { data, error: fetchError } = await supabase
        .rpc('search_archive', { search_query: query });

      // If a newer request has been triggered while this one was pending, ignore this result
      if (currentRequest !== requestCount.current) {
        return; 
      }

      if (fetchError) throw fetchError;
      setResults(data || []);
      
    } catch (err) {
      if (currentRequest === requestCount.current) {
        console.error('Error executing search RPC:', err);
        setError(`خطایی در جستجو رخ داد: ${err.message || 'لطفاً دوباره تلاش کنید.'}`);
      }
    } finally {
      if (currentRequest === requestCount.current) {
        setLoading(false);
      }
    }
  }, []);

  return { results, loading, error, hasSearched, executeSearch };
}