import Modal from '../ui/Modal';
import { joinNamesFromArray } from '../../utils/textUtils';

export default function PlayDetailModal({ edition, onClose, onEdit, onSuggest, onFlag, onDelete }) {
  if (!edition) return null;
  const work = edition.works;
  const tags = edition.edition_tags?.map(et => et.taxonomy?.label_fa).filter(Boolean) || [];
  const refs = edition.external_references || [];

  return (
    <Modal 
      onClose={onClose} 
      title={edition.title_fa} 
      subtitle={work?.original_title || null}
      maxWidth="max-w-2xl"
    >
      <div className="p-6 space-y-6">
        {/* Basic Info */}
        <section>
          <h3 className="text-sm font-bold text-indigo-600 mb-3">📌 اطلاعات اصلی</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">نویسنده:</span> <strong>{joinNamesFromArray(work?.playwright_fa) || '—'}</strong></div>
            <div><span className="text-gray-500">مترجم:</span> <strong>{joinNamesFromArray(edition.translator_fa) || '—'}</strong></div>
            <div><span className="text-gray-500">زبان اصلی:</span> <strong>{work?.source_language === 'fa' ? 'فارسی' : work?.source_language}</strong></div>
            <div><span className="text-gray-500">وضعیت:</span> <strong>{edition.publication_status}</strong></div>
          </div>
        </section>

        {/* Publication */}
        <section>
          <h3 className="text-sm font-bold text-indigo-600 mb-3">📖 نشر</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">ناشر:</span> <strong>{edition.publisher || '—'}</strong></div>
            <div><span className="text-gray-500">سال شمسی:</span> <strong>{edition.publication_year_solar || '—'}</strong></div>
            <div><span className="text-gray-500">سال میلادی:</span> <strong>{edition.publication_year_gregorian || '—'}</strong></div>
            <div><span className="text-gray-500">شابک:</span> <strong dir="ltr">{edition.isbn || '—'}</strong></div>
            <div><span className="text-gray-500">صفحات:</span> <strong>{edition.page_count || '—'}</strong></div>
            {edition.collection_title && (
              <div><span className="text-gray-500">مجموعه:</span> <strong>{edition.collection_title}</strong></div>
            )}
          </div>
        </section>

        {/* Cast */}
        <section>
          <h3 className="text-sm font-bold text-indigo-600 mb-3">🎭 بازیگران</h3>
          {edition.cast_total ? (
            <div className="flex gap-4 text-sm flex-wrap">
              <span>مرد: <strong>{edition.cast_men || 0}</strong></span>
              <span>زن: <strong>{edition.cast_women || 0}</strong></span>
              <span>نامشخص: <strong>{edition.cast_nonspecific || 0}</strong></span>
              <span>مجموع: <strong>{edition.cast_total}</strong></span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">نامشخص</p>
          )}
        </section>

        {/* Synopsis */}
        {edition.synopsis && (
          <section>
            <h3 className="text-sm font-bold text-indigo-600 mb-3">📝 خلاصه</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{edition.synopsis}</p>
          </section>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-indigo-600 mb-3">🏷️ برچسب‌ها</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">{tag}</span>
              ))}
            </div>
          </section>
        )}

        {/* External References */}
        {refs.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-indigo-600 mb-3">🔗 لینک‌های خارجی</h3>
            <div className="space-y-2">
              {refs.map(ref => (
                <a
                  key={ref.id}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 truncate"
                  dir="ltr"
                >
                  {ref.ref_type === 'ebook' ? '📖' : ref.ref_type === 'article' ? '📄' : ref.ref_type === 'video' ? '🎬' : '🔗'}
                  {ref.url}
                </a>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 p-4 rounded-b-2xl">
        <div className="flex gap-2">
          <button
            onClick={() => { onClose(); onEdit?.(edition); }}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
          >
            ✏️ ویرایش
          </button>
          <button
            onClick={() => { onClose(); onSuggest?.(edition); }}
            className="flex-1 py-2.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg font-medium hover:bg-yellow-100 transition-colors text-sm"
          >
            💡 پیشنهاد
          </button>
          <button
            onClick={() => { onClose(); onFlag?.(edition); }}
            className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
          >
            🚩 گزارش
          </button>
          <button
            onClick={() => { onClose(); onDelete?.(edition); }}
            className="flex-1 py-2.5 bg-gray-100 text-gray-600 border border-gray-200 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
          >
            🗑️ حذف
          </button>
        </div>
      </div>
    </Modal>
  );
}