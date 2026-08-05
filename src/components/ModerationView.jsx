// ===== IMPORTS & DEPENDENCIES =====
import React, { useEffect } from 'react';
import { usePendingSubmissions } from '../hooks/usePendingSubmissions';
import { joinNamesFromArray } from '../utils/textUtils';

// ===== COMPONENT =====
export default function ModerationView() {
  const { 
    submissions, 
    loading, 
    actionLoading, 
    error, 
    fetchSubmissions, 
    approveSubmission, 
    rejectSubmission 
  } = usePendingSubmissions();

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  if (loading && submissions.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 text-center">
        <div className="animate-pulse text-indigo-600 font-medium text-lg">در حال بارگذاری کارتابل...</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">کارتابل بررسی آثار</h2>
          <p className="mt-1 text-sm text-gray-500">
            آثار پیشنهاد شده توسط کاربران در این بخش منتظر تأیید شما هستند.
          </p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold">
          {submissions.length} اثر در انتظار
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {submissions.length === 0 && !loading ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <span className="text-4xl mb-3 block">🎉</span>
          <h3 className="text-lg font-bold text-gray-700">کارتابل خالی است!</h3>
          <p className="text-sm text-gray-500 mt-1">هیچ اثری در انتظار بررسی نیست.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {submissions.map((sub) => {
            const payload = sub.payload || {};
            const isProcessing = actionLoading === sub.id;
            const isMergeAction = payload.action_type === 'merge';

            return (
              <div key={sub.id} className={`p-5 rounded-xl border transition-all ${isProcessing ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-indigo-100 bg-white hover:shadow-md'}`}>
                
                {/* Header: Titles & Action Type */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-gray-900">{payload.title_fa || 'بدون عنوان'}</h3>
                      {isMergeAction && (
                        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                          درخواست ادغام
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 font-medium">
                      نویسنده: <span className="text-gray-900">{joinNamesFromArray(payload.playwright_fa) || 'نامشخص'}</span>
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex shrink-0 gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => approveSubmission(sub.id)}
                      disabled={isProcessing}
                      className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isProcessing ? 'در حال انجام...' : (isMergeAction ? '✓ تأیید ادغام' : '✓ تأیید و انتشار')}
                    </button>
                    <button 
                      onClick={() => rejectSubmission(sub.id)}
                      disabled={isProcessing}
                      className="flex-1 md:flex-none bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                    >
                      ✕ رد کردن
                    </button>
                  </div>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2 md:border-none md:pb-0">
                    <span className="text-gray-500">مترجم:</span>
                    <span className="font-semibold text-gray-800">{joinNamesFromArray(payload.translator_fa) || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2 md:border-none md:pb-0">
                    <span className="text-gray-500">زبان اصلی:</span>
                    <span className="font-semibold text-gray-800" dir="ltr">{payload.source_language?.toUpperCase() || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2 md:border-none md:pb-0">
                    <span className="text-gray-500">وضعیت نشر:</span>
                    <span className="font-semibold text-gray-800">
                      {payload.publication_status === 'published' ? 'منتشر شده' : 
                       payload.publication_status === 'self_published' ? 'ناشر مؤلف' : 'چاپ نشده'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2 md:border-none md:pb-0">
                    <span className="text-gray-500">ناشر/مجموعه:</span>
                    <span className="font-semibold text-gray-800 text-left" dir="auto">
                      {payload.publisher || '-'} {payload.is_in_collection ? `(مجموعه: ${payload.collection_title})` : ''}
                    </span>
                  </div>
                </div>

                {/* Submitter Info Footer */}
                <div className="flex justify-between items-center text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                  <span>ارسال کننده: {payload.submitter_name || 'ناشناس'} {payload.submitter_email ? `(${payload.submitter_email})` : ''}</span>
                  <span dir="ltr">{new Date(sub.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}