import React from 'react';
import { joinNamesFromArray } from '../../utils/textUtils';

export default function DuplicateWarning({
  matches = [],
  selectedMatch = null,
  onSelect,
  isChecking = false,
  isCompleting = false,
  onChange,
}) {
  // Loading state while checking for duplicates
  if (isChecking) {
    return (
      <div className="p-4 mb-6 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        ⏳ در حال بررسی موارد تکراری...
      </div>
    );
  }

  // Nothing to show if no matches
  if (!matches || matches.length === 0) return null;

  return (
    <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">⚠️</span>
        <div>
          <h3 className="font-bold text-amber-900">اثر مشابهی یافت شد!</h3>
          <p className="text-sm text-amber-800 mt-1 leading-relaxed">
            به نظر می‌رسد این اثر قبلاً در سامانه ثبت شده است. یکی از موارد زیر را انتخاب کنید؛
            اگر اثر شما متفاوت است، نیازی به انتخاب نیست و می‌توانید ثبت مستقل انجام دهید.
          </p>
        </div>
      </div>

      {/* Match Cards */}
      <div className="space-y-3">
        {matches.map((match) => {
          const work = match.works || {};
          const isSelected = !!selectedMatch && selectedMatch.id === match.id;
          const tags =
            match.edition_tags
              ?.map((et) => et.taxonomy?.label_fa)
              .filter(Boolean) || [];
          const refs = match.external_references || [];

          return (
            <button
              key={match.id}
              type="button"
              onClick={() => onSelect(isSelected ? null : match)}
              className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'bg-amber-100 border-amber-500 shadow-sm'
                  : 'bg-white border-amber-200 hover:border-amber-400'
              }`}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900">📖 {match.title_fa}</p>

                  <p className="text-sm text-gray-600 mt-1">
                    ✍️ {joinNamesFromArray(work.playwright_fa) || 'نامشخص'}
                    {match.translator_fa?.length > 0 && (
                      <span> | 🔄 {joinNamesFromArray(match.translator_fa)}</span>
                    )}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {match.publisher && <span>🏢 {match.publisher}</span>}
                    {match.publication_year_solar && (
                      <span> | 📅 {match.publication_year_solar}</span>
                    )}
                    {match.publication_status && (
                      <span> | 📌 {match.publication_status}</span>
                    )}
                  </p>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((tag, i) => (
                        <span
                          key={`${tag}-${i}`}
                          className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs"
                        >
                          🏷️ {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* External links count */}
                  {refs.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      🔗 {refs.length} لینک خارجی
                    </p>
                  )}
                </div>

                {/* Selection Indicator */}
                <span
                  className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                    isSelected
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-gray-300 text-transparent'
                  }`}
                >
                  ✓
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Complete-this-record checkbox (appears when a match is selected) */}
      {selectedMatch && (
        <label className="flex items-center gap-3 mt-4 p-3 bg-white border border-amber-300 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors">
          <input
            type="checkbox"
            checked={isCompleting}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500"
          />
          <span className="text-sm font-semibold text-amber-900">
            می‌خواهم این اثر را تکمیل کنم (به جای ثبت اثر جدید، اطلاعات ناقص آن را تکمیل می‌کنم)
          </span>
        </label>
      )}

      {/* Helper note when completing */}
      {isCompleting && selectedMatch && (
        <p className="mt-3 text-xs text-amber-800 bg-amber-100 p-3 rounded-lg leading-relaxed">
          💡 فیلدهایی که قبلاً تکمیل شده‌اند قفل (خاکستری) می‌شوند و فقط فیلدهای خالی قابل
          ویرایش هستند. برچسب‌ها و لینک‌های موجود نیز به فرم اضافه می‌شوند.
        </p>
      )}
    </div>
  );
}