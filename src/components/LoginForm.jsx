import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message === 'Invalid login credentials') {
        toast.error('ایمیل یا رمز عبور اشتباه است.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('ورود موفقیت‌آمیز بود!');
      navigate('/submit');
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">ورود همکاران</h2>
      <p className="text-sm text-gray-500 mb-6 text-center">
        برای ثبت مستقیم آثار وارد شوید.
        <br />
        بدون حساب کاربری نیز می‌توانید اثر پیشنهاد دهید.
      </p>

      {/* The inline error block has been removed since we now use Sonner toasts */}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="sr-only">
            ایمیل
          </label>
          <input
            id="login-email"
            type="email"
            placeholder="ایمیل"
            dir="ltr"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors text-left"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="sr-only">
            رمز عبور
          </label>
          <input
            id="login-password"
            type="password"
            placeholder="رمز عبور"
            dir="ltr"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-colors text-left"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? 'در حال ورود...' : 'ورود'}
        </button>
      </form>
    </div>
  );
}

export default LoginForm;