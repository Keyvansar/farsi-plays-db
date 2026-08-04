// ===== IMPORTS & DEPENDENCIES =====
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// ===== CONFIGURATION & CONSTANTS =====
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Safe client initialization with error trapping to prevent white screens
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
      setMessage({ type: 'error', text: 'پایگاه داده متصل نیست. لطفاً تنظیمات .env را بررسی کنید.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('plays')
        .insert([
          {
            ...formData,
            publication_year: formData.publication_year ? parseInt(formData.publication_year, 10) : null
          }
        ]);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'نمایشنامه با موفقیت ثبت شد و پس از بررسی در پایگاه داده قرار خواهد گرفت. سپاس!'
      });

      // Reset form state
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">سامانه ثبت نمایشنامه‌های فارسی</h1>
          <p className="mt-2 text-sm text-gray-600">
            برای افزودن یک نمایشنامه یا متن اجرایی جدید به آرشیو عمومی، فرم زیر را تکمیل کنید.
          </p>
        </div>

        {initializationError && (
          <div className="p-4 mb-6 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
            <p className="font-bold mb-1">خطای تنظیمات:</p>
            <p>{initializationError}</p>
            <p className="mt-2 text-xs text-red-600">
              راهنما: مطمئن شوید فایل <code className="bg-red-100 px-1 py-0.5 rounded">.env</code> در ریشه پوشه پروژه قرار دارد و متغیرها با پیشوند <code className="bg-red-100 px-1 py-0.5 rounded">VITE_</code> شروع شده‌اند. سپس سرور را ریستارت کنید.
            </p>
          </div>
        )}

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
              disabled={loading || !!initializationError}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition duration-150 disabled:opacity-50"
            >
              {loading ? 'در حال ارسال...' : 'ثبت نمایشنامه در بانک اطلاعاتی'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}