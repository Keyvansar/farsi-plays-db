// ===== IMPORTS & DEPENDENCIES =====
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase, initializationError } from './lib/supabase';
import { normalizeFarsi } from './utils/textUtils';
import LoginForm from './components/LoginForm';
import SearchView from './components/search/SearchView';
import SubmitView from './components/SubmitView';
import ModerationView from './components/ModerationView';

// ===== MAIN CONTENT COMPONENT =====
// We create an inner component so we can use useLocation and useNavigate inside BrowserRouter
function AppContent() {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Profile Setup State
  const [setupName, setSetupName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSetupError, setProfileSetupError] = useState('');

  // ===== LIFECYCLE & AUTHENTICATION =====
  useEffect(() => {
    if (!supabase) return;
    
    // Get initial session when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    
    // Listen for login/logout changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      
      // SECURITY FIX: If user logs out while on the moderation page, kick them back to home
      if (!session?.user && window.location.pathname === '/moderate') {
        navigate('/');
      }
    });
    
    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, [navigate]); // ✅ FIXED: Only runs once on mount (navigate is stable)

  // ===== PROFILE SETUP HANDLER =====
  const handleProfileSetup = async (e) => {
    e.preventDefault();
    setProfileSetupError('');
    setIsUpdatingProfile(true);
    const normalizedName = normalizeFarsi(setupName);
    
    if (normalizedName.length < 3) {
      setProfileSetupError('لطفاً نام و نام خانوادگی خود را به صورت کامل وارد کنید.');
      setIsUpdatingProfile(false);
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: normalizedName }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileSetupError('خطا در ثبت نام. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const needsProfileSetup = user && !user.user_metadata?.display_name;

  // Helper function to highlight the active tab based on the URL
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      
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
                برای ادامه فعالیت در سامانه، لطفاً نام و نام خانوادگی خود را وارد کنید. این نام در سوابق ثبت آثار شما نمایش داده خواهد شد.
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

      <div className="max-w-4xl mx-auto">
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
              <button 
                onClick={() => supabase.auth.signOut()}
                className="px-6 py-2.5 rounded-lg font-medium text-sm bg-red-50 text-red-700 hover:bg-red-100 transition-all shadow-sm flex items-center gap-2"
              >
                <span>خروج</span>
                <span className="font-bold border-r border-red-200 pr-2">
                  {user.user_metadata?.display_name || user.email.split('@')[0]}
                </span>
              </button>
            )}
          </div>
        </header>

        {initializationError && (
          <div className="p-4 mb-6 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
            {initializationError}
          </div>
        )}

        {/* ROUTING LOGIC */}
        <Routes>
          <Route path="/" element={<SearchView />} />
          <Route path="/submit" element={<SubmitView user={user} />} />
          <Route path="/moderate" element={user ? <ModerationView /> : <Navigate to="/" replace />} />
          <Route path="/login" element={<LoginForm />} />
        </Routes>
        
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