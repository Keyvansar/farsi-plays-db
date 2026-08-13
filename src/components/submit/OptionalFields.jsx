import React from 'react';
import { useFormContext } from 'react-hook-form';
import FieldError from '../ui/FieldError';
import TagsSection from './TagsSection';
import ExternalLinksSection from './ExternalLinksSection';

const inputClass =
  'w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-gray-50 focus:bg-white transition-colors';
const lockedClass = 'bg-gray-100 text-gray-500 cursor-not-allowed';

export default function OptionalFields({ castWarning = '', lockedFields = {} }) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext();

  const isInCollection = watch('is_in_collection');
  const castUnknown = watch('cast_unknown');
  const isLocked = (name) => !!lockedFields[name];

  return (
    <div className="space-y-5 bg-gray-50/50 border border-gray-100 rounded-xl p-4">
      {/* ===== Publication ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="publication_status" className="block text-sm font-semibold text-gray-800 mb-1.5">
            وضعیت انتشار
          </label>
          <select
            id="publication_status"
            {...register('publication_status')}
            disabled={isLocked('publication_status')}
            aria-invalid={!!errors.publication_status}
            aria-describedby="publication_status-error"
            className={`${inputClass} ${isLocked('publication_status') ? lockedClass : ''}`}
          >
            <option value="published">منتشر شده</option>
            <option value="unpublished">منتشر نشده</option>
            <option value="in_press">زیر چاپ</option>
          </select>
          <FieldError id="publication_status-error" message={errors.publication_status?.message} />
        </div>

        <div>
          <label htmlFor="publisher" className="block text-sm font-semibold text-gray-800 mb-1.5">
            ناشر
          </label>
          <input
            id="publisher"
            type="text"
            {...register('publisher')}
            disabled={isLocked('publisher')}
            aria-invalid={!!errors.publisher}
            aria-describedby="publisher-error"
            className={`${inputClass} ${isLocked('publisher') ? lockedClass : ''}`}
            placeholder="مثال: انتشارات نیلا"
          />
          <FieldError id="publisher-error" message={errors.publisher?.message} />
        </div>
      </div>

      {/* ===== Collection ===== */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('is_in_collection')}
            disabled={isLocked('is_in_collection')}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-semibold text-gray-800">این اثر بخشی از یک مجموعه است</span>
        </label>

        {isInCollection && (
          <div>
            <label htmlFor="collection_title" className="block text-sm font-semibold text-gray-800 mb-1.5">
              عنوان مجموعه
            </label>
            <input
              id="collection_title"
              type="text"
              {...register('collection_title')}
              disabled={isLocked('collection_title')}
              aria-invalid={!!errors.collection_title}
              aria-describedby="collection_title-error"
              className={`${inputClass} ${isLocked('collection_title') ? lockedClass : ''}`}
              placeholder="مثال: مجموعه نمایشنامه‌های معاصر"
            />
            <FieldError id="collection_title-error" message={errors.collection_title?.message} />
          </div>
        )}
      </div>

      {/* ===== Original Title ===== */}
      <div>
        <label htmlFor="original_title" className="block text-sm font-semibold text-gray-800 mb-1.5">
          عنوان اصلی (برای آثار ترجمه‌شده)
        </label>
        <input
          id="original_title"
          type="text"
          {...register('original_title')}
          disabled={isLocked('original_title')}
          aria-invalid={!!errors.original_title}
          aria-describedby="original_title-error"
          className={`${inputClass} ${isLocked('original_title') ? lockedClass : ''}`}
          placeholder="مثال: Hamlet"
          dir="ltr"
        />
        <FieldError id="original_title-error" message={errors.original_title?.message} />
      </div>

      {/* ===== Years ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="publication_year_solar" className="block text-sm font-semibold text-gray-800 mb-1.5">
            سال انتشار (شمسی)
          </label>
          <input
            id="publication_year_solar"
            type="number"
            {...register('publication_year_solar')}
            disabled={isLocked('publication_year_solar')}
            aria-invalid={!!errors.publication_year_solar}
            aria-describedby="publication_year_solar-error"
            className={`${inputClass} ${isLocked('publication_year_solar') ? lockedClass : ''}`}
            placeholder="مثال: 1402"
          />
          <FieldError id="publication_year_solar-error" message={errors.publication_year_solar?.message} />
        </div>

        <div>
          <label htmlFor="publication_year_gregorian" className="block text-sm font-semibold text-gray-800 mb-1.5">
            سال انتشار (میلادی)
          </label>
          <input
            id="publication_year_gregorian"
            type="number"
            {...register('publication_year_gregorian')}
            disabled={isLocked('publication_year_gregorian')}
            aria-invalid={!!errors.publication_year_gregorian}
            aria-describedby="publication_year_gregorian-error"
            className={`${inputClass} ${isLocked('publication_year_gregorian') ? lockedClass : ''}`}
            placeholder="مثال: 2023"
            dir="ltr"
          />
          <FieldError id="publication_year_gregorian-error" message={errors.publication_year_gregorian?.message} />
        </div>

        <div>
          <label htmlFor="original_year" className="block text-sm font-semibold text-gray-800 mb-1.5">
            سال نگارش اثر اصلی
          </label>
          <input
            id="original_year"
            type="number"
            {...register('original_year')}
            disabled={isLocked('original_year')}
            aria-invalid={!!errors.original_year}
            aria-describedby="original_year-error"
            className={`${inputClass} ${isLocked('original_year') ? lockedClass : ''}`}
            placeholder="مثال: 1899"
            dir="ltr"
          />
          <FieldError id="original_year-error" message={errors.original_year?.message} />
        </div>
      </div>

      {/* ===== ISBN / Pages ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="isbn" className="block text-sm font-semibold text-gray-800 mb-1.5">
            شابک (ISBN)
          </label>
          <input
            id="isbn"
            type="text"
            {...register('isbn')}
            disabled={isLocked('isbn')}
            aria-invalid={!!errors.isbn}
            aria-describedby="isbn-error"
            className={`${inputClass} ${isLocked('isbn') ? lockedClass : ''}`}
            placeholder="مثال: 978-600-123-456-7"
            dir="ltr"
          />
          <FieldError id="isbn-error" message={errors.isbn?.message} />
        </div>

        <div>
          <label htmlFor="page_count" className="block text-sm font-semibold text-gray-800 mb-1.5">
            تعداد صفحات
          </label>
          <input
            id="page_count"
            type="number"
            {...register('page_count')}
            disabled={isLocked('page_count')}
            aria-invalid={!!errors.page_count}
            aria-describedby="page_count-error"
            className={`${inputClass} ${isLocked('page_count') ? lockedClass : ''}`}
            placeholder="مثال: 120"
          />
          <FieldError id="page_count-error" message={errors.page_count?.message} />
        </div>
      </div>

      {/* ===== Cast ===== */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">بازیگران</p>

        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            {...register('cast_unknown')}
            disabled={isLocked('cast_unknown')}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">تعداد بازیگران نامشخص است</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="cast_men" className="block text-xs font-medium text-gray-600 mb-1">
              مرد
            </label>
            <input
              id="cast_men"
              type="number"
              {...register('cast_men')}
              disabled={castUnknown || isLocked('cast_men')}
              aria-invalid={!!errors.cast_men}
              aria-describedby="cast_men-error"
              className={`${inputClass} ${castUnknown || isLocked('cast_men') ? lockedClass : ''}`}
            />
            <FieldError id="cast_men-error" message={errors.cast_men?.message} />
          </div>

          <div>
            <label htmlFor="cast_women" className="block text-xs font-medium text-gray-600 mb-1">
              زن
            </label>
            <input
              id="cast_women"
              type="number"
              {...register('cast_women')}
              disabled={castUnknown || isLocked('cast_women')}
              aria-invalid={!!errors.cast_women}
              aria-describedby="cast_women-error"
              className={`${inputClass} ${castUnknown || isLocked('cast_women') ? lockedClass : ''}`}
            />
            <FieldError id="cast_women-error" message={errors.cast_women?.message} />
          </div>

          <div>
            <label htmlFor="cast_nonspecific" className="block text-xs font-medium text-gray-600 mb-1">
              نامشخص
            </label>
            <input
              id="cast_nonspecific"
              type="number"
              {...register('cast_nonspecific')}
              disabled={castUnknown || isLocked('cast_nonspecific')}
              aria-invalid={!!errors.cast_nonspecific}
              aria-describedby="cast_nonspecific-error"
              className={`${inputClass} ${castUnknown || isLocked('cast_nonspecific') ? lockedClass : ''}`}
            />
            <FieldError id="cast_nonspecific-error" message={errors.cast_nonspecific?.message} />
          </div>

          <div>
            <label htmlFor="cast_total" className="block text-xs font-medium text-gray-600 mb-1">
              مجموع (خودکار)
            </label>
            <input
              id="cast_total"
              type="number"
              {...register('cast_total')}
              disabled={castUnknown || isLocked('cast_total')}
              aria-invalid={!!errors.cast_total}
              aria-describedby="cast_total-error"
              className={`${inputClass} ${castUnknown || isLocked('cast_total') ? lockedClass : ''}`}
            />
            <FieldError id="cast_total-error" message={errors.cast_total?.message} />
          </div>
        </div>

        {castWarning && (
          <p role="alert" className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            ⚠️ {castWarning}
          </p>
        )}
      </div>

      {/* ===== Tags ===== */}
      <TagsSection lockedFields={lockedFields} />

      {/* ===== External Links ===== */}
      <ExternalLinksSection lockedFields={lockedFields} />
    </div>
  );
}