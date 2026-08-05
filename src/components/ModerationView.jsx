import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TABS = [
  { key: 'all', label: 'همه', icon: '📋' },
  { key: 'direct_edit', label: 'ویرایش مستقیم', icon: '✏️' },
  { key: 'edit_suggestion', label: 'پیشنهاد ویرایش', icon: '💡' },
  { key: 'new_submission', label: 'ثبت جدید', icon: '🆕' },
  { key: 'flag', label: 'گزارش خطا', icon: '🚩' },
];

const TYPE_STYLES = {
  direct_edit: { badge: 'bg-green-100 text-green-800', border: 'border-green-200', label: 'ویرایش مستقیم' },
  edit_suggestion: { badge: 'bg-blue-100 text-blue-800', border: 'border-blue-200', label: 'پیشنهاد ویرایش' },
  new_submission: { badge: 'bg-purple-100 text-purple-800', border: 'border-purple-200', label: 'ثبت اثر جدید' },
  flag: { badge: 'bg-red-100 text-red-800', border: 'border-red-200', label: 'گزارش خطا' },
};

export default function ModerationView() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
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

  const filtered = activeTab === 'all'
    ? submissions
    : submissions.filter(s => s.action_type === activeTab);

  const handleApprove = async (id) => {
    setProcessingId(id);
    setMessage({ type: '', text: '' });
    const { data, error } = await supabase.rpc('approve_pending_submission', { submission_id: id });

    if (error) {
      setMessage({ type: 'error', text: `خطا: ${error.message}` });
    } else if (data && !data.success) {
      setMessage({ type: 'error', text: `خطا: ${data.error}` });
    } else {
      setMessage({ type: 'success', text: '✅ تایید و اعمال شد.' });
      setSubmissions(subs => subs.filter(s => s.id !== id));
    }
    setProcessingId(null);
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    const reason = prompt('دلیل رد کردن (اختیاری):');
    if (reason === null) { setProcessingId(null); return; }

    const { data, error } = await supabase.rpc('reject_pending_submission', { submission_id: id, reason });

    if (error || (data && !data.success)) {
      setMessage({ type: 'error', text: `خطا: ${error?.message || data?.error}` });
    } else {
      setMessage({ type: 'success', text: '❌ رد شد.' });
      setSubmissions(subs => subs.filter(s => s.id !== id));
    }
    setProcessingId(null);
  };

  // Render side-by-side comparison for edits
  const renderComparison = (payload) => {
    if (!payload?.field_label) return null;
    return (
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
          <p className="text-xs text-red-600 font-medium mb-1">مقدار فعلی:</p>
          <p className="text-sm text-gray-800">{payload.current_value || '(خالی)'}</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
          <p className="text-xs text-green-600 font-medium mb-1">مقدار پیشنهادی:</p>
          <p className="text-sm text-gray-800">{payload.new_value || '(خالی)'}</p>
        </div>
      </div>
    );
  };

  // Render payload details based on action type
  const renderPayload = (sub) => {
    const p = sub.payload;
    if (!p) return null;

    if (sub.action_type === 'flag') {
      return (
        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
          <p className="text-sm"><strong>نوع خطا:</strong> {p.flag_type || 'سایر'}</p>
          {p.description && <p className="text-sm mt-1"><strong>توضیحات:</strong> {p.description}</p>}
          {p.field_name && <p className="text-sm mt-1"><strong>فیلد:</strong> {p.field_name}</p>}
          {p.current_value && <p className="text-sm mt-1"><strong>مقدار فعلی:</strong> {String(p.current_value)}</p>}
        </div>
      );
    }

    if (sub.action_type === 'direct_edit' || sub.action_type === 'edit_suggestion') {
      return (
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-700">فیلد: <strong>{p.field_label || sub.field_name}</strong></p>
          {renderComparison(p)}
          {p.note && <p className="text-xs text-gray-500 mt-2">📝 {p.note}</p>}
        </div>
      );
    }

    // new_submission: show key fields
    return (
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {p.title_fa && <div><span className="text-gray-500">عنوان:</span> <strong>{p.title_fa}</strong></div>}
        {p.playwright_fa && <div><span className="text-gray-500">نویسنده:</span> <strong>{Array.isArray(p.playwright_fa) ? p.playwright_fa.join('، ') : p.playwright_fa}</strong></div>}
        {p.publisher && <div><span className="text-gray-500">ناشر:</span> <strong>{p.publisher}</strong></div>}
        {p.publication_year_solar && <div><span className="text-gray-500">سال:</span> <strong>{p.publication_year_solar}</strong></div>}
      </div>
    );
  };

  if (loading) return <div className="text-center py-12 text-gray-500">در حال بارگذاری...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 کارتابل بررسی</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TABS.map(tab => {
          const count = tab.key === 'all'
            ? submissions.length
            : submissions.filter(s => s.action_type === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.icon} {tab.label}
              {count > 0 && <span className="mr-1.5 px-1.5 py-0.5 bg-white/20 rounded text-xs">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      {message.text && (
        <div className={`p-3 mb-4 rounded-lg text-sm border ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
          🎉 موردی برای بررسی وجود ندارد.
        </div>
      )}

      {/* Submission Cards */}
      <div className="space-y-4">
        {filtered.map(sub => {
          const style = TYPE_STYLES[sub.action_type] || TYPE_STYLES.new_submission;
          const isExpanded = expandedId === sub.id;

          return (
            <div key={sub.id} className={`border rounded-xl overflow-hidden ${style.border}`}>
              {/* Header */}
              <div
                className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : sub.id)}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${style.badge}`}>
                    {style.icon} {style.label}
                  </span>
                  <span className="font-bold text-gray-900 text-sm">
                    {sub.payload?.title_fa || sub.payload?.field_label || sub.field_name || '—'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{new Date(sub.submitted_at).toLocaleString('fa-IR')}</span>
                  <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Body */}
              {isExpanded && (
                <div className="p-4 border-t border-gray-100">
                  {renderPayload(sub)}
                </div>
              )}

              {/* Actions */}
              <div className="p-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => handleApprove(sub.id)}
                  disabled={processingId === sub.id}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {processingId === sub.id ? '⏳...' : '✅ تایید'}
                </button>
                <button
                  onClick={() => handleReject(sub.id)}
                  disabled={processingId === sub.id}
                  className="flex-1 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg font-bold hover:bg-red-50 disabled:opacity-50 transition-colors text-sm"
                >
                  {processingId === sub.id ? '⏳...' : '❌ رد'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}