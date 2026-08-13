import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import FilterSidebar from './FilterSidebar';
import SearchResults from './SearchResults';
import PlayDetailModal from './PlayDetailModal';
import EditModal from './EditModal';
import EditSuggestModal from './EditSuggestModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import Pagination from './Pagination';

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

export default function SearchView({ user }) {
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

  // Modal states
  const [selectedEdition, setSelectedEdition] = useState(null);
  const [editModalTarget, setEditModalTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editMode, setEditMode] = useState('edit');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Filter options
  const [allPlaywrights, setAllPlaywrights] = useState([]);
  const [allTranslators, setAllTranslators] = useState([]);
  const [allTags, setAllTags] = useState([]);

  // Track initialization
  const [initialized, setInitialized] = useState(false);

  // ===== INITIALIZE FROM URL PARAMS =====
  useEffect(() => {
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ===== LOAD FILTER OPTIONS =====
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [worksRes, editionsRes, tagsRes] = await Promise.all([
          supabase.from('works').select('playwright_fa'),
          supabase.from('farsi_editions').select('translator_fa'),
          supabase.from('farsi_editions')
            .select('edition_tags(taxonomy_id, taxonomy(id, label_fa))')
            .eq('is_verified', true),
        ]);

        const pwSet = new Set();
        worksRes.data?.forEach(w => w.playwright_fa?.forEach(p => pwSet.add(p)));
        setAllPlaywrights([...pwSet].sort());

        const trSet = new Set();
        editionsRes.data?.forEach(e => e.translator_fa?.forEach(t => trSet.add(t)));
        setAllTranslators([...trSet].sort());

        const tagMap = new Map();
        tagsRes.data?.forEach(edition => {
          edition.edition_tags?.forEach(et => {
            if (et.taxonomy && !tagMap.has(et.taxonomy.id)) {
              tagMap.set(et.taxonomy.id, { id: et.taxonomy.id, label_fa: et.taxonomy.label_fa });
            }
          });
        });
        setAllTags([...tagMap.values()]);
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    };
    loadOptions();
  }, []);

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

  return (
    <div className="flex gap-6" dir="rtl">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 hidden lg:block">
        <FilterSidebar
          filters={filters}
          setFilters={setFilters}
          playwrights={allPlaywrights}
          translators={allTranslators}
          tags={allTags}
          onClearAll={() => setFilters(defaultFilters)}
          activeCount={activeCount}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-3 mb-6">
          <select
            value={searchScope}
            onChange={(e) => setSearchScope(e.target.value)}
            className="px-3 py-3 border-2 border-gray-200 rounded-xl text-sm bg-white min-w-[130px]"
          >
            <option value="all">همه فیلدها</option>
            <option value="title">عنوان</option>
            <option value="author">نویسنده</option>
            <option value="translator">مترجم</option>
            <option value="publisher">ناشر</option>
            <option value="synopsis">خلاصه</option>
          </select>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="جستجو..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 pr-10"
            />
            <span className="absolute right-3 top-3.5 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Mobile Filters */}
        <div className="lg:hidden mb-4">
          <details className="bg-white rounded-xl border border-gray-200">
            <summary className="p-4 cursor-pointer font-medium text-sm">
              🔧 فیلترها {activeCount > 0 && `(${activeCount})`}
            </summary>
            <div className="p-4 border-t border-gray-100">
              <FilterSidebar
                filters={filters}
                setFilters={setFilters}
                playwrights={allPlaywrights}
                translators={allTranslators}
                tags={allTags}
                onClearAll={() => setFilters(defaultFilters)}
                activeCount={activeCount}
              />
            </div>
          </details>
        </div>

        {/* Results Count */}
        <p className="text-sm text-gray-500 mb-4">
          {totalCount} اثر یافت شد
        </p>

        {/* Results */}
        <SearchResults results={results} loading={loading} onCardClick={setSelectedEdition} />

        {/* Pagination */}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </main>

      {/* ===== MODALS ===== */}

      {selectedEdition && (
        <PlayDetailModal
          edition={selectedEdition}
          onClose={() => setSelectedEdition(null)}
          onEdit={(ed) => setEditModalTarget(ed)}
          onSuggest={(ed) => { setEditTarget(ed); setEditMode('suggest'); }}
          onFlag={(ed) => { setEditTarget(ed); setEditMode('flag'); }}
          onDelete={(ed) => setDeleteTarget(ed)}
        />
      )}

      {editModalTarget && (
        <EditModal
          edition={editModalTarget}
          user={user}
          onClose={() => setEditModalTarget(null)}
          onSubmitted={() => { setEditModalTarget(null); fetchResults(); }}
        />
      )}

      {editTarget && (
        <EditSuggestModal
          edition={editTarget}
          user={user}
          onClose={() => setEditTarget(null)}
          onSubmitted={() => { setEditTarget(null); fetchResults(); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          edition={deleteTarget}
          user={user}
          onClose={() => setDeleteTarget(null)}
          onSubmitted={() => { setDeleteTarget(null); fetchResults(); }}
        />
      )}
    </div>
  );
}