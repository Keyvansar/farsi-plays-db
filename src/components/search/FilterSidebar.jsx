import React from 'react';
import AutocompleteFilter from './AutocompleteFilter';

export default function FilterSidebar({
  filters, setFilters,
  playwrights, translators, tags,
  onClearAll, activeCount
}) {
  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900">🔧 فیلترها</h3>
        {activeCount > 0 && (
          <button onClick={onClearAll} className="text-xs text-red-500 hover:text-red-700 font-medium">
            پاک کردن همه ({activeCount})
          </button>
        )}
      </div>

      {/* Playwright Autocomplete */}
      <AutocompleteFilter
        label="نویسنده"
        options={playwrights}
        selected={filters.playwrights}
        onChange={(val) => updateFilter('playwrights', val)}
      />

      {/* Translator Autocomplete */}
      <AutocompleteFilter
        label="مترجم"
        options={translators}
        selected={filters.translators}
        onChange={(val) => updateFilter('translators', val)}
      />

      {/* Source Language */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">نوع اثر</label>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'همه' },
            { value: 'fa', label: 'تألیفی' },
            { value: 'translated', label: 'ترجمه' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => updateFilter('sourceType', opt.value)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                filters.sourceType === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Year Range */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">سال انتشار (شمسی)</label>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="از" value={filters.yearMin} onChange={(e) => updateFilter('yearMin', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center" />
          <span className="text-gray-400">—</span>
          <input type="number" placeholder="تا" value={filters.yearMax} onChange={(e) => updateFilter('yearMax', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center" />
        </div>
      </div>

      {/* Publication Status */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">وضعیت انتشار</label>
        <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">همه</option>
          <option value="published">منتشر شده</option>
          <option value="unpublished">منتشر نشده</option>
          <option value="manuscript">نسخه خطی</option>
          <option value="digital">دیجیتال</option>
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">برچسب‌ها</label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => {
                const isSelected = filters.tags.includes(tag.id);
                updateFilter('tags', isSelected
                  ? filters.tags.filter(t => t !== tag.id)
                  : [...filters.tags, tag.id]
                );
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                filters.tags.includes(tag.id)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tag.label_fa}
            </button>
          ))}
        </div>
      </div>

      {/* Cast Size */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">تعداد بازیگران</label>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="حداقل" value={filters.castMin} onChange={(e) => updateFilter('castMin', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center" />
          <span className="text-gray-400">—</span>
          <input type="number" placeholder="حداکثر" value={filters.castMax} onChange={(e) => updateFilter('castMax', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center" />
        </div>
      </div>

      {/* Boolean Toggles */}
      <div className="space-y-2">
        {[
          { key: 'verifiedOnly', label: 'فقط تایید شده‌ها' },
          { key: 'hasSynopsis', label: 'دارای خلاصه' },
          { key: 'inCollection', label: 'بخشی از مجموعه' },
          { key: 'hasLinks', label: 'دارای لینک خارجی' },
        ].map(toggle => (
          <label key={toggle.key} className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={filters[toggle.key]}
              onChange={(e) => updateFilter(toggle.key, e.target.checked)}
              className="rounded text-indigo-600"
            />
            <span>{toggle.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}