import React from 'react';
import { useFormContext } from 'react-hook-form';
import FieldError from '../ui/FieldError';

const inputClass =
  'w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-gray-50 focus:bg-white transition-colors';
const lockedClass = 'bg-gray-100 text-gray-500 cursor-not-allowed';

export default function RequiredFields({ isCheckingDuplicate = false, lockedFields = {} }) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext();

  const sourceLanguage = watch('source_language');
  const isTranslated = !!sourceLanguage && sourceLanguage !== 'fa';
  const isLocked = (name) => !!lockedFields[name];

  return (
    <div className="space-y-5">
      {/* ===== Title ===== */}
      <div>
        <label htmlFor="title_fa" className="block text-sm font-semibold text-gray-800 mb-1.5">
          عنوان نمایشنامه <span className="text-red-500">*</span>
        </label>
        <input
          id="title_fa"
          type="text"
          {...register('title_fa')}
          disabled={isLocked('title_fa')}
          aria-invalid={!!errors.title_fa}
          aria-describedby="title_fa-error"
          className={`${inputClass} ${isLocked('title_fa') ? lockedClass : ''}`}
          placeholder="مثال: حکام قدیم، حکام جدید"
        />
        <FieldError id="title_fa-error" message={errors.title_fa?.message} />
        {isCheckingDuplicate && (
          <p className="mt-1 text-xs text-blue-600">⏳ در حال بررسی موارد تکراری...</p>
        )}
      </div>

      {/* ===== Playwright ===== */}
      <div>
        <label htmlFor="playwright_fa" className="block text-sm font-semibold text-gray-800 mb-1.5">
          نویسنده / نمایشنامه‌نویس <span className="text-red-500">*</span>
        </label>
        <input
          id="playwright_fa"
          type="text"
          {...register('playwright_fa')}
          disabled={isLocked('playwright_fa')}
          aria-invalid={!!errors.playwright_fa}
          aria-describedby="playwright_fa-error"
          className={`${inputClass} ${isLocked('playwright_fa') ? lockedClass : ''}`}
          placeholder="مثال: مؤیدالممالک فکری ارشاد"
        />
        <FieldError id="playwright_fa-error" message={errors.playwright_fa?.message} />
      </div>

      {/* ===== Source Language ===== */}
      <div>
        <label htmlFor="source_language" className="block text-sm font-semibold text-gray-800 mb-1.5">
          زبان اصلی اثر
        </label>
        <select
          id="source_language"
          {...register('source_language')}
          disabled={isLocked('source_language')}
          aria-invalid={!!errors.source_language}
          aria-describedby="source_language-error"
          className={`${inputClass} ${isLocked('source_language') ? lockedClass : ''}`}
        >
          <option value="fa">فارسی (تألیفی)</option>
          <option value="en">انگلیسی</option>
          <option value="ar">عربی</option>
          <option value="fr">فرانسوی</option>
          <option value="de">آلمانی</option>
          <option value="ru">روسی</option>
          <option value="other">سایر</option>
        </select>
        <FieldError id="source_language-error" message={errors.source_language?.message} />
      </div>

      {/* ===== Translator ===== */}
      <div>
        <label htmlFor="translator_fa" className="block text-sm font-semibold text-gray-800 mb-1.5">
          مترجم {isTranslated && <span className="text-red-500">*</span>}
        </label>
        <input
          id="translator_fa"
          type="text"
          {...register('translator_fa')}
          disabled={isLocked('translator_fa')}
          aria-invalid={!!errors.translator_fa}
          aria-describedby="translator_fa-error"
          className={`${inputClass} ${isLocked('translator_fa') ? lockedClass : ''}`}
          placeholder={isTranslated ? 'نام مترجم الزامی است' : 'فقط برای آثار ترجمه‌شده'}
        />
        <FieldError id="translator_fa-error" message={errors.translator_fa?.message} />
      </div>
    </div>
  );
}