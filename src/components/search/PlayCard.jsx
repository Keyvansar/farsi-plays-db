export default function PlayCard({ edition, onClick }) {
  const work = edition.works;
  const tags = edition.edition_tags?.map(et => et.taxonomy?.label_fa).filter(Boolean) || [];
  const formatList = (arr) => Array.isArray(arr) ? arr.join('، ') : arr;

  return (
    <div
      onClick={() => onClick(edition)}
      className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold text-gray-900">{edition.title_fa}</h3>
        {edition.is_verified && (
          <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full shrink-0">✅</span>
        )}
      </div>

      <p className="text-gray-600 text-sm mb-3">
        <span className="font-medium">نویسنده:</span> {formatList(work?.playwright_fa) || 'نامشخص'}
      </p>

      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
        {edition.publication_year_solar && <span>📅 {edition.publication_year_solar}</span>}
        {edition.publisher && <span>🏢 {edition.publisher}</span>}
        {edition.page_count && <span>📄 {edition.page_count} ص</span>}
        {work?.source_language !== 'fa' && <span className="text-indigo-600 font-medium">🌐 ترجمه</span>}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{tag}</span>
          ))}
          {tags.length > 3 && <span className="text-xs text-gray-400">+{tags.length - 3} بیشتر</span>}
        </div>
      )}
    </div>
  );
}