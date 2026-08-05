import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Field definitions: name, label, input type, where to get current value
const FIELD_DEFINITIONS = [
  { key: 'title_fa', label: 'عنوان', type: 'text', source: 'edition' },
  { key: 'playwright_fa', label: 'نویسنده', type: 'text', source: 'work', isArray: true },
  { key: 'translator_fa', label: 'مترجم', type: 'text', source: 'edition', isArray: true },
  { key: 'original_title', label: 'عنوان اصلی', type: 'text', source: 'work' },
  { key: 'publisher', label: 'ناشر', type: 'text', source: 'edition' },
  { key: 'publication_status', label: 'وضعیت انتشار', type: 'select', source: 'edition', options: ['published', 'unpublished', 'manuscript', 'digital'] },
  { key: 'publication_year_solar', label: 'سال شمسی', type: 'number', source: 'edition' },
  { key: 'publication_year_gregorian', label: 'سال میلادی', type: 'number', source: 'edition' },
  { key: 'original_year', label: 'سال نگارش اصلی', type: 'number', source: 'edition' },
  { key: 'isbn', label: 'شابک', type: 'text', source: 'edition' },
  { key: 'page_count', label: 'تعداد صفحات', type: 'number', source: 'edition' },
  { key: 'cast_men', label: 'بازیگران مرد', type: 'number', source: 'edition' },
  { key: 'cast_women', label: 'بازیگران زن', type: 'number', source: 'edition' },
  { key: 'cast_nonspecific', label: 'بازیگران نامشخص', type: 'number', source: 'edition' },
  { key: 'cast_total', label: 'مجموع بازیگران', type: 'number', source: 'edition' },
  { key: 'synopsis', label: 'خلاصه', type: 'textarea', source: 'edition' },
  { key: 'collection_title', label: 'عنوان مجموعه', type: 'text', source: 'edition' },
];

export default function EditSuggestModal({ edition, user, onClose, onSubmitted }) {
  const [selectedField, setSelectedField] = useState('');
  const [newValue, setNewValue] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const isModerator = user?.user_metadata?.role === 'moderator' || user?.user_metadata?.role === 'admin';
  const fieldDef = FIELD_DEFINITIONS.find(f => f.key === selectedField);

  // Get current value from edition data
  const getCurrentValue = (key) => {
    if (!edition) return '';
    const def = FIELD_DEFINITIONS.find(f => f.key === key);
    if (!def) return '';
    if (def.source === 'work') {
      const val = edition.works?.[key];
      return Array.isArray(val) ? val.join(', ') : val || '';
    }
    const val = edition[key];
    return Array.isArray(val) ? val.join(', ') : val || '';
  };

  const currentValue = selectedField ? getCurrentValue(selectedField) : '';

  const handleSubmit = async () => {
    if (!selectedField || !newValue) {
      setMessage({ type: 'error', text: 'لطفاً فیلد و مقدار جدید را وارد کنید.' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    const actionType = isModerator ? 'direct_edit' : 'edit_suggestion';

    try {
      const { error } = await supabase.from('pending_submissions').insert({
        action_type: actionType,
        edition_id: edition.id,
        field_name: selectedField,
        submitted_by: user?.id || null,
        payload: {
          field_label: fieldDef?.label || selectedField,
          current_value: currentValue,
          new_value: newValue,
          note: note || null,
        },
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: isModerator
          ? '✅ ویرایش مستقیم ثبت شد و پس از تایید اعمال می‌شود.'
          : '✅ پیشنهاد ویرایش ثبت شد و پس از بررسی اعمال خواهد شد.',
      });

      // Auto-close after success
      setTimeout(() => {
        onSubmitted?.();
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Edit submission error:', err);
      setMessage({ type: 'error', text: 'خطا در ثبت. لطفاً دوباره تلاش کنید.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic input renderer
  const renderInput = () => {
    if (!fieldDef) return null;

    const baseClass = 'w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0';

    switch (fieldDef.type) {
      case 'textarea':
        return <textarea value={newValue} onChange={(e) => setNewValue(e.target.value)} rows={4} className={baseClass} placeholder="مقدار جدید..." />;
      case 'number':
        return <input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} className={baseClass} placeholder="مقدار جدید..." />;
      case 'select':
        return (
          <select value={newValue} onChange={(e) => setNewValue(e.target.value)} className={baseClass}>
            <option value="">انتخاب کنید...</option>
            {fieldDef.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      default:
        return <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)} className={baseClass} placeholder="مقدار جدید..." />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isModerator ? '✏️ ویرایش مستقیم' : '💡 پیشنهاد ویرایش'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          در حال ویرایش: <strong>{edition.title_fa}</strong>
        </p>

        {message.text && (
          <div className={`p-3 mb-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* Field Selector */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">فیلد مورد نظر</label>
          <select
            value={selectedField}
            onChange={(e) => { setSelectedField(e.target.value); setNewValue(''); }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-white"
          >
            <option value="">انتخاب فیلد...</option>
            {FIELD_DEFINITIONS.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Current Value */}
        {selectedField && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">مقدار فعلی:</p>
            <p className="text-sm font-medium text-gray-800">{currentValue || '(خالی)'}</p>
          </div>
        )}

        {/* New Value Input */}
        {selectedField && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">مقدار جدید</label>
            {renderInput()}
          </div>
        )}

        {/* Note */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-1.5">توضیحات (اختیاری)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0"
            placeholder="دلیل ویرایش یا منبع اطلاعات..."
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedField || !newValue}
          className={`w-full py-3 rounded-xl font-bold text-white transition-colors disabled:opacity-50 ${
            isModerator ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {submitting ? '⏳ در حال ثبت...' : isModerator ? '✅ اعمال ویرایش' : '📨 ارسال پیشنهاد'}
        </button>
      </div>
    </div>
  );
}