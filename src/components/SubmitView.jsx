// ===== IMPORTS & DEPENDENCIES =====
import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { normalizeFarsi, parseNamesToArray } from '../utils/textUtils';

// Child Components
import DuplicateWarning from './submit/DuplicateWarning';
import RequiredFields from './submit/RequiredFields';
import OptionalFields from './submit/OptionalFields';

// ===== FORM VALIDATION SCHEMA =====
const formSchema = z.object({
  title_fa: z.string().min(3, 'عنوان باید حداقل ۳ حرف باشد'),
  playwright_fa: z.string().min(3, 'نام نویسنده الزامی است'),
  source_language: z.string().default('fa'),
  translator_fa: z.string().optional().default(''),
  publication_status: z.string().default('published'),
  publisher: z.string().optional().default(''),
  is_in_collection: z.boolean().default(false),
  collection_title: z.string().optional().default(''),
  original_title: z.string().optional().default(''),
  publication_year_solar: z.string().optional().default(''),
  publication_year_gregorian: z.string().optional().default(''),
  original_year: z.string().optional().default(''),
  isbn: z.string().optional().default(''),
  page_count: z.string().optional().default(''),
  cast_men: z.string().optional().default(''),
  cast_women: z.string().optional().default(''),
  cast_nonspecific: z.string().optional().default(''),
  cast_total: z.string().optional().default(''),
  cast_unknown: z.boolean().default(false),
  synopsis: z.string().optional().default(''),
  submitter_name: z.string().optional().default(''),
  submitter_email: z.string().email('ایمیل نامعتبر است').optional().or(z.literal('')),
  external_references: z.array(z.object({
    url: z.string().url('لینک نامعتبر است').or(z.literal('')),
    ref_type: z.string().default('ebook'),
  })).default([]),
  tags: z.array(z.string()).default([]),
  custom_tag: z.string().optional().default(''),
}).refine(
  (data) => {
    if (data.source_language !== 'fa') {
      return data.translator_fa && data.translator_fa.trim().length >= 3;
    }
    return true;
  },
  {
    message: 'نام مترجم برای آثار ترجمه شده الزامی است',
    path: ['translator_fa'],
  }
);

// ===== DEFAULT VALUES (Empty State) =====
const emptyDefaults = {
  title_fa: '', playwright_fa: '', source_language: 'fa', translator_fa: '',
  publication_status: 'published', publisher: '', is_in_collection: false,
  collection_title: '', original_title: '', publication_year_solar: '',
  publication_year_gregorian: '', original_year: '', isbn: '', page_count: '',
  cast_men: '', cast_women: '', cast_nonspecific: '', cast_total: '',
  cast_unknown: false, synopsis: '', submitter_name: '', submitter_email: '',
  external_references: [], tags: [], custom_tag: '',
};

// ===== MAIN COMPONENT =====
export default function SubmitView({ user }) {
  const isAuthenticated = !!user;
  const savedData = JSON.parse(localStorage.getItem('farsiPlayDraft')) || {};

  // ===== FORM SETUP =====
  const methods = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { ...emptyDefaults, ...savedData },
  });

  const { handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = methods;

  // ===== UI STATE =====
  const [showOptional, setShowOptional] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [castWarning, setCastWarning] = useState('');

  // ===== DUPLICATE STATES =====
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [selectedMergeTarget, setSelectedMergeTarget] = useState(null);

  // ===== WATCHED FIELDS =====
  const watchedTitle = watch('title_fa');
  const watchedCastMen = watch('cast_men');
  const watchedCastWomen = watch('cast_women');
  const watchedCastNonspecific = watch('cast_nonspecific');
  const watchedCastUnknown = watch('cast_unknown');

  // ===== LOCALSTORAGE PERSISTENCE =====
  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem('farsiPlayDraft', JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // ===== DUPLICATE DETECTION =====
  useEffect(() => {
    const normalizedTitle = normalizeFarsi(watchedTitle || '');
    if (normalizedTitle.length < 3) {
      setDuplicateMatches([]);
      setSelectedMergeTarget(null);
      return;
    }

    const checkDuplicate = async () => {
      setIsCheckingDuplicate(true);
      try {
        const { data, error } = await supabase
          .from('farsi_editions')
          .select(`id, title_fa, publisher, publication_year_solar, page_count, synopsis, works!inner(id, playwright_fa, original_title)`)
          .ilike('title_fa', `%${normalizedTitle}%`)
          .limit(3);

        if (error) throw error;
        setDuplicateMatches(data || []);
        setSelectedMergeTarget((prev) => {
          if (prev && !(data || []).find(d => d.id === prev.id)) return null;
          return prev;
        });
      } catch (err) {
        console.error('Error checking for duplicates:', err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    };

    const delayDebounceFn = setTimeout(() => checkDuplicate(), 800);
    return () => clearTimeout(delayDebounceFn);
  }, [watchedTitle]);

  // ===== CAST WARNING LOGIC =====
  useEffect(() => {
    if (watchedCastUnknown) { setCastWarning(''); return; }
    const men = parseInt(watchedCastMen) || 0;
    const women = parseInt(watchedCastWomen) || 0;
    const nonspecific = parseInt(watchedCastNonspecific) || 0;
    const total = men + women + nonspecific;
    setValue('cast_total', total > 0 ? total.toString() : '');

    if (total > 0) {
      if (men > 0 && women === 0 && nonspecific === 0) setCastWarning('⚠️ فقط بازیگر مرد ثبت شده است.');
      else if (women > 0 && men === 0 && nonspecific === 0) setCastWarning('⚠️ فقط بازیگر زن ثبت شده است.');
      else setCastWarning('');
    } else {
      setCastWarning('');
    }
  }, [watchedCastMen, watchedCastWomen, watchedCastNonspecific, watchedCastUnknown, setValue]);

  // ===== FORM SUBMISSION =====
  const onSubmit = async (data) => {
    if (!supabase) { setMessage({ type: 'error', text: 'پایگاه داده متصل نیست.' }); return; }
    setMessage({ type: '', text: '' });

    try {
      // 1. Build the payload
      const editionPayload = {
        title_fa: data.title_fa,
        playwright_fa: parseNamesToArray(data.playwright_fa),
        source_language: data.source_language,
        translator_fa: data.translator_fa ? parseNamesToArray(data.translator_fa) : [],
        original_title: data.original_title || null,
        publication_status: data.publication_status,
        publisher: data.publisher || null,
        is_in_collection: data.is_in_collection || false,
        collection_title: data.collection_title || null,
        publication_year_solar: data.publication_year_solar ? parseInt(data.publication_year_solar) : null,
        publication_year_gregorian: data.publication_year_gregorian ? parseInt(data.publication_year_gregorian) : null,
        original_year: data.original_year ? parseInt(data.original_year) : null,
        isbn: data.isbn || null,
        page_count: data.page_count ? parseInt(data.page_count) : null,
        cast_men: data.cast_unknown ? null : (data.cast_men ? parseInt(data.cast_men) : null),
        cast_women: data.cast_unknown ? null : (data.cast_women ? parseInt(data.cast_women) : null),
        cast_nonspecific: data.cast_unknown ? null : (data.cast_nonspecific ? parseInt(data.cast_nonspecific) : null),
        cast_total: data.cast_unknown ? null : (parseInt(data.cast_men) || 0) + (parseInt(data.cast_women) || 0) + (parseInt(data.cast_nonspecific) || 0),
        synopsis: data.synopsis || null,
        submitter_name: data.submitter_name || null,
        submitter_email: data.submitter_email || null,
        external_references: data.external_references?.filter(r => r.url) || [],
        tags: data.tags || [],
      };

      // 2. Route based on Authentication
      if (isAuthenticated) {
        
        // --- SCENARIO A: MERGE (Update Existing) ---
        if (selectedMergeTarget) {
          if (editionPayload.original_title && selectedMergeTarget.works) {
            await supabase.from('works').update({
              original_title: editionPayload.original_title,
              source_language: editionPayload.source_language
            }).eq('id', selectedMergeTarget.works.id).is('original_title', null);
          }

          // Update scalar fields in farsi_editions
          await supabase.from('farsi_editions').update({
            synopsis: editionPayload.synopsis || undefined,
            page_count: editionPayload.page_count || undefined,
            publisher: editionPayload.publisher || undefined,
            publication_year_solar: editionPayload.publication_year_solar || undefined,
            publication_year_gregorian: editionPayload.publication_year_gregorian || undefined,
            isbn: editionPayload.isbn || undefined,
          }).eq('id', selectedMergeTarget.id);

          // Append new external references
          if (editionPayload.external_references && editionPayload.external_references.length > 0) {
            const refsToInsert = editionPayload.external_references.map(ref => ({
              farsi_edition_id: selectedMergeTarget.id,
              url: ref.url,
              ref_type: ref.ref_type || 'other'
            }));
            await supabase.from('external_references').insert(refsToInsert);
          }

          // Append new tags
          if (editionPayload.tags && editionPayload.tags.length > 0) {
            for (const tagLabel of editionPayload.tags) {
              let { data: taxData } = await supabase.from('taxonomy').select('id').eq('label_fa', tagLabel).maybeSingle();
              if (!taxData) {
                const { data: newTax } = await supabase.from('taxonomy').insert({ label_fa: tagLabel, category: 'user_tag', is_approved: false }).select('id').single();
                taxData = newTax;
              }
              if (taxData) {
                await supabase.from('edition_tags').upsert({ farsi_edition_id: selectedMergeTarget.id, taxonomy_id: taxData.id });
              }
            }
          }
          setMessage({ type: 'success', text: '✅ اطلاعات تکمیلی با موفقیت به رکورد موجود اضافه شد.' });
        
        // --- SCENARIO B: NEW RECORD (Direct Insert) ---
        } else {
          const { data: wData, error: wErr } = await supabase.from('works').insert({
            original_title: editionPayload.original_title,
            source_language: editionPayload.source_language,
            playwright_fa: editionPayload.playwright_fa,
          }).select('id').single();
          if (wErr) throw wErr;

          const { data: eData, error: eErr } = await supabase.from('farsi_editions').insert({
            work_id: wData.id,
            title_fa: editionPayload.title_fa,
            translator_fa: editionPayload.translator_fa,
            publication_status: editionPayload.publication_status,
            publisher: editionPayload.publisher,
            is_in_collection: editionPayload.is_in_collection,
            collection_title: editionPayload.collection_title,
            page_count: editionPayload.page_count,
            synopsis: editionPayload.synopsis,
            publication_year_solar: editionPayload.publication_year_solar,
            publication_year_gregorian: editionPayload.publication_year_gregorian,
            original_year: editionPayload.original_year,
            isbn: editionPayload.isbn,
            cast_men: editionPayload.cast_men,
            cast_women: editionPayload.cast_women,
            cast_nonspecific: editionPayload.cast_nonspecific,
            cast_total: editionPayload.cast_total,
            submitter_name: editionPayload.submitter_name,
            submitter_email: editionPayload.submitter_email,
            is_verified: true,
          }).select('id').single();
          if (eErr) throw eErr;

          const newEditionId = eData.id;

          // Insert external references
          if (editionPayload.external_references && editionPayload.external_references.length > 0) {
            const refsToInsert = editionPayload.external_references.map(ref => ({
              farsi_edition_id: newEditionId,
              url: ref.url,
              ref_type: ref.ref_type || 'other'
            }));
            await supabase.from('external_references').insert(refsToInsert);
          }

          // Insert tags
          if (editionPayload.tags && editionPayload.tags.length > 0) {
            for (const tagLabel of editionPayload.tags) {
              let { data: taxData } = await supabase.from('taxonomy').select('id').eq('label_fa', tagLabel).maybeSingle();
              if (!taxData) {
                const { data: newTax } = await supabase.from('taxonomy').insert({ label_fa: tagLabel, category: 'user_tag', is_approved: false }).select('id').single();
                taxData = newTax;
              }
              if (taxData) {
                await supabase.from('edition_tags').insert({ farsi_edition_id: newEditionId, taxonomy_id: taxData.id });
              }
            }
          }

          setMessage({ type: 'success', text: '✅ اثر جدید با موفقیت ثبت شد.' });
        }
      
      // --- SCENARIO C: GUEST (Queue for Moderation) ---
      } else {
        const { error: pErr } = await supabase.from('pending_submissions').insert({ payload: editionPayload });
        if (pErr) throw pErr;
        setMessage({ type: 'success', text: selectedMergeTarget ? '✅ درخواست تکمیل اطلاعات دریافت شد.' : '✅ اثر دریافت شد و پس از بازبینی در آرشیو قرار خواهد گرفت.' });
      }

      // 3. Success Cleanup
      localStorage.removeItem('farsiPlayDraft');
      reset(emptyDefaults);
      setSelectedMergeTarget(null);
      setShowOptional(false);

    } catch (err) {
      console.error('Submission error:', err);
      let errorMessage = 'خطایی در ثبت اطلاعات رخ داد.';
      if (err.message?.includes('duplicate')) errorMessage = 'این اثر قبلاً ثبت شده است.';
      else if (err.message?.includes('validation') || err.message?.includes('constraint')) errorMessage = 'اطلاعات وارد شده نامعتبر است.';
      else if (err.message?.includes('network') || err.message?.includes('fetch')) errorMessage = 'ارتباط با سرور قطع شد.';
      else if (err.code === 'PGRST301' || err.message?.includes('JWT')) errorMessage = 'لطفاً ابتدا وارد حساب کاربری خود شوید.';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  // ===== RENDER =====
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">✍️ ثبت اثر جدید</h2>

      {message.text && (
        <div className={`p-4 mb-6 rounded-lg text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {message.text}
        </div>
      )}

      <DuplicateWarning
        duplicateMatches={duplicateMatches}
        selectedMergeTarget={selectedMergeTarget}
        onSelectTarget={setSelectedMergeTarget}
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <RequiredFields isCheckingDuplicate={isCheckingDuplicate} />

          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 transition-all flex items-center justify-center gap-2"
          >
            {showOptional ? '▲ بستن فیلدهای اختیاری' : '▼ نمایش فیلدهای اختیاری (ناشر، سال، بازیگران و...)'}
          </button>

          {showOptional && <OptionalFields castWarning={castWarning} />}

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">خلاصه اثر</label>
            <textarea
              {...methods.register('synopsis')}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-gray-50 focus:bg-white"
              placeholder="خلاصه‌ای از داستان و محتوای نمایشنامه..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">نام ثبت‌کننده</label>
              <input
                type="text"
                {...methods.register('submitter_name')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-gray-50 focus:bg-white"
                placeholder="نام شما"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">ایمیل ثبت‌کننده</label>
              <input
                type="email"
                {...methods.register('submitter_email')}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-gray-50 focus:bg-white"
                placeholder="example@email.com"
                dir="ltr"
              />
              {errors.submitter_email && (
                <p className="mt-1 text-sm text-red-600">{errors.submitter_email.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-md shadow-indigo-200 text-lg"
          >
            {isSubmitting ? '⏳ در حال ثبت...' : selectedMergeTarget ? '✅ تکمیل اطلاعات اثر' : '✅ ثبت اثر در آرشیو'}
          </button>
        </form>
      </FormProvider>
    </div>
  );
}