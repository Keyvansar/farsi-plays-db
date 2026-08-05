import { useFormContext } from 'react-hook-form';

export default function RequiredFields({ isCheckingDuplicate }) {
  const { register, formState: { errors }, watch } = useFormContext();
  const watchedSourceLang = watch('source_language');

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          عنوان نمایشنامه <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('title_fa')}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white"
          placeholder="مثال: رستم و سهراب"
        />
        {errors.title_fa && (
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
        </label>
        <input
          type="text"
          {...register('playwright_fa')}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white"
          placeholder="مثال: اکبر رادی (برای چند نفر با ویرگول جدا کنید)"
        />
        {errors.playwright_fa && (
          <p className="mt-1 text-sm text-red-600">{errors.playwright_fa.message}</p>
        )}
      </div>

      {/* Source Language */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          زبان اصلی اثر
        </label>
        <select
          {...register('source_language')}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-gray-50 focus:bg-white"
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
	</label>
          <input
            type="text"
            {...register('translator_fa')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white"
            placeholder="مثال: نجف دریابندری"
          />
	  {errors.translator_fa && (
            <p className="mt-1 text-sm text-red-600">{errors.translator_fa.message}</p>
          )}
        </div>
      )}

      {/* Original Title (Conditional) */}
      {watchedSourceLang !== 'fa' && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">
            عنوان اصلی اثر (به زبان مبدأ)
          </label>
          <input
            type="text"
            {...register('original_title')}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white"
            placeholder="Original Title"
            dir="ltr"
          />
        </div>
      )}
    </div>
  );
}