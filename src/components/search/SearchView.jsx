import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import FilterSidebar from './FilterSidebar';
import SearchResults from './SearchResults';
import PlayDetailModal from './PlayDetailModal';
import EditSuggestModal from './EditSuggestModal';
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
  
  // Modal state
  const [selectedEdition, setSelectedEdition] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editMode, setEditMode] = useState('edit'); // 'edit' | 'suggest' | 'flag'
  
  // Filter options (loaded once)
  const [allPlaywrights, setAllPlaywrights] = useState([]);
  const [allTranslators, setAllTranslators] = useState([]);
  const [allTags, setAllTags] = useState([]);

  // ===== LOAD FILTER OPTIONS =====
  useEffect(() => {
    const loadOptions = async () => {
      // Playwrights
      const { data: works } = await supabase.from('works').select('playwright_fa');
      const pwSet = new Set();
      works?.forEach(w => w.playwright_fa?.forEach(p => pwSet.add(p)));
      setAllPlaywrights([...pwSet].sort());

      // Translators
      const { data: editions } = await supabase.from('farsi_editions').select('translator_fa');
      const trSet = new Set();
      editions?.forEach(e => e.translator_fa?.forEach(t => trSet.add(t)));
      setAllTranslators([...trSet].sort());

      // Tags: Only fetch tags actually used on verified editions
      const { data: verifiedEditions } = await supabase
        .from('farsi_editions')
        .select('edition_tags(taxonomy_id, taxonomy(id, label_fa))')
        .eq('is_verified', true);

      const tagMap = new Map();
      verifiedEditions?.forEach(edition => {
        edition.edition_tags?.forEach(et => {
          if (et.taxonomy && !tagMap.has(et.taxonomy.id)) {
            tagMap.set(et.taxonomy.id, { id: et.taxonomy.id, label_fa: et.taxonomy.label_fa });
          }
        });
      });
      setAllTags([...tagMap.values()]);
    };
    loadOptions();
  }, []);

  // ===== BUILD & EXECUTE QUERY =====
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      const term = searchTerm.trim();

      // Dynamic select: use !inner on edition_tags when filtering by tags
      const tagsJoin = filters.tags.length > 0
        ? 'edition_tags!inner(taxonomy_id, taxonomy(id, label_fa))'
        : 'edition_tags(taxonomy_id, taxonomy(id, label_fa))';

      const selectString = `*, works!inner(*), ${tagsJoin}, external_references(id, url, ref_type)`;

      let query = supabase
        .from('farsi_editions')
        .select(selectString, { count: 'exact' });

      // --- Server-side text search (only for plain TEXT fields) ---
      if (term) {
        if (searchScope === 'title') {
          query = query.ilike('title_fa', `%${term}%`);
        } else if (searchScope === 'publisher') {
          query = query.ilike('publisher', `%${term}%`);
        } else if (searchScope === 'synopsis') {
          query = query.ilike('synopsis', `%${term}%`);
        }
        // 'author', 'translator', 'all' → handled client-side (TEXT[] arrays)
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

      // Tag filter (server-side for single tag with !inner join)
      if (filters.tags.length === 1) {
        query = query.eq('edition_tags.taxonomy_id', filters.tags[0]);
      }

      // --- Pagination ---
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
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

      // --- Client-side: Text search for array fields & 'all' scope ---
      if (term) {
        filtered = filtered.filter(ed => {
          switch (searchScope) {
            case 'title':
              return ed.title_fa?.includes(term);
            case 'publisher':
              return ed.publisher?.includes(term);
            case 'synopsis':
              return ed.synopsis?.includes(term);
            case 'author':
              return ed.works?.playwright_fa?.some(p => p.includes(term));
            case 'translator':
              return ed.translator_fa?.some(t => t.includes(term));
            case 'all':
            default:
              return (
                ed.title_fa?.includes(term) ||
                ed.publisher?.includes(term) ||
                ed.synopsis?.includes(term) ||
                ed.works?.playwright_fa?.some(p => p.includes(term)) ||
                ed.translator_fa?.some(t => t.includes(term))
              );
          }
        });
      }

      // --- Client-side: AND filter for multiple tags ---
      if (filters.tags.length > 1) {
        filtered = filtered.filter(edition => {
          const editionTagIds = edition.edition_tags?.map(et => et.taxonomy_id) || [];
          return filters.tags.every(tagId => editionTagIds.includes(tagId));
        });
      }

      // --- Client-side: Playwright filter ---
      if (filters.playwrights.length > 0) {
        filtered = filtered.filter(edition =>
          filters.playwrights.some(pw => edition.works?.playwright_fa?.includes(pw))
        );
      }

      // --- Client-side: Translator filter ---
      if (filters.translators.length > 0) {
        filtered = filtered.filter(edition =>
          filters.translators.some(tr => edition.translator_fa?.includes(tr))
        );
      }

      // --- Client-side: Has links filter ---
      if (filters.hasLinks) {
        filtered = filtered.filter(ed => ed.external_references?.length > 0);
      }

      setResults(filtered);
      setTotalCount(count || filtered.length);
      setLoading(false);
    };

    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchScope, filters, page]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [searchTerm, searchScope, filters]);

  // Count active filters
  const activeCount = Object.entries(filters).filter(([key, val]) => {
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val !== '' && val !== 'all';
    return false;
  }).length;

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
        {/* Search Bar + Scope */}
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

        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-4">
          <details className="bg-white rounded-xl border border-gray-200">
            <summary className="p-4 cursor-pointer font-medium text-sm">🔧 فیلترها {activeCount > 0 && `(${activeCount})`}</summary>
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
        <p className="text-sm text-gray-500 mb-4">{totalCount} اثر یافت شد</p>

        {/* Results */}
        <SearchResults results={results} loading={loading} onCardClick={setSelectedEdition} />

        {/* Pagination */}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </main>

      {/* Detail Modal */}
      {selectedEdition && (
        <PlayDetailModal
          edition={selectedEdition}
          onClose={() => setSelectedEdition(null)}
          onEdit={(ed) => { setEditTarget(ed); setEditMode('edit'); }}
          onSuggest={(ed) => { setEditTarget(ed); setEditMode('suggest'); }}
          onFlag={(ed) => { setEditTarget(ed); setEditMode('flag'); }}
        />
      )}

      {/* Edit/Suggest Modal */}
      {editTarget && (
        <EditSuggestModal
          edition={editTarget}
          user={user}
          onClose={() => setEditTarget(null)}
          onSubmitted={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}