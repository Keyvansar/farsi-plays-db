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

// ===== CORE COMPONENT: App =====
export default function App() {
  // Navigation State: 'submit' or 'search'
  const [activeTab, setActiveTab] = useState('search');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header & Navigation Tabs */}
        <header className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">بانک اطلاعات نمایشنامه‌های فارسی</h1>
          <p className="text-sm text-gray-600 mb-6">
            سامانه جامع، متن‌باز و مردمی برای ثبت و جستجوی نمایشنامه‌ها و متون اجرایی
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
              ✍️ ثبت نمایشنامه جدید
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
  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setHasSearched(true);

    try {
      // Query Supabase using fuzzy matching (.ilike) across title and playwright
      const query = searchTerm.trim();
      let queryBuilder = supabase.from('plays').select('*');

      if (query) {
        queryBuilder = queryBuilder.or(
          `title_fa.ilike.%${query}%,playwright_fa.ilike.%${query}%,translator_fa.ilike.%${query}%`
        );
      }

      const { data, error } = await queryBuilder.order('created_at', { ascending: false }).limit(20);

      if (error) throw error;
      setPlays(data || []);
    } catch (err) {
      console.error('Error searching plays:', err);
    } finally {
      setLoading(false);
    }
  };

  // Perform an initial fetch of recent entries on load
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
            placeholder="جستجو بر اساس نام نمایشنامه، نویسنده یا مترجم..."
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
          {hasSearched ? `نتایج جستجو (${plays.length} اثر)` : 'نمایشنامه‌های اخیر'}
        </h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500">در حال دریافت اطلاعات...</div>
         маслом : plays.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            هیچ نمایشنامه‌ای با این مشخصات یافت نشد.
          </div>
        ) : (
          <div className="space-y-4">
            {plays.map((play) => (
              <div
                key={play.id}
                className="p-5 rounded-lg border border-gray-200 hover:border-indigo-300 transition-all bg-white shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-indigo-900">{play.title_fa}</h3>
                    {play.title_en && <p className="text-xs text-gray-400 font-mono" dir="ltr">{play.title_en}</p>}
                  </div>
                  {play.publication_year && (
                    <span className="inline-block bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium self-start">
                      سال انتشار: {play.publication_year}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600 my-3">
                  <div>
                    <span className="font-semibold text-gray-700">نویسنده:</span> {play.playwright_fa}
                  </div>
                  {play.translator_fa && (
                    <div>
                      <span className="font-semibold text-gray-700">مترجم:</span> {play.translator_fa}
                    </div>
                  )}
                  {play.publisher && (
                    <div>
                      <span className="font-semibold text-gray-700">ناشر:</span> {play.publisher}
                    </div>
                  )}
                </div>

                {play.genre && (
                  <div className="text-xs text-gray-500 mb-2">
                    <span className="font-semibold">ژانر:</span> {play.genre}
                  </div>
                )}

                {play.synopsis && (
                  <p className="text-sm text-gray-700 mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                    {play.synopsis}
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
    title_fa: '',
    title_en: '',
    playwright_fa: '',
    translator_fa: '',
    publisher: '',
    publication_year: '',
    genre: '',
    synopsis: '',
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
      const { error } = await supabase.from('plays').insert([
        {
          ...formData,
          publication_year: formData.publication_year ? parseInt(formData.publication_year, 10) : null
        }
      ]);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'نمایشنامه با موفقیت ثبت شد و در پایگاه داده قرار گرفت. سپاس!'
      });

      setFormData({
        title_fa: '',
        title_en: '',
        playwright_fa: '',
        translator_fa: '',
        publisher: '',
        publication_year: '',
        genre: '',
        synopsis: '',
        submitter_name: '',
        submitter_email: ''
      });
    } catch (err) {
      console.error('Error inserting play:', err);
      setMessage({
        type: 'error',
        text: 'خطایی در ثبت اطلاعات رخ داد. لطفا دوباره تلاش کنید.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">فرم ثبت نمایشنامه جدید</h2>
        <p className="mt-1 text-sm text-gray-600">
          برای افزودن اثر به آرشیو عمومی، اطلاعات زیر را با دقت تکمیل کنید.
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نام نمایشنامه (فارسی) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title_fa"
              required
              value={formData.title_fa}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="مثال: مرگ فروشنده"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نام انگلیسی (اختیاری)</label>
            <input
              type="text"
              name="title_en"
              dir="ltr"
              value={formData.title_en}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-left"
              placeholder="Death of a Salesman"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نویسنده / نمایشنامه‌نویس <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="playwright_fa"
              required
              value={formData.playwright_fa}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="مثال: آرتور میلر"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">مترجم (در صورت ترجمه)</label>
            <input
              type="text"
              name="translator_fa"
              value={formData.translator_fa}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="نام مترجم"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ناشر</label>
            <input
              type="text"
              name="publisher"
              value={formData.publisher}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="مثال: 1402"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">گونه / ژانر</label>
            <input
              type="text"
              name="genre"
              value={formData.genre}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="مثال: درام، تراژدی"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">خلاصه داستان / معرفی کوتاه</label>
          <textarea
            name="synopsis"
            rows="4"
            value={formData.synopsis}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="توضیحی مختصر درباره خط اصلی داستان یا فضای اثر..."
          ></textarea>
        </div>

        <div className="border-t border-gray-200 pt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نام ثبت‌کننده (شما)</label>
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
            {loading ? 'در حال ارسال...' : 'ثبت نمایشنامه در بانک اطلاعاتی'}
          </button>
        </div>
      </form>
    </div>
  );
}