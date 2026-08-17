import React, { useState, useEffect } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';
import { editionSchema } from '../schemas/editionSchema';
import { useCastTotal } from '../hooks/useCastTotal';
import { useSubmitDraft } from '../hooks/useSubmitDraft';
import { useDuplicateDetection } from '../hooks/useDuplicateDetection';
import {
  getUserRole,
  buildPayload,
  insertDirectly,
  insertNewEdition,
  queueNewEdition,
  updateExisting,
  queueCompletionSuggestions,
} from './submit/submitActions';
import RequiredFields from './submit/RequiredFields';
import OptionalFields from './submit/OptionalFields';
import DuplicateWarning from './submit/DuplicateWarning';
import FieldError from './ui/FieldError';
import { toast } from 'sonner';

// 🛛 Single source of truth for empty form values
const EMPTY_FORM_VALUES = {
  title_fa: '',
  playwright_fa: '',
  source_language: 'fa',
  translator_fa: '',
  publication_status: 'published',
  publisher: '',
  is_in_collection: false,
  collection_title: '',
  original_title: '',
  alternative_titles: '',
  publication_year_solar: '',
  publication_year_gregorian: '',
  original_year: '',
  isbn: '',
  page_count: '',
  cast_men: '',
  cast_women: '',
  cast_nonspecific: '',
  cast_total: '',
  cast_unknown: false,
  synopsis: '',
  tags: [],
  external_references: [],
  submitter_name: '',
  submitter_email: '',
};

export default function SubmitView({ user }) {
  const methods = useForm({
    resolver: zodResolver(editionSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const { handleSubmit, watch, reset, setValue, getValues, control } = methods;

  // ===== HOOKS =====
  useCastTotal(control, setValue);

  const draft = useSubmitDraft(watch, reset, EMPTY_FORM_VALUES);

  const watchedTitle = watch('title_fa');
  const dup = useDuplicateDetection(watchedTitle);

  // ===== UI STATE =====
  const [showOptional, setShowOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  // ===== CAST MISMATCH WARNING =====
  const castMen = useWatch({ control, name: 'cast_men' });
  const castWomen = useWatch({ control, name: 'cast_women' });
  const castNonspecific = useWatch({ control, name: 'cast_nonspecific' });
  const castTotal = useWatch({ control, name: 'cast_total' });
  const castUnknown = useWatch({ control, name: 'cast_unknown' });
  const [castWarning, setCastWarning] = useState('');

  useEffect(() => {
    if (castUnknown) { setCastWarning(''); return; }
    const sum = (parseInt(castMen) || 0) + (parseInt(castWomen) || 0) + (parseInt(castNonspecific) || 0);
    const total = parseInt(castTotal) || 0;
    if (castTotal && sum > 0 && total !== sum) {
      setCastWarning(`مجموع بازیگران (${total}) با جمع جزئیات (${sum}) مطابقت ندارد.`);
    } else {
      setCastWarning('');
    }
  }, [castMen, castWomen, castNonspecific, castTotal, castUnknown]);

  // ===== 🆕 AUTO-FILL original_title FOR PERSIAN WORKS (respects manual edits) =====
  const sourceLanguage = watch('source_language');
  const titleFa = watch('title_fa');

  // 🛛 FIX: Detect if user manually edited original_title
  const isOriginalTitleDirty = !!methods.formState.dirtyFields.original_title;

  useEffect(() => {
    if (
      sourceLanguage === 'fa' &&
      titleFa &&
      !dup.lockedFields.original_title &&
      !isOriginalTitleDirty // 🆕 Only auto-fill if user hasn't manually edited
    ) {
      setValue('original_title', titleFa, { shouldDirty: false });
    }
  }, [sourceLanguage, titleFa, dup.lockedFields.original_title, isOriginalTitleDirty]);

  // ===== MODE CHANGE HANDLER =====
  const handleModeChange = (mode) => {
    dup.handleModeChange(mode);

    if (mode === 'complete' && dup.selectedMergeTarget) {
      const ed = dup.selectedMergeTarget;
      const work = ed.works || {};

      const editionTags = ed.edition_tags?.map(et => et.taxonomy?.label_fa).filter(Boolean) || [];
      const editionRefs = ed.external_references?.filter(r => r.url).map(r => ({
        url: r.url,
        ref_type: r.ref_type || 'other',
      })) || [];

      const locks = {
        title_fa: !!ed.title_fa,
        playwright_fa: !!(work.playwright_fa && work.playwright_fa.length > 0),
        translator_fa: !!(ed.translator_fa && ed.translator_fa.length > 0),
        source_language: !!work.source_language,
        original_title: !!work.original_title,
        alternative_titles: !!(work.alternative_titles && work.alternative_titles.length > 0),
        publisher: !!ed.publisher,
        publication_year_solar: !!ed.publication_year_solar,
        publication_year_gregorian: !!ed.publication_year_gregorian,
        original_year: !!ed.original_year,
        isbn: !!ed.isbn,
        page_count: !!ed.page_count,
        synopsis: !!ed.synopsis,
        cast_men: !!ed.cast_men,
        cast_women: !!ed.cast_women,
        cast_nonspecific: !!ed.cast_nonspecific,
        cast_total: !!ed.cast_total,
        publication_status: !!ed.publication_status,
        is_in_collection: !!ed.is_in_collection,
        collection_title: !!ed.collection_title,
        tags: editionTags.length > 0,
        external_references: editionRefs.length > 0,
      };
      dup.setLockedFields(locks);

      draft.blockSave();
      reset({
        title_fa: ed.title_fa || '',
        playwright_fa: work.playwright_fa?.join(', ') || '',
        source_language: work.source_language || 'fa',
        translator_fa: ed.translator_fa?.join(', ') || '',
        publication_status: ed.publication_status || 'published',
        publisher: ed.publisher || '',
        is_in_collection: ed.is_in_collection || false,
        collection_title: ed.collection_title || '',
        original_title: work.original_title || '',
        alternative_titles: work.alternative_titles?.join('، ') || '',
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
        submitter_name: '',
        submitter_email: '',
      });
      setTimeout(() => draft.unblockSave(), 1200);
      setShowOptional(true);

    } else if (mode === 'new_edition' && dup.selectedMergeTarget) {
      const work = dup.selectedMergeTarget.works || {};
      dup.setLockedFields({});

      draft.blockSave();
      reset({
        ...EMPTY_FORM_VALUES,
        playwright_fa: work.playwright_fa?.join(', ') || '',
        source_language: work.source_language || 'fa',
        original_title: work.original_title || '',
        alternative_titles: work.alternative_titles?.join('، ') || '',
      });
      setTimeout(() => draft.unblockSave(), 1200);
      setShowOptional(true);

    } else {
      dup.setLockedFields({});
    }
  };

  // ===== SUBMIT =====
  const onSubmit = async (formData) => {
    const now = Date.now();
    if (now - lastSubmitTime < 10000) {
      toast.error('لطفاً چند ثانیه صبر کنید و دوباره تلاش کنید.');
      return;
    }
    setLastSubmitTime(now);
    setSubmitting(true);
    draft.blockSave();

    try {
      const p = buildPayload(formData);
      const role = await getUserRole(user);
      const canModerate = role === 'moderator' || role === 'admin';

      // NEW EDITION MODE
      if (dup.isNewEdition && dup.selectedMergeTarget) {
        const existingWorkId = dup.selectedMergeTarget.works?.id;
        if (!existingWorkId) throw new Error('Work ID not found');

        if (canModerate) {
          await insertNewEdition(p, existingWorkId);
          toast.success('نسخه جدید با موفقیت ثبت و تایید شد.');
        } else {
          await queueNewEdition(p, existingWorkId, user);
          toast.success('نسخه جدید برای بررسی ثبت شد.');
        }

        // COMPLETE EXISTING RECORD MODE
      } else if (dup.isCompletingDuplicate && dup.selectedMergeTarget) {
        if (canModerate) {
          await updateExisting(p, dup.selectedMergeTarget);
          toast.success('اثر موجود با موفقیت تکمیل شد.');
        } else {
          await queueCompletionSuggestions(p, dup.selectedMergeTarget, dup.lockedFields, user);
          toast.success('پیشنهادهای تکمیل اثر برای بررسی ثبت شد.');
        }

        // NEW SUBMISSION MODE
      } else if (canModerate) {
        await insertDirectly(p);
        toast.success('اثر با موفقیت ثبت و تایید شد.');
      } else {
        const { error: qErr } = await supabase.from('pending_submissions').insert({
          action_type: 'new_submission',
          submitted_by: user?.id || null,
          payload: p,
        });
        if (qErr) throw qErr;
        toast.success('اثر شما برای بررسی ثبت شد. پس از تایید ویراستاران منتشر خواهد شد.');
      }

      draft.deleteDraft();
      dup.resetDuplicateState();

      setTimeout(() => {
        draft.clearDraft();
        setShowOptional(false);
        draft.reEnableSave();
      }, 1500);

    } catch (err) {
      console.error('Submission error:', err);
      toast.error(`خطا در ثبت اثر: ${err.message}`);
      draft.unblockSave();
    } finally {
      setSubmitting(false);
    }
  };

  // ===== CLEAR FORM =====
  const handleClearForm = () => {
    draft.clearDraft();
    dup.resetDuplicateState();
    setShowOptional(false);
    toast.info('فرم پاک شد.');
  };

  return (
    <div className="max-w-3xl mx-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">✍️ ثبت اثر جدید</h2>
        <p className="text-sm text-gray-500 mb-6">
          {user
            ? 'اطلاعات اثر را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.'
            : 'شما به عنوان مهمان ثبت می‌کنید؛ اثر پس از بررسی ویراستاران منتشر خواهد شد.'}
        </p>

        {/* Duplicate Warning */}
        {(dup.isCheckingDuplicate || dup.duplicateMatches.length > 0) && (
          <DuplicateWarning
            matches={dup.duplicateMatches}
            selectedMatch={dup.selectedMergeTarget}
            onSelect={dup.handleSelectMatch}
            isChecking={dup.isCheckingDuplicate}
            isCompleting={dup.isCompletingDuplicate}
            isNewEdition={dup.isNewEdition}
            onChange={handleModeChange}
          />
        )}

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* 🆕 Visual indicator: new edition linking */}
            {dup.isNewEdition && dup.selectedMergeTarget && (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-xl">📚</span>
                  <div>
                    <p className="text-sm font-bold text-green-800">
                      این نسخه به اثر زیر متصل خواهد شد:
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      «{dup.selectedMergeTarget.title_fa}»
                      {dup.selectedMergeTarget.works?.playwright_fa?.length > 0 && (
                        <span> — {dup.selectedMergeTarget.works.playwright_fa.join('، ')}</span>
                      )}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      اطلاعات نویسنده و زبان اصلی از اثر موجود کپی شده است.
                      فقط اطلاعات نسخه جدید (مترجم، ناشر، سال و...) را وارد کنید.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 🆕 Visual indicator: complete mode */}
            {dup.isCompletingDuplicate && dup.selectedMergeTarget && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🔧</span>
                  <div>
                    <p className="text-sm font-bold text-blue-800">
                      در حال تکمیل رکورد: «{dup.selectedMergeTarget.title_fa}»
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      فیلدهای پُر شده قفل هستند. فقط فیلدهای خالی را تکمیل کنید.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <RequiredFields isCheckingDuplicate={dup.isCheckingDuplicate} lockedFields={dup.lockedFields} />

            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="w-full py-2 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 transition-all"
            >
              {showOptional ? '▲ بستن فیلدهای اختیاری' : '▼ فیلدهای اختیاری'}
            </button>

            {showOptional && <OptionalFields castWarning={castWarning} lockedFields={dup.lockedFields} />}

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">خلاصه اثر</label>
              <textarea
                {...methods.register('synopsis')}
                rows={4}
                disabled={!!dup.lockedFields.synopsis}
                className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-gray-50 focus:bg-white ${dup.lockedFields.synopsis ? 'bg-gray-100 text-gray-500' : ''}`}
                placeholder="خلاصه‌ای از داستان..."
              />
              <FieldError id="synopsis-error" message={methods.formState.errors.synopsis?.message} />
            </div>

            {/* Guest attribution */}
            {!user && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">نام شما (اختیاری)</label>
                  <input
                    type="text"
                    {...methods.register('submitter_name')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0"
                    placeholder="نام و نام خانوادگی"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">ایمیل شما (اختیاری)</label>
                  <input
                    type="email"
                    {...methods.register('submitter_email')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0"
                    placeholder="example@email.com"
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClearForm}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                🧹 پاک کردن فرم
              </button>
              <button
                type="submit"
                disabled={submitting || dup.isCheckingDuplicate}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting
                  ? '⏳ در حال ثبت...'
                  : dup.isCompletingDuplicate
                    ? '✅ تکمیل اثر موجود'
                    : dup.isNewEdition
                      ? '📚 ثبت نسخه جدید'
                      : '📤 ثبت اثر'}
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}