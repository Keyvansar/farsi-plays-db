import React from 'react';
import { joinNamesFromArray } from '../../utils/textUtils';

export default function PlayCard({ edition, onClick }) {
  if (!edition) return null;

  const work = edition.works || {};
  const tags = edition.edition_tags?.map(et => et.taxonomy?.label_fa).filter(Boolean) || [];

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(edition);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`نمایش جزئیات نمایشنامه ${edition.title_fa}`}
      onClick={() => onClick(edition)}
      onKeyDown={handleKeyDown}
      className="group bg-white p-5 rounded-xl border-2 border-gray-100 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-4 mb-3">
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {edition.title_fa}
        </h3>

        {/* Status Badges */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {edition.is_verified ? (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              تایید شده
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
              در انتظار تایید
            </span>
          )}

          {work.source_language && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${work.source_language !== 'fa'
              ? 'bg-sky-50 text-sky-700 border-sky-200'
              : 'bg-violet-50 text-violet-700 border-violet-200'
              }`}>
              {work.source_language !== 'fa' ? 'ترجمه' : 'تألیفی'}
            </span>
          )}
          {/* 🆕 Edition count badge */}
          {edition.work_edition_count > 1 && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path d="M10 12a1 1 0 001-1V6.5a1 1 0 10-2 0V11a1 1 0 001 1z" />
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              {edition.work_edition_count} نسخه
            </span>
          )}
        </div>
      </div>

      {/* Author / Translator */}
      <div className="space-y-1 mb-4 text-sm text-gray-600">
        <p className="truncate flex items-center gap-1.5">
          <span className="text-gray-400">✍️</span>
          <span className="font-medium">{joinNamesFromArray(work.playwright_fa) || 'نامشخص'}</span>
        </p>
        {edition.translator_fa?.length > 0 && (
          <p className="truncate flex items-center gap-1.5">
            <span className="text-gray-400">🔄</span>
            <span>{joinNamesFromArray(edition.translator_fa)}</span>
          </p>
        )}
      </div>

      {/* Publication Info (Grouped by subtle background colors for scannability) */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs font-medium">
        {edition.publisher && (
          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md">
            {edition.publisher}
          </span>
        )}
        {edition.publication_year_solar && (
          <span className="px-2 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-md">
            {edition.publication_year_solar}
          </span>
        )}
        {edition.page_count && (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
            {edition.page_count} صفحه
          </span>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-medium">
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="px-2 py-0.5 text-gray-400 text-[11px] font-medium">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}