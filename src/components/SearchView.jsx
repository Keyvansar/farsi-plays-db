// ===== IMPORTS & DEPENDENCIES =====
import React, { useState, useEffect, useMemo } from 'react';
import { useArchiveSearch } from '../hooks/useArchiveSearch';
import { joinNamesFromArray } from '../utils/textUtils';
import { supabase } from '../lib/supabase';

const STATUS_OPTIONS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'verified', label: 'تأیید شده' },
  { value: 'unverified', label: 'تأیید نشده' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'oldest', label: 'قدیمی‌ترین' },
  { value: 'title_asc', label: 'عنوان (الف-ی)' },
  { value: 'title_desc', label: 'عنوان (ی-الف)' },
  { value: 'year_desc', label: 'سال انتشار (نزولی)' },
  { value: 'year_asc', label: 'سال انتشار (صعودی)' },
];

const TRANSLATION_STATUS_OPTIONS = [
  { value: '', label: 'همه' },
  { value: 'original', label: 'تألیفی' },
  { value: 'translated', label: 'ترجمه' },
];

function FilterBadge({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-indigo-900 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

function SuggestEditModal({ isOpen, onClose, item, user }) {
  const [editType, setEditType] = useState('correction');
  const [field, setField] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [suggestedValue, setSuggestedValue] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isOpen) {
      setEditType('correction');
      setField('');
      setCurrentValue('');
      setSuggestedValue('');
      setNotes('');
      setMessage({ type: '', text: '' });
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setMessage({ type: 'error', text: 'ارتباط با پایگاه داده برقرار نیست.' });
      return;
    }
    setSubmitting(true);
    const payload = {
      edition_id: item.id,
      edit_type: editType,
      field_name: field,
      current_value: currentValue,
      suggested_value: suggestedValue,
      notes: notes || null,
      submitter_name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'ناشناس',
      submitter_email: user?.email || null,
    };
    try {
      const { error } = await supabase.from('pending_submissions').insert({ 
        payload: { type: 'edit_suggestion', ...payload } 
      });
      if (error) throw error;
      setMessage({ type: 'success', text: '✅ پیشنهاد شما ثبت شد و پس از بررسی اعمال خواهد شد.' });
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error('Error submitting edit suggestion:', err);
      setMessage({ type: 'error', text: 'خطایی در ثبت پیشنهاد رخ داد. لطفاً دوباره تلاش کنید.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">پیشنهاد ویرایش</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">اثر: <span className="font-semibold text-indigo-700">{item.title_fa}</span></p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {message.text && (
            <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{message.text}</div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">نوع درخواست</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="editType" value="correction" checked={editType === 'correction'} onChange={e => setEditType(e.target.value)} className="text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">اصلاح اطلاعات</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="editType" value="addition" checked={editType === 'addition'} onChange={e => setEditType(e.target.value)} className="text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">افزودن اطلاعات جدید</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="editType" value="flag" checked={editType === 'flag'} onChange={e => setEditType(e.target.value)} className="text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">گزارش خطا</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">فیلد مورد نظر</label>
            <select value={field} onChange={e => setField(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base">
              <option value="">انتخاب فیلد...</option>
              <option value="title_fa">عنوان فارسی</option>
              <option value="playwright_fa">نویسنده</option>
              <option value="translator_fa">مترجم</option>
              <option value="publisher">ناشر</option>
              <option value="publication_year_solar">سال انتشار شمسی</option>
              <option value="page_count">تعداد صفحات</option>
              <option value="isbn">شابک (ISBN)</option>
              <option value="synopsis">خلاصه داستان</option>
              <option value="cast_total">تعداد کل بازیگران</option>
              <option value="cast_men">بازیگران مرد</option>
              <option value="cast_women">بازیگران زن</option>
              <option value="other">سایر</option>
            </select>
          </div>
          {editType !== 'addition' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">مقدار فعلی</label>
              <input type="text" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="مقدار فعلی را وارد کنید..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base" />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{editType === 'flag' ? 'توضیح خطا' : 'مقدار پیشنهادی'}</label>
            <textarea value={suggestedValue} onChange={e => setSuggestedValue(e.target.value)} placeholder={editType === 'flag' ? 'توضیح دهید چه خطایی وجود دارد...' : 'مقدار صحیح را وارد کنید...'} rows={3} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">یادداشت اضافی (اختیاری)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="توضیحات تکمیلی، منبع اطلاعات، یا هر نکته دیگری..." rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base resize-none" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">انصراف</button>
            <button type="submit" disabled={submitting} className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition-colors disabled:opacity-50">{submitting ? 'در حال ثبت...' : 'ثبت پیشنهاد'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditionCard({ item, user }) {
  const [showEditModal, setShowEditModal] = useState(false);
  return (
    <>
      <div className="interactive-card p-5 rounded-lg border border-gray-200 hover:border-indigo-300 bg-white transition-all hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-indigo-900">{item.title_fa}</h3>
            {item.works?.original_title && (<p className="text-xs text-gray-500 font-mono mt-1" dir="ltr">Original: {item.works.original_title} ({item.works.source_language?.toUpperCase()})</p>)}
          </div>
          <div className="flex items-center gap-2 self-start flex-wrap">
            {item.is_verified ? (<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ تأیید شده</span>) : (<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">تأیید نشده</span>)}
            {item.publication_year_solar && (<span className="inline-block bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium">{item.publication_year_solar}</span>)}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600 my-4">
          <div className="bg-gray-50 px-3 py-2 rounded-lg">
            <span className="font-semibold text-gray-700 block text-xs mb-1">نویسنده:</span>
            <span className="text-gray-900">{joinNamesFromArray(item.works?.playwright_fa) || 'نامشخص'}</span>
          </div>
          {item.translator_fa && item.translator_fa.length > 0 && (
            <div className="bg-gray-50 px-3 py-2 rounded-lg">
              <span className="font-semibold text-gray-700 block text-xs mb-1">مترجم:</span>
              <span className="text-gray-900">{joinNamesFromArray(item.translator_fa)}</span>
            </div>
          )}
          {item.publisher && (
            <div className="bg-gray-50 px-3 py-2 rounded-lg">
              <span className="font-semibold text-gray-700 block text-xs mb-1">ناشر:</span>
              <span className="text-gray-900">{item.publisher}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500 my-3 pt-3 border-t border-gray-100">
          {item.page_count && (<span className="bg-gray-100 px-2 py-1 rounded">📄 {item.page_count} صفحه</span>)}
          {item.isbn && (<span className="bg-gray-100 px-2 py-1 rounded font-mono">ISBN: {item.isbn}</span>)}
          {item.cast_total !== null && item.cast_total !== -1 && (<span className="bg-gray-100 px-2 py-1 rounded">🎭 {item.cast_total} بازیگر</span>)}
          {item.cast_men !== null && (<span className="bg-gray-100 px-2 py-1 rounded">♂️ {item.cast_men}</span>)}
          {item.cast_women !== null && (<span className="bg-gray-100 px-2 py-1 rounded">♀️ {item.cast_women}</span>)}
          {item.cast_nonspecific !== null && (<span className="bg-gray-100 px-2 py-1 rounded">⚧️ {item.cast_nonspecific}</span>)}
        </div>
        {item.synopsis && (
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-gray-700 leading-relaxed"><span className="font-semibold text-indigo-700 block mb-2">خلاصه:</span>{item.synopsis}</p>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <button onClick={() => setShowEditModal(true)} className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            پیشنهاد ویرایش / افزودن اطلاعات
          </button>
        </div>
      </div>
      <SuggestEditModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} item={item} user={user} />
    </>
  );
}

export default function SearchView({ user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const { results, loading, error, hasSearched, executeSearch } = useArchiveSearch();
  const [statusFilter, setStatusFilter] = useState('');
  const [translationFilter, setTranslationFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [yearRange, setYearRange] = useState({ min: '', max: '' });
  const [hasTranslator, setHasTranslator] = useState(false);
  const [hasSynopsis, setHasSynopsis] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const processedResults = useMemo(() => {
    let filtered = [...results];
    if (statusFilter === 'verified') filtered = filtered.filter(item => item.is_verified);
    else if (statusFilter === 'unverified') filtered = filtered.filter(item => !item.is_verified);
    if (translationFilter === 'original') filtered = filtered.filter(item => item.source_language === 'fa');
    else if (translationFilter === 'translated') filtered = filtered.filter(item => item.source_language !== 'fa');
    if (hasTranslator) filtered = filtered.filter(item => item.translator_fa && item.translator_fa.length > 0);
    if (hasSynopsis) filtered = filtered.filter(item => item.synopsis && item.synopsis.trim());
    if (yearRange.min) filtered = filtered.filter(item => item.publication_year_solar >= parseInt(yearRange.min));
    if (yearRange.max) filtered = filtered.filter(item => item.publication_year_solar <= parseInt(yearRange.max));
    switch (sortBy) {
      case 'newest': filtered.sort((a, b) => (b.publication_year_solar || 0) - (a.publication_year_solar || 0)); break;
      case 'oldest': filtered.sort((a, b) => (a.publication_year_solar || 0) - (b.publication_year_solar || 0)); break;
      case 'title_asc': filtered.sort((a, b) => a.title_fa.localeCompare(b.title_fa, 'fa')); break;
      case 'title_desc': filtered.sort((a, b) => b.title_fa.localeCompare(a.title_fa, 'fa')); break;
      case 'year_desc': filtered.sort((a, b) => (b.publication_year_solar || 0) - (a.publication_year_solar || 0)); break;
      case 'year_asc': filtered.sort((a, b) => (a.publication_year_solar || 0) - (b.publication_year_solar || 0)); break;
      default: break;
    }
    return filtered;
  }, [results, statusFilter, translationFilter, sortBy, yearRange, hasTranslator, hasSynopsis]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter) count++;
    if (translationFilter) count++;
    if (yearRange.min) count++;
    if (yearRange.max) count++;
    if (hasTranslator) count++;
    if (hasSynopsis) count++;
    return count;
  }, [statusFilter, translationFilter, yearRange, hasTranslator, hasSynopsis]);

  const clearAllFilters = () => {
    setStatusFilter('');
    setTranslationFilter('');
    setYearRange({ min: '', max: '' });
    setHasTranslator(false);
    setHasSynopsis(false);
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    executeSearch(searchTerm);
  };

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-3">
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="جستجو بر اساس نام اثر، نویسنده یا مترجم..." className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base" />
            <button type="submit" disabled={loading} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition duration-150 disabled:opacity-50">{loading ? 'در حال جستجو...' : 'جستجو'}</button>
            <button type="button" onClick={() => setShowFilters(!showFilters)} className="relative px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              {activeFiltersCount > 0 && (<span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{activeFiltersCount}</span>)}
            </button>
          </div>
        </form>
        {showFilters && (
          <div className="border-t pt-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">فیلترهای پیشرفته</h3>
              {activeFiltersCount > 0 && (<button onClick={clearAllFilters} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">حذف همه فیلترها</button>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">وضعیت تأیید</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                  {STATUS_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">نوع اثر</label>
                <select value={translationFilter} onChange={(e) => setTranslationFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                  {TRANSLATION_STATUS_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">مرتب‌سازی</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                  {SORT_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">محدوده سال انتشار</label>
                <div className="flex gap-3">
                  <input type="number" value={yearRange.min} onChange={(e) => setYearRange(prev => ({ ...prev, min: e.target.value }))} placeholder="از سال" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
                  <span className="self-center text-gray-400">تا</span>
                  <input type="number" value={yearRange.max} onChange={(e) => setYearRange(prev => ({ ...prev, max: e.target.value }))} placeholder="تا سال" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={hasTranslator} onChange={(e) => setHasTranslator(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700">دارای مترجم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={hasSynopsis} onChange={(e) => setHasSynopsis(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700">دارای خلاصه</span>
                </label>
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                {statusFilter && (<FilterBadge label={STATUS_OPTIONS.find(o => o.value === statusFilter)?.label} onRemove={() => setStatusFilter('')} />)}
                {translationFilter && (<FilterBadge label={TRANSLATION_STATUS_OPTIONS.find(o => o.value === translationFilter)?.label} onRemove={() => setTranslationFilter('')} />)}
                {yearRange.min && (<FilterBadge label={`از سال ${yearRange.min}`} onRemove={() => setYearRange(prev => ({ ...prev, min: '' }))} />)}
                {yearRange.max && (<FilterBadge label={`تا سال ${yearRange.max}`} onRemove={() => setYearRange(prev => ({ ...prev, max: '' }))} />)}
                {hasTranslator && (<FilterBadge label="دارای مترجم" onRemove={() => setHasTranslator(false)} />)}
                {hasSynopsis && (<FilterBadge label="دارای خلاصه" onRemove={() => setHasSynopsis(false)} />)}
              </div>
            )}
          </div>
        )}
      </div>
      {error && (<div className="p-4 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200 animate-fadeIn">{error}</div>)}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">{hasSearched ? `نتایج جستجو (${processedResults.length} اثر)` : 'آثار و ویرایش‌های اخیر'}</h2>
        <span className="text-sm text-gray-500">نمایش {processedResults.length} از {results.length} نتیجه</span>
      </div>
      {loading && results.length === 0 ? (
        <div className="text-center py-12 text-gray-500 animate-pulse bg-white rounded-xl border border-gray-100">در حال دریافت اطلاعات از پایگاه داده...</div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <p className="text-lg font-medium">هیچ اثری با این مشخصات یافت نشد.</p>
          {activeFiltersCount > 0 && (<button onClick={clearAllFilters} className="mt-3 text-indigo-600 hover:text-indigo-800 font-medium">حذف فیلترها و مشاهده همه آثار</button>)}
        </div>
      ) : (
        <div className="space-y-4">{processedResults.map((item) => (<EditionCard key={item.id} item={item} user={user} />))}</div>
      )}
    </div>
  );
}
