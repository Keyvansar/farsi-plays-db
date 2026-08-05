// ===== IMPORTS & DEPENDENCIES =====
import React, { useState, useEffect } from 'react';
import { useArchiveSearch } from '../hooks/useArchiveSearch';
import { joinNamesFromArray } from '../utils/textUtils';

// ===== COMPONENT =====
export default function SearchView() {
  const [searchTerm, setSearchTerm] = useState('');
  const { results, loading, error, hasSearched, executeSearch } = useArchiveSearch();

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    executeSearch(searchTerm);
  };

  // Initial load
  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100">
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو بر اساس نام اثر، نویسنده یا مترجم..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition duration-150 disabled:opacity-50"
          >
            {loading ? 'در حال جستجو...' : 'جستجو'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 mb-6 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200 animate-fadeIn">
          {error}
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
          {hasSearched ? `نتایج جستجو (${results.length} اثر)` : 'آثار و ویرایش‌های اخیر'}
        </h2>

        {loading && results.length === 0 ? (
          <div className="text-center py-12 text-gray-500 animate-pulse">در حال دریافت اطلاعات از پایگاه داده...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            هیچ اثری با این مشخصات یافت نشد.
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((item) => (
              <div
                key={item.id}
                className="interactive-card p-5 rounded-lg border border-gray-200 hover:border-indigo-300 bg-white"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-indigo-900">{item.title_fa}</h3>
                    {item.works?.original_title && (
                      <p className="text-xs text-gray-500 font-mono" dir="ltr">
                        Original: {item.works.original_title} ({item.works.source_language?.toUpperCase()})
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-start">
                    {item.is_verified ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ تأیید شده
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        تأیید نشده
                      </span>
                    )}
                    {item.publication_year_solar && (
                      <span className="inline-block bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium">
                        {item.publication_year_solar}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600 my-3">
                  <div>
                    <span className="font-semibold text-gray-700">نویسنده:</span> {joinNamesFromArray(item.works?.playwright_fa) || 'نامشخص'}
                  </div>
                  {item.translator_fa && item.translator_fa.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-700">مترجم:</span> {joinNamesFromArray(item.translator_fa)}
                    </div>
                  )}
                  {item.publisher && (
                    <div>
                      <span className="font-semibold text-gray-700">ناشر:</span> {item.publisher}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-gray-500 my-2 pt-2 border-t border-gray-100">
                  {item.page_count && <span>تعداد صفحه: {item.page_count}</span>}
                  {item.cast_total !== null && item.cast_total !== -1 && <span>بازیگران: {item.cast_total}</span>}
                  {item.cast_men !== null && <span>مرد: {item.cast_men}</span>}
                  {item.cast_women !== null && <span>زن: {item.cast_women}</span>}
                  {item.cast_nonspecific !== null && <span>خنثی: {item.cast_nonspecific}</span>}
                </div>

                {item.synopsis && (
                  <p className="text-sm text-gray-700 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                    {item.synopsis}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}