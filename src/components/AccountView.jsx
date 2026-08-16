import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeFarsi } from '../utils/textUtils';
import { toast } from 'sonner';

export default function AccountView({ user }) {
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [userRole, setUserRole] = useState('guest');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const roleLabels = {
    guest: 'مهمان',
    contributor: 'مشارکت‌کننده',
    moderator: 'ویراستار',
    admin: 'مدیر',
  };

  // Fetch user role from user_roles table
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole('guest');
      } else {
        setUserRole(data?.role || 'guest');
      }
    };

    fetchUserRole();
  }, [user]);

  const handleUpdateName = async (e) => {
    e.preventDefault();

    const normalizedName = normalizeFarsi(displayName);
    if (normalizedName.length < 3) {
      toast.error('نام باید حداقل ۳ کاراکتر باشد.');
      return;
    }

    setIsUpdatingName(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: normalizedName }
      });

      if (error) throw error;

      toast.success('نام با موفقیت به‌روزرسانی شد.');
    } catch (err) {
      console.error('Name update error:', err);
      toast.error('خطا در به‌روزرسانی نام. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('رمز عبور جدید باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('رمز عبور و تکرار آن مطابقت ندارند.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('رمز عبور با موفقیت تغییر کرد.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password update error:', err);
      toast.error('خطا در تغییر رمز عبور. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-900">👤 حساب کاربری</h2>

      {/* Profile Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">اطلاعات حساب</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">ایمیل:</span>
            <span className="font-medium" dir="ltr">{user?.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">نقش:</span>
            <span className="font-medium text-indigo-600">{roleLabels[userRole] || userRole}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">عضویت از:</span>
            <span className="font-medium">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('fa-IR') : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Display Name Update */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">✏️ تغییر نام نمایشی</h3>

        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              نام و نام خانوادگی
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0"
              placeholder="مثال: بهرام بیضایی"
            />
          </div>
          <button
            type="submit"
            disabled={isUpdatingName}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isUpdatingName ? '⏳ در حال ذخیره...' : '💾 ذخیره نام'}
          </button>
        </form>
      </div>

      {/* Password Change */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">🔒 تغییر رمز عبور</h3>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
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
              placeholder="رمز عبور جدید را دوباره وارد کنید"
              dir="ltr"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isUpdatingPassword ? '⏳ در حال تغییر...' : '🔒 تغییر رمز عبور'}
          </button>
        </form>
      </div>

      {/* Sign Out */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition-colors"
        >
          🚪 خروج از حساب
        </button>
      </div>
    </div>
  );
}