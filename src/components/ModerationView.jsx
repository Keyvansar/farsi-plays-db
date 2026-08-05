import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ModerationView() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [expandedId, setExpandedId] = useState(null);

  const fetchPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pending_submissions')
      .select('*')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false });

    if (error) console.error('Fetch error:', error);
    setSubmissions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (id) => {
    setProcessingId(id);
    setMessage({ type: '', text: '' });

    const { data, error } = await supabase.rpc('approve_pending_submission', { submission_id: id });

    if (error) {
      setMessage({ type: 'error', text: `خطای پایگاه داده: ${error.message}` });
    } else if (data && !data.success) {
      setMessage({ type: 'error', text: `خطا: ${data.error}` });
    } else {
      setMessage({ type: 'success', text: '✅ با موفقیت تایید و به آرشیو اضافه شد!' });
      setSubmissions(subs => subs.filter(s => s.id !== id));
    }
    setProcessingId(null);
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    setMessage({ type: '', text: '' });
    const reason = prompt('دلیل رد کردن (اختیاری):');
    if (reason === null) { setProcessingId(null); return; }

    const { data, error } = await supabase.rpc('reject_pending_submission', { submission_id: id, reason });

    if (error || (data && !data.success)) {
      setMessage({ type: 'error', text: `خطا: ${error?.message || data?.error}` });
    } else {
      setMessage({ type: 'success', text: '❌ اثر رد شد.' });
      setSubmissions(subs => subs.filter(s => s.id !== id));
    }
    setProcessingId(null);
  };

  // Helper to render payload fields
  const renderPayload = (payload) => {
    if (!payload) return null;
    const fields = [
      { key: 'title_fa', label: 'عنوان' },
      { key: 'playwright_fa', label: 'نویسنده', isArray: true },
      { key: 'translator_fa', label: 'مترجم', isArray: true },
      { key: 'source_language', label: 'زبان اصلی' },
      { key: 'original_title', label: 'عنوان اصلی' },
      { key: 'publication_status', label: 'وضعیت انتشار' },
      { key: 'publisher', label: 'ناشر' },
      { key: 'publication_year_solar', label: 'سال شمسی' },
      { key: 'publication_year_gregorian', label: 'سال میلادی' },
      { key: 'isbn', label: 'شابک' },
      { key: 'page_count', label: 'تعداد صفحات' },
      { key: 'cast_men', label: 'بازیگر مرد' },
      { key: 'cast_women', label: 'بازیگر زن' },
      { key: 'cast_total', label: 'مجموع بازیگران' },
      { key: 'synopsis', label: 'خلاصه' },
      { key: 'submitter_name', label: 'نام ثبت‌کننده' },
      { key: 'submitter_email', label: 'ایمیل ثبت‌کننده' },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        {fields.map(({ key, label, isArray }) => {
          const value = payload[key];
          if (!value || (Array.isArray(value) && value.length === 0)) return null;
          const displayValue = isArray ? (Array.isArray(value) ? value.join('، ') : value) : String(value);
          return (
            <div key={key} className="bg-gray-50 p-2 rounded">
              <span className="text-gray-500 text-xs">{label}:</span>{' '}
              <span className="text-gray-800 font-medium">{displayValue}</span>
            </div>
          );
        })}
        {/* Tags */}
        {payload.tags?.length > 0 && (
          <div className="bg-indigo-50 p-2 rounded md:col-span-2">
            <span className="text-indigo-600 text-xs">برچسب‌ها:</span>{' '}
            <span className="text-indigo-800">{payload.tags.join('، ')}</span>
          </div>
        )}
        {/* External References */}
        {payload.external_references?.length > 0 && (
          <div className="bg-green-50 p-2 rounded md:col-span-2">
            <span className="text-green-600 text-xs">لینک‌ها:</span>{' '}
            {payload.external_references.map((ref, i) => (
              <span key={i} className="text-green-800 block truncate" dir="ltr">{ref.url}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="text-center py-12 text-gray-500">در حال بارگذاری...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">📋 کارتابل بررسی</h2>
        <button onClick={fetchPending} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">🔄 بروزرسانی</button>
      </div>

      {message.text && (
        <div className={`p-3 mb-4 rounded-lg text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {message.text}
        </div>
      )}

      {submissions.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-xl">
          🎉 هیچ اثری در صف انتظار نیست!
        </div>
      )}

      <div className="space-y-4">
        {submissions.map((sub) => (
          <div key={sub.id} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer" onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  sub.action_type === 'new_submission' ? 'bg-blue-100 text-blue-800' :
                  sub.action_type === 'flag' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {sub.action_type === 'new_submission' ? '🆕 ثبت جدید' : sub.action_type === 'flag' ? '🚩 گزارش' : '✏️ ویرایش'}
                </span>
                <span className="font-bold text-gray-900">{sub.payload?.title_fa || 'بدون عنوان'}</span>
              </div>
              <span className="text-gray-400">{expandedId === sub.id ? '▲' : '▼'}</span>
            </div>

            {/* Body */}
            {expandedId === sub.id && (
              <div className="p-4 border-t border-gray-100">
                {renderPayload(sub.payload)}
              </div>
            )}

            {/* Actions */}
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => handleApprove(sub.id)}
                disabled={processingId === sub.id}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {processingId === sub.id ? '⏳...' : '✅ تایید و انتشار'}
              </button>
              <button
                onClick={() => handleReject(sub.id)}
                disabled={processingId === sub.id}
                className="flex-1 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg font-bold hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {processingId === sub.id ? '⏳...' : '❌ رد کردن'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}