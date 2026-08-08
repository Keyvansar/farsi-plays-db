import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ResetPasswordView() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check if we have a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          setIsValidSession(false);
          setMessage({ 
            type: 'error', 
            text: 'لینک بازیابی معتبر نیست یا منقضی شده است. لطفاً دوباره درخواست بازیابی رمز عبور دهید.' 
          });
        } else {
          setIsValidSession(true);
        }
      } catch (err) {
        console.error('Session check error:', err);
        setIsValidSession(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'رمز عبور و تکرار آن مطابقت ندارند.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: '✅ رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.' 
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);

    } catch (err) {
      console.error('Password reset error:', err);
      setMessage({ type: 'error', text: 'خطا در تغییر رمز عبور. لطفاً دوباره تلاش کنید.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-500">در حال بررسی لینک بازیابی...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            🔒
          </div>
          <h2 className="text-2xl font-bold text-gray-900">بازیابی رمز عبور</h2>
          <p className="text-sm text-gray-500 mt-2">
            رمز عبور جدید خود را وارد کنید
          </p>
        </div>

        {message.text && (
          <div className={`p-3 mb-4 rounded-lg text-sm border ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {!isValidSession ? (
          <div className="text-center">
            <button
              onClick={() => window.location.href = '/login'}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              بازگشت به صفحه ورود
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                رمز عبور جدید
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0"
                placeholder="حداقل ۶ کاراکتر"
                dir="ltr"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                تکرار رمز عبور جدید
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0"
                placeholder="رمز عبور را دوباره وارد کنید"
                dir="ltr"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '⏳ در حال ذخیره...' : '🔒 ذخیره رمز عبور جدید'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}