import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../ui/Modal';

// Fields that contributors can suggest edits for (must match approve RPC whitelist)
const SUGGESTABLE_FIELDS = [
  { key: 'title_fa', label: 'عنوان' },
  { key: 'translator_fa', label: 'مترجم' },
  { key: 'publication_status', label: 'وضعیت انتشار' },
  { key: 'publisher', label: 'ناشر' },
  { key: 'collection_title', label: 'عنوان مجموعه' },
  { key: 'publication_year_solar', label: 'سال شمسی' },
  { key: 'publication_year_gregorian', label: 'سال میلادی' },
  { key: 'original_year', label: 'سال نگارش' },
  { key: 'isbn', label: 'شابک' },
  { key: 'page_count', label: 'تعداد صفحات' },
  { key: 'cast_men', label: 'بازیگر مرد' },
  { key: 'cast_women', label: 'بازیگر زن' },
  { key: 'cast_nonspecific', label: 'بازیگر نامشخص' },
  { key: 'cast_total', label: 'مجموع بازیگران' },
  { key: 'synopsis', label: 'خلاصه' },
];

// NOTE: These values must match your flag_type_enum in the database
const FLAG_TYPES = [
  { key: 'wrong_info', label: 'اطلاعات نادرست' },
  { key: 'duplicate', label: 'اثر تکراری' },
  { key: 'spam', label: 'اسپم' },
  { key: 'copyright', label: 'نقض حق نشر' },
  { key: 'other', label: 'سایر' },
];

export default function EditSuggestModal({ edition, user, mode = 'suggest', onClose, onSubmitted }) {
  const [selectedField, setSelectedField] = useState('');
  const [newValue, setNewValue] = useState('');
  const [note, setNote] = useState('');
  const [flagType, setFlagType] = useState('wrong_info');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const isFlag = mode === 'flag';

  // Get current value of a field for display
  const getCurrentValue = (fieldKey) => {
    const ed = edition || {};
    switch (fieldKey) {
      case 'title_fa': return ed.title_fa || '';
      case 'translator_fa': return Array.isArray(ed.translator_fa) ? ed.translator_fa.join('، ') : (ed.translator_fa || '');
      case 'publication_status': return ed.publication_status || '';
      case 'publisher': return ed.publisher || '';
      case 'collection_title': return ed.collection_title || '';
      case 'publication_year_solar': return ed.publication_year_solar?.toString() || '';
      case 'publication_year_gregorian': return ed.publication_year_gregorian?.toString() || '';
      case 'original_year': return ed.original_year?.toString() || '';
      case 'isbn': return ed.isbn || '';
      case 'page_count': return ed.page_count?.toString() || '';
      case 'cast_men': return ed.cast_men?.toString() || '';
      case 'cast_women': return ed.cast_women?.toString() || '';
      case 'cast_nonspecific': return ed.cast_nonspecific?.toString() || '';
      case 'cast_total': return ed.cast_total?.toString() || '';
      case 'synopsis': return ed.synopsis || '';
      default: return '';
    }
  };

  const canSubmit = isFlag
    ? description.trim().length >= 3
    : selectedField && newValue.trim().length > 0;

  // ===== SUBMIT =====
  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      if (isFlag) {
        const { error } = await supabase.from('pending_submissions').insert({
          action_type: 'flag',
          edition_id: edition.id,
          field_name: 'flag',
          submitted_by: user?.id || null,
          payload: {
            title_fa: edition.title_fa,
            flag_type: flagType,
            description: description.trim(),
          },
        });
        if (error) throw error;
        setMessage({ type: 'success', text: '✅ گزارش شما برای بررسی ثبت شد. سپاس!' });
      } else {
        const fieldDef = SUGGESTABLE_FIELDS.find(f => f.key === selectedField);
        const { error } = await supabase.from('pending_submissions').insert({
          action_type: 'edit_suggestion',
          edition_id: edition.id,
          field_name: selectedField,
          submitted_by: user?.id || null,
          payload: {
            title_fa: edition.title_fa,
            field_label: fieldDef?.label || selectedField,
            current_value: String(getCurrentValue(selectedField)),
            new_value: newValue.trim(),
            note: note.trim() || null,
          },
        });
        if (error) throw error;
        setMessage({ type: 'success', text: '✅ پیشنهاد شما برای بررسی ثبت شد. سپاس!' });
      }

      setTimeout(() => {
        onSubmitted?.();
        onClose();
      }, 1200);

    } catch (err) {
      console.error('Suggest/flag submission error:', err);
      setMessage({ type: 'error', text: `خطا در ثبت: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title={isFlag ? '🚩 گزارش خطا' : '💡 پیشنهاد ویرایش'}
      subtitle={edition?.title_fa}
      maxWidth="max-w-md"
    >
      <div className="p-6 space-y-4">
        {/* Messages */}
        {message.text && (
          <div className={`p-3 rounded-lg text-sm border ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
            'bg-red-50 text-red-800 border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {isFlag ? (
          /* ===== FLAG MODE ===== */
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">نوع خطا</label>
              <select
                value={flagType}
                onChange={(e) => setFlagType(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-white"
              >
                {FLAG_TYPES.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                توضیحات <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-gray-50 focus:bg-white"
                placeholder="لطفاً خطای مشاهده شده را شرح دهید..."
              />
            </div>
          </>
        ) : (
          /* ===== SUGGEST MODE ===== */
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                فیلد مورد نظر <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-white"
              >
                <option value="">انتخاب کنید...</option>
                {SUGGESTABLE_FIELDS.map(f => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </div>

            {selectedField && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">مقدار فعلی:</p>
                <p className="text-sm text-gray-800 break-words">
                  {getCurrentValue(selectedField) || '(خالی)'}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                مقدار پیشنهادی <span className="text-red-500">*</span>
              </label>
              {selectedField === 'synopsis' ? (
                <textarea
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-gray-50 focus:bg-white"
                  placeholder="مقدار جدید را وارد کنید..."
                />
              ) : (
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-gray-50 focus:bg-white"
                  placeholder="مقدار جدید را وارد کنید..."
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                یادداشت (اختیاری)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 bg-gray-50 focus:bg-white"
                placeholder="توضیح یا منبع برای این پیشنهاد..."
              />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className={`flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50 transition-colors ${
              isFlag ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {submitting ? '⏳ در حال ثبت...' : (isFlag ? '🚩 ثبت گزارش' : '💡 ثبت پیشنهاد')}
          </button>
        </div>
      </div>
    </Modal>
  );
}