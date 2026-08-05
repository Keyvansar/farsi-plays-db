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

// ===== SUB-COMPONENT: Submit View (Redesigned) =====
function SubmitView() {
  const [formData, setFormData] = useState({
    // Required fields (always visible)
    title_fa: '',
    playwright_fa: '',
    source_language: 'fa',
    translator_fa: '',
    // Optional fields (hidden by default)
    original_title: '',
    publisher: '',
    publication_year_solar: '',
    publication_year_gregorian: '',
    isbn: '',
    page_count: '',
    cast_men: '',
    cast_women: '',
    cast_nonspecific: '',
    synopsis: '',
    submitter_name: '',
    submitter_email: '',
    external_references: [] // Array of { url, ref_type }
  });

  const [showOptional, setShowOptional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newLink, setNewLink] = useState({ url: '', ref_type: 'ebook' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addExternalLink = () => {
    if (!newLink.url.trim()) return;
    setFormData((prev) => ({
      ...prev,
      external_references: [...prev.external_references, { ...newLink }]
    }));
    setNewLink({ url: '', ref_type: 'ebook' });
  };

  const removeExternalLink = (index) => {
    setFormData((prev) => ({
      ...prev,
      external_references: prev.external_references.filter((_, i) => i !== index)
    }));
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
      // Write ONLY to pending_submissions — never to works/farsi_editions directly
      const { error } = await supabase.from('pending_submissions').insert({
        payload: {
          // Work fields
          original_title: normalizeFarsi(formData.original_title || formData.title_fa),
          source_language: formData.source_language,
          playwright_fa: normalizeFarsi(formData.playwright_fa),
          // Edition fields
          title_fa: normalizeFarsi(formData.title_fa),
          translator_fa: formData.source_language !== 'fa' 
            ? normalizeFarsi(formData.translator_fa) 
            : null,
          publisher: formData.publisher ? normalizeFarsi(formData.publisher) : null,
          publication_year_solar: formData.publication_year_solar 
            ? parseInt(formData.publication_year_solar, 10) 
            : null,
          publication_year_gregorian: formData.publication_year_gregorian 
            ? parseInt(formData.publication_year_gregorian, 10) 
            : null,
          isbn: formData.isbn || null,
          page_count: formData.page_count ? parseInt(formData.page_count, 10) : null,
          cast_men: formData.cast_men !== '' ? parseInt(formData.cast_men, 10) : null,
          cast_women: formData.cast_women !== '' ? parseInt(formData.cast_women, 10) : null,
          cast_nonspecific: formData.cast_nonspecific !== '' ? parseInt(formData.cast_nonspecific, 10) : null,
          synopsis: formData.synopsis ? normalizeFarsi(formData.synopsis) : null,
          external_references: formData.external_references,
        },
        submitter_name: formData.submitter_name ? normalizeFarsi(formData.submitter_name) : null,
        submitter_email: formData.submitter_email || null,
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: '✅ اثر با موفقیت دریافت شد و پس از بازبینی توسط تیم پژوهشی در آرشیو عمومی قرار خواهد گرفت. سپاس از مشارکت شما!'
      });

      // Reset form completely
      setFormData({
        title_fa: '', playwright_fa: '', source_language: 'fa', translator_fa: '',
        original_title: '', publisher: '', publication_year_solar: '', publication_year_gregorian: '',
        isbn: '', page_count: '', cast_men: '', cast_women: '', cast_nonspecific: '',
        synopsis: '', submitter_name: '', submitter_email: '', external_references: []
      });
      setShowOptional(false);
    } catch (err) {
      console.error('Submission error:', err);
      setMessage({
        type: 'error',
        text: 'خطایی در ثبت اطلاعات رخ داد: ' + (err.message || 'لطفاً دوباره تلاش کنید.')
      });
    } finally {
      setLoading(false);
    }
  };

  const isTranslation = formData.source_language !== 'fa';

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">ثبت اثر نمایشی جدید</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto">
          تنها ۴ فیلد ضروری را تکمیل کنید. اطلاعات تکمیلی به صورت اختیاری قابل افزودن است.
        </p>
      </div>

      {message.text && (
        <div className={`p-4 mb-6 rounded-lg text-sm text-center ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ===== REQUIRED FIELDS SECTION (Always Visible) ===== */}
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">
              نام نمایشنامه <span className="text-red-500">*</span>
            </label>
            <input
              type="text" name="title_fa" required
              value={formData.title_fa} onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white text-lg"
              placeholder="مثال: مرگ فروشنده"
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-gray-800 mb-1.5">
              نام نویسنده <span className="text-red-500">*</span>
            </label>
            <input
              type="text" name="playwright_fa" required
              value={formData.playwright_fa} onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white text-lg"
              placeholder="مثال: آرتور میلر"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-1.5">
                زبان اصلی اثر <span className="text-red-500">*</span>
              </label>
              <select
                name="source_language"
                value={formData.source_language} onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white text-lg appearance-none cursor-pointer"
              >
                <option value="fa">فارسی (تألیف)</option>
                <option value="en">انگلیسی</option>
                <option value="fr">فرانسوی</option>
                <option value="de">آلمانی</option>
                <option value="ru">روسی</option>
                <option value="ar">عربی</option>
                <option value="other">سایر زبان‌ها</option>
              </select>
            </div>

            {/* Conditional Translator - Only shows for non-Farsi works */}
            <div className={`transition-all duration-300 overflow-hidden ${isTranslation ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0'}`}>
              <label className="block text-base font-semibold text-gray-800 mb-1.5">
                نام مترجم <span className="text-red-500">*</span>
              </label>
              <input
                type="text" name="translator_fa"
                required={isTranslation}
                value={formData.translator_fa} onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white text-lg"
                placeholder="نام مترجم اثر"
              />
            </div>
          </div>
        </div>

        {/* ===== OPTIONAL FIELDS TOGGLE ===== */}
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-all text-sm font-medium flex items-center justify-center gap-2"
        >
          {showOptional ? '▼ بستن فیلدهای اختیاری' : '▶ مشاهده فیلدهای اختیاری (ناشر، سال، بازیگران، لینک‌ها و...)'}
        </button>

        {/* ===== OPTIONAL FIELDS (Collapsible) ===== */}
        {showOptional && (
          <div className="space-y-5 pt-2 animate-fadeIn">
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
              <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-3">📚 مشخصات نشر و ترجمه</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">عنوان اصلی (به زبان مبدأ)</label>
                <input type="text" name="original_title" dir="ltr"
                  value={formData.original_title} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-left text-sm"
                  placeholder="Death of a Salesman"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">ناشر</label>
                  <input type="text" name="publisher"
                    value={formData.publisher} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                    placeholder="نام انتشارات"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">سال انتشار (شمسی)</label>
                  <input type="number" name="publication_year_solar"
                    value={formData.publication_year_solar} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                    placeholder="۱۴۰۲"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">تعداد صفحه</label>
                  <input type="number" name="page_count" min="1"
                    value={formData.page_count} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                    placeholder="۱۲۰"
                  />
                </div>
              </div>
            </div>

            {/* Cast Breakdown */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-3">🎭 ترکیب بازیگران</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: 'cast_men', label: 'مرد' },
                  { name: 'cast_women', label: 'زن' },
                  { name: 'cast_nonspecific', label: 'خنثی/نامشخص' }
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-xs font-medium text-gray-600 mb-1 text-center">{field.label}</label>
                    <input type="number" name={field.name} min="0"
                      value={formData[field.name]} onChange={handleChange}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center text-sm"
                      placeholder="۰"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* External References */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-3">
              <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider">🔗 لینک‌های خارجی</h3>
              
              <div className="flex gap-2">
                <select
                  value={newLink.ref_type}
                  onChange={(e) => setNewLink(prev => ({ ...prev, ref_type: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="ebook">کتاب الکترونیک</option>
                  <option value="publisher">سایت ناشر</option>
                  <option value="bookstore">فروشگاه کتاب</option>
                  <option value="library">کتابخانه</option>
                  <option value="archive">آرشیو</option>
                  <option value="production">اجرای نمایشی</option>
                </select>
                <input type="url" dir="ltr" placeholder="https://..."
                  value={newLink.url}
                  onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-left"
                />
                <button type="button" onClick={addExternalLink}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors whitespace-nowrap"
                >
                  + افزودن
                </button>
              </div>

              {formData.external_references.length > 0 && (
                <div className="space-y-2 mt-3">
                  {formData.external_references.map((ref, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200 text-sm">
                      <span className="truncate text-left flex-1 ml-2 text-gray-600" dir="ltr">{ref.url}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 ml-2">{ref.ref_type}</span>
                      <button type="button" onClick={() => removeExternalLink(idx)}
                        className="text-red-400 hover:text-red-600 px-1"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Synopsis */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">خلاصه داستان / معرفی کوتاه</label>
              <textarea name="synopsis" rows="3"
                value={formData.synopsis} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                placeholder="توضیحی مختصر درباره خط اصلی داستان..."
              ></textarea>
            </div>

            {/* Submitter Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">نام شما (اختیاری)</label>
                <input type="text" name="submitter_name"
                  value={formData.submitter_name} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  placeholder="نام ثبت‌کننده"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">ایمیل (اختیاری)</label>
                <input type="email" name="submitter_email" dir="ltr"
                  value={formData.submitter_email} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-left"
                  placeholder="name@example.com"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" disabled={loading}
          className="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-lg mt-4"
        >
          {loading ? '⏳ در حال ارسال...' : 'ثبت اثر در بانک اطلاعاتی'}
        </button>

        <p className="text-xs text-center text-gray-400 mt-3">
          اطلاعات ارسالی پس از بررسی صحت، در آرشیو عمومی منتشر خواهد شد.
        </p>
      </form>
    </div>
  );