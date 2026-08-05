// ===== IMPORTS & DEPENDENCIES =====
import { createClient } from '@supabase/supabase-js';

// ===== CONFIGURATION & CONSTANTS =====
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ===== CORE BUSINESS LOGIC =====
export let initializationError = null;
export let supabase = null;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  initializationError = 'کلیدهای اتصال به پایگاه داده یافت نشدند.';
} else {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    initializationError = 'خطا در مقداردهی اولیه سوپابیس: ' + err.message;
  }
}