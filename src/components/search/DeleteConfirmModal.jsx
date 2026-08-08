import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const DELETE_REASONS = [
  { key: 'duplicate', label: 'تکراری' },
  { key: 'spam', label: 'اسپم' },
  { key: 'fake', label: 'جعلی' },
  { key: 'other', label: 'دلایل دیگر' },
];

export default function DeleteConfirmModal({ edition, user, onClose, onSubmitted }) {
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [otherReason, setOtherReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const toggleReason = (key) => {
    setSelectedReasons(prev =>
      prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (selectedReasons.length === 0) {
      setMessage({ type: 'error', text: 'لطفاً حداقل یک دلیل انتخاب کنید.' });
      return;
    }

    if (selectedReasons.includes('other') && !otherReason.trim()) {
      setMessage({ type: 'error', text: 'لطفاً دلیل دیگر را توضیح دهید.' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.from('pending_submissions').insert({
        action_type: 'delete_suggestion',
        edition_id: edition.id,
        submitted_by: user?.id || null,
        payload: {
          title_fa: edition.title_fa,
          delete_reasons: selectedReasons,
          other_reason: selectedReasons.includes('other') ? otherReason : null,
        },
      });

      if (error) throw error;

      setMessage({ type: 'success', text: '✅ پیشنهاد حذف ثبت شد و پس از تایید مدیر اعمال می‌شود.' });
      setTimeout(() => {
        onSubmitted?.();
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Delete suggestion error:', err);
      setMessage({ type: 'error', text: 'خطا در ثبت پیشنهاد حذف.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-red-600">🗑️ پیشنهاد حذف</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          در حال پیشنهاد حذف: <strong>{edition.title_fa}</strong>
        </p>

        {message.text && (
          <div className={`p-3 mb-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* Reason Checkboxes */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-800 mb-2">دلیل حذف:</label>
          <div className="space-y-2">
            {DELETE_REASONS.map(reason => (
              <label key={reason.key} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedReasons.includes(reason.key)}
                  onChange={() => toggleReason(reason.key)}
                  className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                />
                <span className="text-sm">{reason.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Other Reason Textbox */}
        {selectedReasons.includes('other') && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">توضیح دلیل دیگر:</label>
            <textarea
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-0"
              placeholder="لطفاً دلیل حذف را توضیح دهید..."
            />
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || selectedReasons.length === 0}
          className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? '⏳ در حال ثبت...' : '🗑️ ثبت پیشنهاد حذف'}
        </button>
      </div>
    </div>
  );
}