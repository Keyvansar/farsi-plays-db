// ===== IMPORTS & DEPENDENCIES =====
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

// ===== COMPONENT =====
export default function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError(loginError.message === 'Invalid login credentials'
        ? 'ایمیل یا رمز عبور اشتباه است.'
        : loginError.message);
    } else {
      onLoginSuccess();
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">ورود همکاران</h2>
      <p className="text-sm text-gray-500 mb-6 text-center">
        برای ثبت مستقیم آثار وارد شوید.<br />
        بدون حساب کاربری نیز می‌توانید اثر پیشنهاد دهید.
      </p>
      {error && (
        <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm text-center">{error}</div>
      )}
      <form onSubmit={handleLogin} className="space-y-4">
        <input type="email" dir="ltr" required placeholder="ایمیل"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors text-left"
        />
        <input type="password" dir="ltr" required placeholder="رمز عبور"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors text-left"
        />
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
        >{loading ? 'در حال ورود...' : 'ورود'}</button>
      </form>
    </div>
  );
}