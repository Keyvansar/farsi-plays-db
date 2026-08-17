import React, { useState } from 'react';
import { useSearch } from '../../hooks/useSearch';
import FilterSidebar from './FilterSidebar';
import SearchResults from './SearchResults';
import PlayDetailModal from './PlayDetailModal';
import EditModal from './EditModal';
import EditSuggestModal from './EditSuggestModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import Pagination from './Pagination';

export default function SearchView({ user }) {
  const {
    searchTerm, setSearchTerm,
    searchScope, setSearchScope,
    filters, setFilters,
    results, totalCount, loading,
    page, setPage, totalPages,
    activeCount,
    fetchResults,
    defaultFilters,
  } = useSearch();

  // Modal states (kept local to the view)
  const [selectedEdition, setSelectedEdition] = useState(null);
  const [editModalTarget, setEditModalTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editMode, setEditMode] = useState('edit');
  const [deleteTarget, setDeleteTarget] = useState(null);

  return (
    <div className="flex gap-6" dir="rtl">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 hidden lg:block">
        <FilterSidebar
          filters={filters}
          setFilters={setFilters}
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
                onClearAll={() => setFilters(defaultFilters)}
                activeCount={activeCount}
              />
            </div>
          </details>
        </div>

        {/* Results Count (announced to screen readers) */}
        <p className="text-sm text-gray-500 mb-4" role="status" aria-live="polite">
          {loading ? 'در حال جستجو...' : `${totalCount} اثر یافت شد`}
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
          // 🆕 NEW: Switch to another edition of the same work
          onSwitchEdition={(ed) => setSelectedEdition(ed)}
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
          mode={editMode}
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