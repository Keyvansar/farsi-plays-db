import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../ui/Modal';
import { joinNamesFromArray } from '../../utils/textUtils';
import { toast } from 'sonner';
import { getEditionFull } from '../submit/submitActions';

export default function PlayDetailModal({ edition, onClose, onEdit, onSuggest, onFlag, onDelete, onSwitchEdition }) {
  // 🆕 Other editions of the same work
  const [otherEditions, setOtherEditions] = useState([]);
  const [loadingEditions, setLoadingEditions] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);

  // 🛛 FIX: useEffect MUST be before any conditional return (React hooks rule)
  const workId = edition?.work_id || edition?.works?.id;

  useEffect(() => {
    if (!workId || !edition?.id) {
      setOtherEditions([]);
      return;
    }

    const fetchOtherEditions = async () => {
      setLoadingEditions(true);
      try {
        const { data, error } = await supabase
          .from('farsi_editions')
          .select(`
            id,
            title_fa,
            translator_fa,
            publisher,
            publication_year_solar,
            publication_status,
            is_verified,
            page_count
          `)
          .eq('work_id', workId)
          .neq('id', edition.id)
          .order('publication_year_solar', { ascending: false, nullsFirst: false })
          .limit(10);

        if (!error) setOtherEditions(data || []);
      } catch (err) {
        console.error('Error fetching other editions:', err);
        setOtherEditions([]);
      } finally {
        setLoadingEditions(false);
      }
    };

    fetchOtherEditions();
  }, [workId, edition?.id]);

  // 🛛 Conditional return AFTER all hooks
  if (!edition) return null;

  const work = edition.works;
  const tags = edition.edition_tags?.map(et => et.taxonomy?.label_fa).filter(Boolean) || [];
  const refs = edition.external_references || [];

  // 🆕 Fetch FULL edition data before switching
  const handleSwitchEdition = async (targetEdition) => {
    setSwitchingId(targetEdition.id);
    try {
      const full = await getEditionFull(targetEdition.id);
      if (full && onSwitchEdition) {
        onSwitchEdition(full);
      }
    } catch (err) {
      console.error('Error fetching full edition:', err);
      toast.error('خطا در بارگذاری نسخه.');
    } finally {
      setSwitchingId(null);
    }
  };

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

        {/* 🆕 Other Editions Section */}
        {(otherEditions.length > 0 || loadingEditions) && (
          <section>
            <h3 className="text-sm font-bold text-indigo-600 mb-3">
              📚 نسخه‌های دیگر این اثر
              {otherEditions.length > 0 && (
                <span className="mr-2 text-xs font-normal text-gray-400">({otherEditions.length} نسخه)</span>
              )}
            </h3>

            {loadingEditions ? (
              <p className="text-sm text-gray-400">در حال بارگذاری...</p>
            ) : (
              <div className="space-y-2">
                {otherEditions.map(ed => (
                  <button
                    key={ed.id}
                    type="button"
                    onClick={() => handleSwitchEdition(ed)}
                    disabled={switchingId === ed.id}
                    className="w-full text-right p-3 rounded-lg border-2 border-gray-100 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group disabled:opacity-50"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          📖 {ed.title_fa}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {ed.translator_fa?.length > 0 && (
                            <span>🔄 {joinNamesFromArray(ed.translator_fa)} | </span>
                          )}
                          {ed.publisher && <span>🏢 {ed.publisher}</span>}
                          {ed.publication_year_solar && <span> | 📅 {ed.publication_year_solar}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ed.is_verified && (
                          <span className="text-green-600 text-xs" title="تایید شده">✅</span>
                        )}
                        <span className="text-xs text-indigo-400 group-hover:text-indigo-600">
                          {switchingId === ed.id ? '⏳ ...' : 'مشاهده ←'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
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