// ===== IMPORTS & DEPENDENCIES =====
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { supabase, initializationError } from './lib/supabase';
import { normalizeFarsi } from './utils/textUtils';
import ErrorBoundary from './components/ui/ErrorBoundary';


// ===== 🚀 LAZY IMPORTS (loaded on demand) =====
const SearchView = lazy(() => import('./components/search/SearchView'));  // 🆕
const SubmitView = lazy(() => import('./components/SubmitView'));
const ModerationView = lazy(() => import('./components/ModerationView'));
const AccountView = lazy(() => import('./components/AccountView'));
const ResetPasswordView = lazy(() => import('./components/ResetPasswordView'));
const LoginForm = lazy(() => import('./components/LoginForm'));

// ===== ROUTE LOADING FALLBACK =====
function RouteLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500">در حال بارگذاری...</p>
      </div>
    </div>
  );
}

// ===== MAIN CONTENT COMPONENT =====
function AppContent() {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Profile Setup State
  const [setupName, setSetupName] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSetupError, setProfileSetupError] = useState('');

  // ===== LIFECYCLE & AUTHENTICATION =====
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user && window.location.pathname === '/moderate') {
        navigate('/');
      }
    });

    return () => subscription?.unsubscribe?.();
  }, [navigate]);

  // ===== PROFILE SETUP HANDLER =====
  const handleProfileSetup = async (e) => {
    e.preventDefault();
    setProfileSetupError('');

    const normalizedName = normalizeFarsi(setupName);

    if (normalizedName.length < 3) {
      setProfileSetupError('لطفاً نام و نام خانوادگی خود را به صورت کامل وارد کنید.');
      return;
    }

    if (setupPassword.length < 6) {
      setProfileSetupError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    if (setupPassword !== setupPasswordConfirm) {
      setProfileSetupError('رمز عبور و تکرار آن مطابقت ندارند.');
      return;
    }

    setIsUpdatingProfile(true);

    try {
      // Step 1: Set the password
      const { error: pwError } = await supabase.auth.updateUser({
        password: setupPassword
      });
      if (pwError) throw pwError;

      // Step 2: Set the display name
      const { error: nameError } = await supabase.auth.updateUser({
        data: { display_name: normalizedName }
      });
      if (nameError) throw nameError;

      toast.success('اطلاعات با موفقیت ذخیره شد. به سامانه خوش آمدید!');

    } catch (err) {
      console.error('Error during profile setup:', err);
      const errorMsg = 'خطا در ثبت اطلاعات. لطفاً دوباره تلاش کنید.';
      setProfileSetupError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const needsProfileSetup = user && !user.user_metadata?.display_name;

  // Helper to style active navigation links
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">

      <Toaster
        dir="rtl"
        position="bottom-center"
        richColors
        closeButton
        toastOptions={{
          style: { fontFamily: 'IRANSans, ui-sans-serif, system-ui, sans-serif' }
        }}
      />

      {/* 🚀 MANDATORY PROFILE SETUP GATE */}
      {needsProfileSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fadeIn border border-gray-100">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                👋
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">خوش آمدید!</h2>
              <p className="text-sm text-gray-500">
                برای ادامه فعالیت در سامانه، لطفاً اطلاعات زیر را تکمیل کنید. این نام در سوابق ثبت آثار شما نمایش داده خواهد شد.
              </p>
            </div>
            {profileSetupError && (
              <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm text-center border border-red-100">
                {profileSetupError}
              </div>
            )}
            <form onSubmit={handleProfileSetup} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  نام و نام خانوادگی <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white text-lg"
                  placeholder="مثال: بهرام بیضایی"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  تنظیم رمز عبور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white"
                  placeholder="حداقل ۶ کاراکتر"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  تکرار رمز عبور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={setupPasswordConfirm}
                  onChange={(e) => setSetupPasswordConfirm(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors bg-gray-50 focus:bg-white"
                  placeholder="رمز عبور را دوباره وارد کنید"
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-md shadow-indigo-200"
              >
                {isUpdatingProfile ? 'در حال ثبت...' : 'ذخیره و ورود به سامانه'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <header className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 text-center relative overflow-hidden">
          {user && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>
          )}
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">بانک اطلاعات نمایشنامه‌های فارسی</h1>
          <p className="text-sm text-gray-600 mb-6">
            سامانه جامع، متن‌باز و پژوهشی برای ثبت و جستجوی متون نمایشی
          </p>

          {/* NAVIGATION LINKS */}
          <div className="flex justify-center gap-3 flex-wrap">
            <Link
              to="/"
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm ${isActive('/') ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              🔍 جستجو
            </Link>

            <Link
              to="/submit"
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm ${isActive('/submit') ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              ✍️ ثبت اثر جدید
            </Link>

            {user && (
              <Link
                to="/moderate"
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm ${isActive('/moderate') ? 'bg-green-600 text-white shadow-green-100' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'}`}
              >
                📋 کارتابل بررسی
              </Link>
            )}

            {!user ? (
              <Link
                to="/login"
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm ${isActive('/login') ? 'bg-gray-800 text-white shadow-gray-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                🔑 ورود همکاران
              </Link>
            ) : (
              <>
                <Link
                  to="/account"
                  className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm ${isActive('/account') ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  👤 حساب کاربری
                </Link>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="px-6 py-2.5 rounded-lg font-medium text-sm bg-red-50 text-red-700 hover:bg-red-100 transition-all shadow-sm flex items-center gap-2"
                >
                  <span>خروج</span>
                  <span className="font-bold border-r border-red-200 pr-2">
                    {user.user_metadata?.display_name || user.email?.split('@')[0] || 'کاربر'}
                  </span>
                </button>
              </>
            )}
          </div>
        </header>

        {initializationError && (
          <div className="p-4 mb-6 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
            {initializationError}
          </div>
        )}

        {/* 🚀 ROUTING LOGIC WITH SUSPENSE */}
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<ErrorBoundary><SearchView user={user} /></ErrorBoundary>} />
            <Route path="/submit" element={<ErrorBoundary><SubmitView user={user} /></ErrorBoundary>} />
            <Route path="/moderate" element={user ? <ErrorBoundary><ModerationView /></ErrorBoundary> : <Navigate to="/" replace />} />
            <Route path="/account" element={user ? <ErrorBoundary><AccountView user={user} /></ErrorBoundary> : <Navigate to="/" replace />} />
            <Route path="/reset-password" element={<ErrorBoundary><ResetPasswordView /></ErrorBoundary>} />
            <Route path="/login" element={<ErrorBoundary><LoginForm /></ErrorBoundary>} />
          </Routes>
        </Suspense>

      </div>
    </div>
  );
}

// ===== MAIN APP EXPORT =====
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}