import React from 'react';
import AutocompleteFilter from './AutocompleteFilter';
import AutocompleteSelect from '../ui/AutocompleteSelect';
import { supabase } from '../../lib/supabase';

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
          <button onClick={onClearAll} className="text-xs text-red-500 hover:text-red-700 font-medium focus-visible:ring-2 focus-visible:ring-red-500 rounded px-1 outline-none" aria-label="پاک کردن همه فیلترها">
            پاک کردن همه ({activeCount})
          </button>
        )}
      </div>
          {/* ===== Writers ===== */}

      <AutocompleteSelect
  label="نویسندگان"
  selectedValues={filters.playwrights}
  onChange={(newValues) => setFilters({ ...filters, playwrights: newValues })}
  searchFn={async (term) => {
    const { data } = await supabase.rpc('search_playwrights', {
      search_term: term,
      limit_val: 50,
    });
    // FIX: Extract .name from the row object
    return (data || []).map(row => ({ value: row.name, label: row.name }));
  }}
  placeholder="نام نویسنده..."
/>

      {/* ===== Translators ===== */}
<AutocompleteSelect
  label="مترجمان"
  selectedValues={filters.translators}
  onChange={(newValues) => setFilters({ ...filters, translators: newValues })}
  searchFn={async (term) => {
    const { data } = await supabase.rpc('search_translators', {
      search_term: term,
      limit_val: 50,
    });
    // FIX: Extract .name from the row object
    return (data || []).map(row => ({ value: row.name, label: row.name }));
  }}
  placeholder="نام مترجم..."
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

      {/* ===== Tags ===== */}
<AutocompleteSelect
  label="برچسب‌ها"
  selectedValues={filters.tags}
  onChange={(newValues) => setFilters({ ...filters, tags: newValues })}
  searchFn={async (term) => {
    const { data } = await supabase.rpc('search_tags', {
      search_term: term,
      limit_val: 50,
    });
    // FIX: Extract .id and .label_fa from the row object
    return (data || []).map(row => ({ value: row.id, label: row.label_fa }));
  }}
  placeholder="جستجوی برچسب..."
/>

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