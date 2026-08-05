// ===== IMPORTS & DEPENDENCIES =====
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeFarsi, parseNamesToArray } from '../utils/textUtils';

// ===== COMPONENT =====
export default function SubmitView({ user }) {
  const isAuthenticated = !!user;

  // ===== STATE MANAGEMENT =====
  const [formData, setFormData] = useState({
    title_fa: '', playwright_fa: '', source_language: 'fa', translator_fa: '',
    publication_status: 'published', publisher: '',
    is_in_collection: false, collection_title: '',
    original_title: '', publication_year_solar: '', publication_year_gregorian: '',
    original_year: '', isbn: '', page_count: '',
    cast_men: '', cast_women: '', cast_nonspecific: '', cast_total: '', cast_unknown: false,
    synopsis: '', submitter_name: '', submitter_email: '',
    external_references: [], tags: [], custom_tag: '',
  });

  const [showOptional, setShowOptional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newLink, setNewLink] = useState({ url: '', ref_type: 'ebook' });
  const [castWarning, setCastWarning] = useState('');
  
  // Advanced Duplicate & Merge States
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [selectedMergeTarget, setSelectedMergeTarget] = useState(null);
  const [mergeableFieldsCache, setMergeableFieldsCache] = useState([]);

  // ===== SMART DUPLICATE & MERGE DETECTION =====
  useEffect(() => {
    const normalizedTitle = normalizeFarsi(formData.title_fa);
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
          .select(`
            id, title_fa, publisher, publication_year_solar, page_count, synopsis,
            works!inner(id, playwright_fa, original_title)
          `)
          .ilike('title_fa', `%${normalizedTitle}%`)
          .limit(3);

        if (error) throw error;
        setDuplicateMatches(data || []);
        
        // Clear selected merge target if it's no longer in the results
        // Using functional update to avoid stale closure
        setSelectedMergeTarget((prevTarget) => {
          if (prevTarget && !(data || []).find(d => d.id === prevTarget.id)) {
            return null;
          }
          return prevTarget;
        });
      } catch (err) {
        console.error('Error checking for duplicates:', err);
        // Don't show error to user for duplicate check failures - just log it
        // This is a non-critical background operation
      } finally {
        setIsCheckingDuplicate(false);
      }
    };

    const delayDebounceFn = setTimeout(() => checkDuplicate(), 800);
    return () => clearTimeout(delayDebounceFn);
  }, [formData.title_fa]);

  const calculateMergeableFields = (match) => {
    const enrichments = [];
    if (formData.synopsis && !match.synopsis) enrichments.push('خلاصه داستان');
    if (formData.page_count && !match.page_count) enrichments.push('تعداد صفحات');
    if (formData.publisher && !match.publisher) enrichments.push('ناشر');
    if (formData.publication_year_solar && !match.publication_year_solar) enrichments.push('سال انتشار');
    if (formData.original_title && !match.works?.original_title) enrichments.push('عنوان اصلی لاتین');
    return enrichments;
  };

  const handleSelectMergeTarget = (match) => {
    if (selectedMergeTarget?.id === match.id) {
      setSelectedMergeTarget(null);
      setMergeableFieldsCache([]);
    } else {
      setSelectedMergeTarget(match);
      setMergeableFieldsCache(calculateMergeableFields(match));
    }
  };

  // ===== EVENT HANDLERS =====
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    if (['cast_men', 'cast_women', 'cast_nonspecific', 'cast_total'].includes(name)) setCastWarning('');
    if (name === 'is_in_collection' && !checked) setFormData(prev => ({ ...prev, collection_title: '' }));

    if (selectedMergeTarget) {
      setMergeableFieldsCache(calculateMergeableFields(selectedMergeTarget));
    }
  };

  const handleCastTotalBlur = () => {
    if (formData.cast_unknown) { setCastWarning(''); return; }
    const sum = (parseInt(formData.cast_men, 10) || 0) + (parseInt(formData.cast_women, 10) || 0) + (parseInt(formData.cast_nonspecific, 10) || 0);
    const total = parseInt(formData.cast_total, 10);
    if (!formData.cast_total && sum > 0) {
      setFormData(prev => ({ ...prev, cast_total: String(sum) }));
      setCastWarning(`ℹ️ مجموع بازیگران خودکار محاسبه شد.`);
    } else if (formData.cast_total && sum > 0 && total !== sum) {
      setCastWarning(`⚠️ مجموع تفکیکی (${sum}) با کل (${total}) مطابقت ندارد.`);
    }
  };

  const handleCastUnknownToggle = (e) => {
    handleChange(e);
    if (e.target.checked) {
      setCastWarning('');
      setFormData((prev) => ({
        ...prev,
        cast_unknown: true,
        cast_men: '', cast_women: '', cast_nonspecific: '', cast_total: '',
      }));
    }
  };

  const toggleTag = (tag) => setFormData(prev => ({
    ...prev, tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
  }));

  const addCustomTag = () => {
    const tag = formData.custom_tag.trim();
    if (!tag || formData.tags.includes(tag)) return;
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag], custom_tag: '' }));
  };

  const addExternalLink = () => {
    if (!newLink.url.trim()) return;
    setFormData((prev) => ({
      ...prev,
      external_references: [...prev.external_references, { ...newLink }],
    }));
    setNewLink({ url: '', ref_type: 'ebook' });
  };

  const removeExternalLink = (idx) => setFormData((prev) => ({
    ...prev,
    external_references: prev.external_references.filter((_, i) => i !== idx),
  }));

  // ===== HYBRID SUBMISSION =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) return setMessage({ type: 'error', text: 'پایگاه داده متصل نیست.' });

    if (!formData.cast_unknown) {
      const sum = (parseInt(formData.cast_men, 10) || 0) + (parseInt(formData.cast_women, 10) || 0) + (parseInt(formData.cast_nonspecific, 10) || 0);
      const total = parseInt(formData.cast_total, 10);
      if (formData.cast_total && sum > 0 && total !== sum) {
        setCastWarning(`❌ ثبت متوقف شد: مجموع تفکیکی (${sum}) با تعداد کل (${total}) مطابقت ندارد.`);
        return;
      }
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    const isTranslation = formData.source_language !== 'fa';
    const isPublished = formData.publication_status === 'published';
    const canBeInCollection = formData.publication_status === 'published' || formData.publication_status === 'self_published';

    // Parse Comma-separated names into Arrays
    const playwrightsArray = parseNamesToArray(formData.playwright_fa);
    const translatorsArray = isTranslation ? parseNamesToArray(formData.translator_fa) : [];

    const finalSubmitterName = isAuthenticated 
      ? (user?.user_metadata?.display_name || user?.email?.split('@')[0]) 
      : (formData.submitter_name ? normalizeFarsi(formData.submitter_name) : null);

    const finalSubmitterEmail = isAuthenticated ? user?.email : (formData.submitter_email || null);

    const editionPayload = {
      action_type: selectedMergeTarget ? 'merge' : 'create',
      target_edition_id: selectedMergeTarget ? selectedMergeTarget.id : null,
      original_title: normalizeFarsi(formData.original_title || formData.title_fa),
      source_language: formData.source_language,
      playwright_fa: playwrightsArray, 
      title_fa: normalizeFarsi(formData.title_fa),
      translator_fa: translatorsArray,
      publication_status: formData.publication_status,
      publisher: isPublished ? normalizeFarsi(formData.publisher) : null,
      is_in_collection: canBeInCollection ? formData.is_in_collection : false,
      collection_title: (canBeInCollection && formData.is_in_collection && formData.collection_title) ? normalizeFarsi(formData.collection_title) : null,
      publication_year_solar: formData.publication_year_solar ? parseInt(formData.publication_year_solar, 10) : null,
      publication_year_gregorian: formData.publication_year_gregorian ? parseInt(formData.publication_year_gregorian, 10) : null,
      original_year: isTranslation && formData.original_year ? parseInt(formData.original_year, 10) : null,
      isbn: formData.isbn || null,
      page_count: formData.page_count ? parseInt(formData.page_count, 10) : null,
      cast_men: !formData.cast_unknown && formData.cast_men !== '' ? parseInt(formData.cast_men, 10) : null,
      cast_women: !formData.cast_unknown && formData.cast_women !== '' ? parseInt(formData.cast_women, 10) : null,
      cast_nonspecific: !formData.cast_unknown && formData.cast_nonspecific !== '' ? parseInt(formData.cast_nonspecific, 10) : null,
      cast_total: formData.cast_unknown ? -1 : (formData.cast_total ? parseInt(formData.cast_total, 10) : null),
      synopsis: formData.synopsis ? normalizeFarsi(formData.synopsis) : null,
      tags: formData.tags,
      external_references: formData.external_references,
      submitter_name: finalSubmitterName,
      submitter_email: finalSubmitterEmail,
    };

    try {
      if (isAuthenticated) {
        // Staff bypasses the queue and writes directly to production
        if (editionPayload.action_type === 'merge') {
          // Update Works Table if original title is missing
          if (editionPayload.original_title) {
            await supabase.from('works').update({
              original_title: editionPayload.original_title,
              source_language: editionPayload.source_language
            }).eq('id', selectedMergeTarget.works.id).is('original_title', null);
          }

          // Update Farsi Editions Table
          await supabase.from('farsi_editions').update({
            synopsis: editionPayload.synopsis || undefined,
            page_count: editionPayload.page_count || undefined,
            publisher: editionPayload.publisher || undefined,
            publication_year_solar: editionPayload.publication_year_solar || undefined,
            isbn: editionPayload.isbn || undefined
          }).eq('id', editionPayload.target_edition_id);
          
          setMessage({ type: 'success', text: '✅ اطلاعات تکمیلی با موفقیت به رکورد موجود اضافه شد.' });
        } else {
          // Direct Insert for New Records
          const { data: wData, error: wErr } = await supabase.from('works').insert({
            original_title: editionPayload.original_title,
            source_language: editionPayload.source_language,
            playwright_fa: editionPayload.playwright_fa, // DB now accepts Arrays natively
          }).select('id').single();
          
          if (wErr) throw wErr;
          
          const { error: eErr } = await supabase.from('farsi_editions').insert({
            work_id: wData.id,
            title_fa: editionPayload.title_fa,
            translator_fa: editionPayload.translator_fa, // DB now accepts Arrays natively
            publication_status: editionPayload.publication_status,
            publisher: editionPayload.publisher,
            is_in_collection: editionPayload.is_in_collection,
            collection_title: editionPayload.collection_title,
            page_count: editionPayload.page_count,
            synopsis: editionPayload.synopsis,
            publication_year_solar: editionPayload.publication_year_solar,
            publication_year_gregorian: editionPayload.publication_year_gregorian,
            isbn: editionPayload.isbn,
            cast_men: editionPayload.cast_men,
            cast_women: editionPayload.cast_women,
            cast_nonspecific: editionPayload.cast_nonspecific,
            cast_total: editionPayload.cast_total,
            is_verified: true,
          });

          if (eErr) throw eErr;
          setMessage({ type: 'success', text: '✅ اثر جدید با موفقیت ثبت شد.' });
        }

      } else {
        // Queue the payload for moderation (RPC handles arrays and merging logic upon approval)
        const { error: pErr } = await supabase.from('pending_submissions').insert({ payload: editionPayload });
        if (pErr) throw pErr;
        setMessage({ type: 'success', text: selectedMergeTarget 
          ? '✅ درخواست تکمیل اطلاعات دریافت شد و پس از بررسی اعمال می‌شود.' 
          : '✅ اثر دریافت شد و پس از بازبینی در آرشیو قرار خواهد گرفت. سپاس!' 
        });
      }

      setFormData({
        title_fa: '', playwright_fa: '', source_language: 'fa', translator_fa: '',
        publication_status: 'published', publisher: '', is_in_collection: false, collection_title: '',
        original_title: '', publication_year_solar: '', publication_year_gregorian: '',
        original_year: '', isbn: '', page_count: '', cast_men: '', cast_women: '', cast_nonspecific: '', cast_total: '', cast_unknown: false,
        synopsis: '', submitter_name: '', submitter_email: '', external_references: [], tags: [], custom_tag: '',
      });
      setShowOptional(false);
      setSelectedMergeTarget(null);
    } catch (err) {
      console.error('Submission error:', err);
      // Improved error messages for better user experience
      let errorMessage = 'خطایی در ثبت اطلاعات رخ داد.';
      
      if (err.message?.includes('duplicate')) {
        errorMessage = 'این اثر قبلاً ثبت شده است. لطفاً از بخش جستجو بررسی کنید.';
      } else if (err.message?.includes('validation') || err.message?.includes('constraint')) {
        errorMessage = 'اطلاعات وارد شده نامعتبر است. لطفاً فیلدها را بررسی کنید.';
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = 'ارتباط با سرور قطع شد. لطفاً اتصال اینترنت خود را بررسی کنید.';
      } else if (err.code === 'PGRST301' || err.message?.includes('JWT')) {
        errorMessage = 'لطفاً ابتدا وارد حساب کاربری خود شوید.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const isTranslation = formData.source_language !== 'fa';
  const isPublished = formData.publication_status === 'published';
  const canBeInCollection = formData.publication_status === 'published' || formData.publication_status === 'self_published';

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100 relative">
      
      {isCheckingDuplicate && (
        <div className="absolute top-4 right-4 flex items-center gap-2 text-indigo-400 text-xs font-medium animate-pulse">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          در حال بررسی آرشیو...
        </div>
      )}

      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">ثبت اثر نمایشی جدید</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto">
          {isAuthenticated ? '🟢 شما وارد شده‌اید. آثار مستقیماً منتشر می‌شوند.' : 'فیلدهای ضروری را تکمیل کنید. اثر پس از بازبینی منتشر می‌شود.'}
        </p>
      </div>

      {message.text && (
        <div className={`p-4 mb-6 rounded-lg text-sm text-center ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-5">
          
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">
              نام نمایشنامه <span className="text-red-500">*</span>
            </label>
            <input type="text" name="title_fa" required
              value={formData.title_fa} onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-0 transition-colors text-lg ${
                duplicateMatches.length > 0 ? 'border-amber-400 focus:border-amber-500 bg-amber-50' : 'border-gray-200 focus:border-indigo-500 bg-gray-50 focus:bg-white'
              }`}
              placeholder="مثال: مرگ فروشنده"
            />
            
            {/* INTERACTIVE MERGE UI */}
            {duplicateMatches.length > 0 && (
              <div className="mt-3 space-y-2 animate-fadeIn">
                <p className="text-sm font-bold text-amber-800 flex items-center gap-1">
                  ⚠️ این عنوان در آرشیو یافت شد:
                </p>
                {duplicateMatches.map(match => {
                  const isSelected = selectedMergeTarget?.id === match.id;
                  const authors = match.works?.playwright_fa || [];
                  const authorStr = Array.isArray(authors) ? authors.join('، ') : authors;
                  
                  return (
                    <div key={match.id} 
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-amber-200 bg-amber-50/50 hover:bg-amber-100'}`}
                      onClick={() => handleSelectMergeTarget(match)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-gray-900">{match.title_fa}</span>
                          <span className="text-sm text-gray-600 mr-2">{authorStr ? `(اثر ${authorStr})` : ''}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-400'}`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-indigo-200 text-sm">
                          {mergeableFieldsCache.length > 0 ? (
                            <p className="text-indigo-800">
                              شما در حال اضافه کردن <strong>{mergeableFieldsCache.join('، ')}</strong> به این رکورد هستید. (ادغام اطلاعات)
                            </p>
                          ) : (
                            <p className="text-gray-600">
                              اطلاعات جدیدی برای ادغام یافت نشد. اگر این یک ترجمه/نسخه جدید است، تیک را بردارید تا به عنوان اثر جدید ثبت شود.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">
              نام نویسنده <span className="text-red-500">*</span>
            </label>
            <input type="text" name="playwright_fa" required
              value={formData.playwright_fa} onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white text-lg"
              placeholder="برای بیش از یک نفر با کاما (،) جدا کنید"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-1.5">
                زبان اصلی <span className="text-red-500">*</span>
              </label>
              <select name="source_language" value={formData.source_language} onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white text-lg appearance-none"
              >
                <option value="fa">فارسی (تألیف)</option>
                <option value="en">انگلیسی</option>
                <option value="fr">فرانسوی</option>
                <option value="de">آلمانی</option>
                <option value="ru">روسی</option>
                <option value="ar">عربی</option>
                <option value="es">اسپانیایی</option>
                <option value="other">سایر</option>
              </select>
            </div>

            <div className={`transition-all duration-300 overflow-hidden ${isTranslation ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0'}`}>
              <label className="block text-base font-semibold text-gray-800 mb-1.5">
                نام مترجم <span className="text-red-500">*</span>
              </label>
              <input type="text" name="translator_fa" required={isTranslation}
                value={formData.translator_fa} onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white text-lg"
                placeholder="برای بیش از یک نفر با کاما (،) جدا کنید"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-1.5">وضعیت انتشار <span className="text-red-500">*</span></label>
              <select name="publication_status" required value={formData.publication_status} onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white text-lg appearance-none"
              >
                <option value="published">منتشر شده توسط ناشر</option>
                <option value="self_published">ناشر مؤلف / چاپ غیررسمی</option>
                <option value="performed_unpublished">اجرا شده ولی منتشر نشده</option>
                <option value="unperformed_unpublished">نه اجرا شده و نه منتشر شده</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className={`transition-all duration-300 overflow-hidden ${isPublished ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0'}`}>
                <label className="block text-base font-semibold text-gray-800 mb-1.5">نام ناشر <span className="text-red-500">*</span></label>
                <input type="text" name="publisher" required={isPublished} value={formData.publisher} onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white text-lg"
                  placeholder="مثال: انتشارات نیلا"
                />
              </div>
              
              <div className={`transition-all duration-300 overflow-hidden ${canBeInCollection ? 'opacity-100' : 'opacity-0 h-0'}`}>
                <div className={`flex items-center ${isPublished ? 'pt-2' : 'pt-0'}`}>
                  <input type="checkbox" id="is_in_collection" name="is_in_collection" checked={formData.is_in_collection} onChange={handleChange}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="is_in_collection" className="mr-2 text-sm text-gray-700 cursor-pointer select-none">
                    در یک مجموعه / آنتولوژی چاپ شده است
                  </label>
                </div>
                <div className={`transition-all duration-300 overflow-hidden ${formData.is_in_collection ? 'opacity-100 max-h-24 mt-2' : 'opacity-0 max-h-0'}`}>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">عنوان مجموعه <span className="text-red-500">*</span></label>
                  <input type="text" name="collection_title" required={formData.is_in_collection} value={formData.collection_title} onChange={handleChange}
                    className="w-full px-3 py-2 border-2 border-indigo-100 rounded-lg focus:border-indigo-500 focus:ring-0 transition-colors bg-indigo-50 focus:bg-white text-sm"
                    placeholder="مثال: مجموعه نمایشنامه‌های بکت"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <button type="button" onClick={() => setShowOptional(!showOptional)}
          className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all text-sm font-medium flex items-center justify-center gap-2"
        >
          {showOptional ? '▼ بستن فیلدهای اختیاری' : '▶ مشاهده فیلدهای اختیاری (بازیگران، خلاصه، سال...)'}
        </button>

        {showOptional && (
          <div className="space-y-5 pt-2 animate-fadeIn">
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-3">
              <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider">🎭 ترکیب بازیگران</h3>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input type="checkbox" name="cast_unknown" checked={formData.cast_unknown} onChange={handleCastUnknownToggle}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                <span className="text-sm text-gray-700 font-medium">تعداد بازیگران مشخص نیست</span>
              </label>

              {!formData.cast_unknown && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    {[{ n: 'cast_men', l: 'مرد' }, { n: 'cast_women', l: 'زن' }, { n: 'cast_nonspecific', l: 'خنثی' }].map(f => (
                      <div key={f.n}>
                        <label className="block text-xs font-medium text-gray-600 mb-1 text-center">{f.l}</label>
                        <input type="number" name={f.n} min="0" value={formData[f.n]} onChange={handleChange} onBlur={handleCastTotalBlur}
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center text-sm" placeholder="۰" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-bold text-indigo-700 mb-1 text-center">کل</label>
                      <input type="number" name="cast_total" min="0" value={formData.cast_total} onChange={handleChange} onBlur={handleCastTotalBlur}
                        className={`w-full px-2 py-2 border-2 rounded-lg text-center text-sm font-bold ${castWarning.startsWith('⚠️') || castWarning.startsWith('❌') ? 'border-red-400 bg-red-50' : 'border-indigo-300 bg-indigo-50 focus:border-indigo-500'}`} placeholder="—" />
                    </div>
                  </div>
                  {castWarning && <p className={`text-xs mt-1 px-1 ${castWarning.startsWith('❌') ? 'text-red-600 font-bold' : castWarning.startsWith('⚠️') ? 'text-amber-600' : 'text-indigo-600'}`}>{castWarning}</p>}
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">خلاصه داستان / معرفی</label>
              <textarea name="synopsis" rows="3" value={formData.synopsis} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="توضیحی مختصر درباره خط اصلی داستان..." />
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
              <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider">📅 اطلاعات زمانی</h3>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">سال انتشار نسخهٔ فارسی</label>
                <input type="number" name="publication_year_solar" value={formData.publication_year_solar} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="مثال: ۱۴۰۲" />
              </div>
              {isTranslation && (
                <div className="space-y-4 pt-2 border-t border-gray-200 animate-fadeIn">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">نام نمایشنامهٔ اصلی به لاتین</label>
                    <input type="text" name="original_title" dir="ltr" value={formData.original_title} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-left text-sm" placeholder="Death of a Salesman" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">سال انتشار نمایشنامهٔ اصلی (میلادی)</label>
                    <input type="number" name="original_year" dir="ltr" value={formData.original_year} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-left text-sm" placeholder="1949" />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-3">
              <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider">🔗 لینک‌های خارجی</h3>
              <div className="flex gap-2">
                <select value={newLink.ref_type} onChange={(e) => setNewLink(p => ({ ...p, ref_type: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ebook">کتاب الکترونیک</option>
                  <option value="publisher">سایت ناشر</option>
                  <option value="bookstore">فروشگاه</option>
                  <option value="library">کتابخانه</option>
                  <option value="archive">آرشیو</option>
                  <option value="production">اجرای نمایشی</option>
                </select>
                <input type="url" dir="ltr" placeholder="https://..." value={newLink.url}
                  onChange={(e) => setNewLink(p => ({ ...p, url: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-left"
                />
                <button type="button" onClick={addExternalLink}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors whitespace-nowrap"
                >+ افزودن</button>
              </div>
              {formData.external_references.length > 0 && (
                <div className="space-y-2 mt-3">
                  {formData.external_references.map((ref, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200 text-sm">
                      <span className="truncate text-left flex-1 ml-2 text-gray-600" dir="ltr">{ref.url}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 ml-2">{ref.ref_type}</span>
                      <button type="button" onClick={() => removeExternalLink(idx)} className="text-red-400 hover:text-red-600 px-1">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-3">
              <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider">🏷️ برچسب‌ها و ژانر</h3>
              <div className="flex flex-wrap gap-2">
                {['مونولوگ', 'نمایشنامه کوتاه', 'تاریخی', 'مستندنگاری (Verbatim)', 'تراژدی', 'کمدی', 'ابزورد', 'اجتماعی', 'اسطوره‌ای', 'کودک و نوجوان'].map(tag => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      formData.tags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                    }`}>{tag}</button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input type="text" placeholder="برچسب دلخواه..." value={formData.custom_tag}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_tag: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <button type="button" onClick={addCustomTag}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors whitespace-nowrap"
                >+ افزودن</button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                      {tag}
                      <button type="button" onClick={() => toggleTag(tag)} className="hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {!isAuthenticated && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">نام شما</label>
                  <input type="text" name="submitter_name" value={formData.submitter_name} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="نام ثبت‌کننده" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">ایمیل</label>
                  <input type="email" name="submitter_email" dir="ltr" value={formData.submitter_email} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-left" placeholder="name@example.com" />
                </div>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all duration-150 disabled:opacity-50 text-lg mt-4"
        >
          {loading ? '⏳ در حال پردازش...' : selectedMergeTarget ? '🔄 ادغام اطلاعات' : isAuthenticated ? 'ثبت مستقیم اثر' : 'ارسال برای بازبینی'}
        </button>
      </form>
    </div>
  );
}