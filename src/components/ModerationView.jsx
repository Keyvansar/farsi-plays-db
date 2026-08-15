import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TABS = [
  { key: 'all', label: 'همه', icon: '📋' },
  { key: 'edit_suggestion', label: 'پیشنهاد ویرایش', icon: '💡' },
  { key: 'new_submission', label: 'ثبت جدید', icon: '🆕' },
  { key: 'delete_suggestion', label: 'پیشنهاد حذف', icon: '🗑️' },
  { key: 'flag', label: 'گزارش خطا', icon: '🚩' },
];

const TYPE_STYLES = {
  direct_edit: { badge: 'bg-green-100 text-green-800', border: 'border-green-200', label: 'ویرایش مستقیم', icon: '✏️' },
  edit_suggestion: { badge: 'bg-blue-100 text-blue-800', border: 'border-blue-200', label: 'پیشنهاد ویرایش', icon: '💡' },
  new_submission: { badge: 'bg-purple-100 text-purple-800', border: 'border-purple-200', label: 'ثبت اثر جدید', icon: '🆕' },
  delete_suggestion: { badge: 'bg-orange-100 text-orange-800', border: 'border-orange-200', label: 'پیشنهاد حذف', icon: '🗑️' },
  flag: { badge: 'bg-red-100 text-red-800', border: 'border-red-200', label: 'گزارش خطا', icon: '🚩' },
};

export default function ModerationView() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [processingIds, setProcessingIds] = useState(new Set());
  const [message, setMessage] = useState({ type: '', text: '' });
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_submissions')
        .select('*')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Fetch error:', err);
      setMessage({ type: 'error', text: 'خطا در بارگذاری کارتابل. لطفاً دوباره تلاش کنید.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const filtered = activeTab === 'all'
    ? submissions
    : submissions.filter(s => s.action_type === activeTab);

  // ===== SELECTION =====
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(s => s.id)));
  };

  // ===== BULK ACTIONS =====
  const bulkApprove = async (ids) => {
    if (ids.length === 0) return;
    setProcessingIds(new Set(ids));
    setMessage({ type: '', text: '' });
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const id of ids) {
        const { data, error } = await supabase.rpc('approve_pending_submission', { submission_id: id });
        if (error || (data && !data.success)) {
          errorCount++;
        } else {
          successCount++;
        }
      }

      setSubmissions(subs => subs.filter(s => !ids.includes(s.id)));
      setSelectedIds(new Set());

      if (errorCount === 0) {
        setMessage({ type: 'success', text: `✅ ${successCount} مورد با موفقیت تایید شد.` });
      } else {
        setMessage({ type: 'error', text: `⚠️ ${successCount} تایید شد، ${errorCount} خطا داشت.` });
      }
    } catch (err) {
      console.error('Bulk approve error:', err);
      setMessage({ type: 'error', text: 'خطا در پردازش درخواست‌ها. لطفاً دوباره تلاش کنید.' });
    } finally {
      setProcessingIds(new Set());
    }
  };

  const bulkReject = async (ids) => {
    if (ids.length === 0) return;
    const reason = prompt('دلیل رد کردن (اختیاری):');
    if (reason === null) return;

    setProcessingIds(new Set(ids));
    setMessage({ type: '', text: '' });
    let successCount = 0;

    for (const id of ids) {
      const { data, error } = await supabase.rpc('reject_pending_submission', { submission_id: id, reason });
      if (!error && data?.success) successCount++;
    }

    setSubmissions(subs => subs.filter(s => !ids.includes(s.id)));
    setSelectedIds(new Set());
    setProcessingIds(new Set());
    setMessage({ type: 'success', text: `❌ ${successCount} مورد رد شد.` });
  };

  // ===== COMPREHENSIVE PAYLOAD RENDERER =====
  const renderPayload = (sub) => {
    const p = sub.payload;
    if (!p) return null;

    const Field = ({ label, value, dir }) => {
      if (!value && value !== 0 && value !== false) return null;
      return (
        <div className="flex justify-between items-start py-1.5 border-b border-gray-50 last:border-0">
          <span className="text-xs text-gray-500 shrink-0">{label}:</span>
          <span className="text-sm text-gray-800 font-medium text-left" dir={dir || 'rtl'}>
            {Array.isArray(value) ? value.join('، ') : String(value)}
          </span>
        </div>
      );
    };

    // DELETE SUGGESTION
    if (sub.action_type === 'delete_suggestion') {
      const reasonLabels = { duplicate: 'تکراری', spam: 'اسپم', fake: 'جعلی', other: 'دلایل دیگر' };
      return (
        <div className="mt-3 p-4 bg-orange-50 rounded-lg border border-orange-100">
          <p className="text-sm font-bold text-orange-800 mb-2">🗑️ پیشنهاد حذف</p>
          <Field label="اثر" value={p.title_fa} />
          {p.delete_reasons?.length > 0 && (
            <Field label="دلایل" value={p.delete_reasons.map(r => reasonLabels[r] || r)} />
          )}
          {p.other_reason && <Field label="توضیحات" value={p.other_reason} />}
        </div>
      );
    }

    // FLAG
    if (sub.action_type === 'flag') {
      return (
        <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-100">
          <p className="text-sm font-bold text-red-800 mb-2">🚩 گزارش خطا</p>
          <Field label="نوع خطا" value={p.flag_type || 'سایر'} />
          {p.description && <Field label="توضیحات" value={p.description} />}
          {p.field_name && <Field label="فیلد مربوطه" value={p.field_name} />}
          {p.current_value && <Field label="مقدار فعلی" value={String(p.current_value)} />}
        </div>
      );
    }

    // EDIT / SUGGESTION
    if (sub.action_type === 'direct_edit' || sub.action_type === 'edit_suggestion') {
      return (
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-700 mb-2">
            فیلد: <strong>{p.field_label || sub.field_name}</strong>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs text-red-600 font-medium mb-1">مقدار فعلی:</p>
              <p className="text-sm text-gray-800 break-words">{p.current_value || '(خالی)'}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <p className="text-xs text-green-600 font-medium mb-1">مقدار پیشنهادی:</p>
              <p className="text-sm text-gray-800 break-words">{p.new_value || '(خالی)'}</p>
            </div>
          </div>
          {p.note && <p className="text-xs text-gray-500 mt-2">📝 {p.note}</p>}
        </div>
      );
    }

    // NEW SUBMISSION — SHOW ALL FIELDS
    return (
      <div className="mt-3 space-y-3">
        {/* Basic Info */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <p className="text-xs font-bold text-indigo-600 mb-2">📌 اطلاعات اصلی</p>
          <Field label="عنوان" value={p.title_fa} />
          <Field label="نویسنده" value={p.playwright_fa} />
          <Field label="زبان اصلی" value={p.source_language === 'fa' ? 'فارسی (تألیفی)' : p.source_language} />
          {p.translator_fa && p.translator_fa.length > 0 && <Field label="مترجم" value={p.translator_fa} />}
          {p.original_title && <Field label="عنوان اصلی" value={p.original_title} dir="ltr" />}
        </div>

        {/* Publication */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <p className="text-xs font-bold text-indigo-600 mb-2">📖 نشر</p>
          <Field label="وضعیت انتشار" value={p.publication_status} />
          {p.publisher && <Field label="ناشر" value={p.publisher} />}
          {p.publication_year_solar && <Field label="سال شمسی" value={p.publication_year_solar} />}
          {p.publication_year_gregorian && <Field label="سال میلادی" value={p.publication_year_gregorian} />}
          {p.original_year && <Field label="سال نگارش" value={p.original_year} />}
          {p.isbn && <Field label="شابک" value={p.isbn} dir="ltr" />}
          {p.page_count && <Field label="صفحات" value={p.page_count} />}
          {p.is_in_collection && <Field label="مجموعه" value={p.collection_title || 'بله'} />}
        </div>

        {/* Cast */}
        {(p.cast_men || p.cast_women || p.cast_nonspecific || p.cast_total) && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-bold text-indigo-600 mb-2">🎭 بازیگران</p>
            <div className="flex gap-4 text-sm flex-wrap">
              {p.cast_men != null && <span>مرد: <strong>{p.cast_men}</strong></span>}
              {p.cast_women != null && <span>زن: <strong>{p.cast_women}</strong></span>}
              {p.cast_nonspecific != null && <span>نامشخص: <strong>{p.cast_nonspecific}</strong></span>}
              {p.cast_total != null && <span>مجموع: <strong>{p.cast_total}</strong></span>}
            </div>
          </div>
        )}

        {/* Synopsis */}
        {p.synopsis && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-bold text-indigo-600 mb-2">📝 خلاصه</p>
            <p className="text-sm text-gray-700 leading-relaxed">{p.synopsis}</p>
          </div>
        )}

        {/* Tags */}
        {p.tags?.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-bold text-indigo-600 mb-2">🏷️ برچسب‌ها</p>
            <div className="flex flex-wrap gap-1.5">
              {p.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* External References */}
        {p.external_references?.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-bold text-indigo-600 mb-2">🔗 لینک‌های خارجی</p>
            <div className="space-y-1">
              {p.external_references.map((ref, i) => (
                <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer"
                  className="block text-xs text-indigo-600 hover:text-indigo-800 truncate" dir="ltr">
                  {ref.ref_type === 'ebook' ? '📖' : ref.ref_type === 'article' ? '📄' : '🔗'} {ref.url}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Submitter */}
        {(p.submitter_name || p.submitter_email) && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-xs font-bold text-blue-600 mb-2">👤 ثبت‌کننده</p>
            <Field label="نام" value={p.submitter_name} />
            {p.submitter_email && <Field label="ایمیل" value={p.submitter_email} dir="ltr" />}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="text-center py-12 text-gray-500">در حال بارگذاری...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 کارتابل بررسی</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {TABS.map(tab => {
          const count = tab.key === 'all'
            ? submissions.length
            : submissions.filter(s => s.action_type === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSelectedIds(new Set()); }}
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

      {/* Bulk Action Bar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              className="rounded text-indigo-600"
            />
            <span>انتخاب همه</span>
          </label>

          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">{selectedIds.size} انتخاب شده</span>

          <div className="flex gap-2 mr-auto flex-wrap">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => bulkApprove([...selectedIds])}
                  disabled={processingIds.size > 0}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  ✅ تایید انتخاب‌شده‌ها ({selectedIds.size})
                </button>
                <button
                  onClick={() => bulkReject([...selectedIds])}
                  disabled={processingIds.size > 0}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  ❌ رد انتخاب‌شده‌ها ({selectedIds.size})
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-300"
                >
                  لغو انتخاب
                </button>
              </>
            )}
            <button
              onClick={() => bulkApprove(filtered.map(s => s.id))}
              disabled={processingIds.size > 0}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 disabled:opacity-50"
            >
              ✅ تایید همه ({filtered.length})
            </button>
            <button
              onClick={() => bulkReject(filtered.map(s => s.id))}
              disabled={processingIds.size > 0}
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 disabled:opacity-50"
            >
              ❌ رد همه ({filtered.length})
            </button>
          </div>
        </div>
      )}

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
          const isSelected = selectedIds.has(sub.id);
          const isProcessing = processingIds.has(sub.id);

          return (
            <div key={sub.id} className={`border rounded-xl overflow-hidden transition-all ${style.border} ${isSelected ? 'ring-2 ring-indigo-300' : ''}`}>
              {/* Header */}
              <div className="p-4 bg-gray-50 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(sub.id)}
                  className="w-5 h-5 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 shrink-0"
                />

                <div
                  className="flex-1 flex justify-between items-center cursor-pointer"
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
              </div>

              {/* Expanded Body */}
              {isExpanded && (
                <div className="p-4 border-t border-gray-100">
                  {renderPayload(sub)}
                </div>
              )}

              {/* Actions */}
              <div className="p-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => bulkApprove([sub.id])}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {isProcessing ? '⏳...' : '✅ تایید'}
                </button>
                <button
                  onClick={() => bulkReject([sub.id])}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg font-bold hover:bg-red-50 disabled:opacity-50 transition-colors text-sm"
                >
                  {isProcessing ? '⏳...' : '❌ رد'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}