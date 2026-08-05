import { useFormContext } from 'react-hook-form';

export default function RequiredFields({ isCheckingDuplicate, lockedFields = {} }) {
  const { register, formState: { errors }, watch } = useFormContext();
  const watchedSourceLang = watch('source_language');

  const inputClass = (isLocked) =>
    `w-full px-4 py-3 border-2 rounded-xl focus:ring-0 transition-colors ${
      isLocked
        ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
        : 'border-gray-200 focus:border-indigo-500 bg-gray-50 focus:bg-white'
    }`;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          عنوان نمایشنامه <span className="text-red-500">*</span>
          {lockedFields.title_fa && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
        </label>
        <input
          type="text"
          {...register('title_fa', { disabled: lockedFields.title_fa })}
          className={inputClass(lockedFields.title_fa)}
          placeholder="مثال: رستم و سهراب"
        />
        {errors.title_fa && !lockedFields.title_fa && (
          <p className="mt-1 text-sm text-red-600">{errors.title_fa.message}</p>
        )}
        {isCheckingDuplicate && (
          <p className="mt-1 text-xs text-gray-500">در حال بررسی موارد مشابه...</p>
        )}
      </div>

      {/* Playwright */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          نویسنده / نمایشنامه‌نویس <span className="text-red-500">*</span>
          {lockedFields.playwright_fa && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
        </label>
        <input
          type="text"
          {...register('playwright_fa', { disabled: lockedFields.playwright_fa })}
          className={inputClass(lockedFields.playwright_fa)}
          placeholder="مثال: اکبر رادی"
        />
        {errors.playwright_fa && !lockedFields.playwright_fa && (
          <p className="mt-1 text-sm text-red-600">{errors.playwright_fa.message}</p>
        )}
      </div>

      {/* Source Language */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          زبان اصلی اثر
          {lockedFields.source_language && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
        </label>
        <select
          {...register('source_language', { disabled: lockedFields.source_language })}
          className={inputClass(lockedFields.source_language)}
        >
          <option value="fa">فارسی (تألیفی)</option>
          <option value="en">انگلیسی (ترجمه)</option>
          <option value="fr">فرانسوی (ترجمه)</option>
          <option value="de">آلمانی (ترجمه)</option>
          <option value="ru">روسی (ترجمه)</option>
          <option value="ar">عربی (ترجمه)</option>
          <option value="tr">ترکی (ترجمه)</option>
          <option value="other">سایر</option>
        </select>
      </div>

      {/* Translator (Conditional) */}
      {watchedSourceLang !== 'fa' && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            مترجم <span className="text-red-500">*</span>
            {lockedFields.translator_fa && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
          </label>
          <input
            type="text"
            {...register('translator_fa', { disabled: lockedFields.translator_fa })}
            className={inputClass(lockedFields.translator_fa)}
            placeholder="مثال: نجف دریابندری"
          />
          {errors.translator_fa && !lockedFields.translator_fa && (
            <p className="mt-1 text-sm text-red-600">{errors.translator_fa.message}</p>
          )}
        </div>
      )}

      {/* Original Title (Conditional) */}
      {watchedSourceLang !== 'fa' && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            عنوان اصلی اثر
            {lockedFields.original_title && <span className="text-xs text-gray-400 mr-2">(موجود)</span>}
          </label>
          <input
            type="text"
            {...register('original_title', { disabled: lockedFields.original_title })}
            className={inputClass(lockedFields.original_title)}
            placeholder="Original Title"
            dir="ltr"
          />
        </div>
      )}
    </div>
  );
}