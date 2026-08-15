import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ITEMS_PER_PAGE = 20;

const defaultFilters = {
  playwrights: [],
  translators: [],
  sourceType: 'all',
  yearMin: '',
  yearMax: '',
  status: 'all',
  tags: [],
  castMin: '',
  castMax: '',
  verifiedOnly: false,
  hasSynopsis: false,
  inCollection: false,
  hasLinks: false,
};

export function useSearch() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState('all');

  // Filter state
  const [filters, setFilters] = useState(defaultFilters);

  // Data state
  const [results, setResults] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Track initialization
  const [initialized, setInitialized] = useState(false);
  const isInitialized = useRef(false);

  // ===== INITIALIZE FROM URL PARAMS =====
  useEffect(() => {
    if (isInitialized.current) return;

    const urlSearch = searchParams.get('q') || '';
    const urlScope = searchParams.get('scope') || 'all';
    const urlPage = parseInt(searchParams.get('page') || '1');

    const urlFilters = {
      playwrights: searchParams.get('pw')?.split('|').filter(Boolean) || [],
      translators: searchParams.get('tr')?.split('|').filter(Boolean) || [],
      tags: searchParams.get('tags')?.split('|').filter(Boolean) || [],
      sourceType: searchParams.get('src') || 'all',
      yearMin: searchParams.get('ymin') || '',
      yearMax: searchParams.get('ymax') || '',
      status: searchParams.get('status') || 'all',
      castMin: searchParams.get('cmin') || '',
      castMax: searchParams.get('cmax') || '',
      verifiedOnly: searchParams.get('ver') === '1',
      hasSynopsis: searchParams.get('syn') === '1',
      inCollection: searchParams.get('col') === '1',
      hasLinks: searchParams.get('lnk') === '1',
    };

    setSearchTerm(urlSearch);
    setSearchScope(urlScope);
    setPage(urlPage);
    setFilters(urlFilters);
    setInitialized(true);
    isInitialized.current = true;
  }, [searchParams]);

  // ===== SYNC STATE TO URL =====
  useEffect(() => {
    if (!initialized) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams();

      if (searchTerm) params.set('q', searchTerm);
      if (searchScope !== 'all') params.set('scope', searchScope);
      if (page > 1) params.set('page', String(page));

      if (filters.playwrights.length > 0) params.set('pw', filters.playwrights.join('|'));
      if (filters.translators.length > 0) params.set('tr', filters.translators.join('|'));
      if (filters.tags.length > 0) params.set('tags', filters.tags.join('|'));
      if (filters.sourceType !== 'all') params.set('src', filters.sourceType);
      if (filters.yearMin) params.set('ymin', filters.yearMin);
      if (filters.yearMax) params.set('ymax', filters.yearMax);
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.castMin) params.set('cmin', filters.castMin);
      if (filters.castMax) params.set('cmax', filters.castMax);
      if (filters.verifiedOnly) params.set('ver', '1');
      if (filters.hasSynopsis) params.set('syn', '1');
      if (filters.inCollection) params.set('col', '1');
      if (filters.hasLinks) params.set('lnk', '1');

      setSearchParams(params, { replace: true });
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, searchScope, filters, page, initialized, setSearchParams]);

  // ===== FETCH RESULTS VIA RPC =====
  const fetchResults = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('search_editions', {
        search_term: searchTerm.trim(),
        search_scope: searchScope,
        playwrights: filters.playwrights,
        translators: filters.translators,
        source_type: filters.sourceType,
        year_min: filters.yearMin ? parseInt(filters.yearMin) : null,
        year_max: filters.yearMax ? parseInt(filters.yearMax) : null,
        status: filters.status,
        tags: filters.tags,
        cast_min: filters.castMin ? parseInt(filters.castMin) : null,
        cast_max: filters.castMax ? parseInt(filters.castMax) : null,
        verified_only: filters.verifiedOnly,
        has_synopsis: filters.hasSynopsis,
        in_collection: filters.inCollection,
        has_links: filters.hasLinks,
        page_number: page,
        page_size: ITEMS_PER_PAGE,
      });

      if (error) throw error;

      // Transform RPC results to match the expected format
      const transformedResults = (data || []).map(row => ({
        id: row.edition_id,
        title_fa: row.title_fa,
        publisher: row.publisher,
        publication_status: row.publication_status,
        publication_year_solar: row.publication_year_solar,
        publication_year_gregorian: row.publication_year_gregorian,
        original_year: row.original_year,
        page_count: row.page_count,
        isbn: row.isbn,
        synopsis: row.synopsis,
        cast_men: row.cast_men,
        cast_women: row.cast_women,
        cast_nonspecific: row.cast_nonspecific,
        cast_total: row.cast_total,
        is_in_collection: row.is_in_collection,
        collection_title: row.collection_title,
        translator_fa: row.translator_fa,
        is_verified: row.is_verified,
        flag_count: row.flag_count,
        works: {
          id: row.work_id,
          playwright_fa: row.work_playwright_fa,
          original_title: row.work_original_title,
          source_language: row.work_source_language,
        },
        edition_tags: row.edition_tags || [],
        external_references: row.external_references || [],
      }));

      setResults(transformedResults);
      setTotalCount(data?.[0]?.total_count || 0);

    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, searchScope, filters, page]);

  useEffect(() => {
    if (!initialized) return;
    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [fetchResults, initialized]);

  // Reset page on filter change
  useEffect(() => {
    if (!initialized) return;
    setPage(1);
  }, [searchTerm, searchScope, filters, initialized]);

  // Count active filters
  const activeCount = Object.entries(filters).filter(([key, val]) => {
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val !== '' && val !== 'all';
    return false;
  }).length;

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  return {
    // State
    searchTerm, setSearchTerm,
    searchScope, setSearchScope,
    filters, setFilters,
    results, totalCount, loading,
    page, setPage, totalPages,
    activeCount,
    // Methods
    fetchResults,
    defaultFilters,
  };
}