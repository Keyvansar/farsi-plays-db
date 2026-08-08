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
const MAX_FETCH_FOR_CLIENT_FILTER = 500;

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

  // ===== DETECT WHEN CLIENT-SIDE FILTERING IS NEEDED =====
  // BUG FIX #1: Include text search scopes that require client-side filtering
  const needsClientSideFiltering =
    filters.tags.length > 1 ||
    filters.hasLinks ||
    filters.playwrights.length > 0 ||
    (searchTerm.trim() && ['all', 'author', 'translator'].includes(searchScope));

  // ===== FETCH RESULTS =====
  const fetchResults = useCallback(async () => {
    setLoading(true);
    const term = searchTerm.trim();

    // Always use non-inner join for tags display (BUG FIX #2)
    const tagsJoin = filters.tags.length > 0
      ? 'edition_tags!inner(taxonomy_id, taxonomy(id, label_fa))'
      : 'edition_tags(taxonomy_id, taxonomy(id, label_fa))';

    const selectString = `*, works!inner(*), ${tagsJoin}, external_references(id, url, ref_type)`;

    let query = supabase
      .from('farsi_editions')
      .select(selectString, { count: 'exact' });

    // --- Server-side text search (only for plain TEXT fields) ---
    if (term) {
      if (searchScope === 'title') query = query.ilike('title_fa', `%${term}%`);
      else if (searchScope === 'publisher') query = query.ilike('publisher', `%${term}%`);
      else if (searchScope === 'synopsis') query = query.ilike('synopsis', `%${term}%`);
      // 'author', 'translator', 'all' → handled client-side
    }

    // --- Server-side filters ---
    if (filters.verifiedOnly) query = query.eq('is_verified', true);
    if (filters.hasSynopsis) query = query.not('synopsis', 'is', null);
    if (filters.inCollection) query = query.eq('is_in_collection', true);
    if (filters.status !== 'all') query = query.eq('publication_status', filters.status);
    if (filters.yearMin) query = query.gte('publication_year_solar', parseInt(filters.yearMin));
    if (filters.yearMax) query = query.lte('publication_year_solar', parseInt(filters.yearMax));
    if (filters.castMin) query = query.gte('cast_total', parseInt(filters.castMin));
    if (filters.castMax) query = query.lte('cast_total', parseInt(filters.castMax));
    if (filters.sourceType === 'fa') query = query.eq('works.source_language', 'fa');
    else if (filters.sourceType === 'translated') query = query.neq('works.source_language', 'fa');

    // --- Server-side tag filter (single tag) ---
    if (filters.tags.length === 1) {
      query = query.eq('edition_tags.taxonomy_id', filters.tags[0]);
    }

    // --- Server-side translator filter ---
    if (filters.translators.length > 0) {
      query = query.overlaps('translator_fa', filters.translators);
    }

    // --- Pagination ---
    // BUG FIX #1 & #3: When client-side filtering is needed, fetch more results
    const fetchSize = needsClientSideFiltering ? MAX_FETCH_FOR_CLIENT_FILTER : ITEMS_PER_PAGE;
    const from = needsClientSideFiltering ? 0 : (page - 1) * ITEMS_PER_PAGE;
    const to = from + fetchSize - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    let filtered = data || [];

    // --- Deduplicate by edition ID ---
    const seen = new Set();
    filtered = filtered.filter(ed => {
      if (seen.has(ed.id)) return false;
      seen.add(ed.id);
      return true;
    });

    // --- Client-side: Text search for array fields & 'all' scope ---
    if (term) {
      filtered = filtered.filter(ed => {
        switch (searchScope) {
          case 'title': return ed.title_fa?.includes(term);
          case 'publisher': return ed.publisher?.includes(term);
          case 'synopsis': return ed.synopsis?.includes(term);
          case 'author': return ed.works?.playwright_fa?.some(p => p.includes(term));
          case 'translator': return ed.translator_fa?.some(t => t.includes(term));
          case 'all':
          default:
            return (
              ed.title_fa?.includes(term) ||
              ed.publisher?.includes(term) ||
              ed.synopsis?.includes(term) ||
              ed.collection_title?.includes(term) ||
              ed.works?.playwright_fa?.some(p => p.includes(term)) ||
              ed.translator_fa?.some(t => t.includes(term))
            );
        }
      });
    }

    // --- Client-side: Playwright filter ---
    if (filters.playwrights.length > 0) {
      filtered = filtered.filter(edition =>
        filters.playwrights.some(pw => edition.works?.playwright_fa?.includes(pw))
      );
    }

    // --- Client-side: AND filter for multiple tags ---
    if (filters.tags.length > 1) {
      filtered = filtered.filter(edition => {
        const editionTagIds = edition.edition_tags?.map(et => et.taxonomy_id) || [];
        return filters.tags.every(tagId => editionTagIds.includes(tagId));
      });
    }

    // --- Client-side: Has links filter ---
    if (filters.hasLinks) {
      filtered = filtered.filter(ed => ed.external_references?.length > 0);
    }

    // --- BUG FIX #2: Fetch ALL tags for displayed editions ---
    if (filters.tags.length > 0 && filtered.length > 0) {
      const editionIds = filtered.map(e => e.id);
      const { data: allTagsData } = await supabase
        .from('edition_tags')
        .select('farsi_edition_id, taxonomy_id, taxonomy(id, label_fa)')
        .in('farsi_edition_id', editionIds);

      if (allTagsData) {
        filtered = filtered.map(ed => ({
          ...ed,
          edition_tags: allTagsData.filter(t => t.farsi_edition_id === ed.id),
        }));
      }
    }

    // --- BUG FIX #3: Correct pagination and count ---
    if (needsClientSideFiltering) {
      setTotalCount(filtered.length);
      const clientFrom = (page - 1) * ITEMS_PER_PAGE;
      const clientTo = clientFrom + ITEMS_PER_PAGE;
      setResults(filtered.slice(clientFrom, clientTo));
    } else {
      setTotalCount(count ?? filtered.length);
      setResults(filtered);
    }

    setLoading(false);
  }, [searchTerm, searchScope, filters, page, needsClientSideFiltering]);

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
          {needsClientSideFiltering && (
            <span className="mr-2 text-xs text-orange-500">(فیلتر پیشرفته فعال است)</span>
          )}
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