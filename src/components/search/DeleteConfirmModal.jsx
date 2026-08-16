import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../ui/Modal';
import { toast } from 'sonner';

const DELETE_REASONS = [
  { key: 'duplicate', label: 'تکراری', icon: '📑' },
  { key: 'spam', label: 'اسپم', icon: '🚫' },
  { key: 'fake', label: 'جعلی', icon: '⚠️' },
  { key: 'other', label: 'دلایل دیگر', icon: '📝' },
];

export default function DeleteConfirmModal({ edition, user, onClose, onSubmitted }) {
  const [reasons, setReasons] = useState([]);
  const [otherReason, setOtherReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleReason = (key) => {
    setReasons(prev =>
      prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]
    );
  };

  const needsOtherText = reasons.includes('other');
  const hasSelectedReason = reasons.length > 0;
  const hasValidOtherReason = !needsOtherText || otherReason.trim().length >= 3;
  const canSubmit = hasSelectedReason && hasValidOtherReason;

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const { error } = await supabase.from('pending_submissions').insert({
        action_type: 'delete_suggestion',
        edition_id: edition.id,
        field_name: 'delete',
        submitted_by: user?.id || null,
        payload: {
          title_fa: edition.title_fa,
          delete_reasons: reasons,
          other_reason: otherReason.trim() || null,
        },
      });

      if (error) throw error;

      toast.success('پیشنهاد حذف برای بررسی ثبت شد.');
      setTimeout(() => {
        onSubmitted?.();
        onClose();
      }, 1200);

    } catch (err) {
      console.error('Delete suggestion error:', err);
      toast.error(`خطا در ثبت پیشنهاد: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="🗑️ پیشنهاد حذف اثر"
      subtitle={edition?.title_fa}
      maxWidth="max-w-md"
    >
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-600">
          این اثر برای حذف پیشنهاد خواهد شد و پس از بررسی توسط ویراستاران، تصمیم نهایی گرفته می‌شود.
        </p>

        {/* Removed inline message block in favor of Sonner toasts */}

        {/* Reason Checkboxes */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            دلیل پیشنهاد حذف <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {DELETE_REASONS.map(r => (
              <label
                key={r.key}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${reasons.includes(r.key)
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={reasons.includes(r.key)}
                  onChange={() => toggleReason(r.key)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-800">
                  {r.icon} {r.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Other Reason Text */}
        {needsOtherText && (
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              توضیح دلیل <span className="text-red-500">*</span>
            </label>
            <textarea
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-0 bg-gray-50 focus:bg-white"
              placeholder="لطفاً دلیل حذف را شرح دهید..."
            />
          </div>
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
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? '⏳ در حال ثبت...' : '🗑️ ثبت پیشنهاد حذف'}
          </button>
        </div>
      </div>
    </Modal>
  );
}