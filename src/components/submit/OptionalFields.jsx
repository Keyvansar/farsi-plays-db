import { useFormContext } from 'react-hook-form';
import CastSection from './CastSection';
import ExternalLinksSection from './ExternalLinksSection';
import TagsSection from './TagsSection';

export default function OptionalFields({ castWarning, lockedFields = {} }) {
  const { register, watch } = useFormContext();
  const watchedIsInCollection = watch('is_in_collection');

  const inputClass = (isLocked) =>
    `w-full px-4 py-3 border-2 rounded-xl focus:ring-0 transition-colors ${
      isLocked
        ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
        : 'border-gray-200 focus:border-indigo-500 bg-white'
    }`;

  return (
    <div className="space-y-6 bg-gray-50/50 p-5 rounded-xl border border-gray-100">

      {/* Publication Status */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          وضعیت انتشار
          {lockedFields.publication_status && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
        </label>
        <select
          {...register('publication_status', { disabled: lockedFields.publication_status })}
          className={inputClass(lockedFields.publication_status)}
        >
          <option value="published">منتشر شده</option>
          <option value="unpublished">منتشر نشده</option>
          <option value="manuscript">نسخه خطی</option>
          <option value="digital">نسخه دیجیتال</option>
        </select>
      </div>

      {/* Publisher & Year */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            ناشر {lockedFields.publisher && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
          </label>
          <input
            type="text"
            {...register('publisher', { disabled: lockedFields.publisher })}
            className={inputClass(lockedFields.publisher)}
            placeholder="مثال: انتشارات نگاه"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            سال انتشار (شمسی) {lockedFields.publication_year_solar && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
          </label>
          <input
            type="number"
            {...register('publication_year_solar', { disabled: lockedFields.publication_year_solar })}
            className={inputClass(lockedFields.publication_year_solar)}
            placeholder="مثال: 1402"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            سال انتشار (میلادی)
            {lockedFields.publication_year_gregorian && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
          </label>
          <input
            type="number"
            {...register('publication_year_gregorian', { disabled: lockedFields.publication_year_gregorian })}
            className={inputClass(lockedFields.publication_year_gregorian)}
            placeholder="مثال: 2023"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            سال نگارش اثر اصلی
            {lockedFields.original_year && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
          </label>
          <input
            type="number"
            {...register('original_year', { disabled: lockedFields.original_year })}
            className={inputClass(lockedFields.original_year)}
            placeholder="مثال: 1965"
            dir="ltr"
          />
        </div>
      </div>

      {/* Collection */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          {...register('is_in_collection', { disabled: lockedFields.is_in_collection })}
          className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <label className="text-sm font-medium text-gray-700">
          این نمایشنامه بخشی از یک مجموعه است
          {lockedFields.is_in_collection && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
        </label>
      </div>

      {watchedIsInCollection && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            عنوان مجموعه
            {lockedFields.collection_title && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
          </label>
          <input
            type="text"
            {...register('collection_title', { disabled: lockedFields.collection_title })}
            className={inputClass(lockedFields.collection_title)}
            placeholder="مثال: مجموعه نمایشنامه‌های اکبر رادی"
          />
        </div>
      )}

      {/* ISBN & Pages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            شابک {lockedFields.isbn && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
          </label>
          <input
            type="text"
            {...register('isbn', { disabled: lockedFields.isbn })}
            className={inputClass(lockedFields.isbn)}
            placeholder="978-964-..."
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            تعداد صفحات {lockedFields.page_count && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
          </label>
          <input
            type="number"
            {...register('page_count', { disabled: lockedFields.page_count })}
            className={inputClass(lockedFields.page_count)}
            placeholder="مثال: 120"
          />
        </div>
      </div>

      {/* Sub-sections */}
      <CastSection castWarning={castWarning} lockedFields={lockedFields} />
      <ExternalLinksSection />
      <TagsSection />
    </div>
  );
}