import { useFormContext } from 'react-hook-form';
import CastSection from './CastSection';
import ExternalLinksSection from './ExternalLinksSection';
import TagsSection from './TagsSection';

export default function OptionalFields({ castWarning }) {
  const { register, watch } = useFormContext();
  const watchedIsInCollection = watch('is_in_collection');

  return (
    <div className="space-y-6 bg-gray-50/50 p-5 rounded-xl border border-gray-100">

      {/* Publication Status */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          وضعیت انتشار
        </label>
        <select
          {...register('publication_status')}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-white"
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
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">ناشر</label>
          <input
            type="text"
            {...register('publisher')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-white"
            placeholder="مثال: انتشارات نگاه"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">سال انتشار (شمسی)</label>
          <input
            type="number"
            {...register('publication_year_solar')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-white"
            placeholder="مثال: 1402"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">سال انتشار (میلادی)</label>
          <input
            type="number"
            {...register('publication_year_gregorian')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-white"
            placeholder="مثال: 2023"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">سال نگارش اثر اصلی</label>
          <input
            type="number"
            {...register('original_year')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-white"
            placeholder="مثال: 1965"
            dir="ltr"
          />
        </div>
      </div>

      {/* Collection Checkbox */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          {...register('is_in_collection')}
          className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label className="text-sm font-medium text-gray-700">
          این نمایشنامه بخشی از یک مجموعه است
        </label>
      </div>

      {watchedIsInCollection && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">عنوان مجموعه</label>
          <input
            type="text"
            {...register('collection_title')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-white"
            placeholder="مثال: مجموعه نمایشنامه‌های اکبر رادی"
          />
        </div>
      )}

      {/* ISBN & Page Count */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">شابک (ISBN)</label>
          <input
            type="text"
            {...register('isbn')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-white"
            placeholder="978-964-..."
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">تعداد صفحات</label>
          <input
            type="number"
            {...register('page_count')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-white"
            placeholder="مثال: 120"
          />
        </div>
      </div>

      {/* Sub-sections */}
      <CastSection castWarning={castWarning} />
      <ExternalLinksSection />
      <TagsSection />
    </div>
  );
}