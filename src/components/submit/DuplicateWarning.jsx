export default function DuplicateWarning({
  duplicateMatches,
  selectedMergeTarget,
  onSelectTarget,
  isCompleting,
  onToggleComplete,
}) {
  if (duplicateMatches.length === 0) return null;

  const formatList = (arr) => Array.isArray(arr) ? arr.join('، ') : arr || '—';

  return (
    <div className="mb-6 p-5 bg-yellow-50 border border-yellow-200 rounded-xl">
      <p className="text-sm font-bold text-yellow-800 mb-3">
        ⚠️ آثاری با عنوان مشابه پیدا شد:
      </p>

      {/* Match List */}
      <div className="space-y-3 mb-4">
        {duplicateMatches.map((match) => (
          <div
            key={match.id}
            onClick={() => onSelectTarget(match)}
            className={`p-4 rounded-lg cursor-pointer transition-all border ${
              selectedMergeTarget?.id === match.id
                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <p className="font-bold text-gray-900 mb-1">{match.title_fa}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
              {match.works?.playwright_fa && <span>✍️ {formatList(match.works.playwright_fa)}</span>}
              {match.publisher && <span>🏢 {match.publisher}</span>}
              {match.publication_year_solar && <span>📅 {match.publication_year_solar}</span>}
              {match.page_count && <span>📄 {match.page_count} صفحه</span>}
              {match.isbn && <span dir="ltr">📖 {match.isbn}</span>}
              {match.cast_total && <span>🎭 {match.cast_total} بازیگر</span>}
              {match.translator_fa?.length > 0 && <span>🌐 {formatList(match.translator_fa)}</span>}
            </div>
            {match.synopsis && (
              <p className="text-xs text-gray-500 mt-2 line-clamp-2">{match.synopsis}</p>
            )}
{match.edition_tags?.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {match.edition_tags.map(et => (
      <span key={et.taxonomy_id} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
        {et.taxonomy?.label_fa}
      </span>
    ))}
  </div>
)}
{match.external_references?.length > 0 && (
  <span className="text-xs text-gray-500">🔗 {match.external_references.length} لینک</span>
)}
          </div>
        ))}
      </div>

      {/* Complete Checkbox */}
      {selectedMergeTarget && (
        <div className="bg-white p-4 rounded-lg border border-indigo-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isCompleting}
              onChange={(e) => onToggleComplete(e.target.checked)}
              className="mt-1 w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <div>
              <span className="font-bold text-gray-900 text-sm">
                می‌خواهم اطلاعات این اثر را تکمیل کنم
              </span>
              <p className="text-xs text-gray-500 mt-1">
                با زدن این تیک، فرم با اطلاعات موجود در پایگاه داده پر می‌شود.
                فیلدهایی که قبلاً پر شده‌اند غیرقابل ویرایش خواهند بود و فقط
                فیلدهای خالی برای تکمیل در دسترس هستند.
              </p>
            </div>
          </label>

          {/* Show what's already filled */}
          {isCompleting && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-green-700 mb-2">✅ فیلدهای موجود (غیرقابل ویرایش):</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedMergeTarget.title_fa && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">عنوان</span>}
                {selectedMergeTarget.works?.playwright_fa?.length > 0 && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">نویسنده</span>}
                {selectedMergeTarget.translator_fa?.length > 0 && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">مترجم</span>}
                {selectedMergeTarget.publisher && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">ناشر</span>}
                {selectedMergeTarget.publication_year_solar && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">سال</span>}
                {selectedMergeTarget.isbn && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">شابک</span>}
                {selectedMergeTarget.page_count && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">صفحات</span>}
                {selectedMergeTarget.synopsis && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">خلاصه</span>}
                {selectedMergeTarget.cast_total && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">بازیگران</span>}
              </div>
              <p className="text-xs font-medium text-indigo-700 mt-2">✏️ فیلدهای خالی (قابل تکمیل):</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {!selectedMergeTarget.publisher && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">ناشر</span>}
                {!selectedMergeTarget.publication_year_solar && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">سال</span>}
                {!selectedMergeTarget.isbn && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">شابک</span>}
                {!selectedMergeTarget.page_count && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">صفحات</span>}
                {!selectedMergeTarget.synopsis && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">خلاصه</span>}
                {!selectedMergeTarget.cast_total && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">بازیگران</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}