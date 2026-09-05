import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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

// 🆕 Small debounce helper for fast-changing inputs
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// 🆕 Pure fetch + transform function
async function fetchSearchResults(params) {
  const { data, error } = await supabase.rpc('search_editions', {
    search_term: params.searchTerm.trim(),
    search_scope: params.searchScope,
    playwrights: params.filters.playwrights,
    translators: params.filters.translators,
    source_type: params.filters.sourceType,
    year_min: params.filters.yearMin ? parseInt(params.filters.yearMin) : null,
    year_max: params.filters.yearMax ? parseInt(params.filters.yearMax) : null,
    status: params.filters.status,
    tags: params.filters.tags,
    cast_min: params.filters.castMin ? parseInt(params.filters.castMin) : null,
    cast_max: params.filters.castMax ? parseInt(params.filters.castMax) : null,
    verified_only: params.filters.verifiedOnly,
    has_synopsis: params.filters.hasSynopsis,
    in_collection: params.filters.inCollection,
    has_links: params.filters.hasLinks,
    page_number: params.page,
    page_size: ITEMS_PER_PAGE,
  });

  if (error) throw error;

  const results = (data || []).map(row => ({
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
    work_edition_count: row.work_edition_count,
    works: {
      id: row.work_id,
      playwright_fa: row.work_playwright_fa,
      original_title: row.work_original_title,
      source_language: row.work_source_language,
      alternative_titles: row.work_alternative_titles,
    },
    edition_tags: row.edition_tags || [],
    external_references: row.external_references || [],
  }));

  return {
    results,
    totalCount: data?.[0]?.total_count || 0,
  };
}

export function useSearch() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState('all');

  // Filter state
  const [filters, setFilters] = useState(defaultFilters);

  // Pagination
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

  // ===== SYNC STATE TO URL (unchanged) =====
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

  // 🆕 Debounce fast-changing inputs so we don't query per keystroke
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const debouncedFilters = useDebouncedValue(filters, 300);

  // ===== 🆕 THE QUERY =====
  const {
    data,
    isFetching,
  } = useQuery({
    queryKey: ['search_editions', debouncedSearchTerm, searchScope, debouncedFilters, page],
    queryFn: () =>
      fetchSearchResults({
        searchTerm: debouncedSearchTerm,
        searchScope,
        filters: debouncedFilters,
        page,
      }),
    enabled: initialized,
    placeholderData: keepPreviousData, // keep old results visible while new page loads
    staleTime: 30 * 1000,
  });

  const results = data?.results || [];
  const totalCount = data?.totalCount || 0;
  const loading = isFetching;

  // Reset page on filter / search change (unchanged behavior)
  useEffect(() => {
    if (!initialized) return;
    setPage(1);
  }, [searchTerm, searchScope, filters, initialized]);

  // 🆕 fetchResults now invalidates the cache (used by edit/link/submit flows)
  const fetchResults = () => {
    queryClient.invalidateQueries({ queryKey: ['search_editions'] });
  };

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