// ===== IMPORTS & DEPENDENCIES =====
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// ===== CONFIGURATION & CONSTANTS =====
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Safe client initialization
let supabase = null;
let initializationError = null;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  initializationError = 'کلیدهای اتصال به پایگاه داده (VITE_SUPABASE_URL یا VITE_SUPABASE_ANON_KEY) یافت نشدند.';
} else {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    initializationError = 'خطا در مقداردهی اولیه سوپابیس: ' + err.message;
  }
}

// ===== UTILITY FUNCTIONS =====
const normalizeFarsi = (str) => {
  if (!str) return '';
  return str
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .trim();
};

// ===== CORE COMPONENT: App =====
export default function App() {
  const [activeTab, setActiveTab] = useState('search');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header & Navigation Tabs */}
        <header className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">بانک اطلاعات نمایشنامه‌های فارسی</h1>
          <p className="text-sm text-gray-600 mb-6">
            سامانه جامع، متن‌باز و پژوهشی برای ثبت و جستجوی متون نمایشی و اجرایی
          </p>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm ${
                activeTab === 'search'
                  ? 'bg-indigo-600 text-white shadow-indigo-100'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔍 جستجو در آرشیو
            </button>
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm ${
                activeTab === 'submit'
                  ? 'bg-indigo-600 text-white shadow-indigo-100'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✍️ ثبت اثر جدید
            </button>
          </div>
        </header>

        {initializationError && (
          <div className="p-4 mb-6 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
            <p className="font-bold mb-1">خطای تنظیمات:</p>
            <p>{initializationError}</p>
          </div>
        )}

        {/* View Router */}
        {activeTab === 'search' ? <SearchView /> : <SubmitView />}
      </div>
    </div>
  );
}

// ===== SUB-COMPONENT: Search View =====
function SearchView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const rawQuery = searchTerm.trim();
      const query = normalizeFarsi(rawQuery);

      // Query joining farsi_editions with works table
      let queryBuilder = supabase
        .from('farsi_editions')
        .select(`
          *,
          works (
            original_title,
            playwright_fa,
            source_language
          )
        `);

      if (query) {
        // Search across edition title, translator, or underlying work playwright
        queryBuilder = queryBuilder.or(
          `title_fa.ilike.%${query}%,translator_fa.ilike.%${query}%`
        );
      }

      const { data, error } = await queryBuilder.order('created_at', { ascending: false }).limit(25);

      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error('Error executing search:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supabase) {
      handleSearch({ preventDefault: () => {} });
    }
  }, []);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100">
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو بر اساس نام اثر، نویسنده یا مترجم..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition duration-150 disabled:opacity-50"
          >
            {loading ? 'در حال جستجو...' : 'جستجو'}
          </button>
        </div>
      </form>

      {/* Results Section */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
          {hasSearched ? `نتایج جستجو (${results.length} اثر)` : 'آثار و ویرایش‌های اخیر'}
        </h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500">در حال دریافت اطلاعات از پایگاه داده...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            هیچ اثری با این مشخصات یافت نشد.
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-lg border border-gray-200 hover:border-indigo-300 transition-all bg-white shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-indigo-900">{item.title_fa}</h3>
                    {item.works?.original_title && (
                      <p className="text-xs text-gray-500 font-mono" dir="ltr">
                        Original: {item.works.original_title} ({item.works.source_language?.toUpperCase()})
                      </p>
                    )}
                  </div>
                  {item.publication_year && (
                    <span className="inline-block bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium self-start">
                      سال انتشار: {item.publication_year}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600 my-3">
                  <div>
                    <span className="font-semibold text-gray-700">نویسنده:</span> {item.works?.playwright_fa || 'نامشخص'}
                  </div>
                  {item.translator_fa && (
                    <div>
                      <span className="font-semibold text-gray-700">مترجم:</span> {item.translator_fa}
                    </div>
                  )}
                  {item.publisher && (
                    <div>
                      <span className="font-semibold text-gray-700">ناشر:</span> {item.publisher}
                    </div>
                  )}
                </div>

                {/* Cast & Page Count Metrics */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 my-2 pt-2 border-t border-gray-100">
                  {item.page_count && <span>تعداد صفحه: {item.page_count}</span>}
                  {item.cast_men !== null && <span>بازیگر مرد: {item.cast_men}</span>}
                  {item.cast_women !== null && <span>بازیگر زن: {item.cast_women}</span>}
                  {item.cast_nonspecific !== null && <span>بازیگر خنثی/نامشخص: {item.cast_nonspecific}</span>}
                </div>

                {item.synopsis && (
                  <p className="text-sm text-gray-700 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                    {item.synopsis}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== SUB-COMPONENT: Submit View =====
function SubmitView() {
  const [formData, setFormData] = useState({
    // Work fields
    original_title: '',
    playwright_fa: '',
    source_language: 'fa',
    // Edition fields
    title_fa: '',
    translator_fa: '',
    publisher: '',
    publication_year: '',
    page_count: '',
    cast_men: '',
    cast_women: '',
    cast_nonspecific: '',
    synopsis: '',
    // Submitter metadata
    submitter_name: '',
    submitter_email: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setMessage({ type: 'error', text: 'پایگاه داده متصل نیست.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 1. Insert into 'works' table first to get the work_id
      const { data: workData, error: workError } = await supabase
        .from('works')
        .insert([
          {
            original_title: normalizeFarsi(formData.original_title),
            playwright_fa: normalizeFarsi(formData.playwright_fa),
            source_language: formData.source_language
          }
        ])
        .select()
        .single();

      if (workError) throw workError;

      // 2. Insert into 'farsi_editions' referencing the newly created work
      const { error: editionError } = await supabase
        .from('farsi_editions')
        .insert([
          {
            work_id: workData.id,
            title_fa: normalizeFarsi(formData.title_fa),
            translator_fa: formData.translator_fa ? normalizeFarsi(formData.translator_fa) : null,
            publisher: formData.publisher ? normalizeFarsi(formData.publisher) : null,
            publication_year: formData.publication_year ? parseInt(formData.publication_year, 10) : null,
            page_count: formData.page_count ? parseInt(formData.page_count, 10) : null,
            cast_men: formData.cast_men !== '' ? parseInt(formData.cast_men, 10) : null,
            cast_women: formData.cast_women !== '' ? parseInt(formData.cast_women, 10) : null,
            cast_nonspecific: formData.cast_nonspecific !== '' ? parseInt(formData.cast_nonspecific, 10) : null,
            synopsis: formData.synopsis ? normalizeFarsi(formData.synopsis) : null,
            is_verified: false // Sent for moderation/verification queue
          }
        ]);

      if (editionError) throw editionError;

      setMessage({
        type: 'success',
        text: 'اثر با موفقیت ثبت شد و پس از بازبینی در آرشیو عمومی قرار خواهد گرفت. سپاس!'
      });

      // Reset form
      setFormData({
        original_title: '',
        playwright_fa: '',
        source_language: 'fa',
        title_fa: '',
        translator_fa: '',
        publisher: '',
        publication_year: '',
        page_count: '',
        cast_men: '',
        cast_women: '',
        cast_nonspecific: '',
        synopsis: '',
        submitter_name: '',
        submitter_email: ''
      });
    } catch (err) {
      console.error('Error inserting record:', err);
      setMessage({
        type: 'error',
        text: 'خطایی در ثبت اطلاعات رخ داد: ' + (err.message || 'لطفا دوباره تلاش کنید.')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">فرم ثبت اثر و ویرایش فارسی جدید</h2>
        <p className="mt-1 text-sm text-gray-600">
          اطلاعات اثر اصلی و مشخصات نشر فارسی آن را برای ورود به آرشیو تکمیل کنید.
        </p>
      </div>

      {message.text && (
        <div
          className={`p-4 mb-6 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section: Work Details */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">مشخصات اثر اصلی (Work)</h3>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نام نمایشنامه‌نویس (فارسی) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="playwright_fa"
                required
                value={formData.playwright_fa}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                placeholder="مثال: آرتور میلر"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">زبان اصلی اثر</label>
              <select
                name="source_language"
                value={formData.source_language}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="fa">فارسی (تألیف)</option>
                <option value="en">انگلیسی</option>
                <option value="fr">فرانسوی</option>
                <option value="de">آلمانی</option>
                <option value="other">سایر زبان‌ها</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عنوان اصلی اثر (به زبان مبدأ - اختیاری)</label>
            <input
              type="text"
              name="original_title"
              dir="ltr"
              value={formData.original_title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-left bg-white"
              placeholder="Death of a Salesman"
            />
          </div>
        </div>

        {/* Section: Edition Details */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">مشخصات ویرایش/ترجمه فارسی (Edition)</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نام نمایشنامه در ترجمه/چاپ فارسی <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title_fa"
                required
                value={formData.title_fa}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                placeholder="مثال: مرگ فروشنده"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                مترجم {formData.source_language !== 'fa' && <span className="text-red-500">* الزامی</span>}
              </label>
              <input
                type="text"
                name="translator_fa"
                required={formData.source_language !== 'fa'}
                value={formData.translator_fa}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                placeholder={formData.source_language !== 'fa' ? 'نام مترجم (الزامی برای اثر ترجمه)' : 'نام مترجم (در صورت وجود)'}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ناشر</label>
              <input
                type="text"
                name="publisher"
                value={formData.publisher}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                placeholder="نام انتشارات"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سال انتشار</label>
              <input
                type="number"
                name="publication_year"
                value={formData.publication_year}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                placeholder="مثال: 1402"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تعداد صفحه</label>
              <input
                type="number"
                name="page_count"
                value={formData.page_count}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                placeholder="مثال: 120"
              />
            </div>
          </div>

          {/* Cast breakdown */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">تعداد بازیگر مرد</label>
              <input
                type="number"
                name="cast_men"
                min="0"
                value={formData.cast_men}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-sm"
                placeholder="مثال: 4"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">تعداد بازیگر زن</label>
              <input
                type="number"
                name="cast_women"
                min="0"
                value={formData.cast_women}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-sm"
                placeholder="مثال: 2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">بازیگر خنثی/نامشخص</label>
              <input
                type="number"
                name="cast_nonspecific"
                min="0"
                value={formData.cast_nonspecific}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-sm"
                placeholder="مثال: 1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">خلاصه داستان / معرفی کوتاه</label>
            <textarea
              name="synopsis"
              rows="3"
              value={formData.synopsis}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              placeholder="توضیحی مختصر درباره خط اصلی داستان..."
            ></textarea>
          </div>
        </div>

        {/* Submitter info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نام ثبت‌کننده</label>
            <input
              type="text"
              name="submitter_name"
              value={formData.submitter_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="نام شما"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ایمیل ثبت‌کننده (اختیاری)</label>
            <input
              type="email"
              name="submitter_email"
              dir="ltr"
              value={formData.submitter_email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-left"
              placeholder="name@example.com"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition duration-150 disabled:opacity-50"
          >
            {loading ? 'در حال ثبت در پایگاه داده...' : 'ثبت اثر در بانک اطلاعاتی'}
          </button>
        </div>
      </form>
    </div>
  );
}