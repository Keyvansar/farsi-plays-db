import React, { useState, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editionSchema } from '../../schemas/editionSchema';
import RequiredFields from '../submit/RequiredFields';
import OptionalFields from '../submit/OptionalFields';
import Modal from '../ui/Modal';
import { useCastTotal } from '../../hooks/useCastTotal';
import FieldError from '../ui/FieldError';
import { toast } from 'sonner';
import {
  linkEditionToWork,
  searchWorksForLinking,
} from '../submit/submitActions';

// ===== FIELD LABELS =====
const FIELD_LABELS = {
  title_fa: 'عنوان',
  playwright_fa: 'نویسنده',
  source_language: 'زبان اصلی',
  translator_fa: 'مترجم',
  publication_status: 'وضعیت انتشار',
  publisher: 'ناشر',
  is_in_collection: 'بخشی از مجموعه',
  collection_title: 'عنوان مجموعه',
  original_title: 'عنوان اصلی',
  alternative_titles: 'نام‌های دیگر',
  publication_year_solar: 'سال شمسی',
  publication_year_gregorian: 'سال میلادی',
  original_year: 'سال نگارش',
  isbn: 'شابک',
  page_count: 'تعداد صفحات',
  cast_men: 'بازیگر مرد',
  cast_women: 'بازیگر زن',
  cast_nonspecific: 'بازیگر نامشخص',
  cast_total: 'مجموع بازیگران',
  synopsis: 'خلاصه',
  tags: 'برچسب‌ها',
  external_references: 'لینک‌های خارجی',
};

// ===== MAIN COMPONENT =====
export default function EditModal({ edition, user, onClose, onSubmitted }) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [changes, setChanges] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(true);

  // 🆕 Work linking state
  const [showLinkSection, setShowLinkSection] = useState(false);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [linkSearchResults, setLinkSearchResults] = useState([]);
  const [linkSearching, setLinkSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  // Convert edition data to form format
  const editionToForm = (ed) => {
    const work = ed.works || {};
    const editionTags = ed.edition_tags?.map(et => et.taxonomy?.label_fa).filter(Boolean) || [];
    const editionRefs = ed.external_references?.filter(r => r.url).map(r => ({ url: r.url, ref_type: r.ref_type || 'other' })) || [];

    return {
      title_fa: ed.title_fa || '',
      playwright_fa: work.playwright_fa?.join(', ') || '',
      source_language: work.source_language || 'fa',
      translator_fa: Array.isArray(ed.translator_fa) ? ed.translator_fa.join('، ') : (ed.translator_fa || ''),
      publication_status: ed.publication_status || 'published',
      publisher: ed.publisher || '',
      is_in_collection: ed.is_in_collection || false,
      collection_title: ed.collection_title || '',
      original_title: work.original_title || '',
      alternative_titles: Array.isArray(work.alternative_titles) ? work.alternative_titles.join('، ') : (work.alternative_titles || ''),
      publication_year_solar: ed.publication_year_solar?.toString() || '',
      publication_year_gregorian: ed.publication_year_gregorian?.toString() || '',
      original_year: ed.original_year?.toString() || '',
      isbn: ed.isbn || '',
      page_count: ed.page_count?.toString() || '',
      cast_men: ed.cast_men?.toString() || '',
      cast_women: ed.cast_women?.toString() || '',
      cast_nonspecific: ed.cast_nonspecific?.toString() || '',
      cast_total: ed.cast_total?.toString() || '',
      cast_unknown: !ed.cast_total && !ed.cast_men && !ed.cast_women,
      synopsis: ed.synopsis || '',
      tags: editionTags,
      external_references: editionRefs,
    };
  };

  const originalValues = useMemo(() => editionToForm(edition), [edition]);

  const methods = useForm({
    resolver: zodResolver(editionSchema),
    defaultValues: originalValues,
  });

  const { handleSubmit, reset, watch, setValue, getValues, control } = methods;

  useCastTotal(control, setValue);

  // ===== CALCULATE CHANGES =====
  const calculateChanges = (formData) => {
    const diffs = [];

    Object.keys(FIELD_LABELS).forEach(key => {
      if (key === 'tags' || key === 'external_references') return;

      const oldVal = String(originalValues[key] || '').trim();
      const newVal = String(formData[key] || '').trim();
      if (oldVal !== newVal) {
        diffs.push({
          field: key,
          label: FIELD_LABELS[key],
          oldValue: oldVal || '(خالی)',
          newValue: newVal || '(خالی)',
        });
      }
    });

    const oldTags = originalValues.tags || [];
    const newTags = (formData.tags || []).filter(t => t);
    const addedTags = newTags.filter(t => !oldTags.includes(t));
    const removedTags = oldTags.filter(t => !newTags.includes(t));

    if (addedTags.length > 0 || removedTags.length > 0) {
      diffs.push({
        field: 'tags',
        label: FIELD_LABELS.tags,
        oldValue: oldTags.join('، ') || '(خالی)',
        newValue: newTags.join('، ') || '(خالی)',
        addedTags,
        removedTags,
      });
    }

    const oldRefs = (originalValues.external_references || []).map(r => r.url);
    const newRefs = (formData.external_references || []).filter(r => r.url).map(r => r.url);
    const addedRefs = newRefs.filter(u => !oldRefs.includes(u));
    const removedRefs = oldRefs.filter(u => !newRefs.includes(u));

    if (addedRefs.length > 0 || removedRefs.length > 0) {
      diffs.push({
        field: 'external_references',
        label: FIELD_LABELS.external_references,
        oldValue: oldRefs.join('، ') || '(خالی)',
        newValue: newRefs.join('، ') || '(خالی)',
        addedRefs,
        removedRefs,
      });
    }

    return diffs;
  };

  // ===== UNDO =====
  const handleUndoAll = () => {
    reset(originalValues);
    toast.info('همه تغییرات برگردانده شد.');
  };

  const handleUndoField = (fieldName) => {
    setValue(fieldName, originalValues[fieldName], { shouldDirty: true });
  };

  // 🆕 Search works for linking
  const handleLinkSearch = async () => {
    if (!linkSearchTerm.trim()) return;
    setLinkSearching(true);
    try {
      const results = await searchWorksForLinking(linkSearchTerm.trim());
      const filtered = results.filter(r => r.id !== edition.id);
      setLinkSearchResults(filtered);
    } catch (err) {
      console.error('Link search error:', err);
      toast.error('خطا در جستجوی آثار.');
    } finally {
      setLinkSearching(false);
    }
  };

  // 🆕 Link edition to a different work
  const handleLinkToWork = async (targetWorkId, targetTitle) => {
    setLinking(true);
    try {
      await linkEditionToWork(edition.id, targetWorkId);
      toast.success(`نسخه به «${targetTitle}» متصل شد.`);
      setShowLinkSection(false);
      setLinkSearchResults([]);
      setLinkSearchTerm('');
      onSubmitted?.();
    } catch (err) {
      console.error('Link error:', err);
      toast.error(`خطا در اتصال: ${err.message}`);
    } finally {
      setLinking(false);
    }
  };

  // ===== PREVIEW CHANGES =====
  const onPreviewChanges = (formData) => {
    const diffs = calculateChanges(formData);
    if (diffs.length === 0) {
      toast.info('هیچ تغییری ثبت نشده است.');
      return;
    }
    setChanges(diffs);
    setShowConfirmation(true);
  };

  // ===== SUBMIT CHANGES =====
  const onConfirmSubmit = async () => {
    setSubmitting(true);

    try {
      const { supabase } = await import('../../lib/supabase');

      for (const change of changes) {
        if (change.field === 'tags') {
          if (change.addedTags?.length > 0) {
            for (const tagLabel of change.addedTags) {
              let { data: taxData } = await supabase
                .from('taxonomy')
                .select('id')
                .eq('label_fa', tagLabel)
                .maybeSingle();

              if (!taxData) {
                const { data: newTax } = await supabase
                  .from('taxonomy')
                  .insert({ label_fa: tagLabel, category: 'user_tag', is_approved: false })
                  .select('id')
                  .single();
                taxData = newTax;
              }

              if (taxData) {
                await supabase.from('edition_tags').upsert({
                  farsi_edition_id: edition.id,
                  taxonomy_id: taxData.id,
                });
              }
            }
          }

          if (change.removedTags?.length > 0) {
            for (const tagLabel of change.removedTags) {
              const { data: taxData } = await supabase
                .from('taxonomy')
                .select('id')
                .eq('label_fa', tagLabel)
                .maybeSingle();

              if (taxData) {
                await supabase
                  .from('edition_tags')
                  .delete()
                  .eq('farsi_edition_id', edition.id)
                  .eq('taxonomy_id', taxData.id);
              }
            }
          }

          await supabase.from('edit_history').insert({
            edition_id: edition.id,
            field_name: 'tags',
            old_value: JSON.stringify(change.oldValue),
            new_value: JSON.stringify(change.newValue),
            changed_by: user?.id || null,
          });

        } else if (change.field === 'external_references') {
          if (change.addedRefs?.length > 0) {
            const formData = getValues();
            const newRefsToAdd = (formData.external_references || [])
              .filter(r => r.url && change.addedRefs.includes(r.url))
              .map(r => ({
                farsi_edition_id: edition.id,
                url: r.url,
                ref_type: r.ref_type || 'other',
              }));

            if (newRefsToAdd.length > 0) {
              await supabase.from('external_references').insert(newRefsToAdd);
            }
          }

          if (change.removedRefs?.length > 0) {
            await supabase
              .from('external_references')
              .delete()
              .eq('farsi_edition_id', edition.id)
              .in('url', change.removedRefs);
          }

          await supabase.from('edit_history').insert({
            edition_id: edition.id,
            field_name: 'external_references',
            old_value: JSON.stringify(change.oldValue),
            new_value: JSON.stringify(change.newValue),
            changed_by: user?.id || null,
          });

        } else {
          const worksTableFields = ['playwright_fa', 'original_title', 'source_language', 'alternative_titles'];
          const isWorksField = worksTableFields.includes(change.field);

          const arrayFields = ['translator_fa', 'playwright_fa', 'alternative_titles'];
          const intFields = ['page_count', 'cast_men', 'cast_women', 'cast_nonspecific', 'cast_total', 'publication_year_solar', 'publication_year_gregorian', 'original_year'];
          const boolFields = ['is_in_collection', 'is_verified'];

          if (isWorksField) {
            const workId = edition.works?.id;
            if (!workId) continue;

            const updatePayload = {};
            if (arrayFields.includes(change.field)) {
              updatePayload[change.field] = change.newValue === '(خالی)'
                ? []
                : change.newValue.split(/[,،]/).map(s => s.trim()).filter(Boolean);
            } else {
              updatePayload[change.field] = change.newValue === '(خالی)' ? null : change.newValue;
            }

            const { error: workUpdateError } = await supabase
              .from('works')
              .update(updatePayload)
              .eq('id', workId);

            if (workUpdateError) throw workUpdateError;

          } else {
            const updatePayload = {};

            if (intFields.includes(change.field)) {
              updatePayload[change.field] = change.newValue === '(خالی)' ? null : parseInt(change.newValue);
            } else if (boolFields.includes(change.field)) {
              updatePayload[change.field] = change.newValue === 'true' || change.newValue === 'بله';
            } else if (arrayFields.includes(change.field)) {
              updatePayload[change.field] = change.newValue === '(خالی)'
                ? []
                : change.newValue.split(/[,،]/).map(s => s.trim()).filter(Boolean);
            } else {
              updatePayload[change.field] = change.newValue === '(خالی)' ? null : change.newValue;
            }

            const { error: updateError } = await supabase
              .from('farsi_editions')
              .update(updatePayload)
              .eq('id', edition.id);

            if (updateError) throw updateError;
          }

          await supabase.from('edit_history').insert({
            edition_id: edition.id,
            field_name: change.field,
            old_value: JSON.stringify(change.oldValue),
            new_value: JSON.stringify(change.newValue),
            changed_by: user?.id || null,
          });
        }
      }

      toast.success(`${changes.length} تغییر مستقیماً اعمال شد.`);

      setTimeout(() => {
        reset();
        setShowOptional(false);
        onClose();
      }, 1500);

    } catch (err) {
      toast.error(`خطا در اعمال تغییرات: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const currentFormData = watch();
  const hasChanges = calculateChanges(currentFormData).length > 0;

  return (
    <Modal
      onClose={onClose}
      title="✏️ ویرایش اثر"
      subtitle={edition.title_fa}
      maxWidth="max-w-3xl"
      headerActions={
        hasChanges && !showConfirmation ? (
          <button
            type="button"
            onClick={handleUndoAll}
            className="px-3 py-1.5 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
          >
            ↩️ برگرداندن همه
          </button>
        ) : null
      }
    >
      {/* ===== CONFIRMATION STEP ===== */}
      {showConfirmation ? (
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📋 تایید تغییرات</h3>
          <p className="text-sm text-gray-600 mb-4">
            {changes.length} فیلد تغییر کرده است. لطفاً تایید کنید:
          </p>

          <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
            {changes.map(change => (
              <div key={change.field} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-800 text-sm">{change.label}</span>
                  <button
                    onClick={() => {
                      handleUndoField(change.field);
                      const updated = calculateChanges(getValues());
                      setChanges(updated);
                      if (updated.length === 0) setShowConfirmation(false);
                    }}
                    className="text-xs text-orange-600 hover:text-orange-800"
                  >
                    ↩️ برگرداندن
                  </button>
                </div>

                {change.field === 'tags' ? (
                  <div className="space-y-1 text-sm">
                    {change.addedTags?.length > 0 && (
                      <p className="text-green-700">➕ اضافه شده: {change.addedTags.join('، ')}</p>
                    )}
                    {change.removedTags?.length > 0 && (
                      <p className="text-red-700">➖ حذف شده: {change.removedTags.join('، ')}</p>
                    )}
                  </div>
                ) : change.field === 'external_references' ? (
                  <div className="space-y-1 text-sm">
                    {change.addedRefs?.length > 0 && (
                      <p className="text-green-700" dir="ltr">➕ {change.addedRefs.join('، ')}</p>
                    )}
                    {change.removedRefs?.length > 0 && (
                      <p className="text-red-700" dir="ltr">➖ {change.removedRefs.join('، ')}</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-red-50 rounded border border-red-100">
                      <p className="text-xs text-red-600 mb-1">قبلی:</p>
                      <p className="text-gray-800 break-words">{change.oldValue}</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded border border-green-100">
                      <p className="text-xs text-green-600 mb-1">جدید:</p>
                      <p className="text-gray-800 break-words">{change.newValue}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmation(false)}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              بازگشت به ویرایش
            </button>
            <button
              onClick={onConfirmSubmit}
              disabled={submitting}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? '⏳ در حال ثبت...' : '✅ تایید و اعمال تغییرات'}
            </button>
          </div>
        </div>
      ) : (
        /* ===== EDIT FORM ===== */
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onPreviewChanges)} className="p-6 space-y-6">
            <RequiredFields isCheckingDuplicate={false} lockedFields={{}} />

            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="w-full py-2 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 transition-all"
            >
              {showOptional ? '▲ بستن فیلدهای اختیاری' : '▼ فیلدهای اختیاری'}
            </button>

            {showOptional && <OptionalFields castWarning="" lockedFields={{}} />}

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">خلاصه اثر</label>
              <textarea
                {...methods.register('synopsis')}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-gray-50 focus:bg-white"
                placeholder="خلاصه‌ای از داستان..."
              />
              <FieldError id="synopsis-error" message={methods.formState.errors.synopsis?.message} />
            </div>

            {/* 🆕 WORK LINKING SECTION */}
            <div className="border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowLinkSection(!showLinkSection)}
                className="w-full py-2 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 transition-all flex items-center justify-between"
              >
                <span>📚 اتصال به نسخه‌های دیگر</span>
                <span>{showLinkSection ? '▲' : '▼'}</span>
              </button>

              {showLinkSection && (
                <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  {/* Current work info */}
                  <div className="p-3 bg-white rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">اثر فعلی:</p>
                    <p className="text-sm font-bold text-gray-800">
                      {edition.works?.original_title || edition.title_fa}
                      {edition.works?.playwright_fa?.length > 0 && (
                        <span className="font-normal text-gray-500">
                          {' '}— {edition.works.playwright_fa.join('، ')}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Search for another work */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      جستجوی اثر برای اتصال:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={linkSearchTerm}
                        onChange={(e) => setLinkSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLinkSearch();
                          }
                        }}
                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-0"
                        placeholder="عنوان اثر یا نام نویسنده..."
                      />
                      <button
                        type="button"
                        onClick={handleLinkSearch}
                        disabled={linkSearching || !linkSearchTerm.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {linkSearching ? '⏳' : '🔍'}
                      </button>
                    </div>
                  </div>

                  {/* Search results */}
                  {linkSearchResults.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">نتایج یافت شده:</p>
                      {linkSearchResults.map(result => (
                        <div
                          key={result.id}
                          className="p-3 bg-white rounded-lg border border-gray-100 hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-800">
                                📖 {result.title_fa}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {result.works?.playwright_fa?.length > 0 && (
                                  <span>✍️ {result.works.playwright_fa.join('، ')} | </span>
                                )}
                                {result.works?.original_title && (
                                  <span dir="ltr">{result.works.original_title} | </span>
                                )}
                                {result.publisher && <span>🏢 {result.publisher}</span>}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleLinkToWork(result.works?.id, result.title_fa)}
                              disabled={linking}
                              className="shrink-0 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                            >
                              {linking ? '⏳' : '🔗 اتصال'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {linkSearchResults.length === 0 && linkSearchTerm.trim() && !linkSearching && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      اثری یافت نشد.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={!hasChanges}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {hasChanges ? `پیش‌نمایش ${calculateChanges(currentFormData).length} تغییر` : 'بدون تغییر'}
              </button>
            </div>
          </form>
        </FormProvider>
      )}
    </Modal>
  );
}