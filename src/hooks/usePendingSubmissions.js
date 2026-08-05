// ===== IMPORTS & DEPENDENCIES =====
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ===== CORE BUSINESS LOGIC =====
export function usePendingSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  // Fetch all pending submissions
  const fetchSubmissions = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    try {
      // Removing .order() from the DB call to prevent strict schema crashing.
      // We will handle the sorting securely on the client side.
      const { data, error: fetchError } = await supabase
        .from('pending_submissions')
        .select('*');

      if (fetchError) {
        throw fetchError; 
      }
      
      // Resilient Client-Side Sorting (Fallback mechanism)
      const sortedData = (data || []).sort((a, b) => {
        if (a.created_at && b.created_at) {
          return new Date(a.created_at) - new Date(b.created_at);
        }
        return 0;
      });

      setSubmissions(sortedData);
    } catch (err) {
      console.error('Supabase API Error:', err);
      // User-friendly error messages for fetch failures
      let errorMsg = 'خطایی در دریافت اطلاعات رخ داد.';
      
      if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMsg = 'ارتباط با سرور قطع شد. لطفاً اتصال اینترنت خود را بررسی کنید.';
      } else if (err.code === 'PGRST301' || err.message?.includes('JWT')) {
        errorMsg = 'لطفاً ابتدا وارد حساب کاربری خود شوید.';
      } else if (err.message?.includes('permission') || err.message?.includes('RLS')) {
        errorMsg = 'دسترسی شما برای مشاهده این اطلاعات کافی نیست.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Approve a submission using the PostgreSQL RPC
  const approveSubmission = async (id) => {
    if (!supabase) return false;
    setActionLoading(id);
    try {
      const { error: rpcError } = await supabase.rpc('approve_pending_submission', {
        submission_id: id
      });

      if (rpcError) throw rpcError;
      
      // Remove from local state on success (Optimistic UI Update)
      setSubmissions(prev => prev.filter(sub => sub.id !== id));
      return true;
    } catch (err) {
      console.error('Error approving submission:', err);
      // User-friendly error messages for approve failures
      let errorMsg = 'خطایی در تأیید اثر رخ داد.';
      
      if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMsg = 'ارتباط با سرور قطع شد. لطفاً اتصال اینترنت خود را بررسی کنید.';
      } else if (err.code === 'PGRST301' || err.message?.includes('JWT')) {
        errorMsg = 'لطفاً ابتدا وارد حساب کاربری خود شوید.';
      } else if (err.message?.includes('permission') || err.message?.includes('RLS')) {
        errorMsg = 'دسترسی شما برای تأیید آثار کافی نیست.';
      } else if (err.message?.includes('duplicate')) {
        errorMsg = 'این اثر قبلاً تأیید شده است.';
      }
      
      alert(errorMsg);
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  // Reject (delete) a submission
  const rejectSubmission = async (id) => {
    if (!supabase) return false;
    
    if (!window.confirm('آیا از حذف این پیشنهاد اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
      return false;
    }

    setActionLoading(id);
    try {
      const { error: deleteError } = await supabase
        .from('pending_submissions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      // Remove from local state on success (Optimistic UI Update)
      setSubmissions(prev => prev.filter(sub => sub.id !== id));
      return true;
    } catch (err) {
      console.error('Error rejecting submission:', err);
      // User-friendly error messages for reject failures
      let errorMsg = 'خطایی در حذف اثر رخ داد.';
      
      if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMsg = 'ارتباط با سرور قطع شد. لطفاً اتصال اینترنت خود را بررسی کنید.';
      } else if (err.code === 'PGRST301' || err.message?.includes('JWT')) {
        errorMsg = 'لطفاً ابتدا وارد حساب کاربری خود شوید.';
      } else if (err.message?.includes('permission') || err.message?.includes('RLS')) {
        errorMsg = 'دسترسی شما برای حذف آثار کافی نیست.';
      }
      
      alert(errorMsg);
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  return { 
    submissions, 
    loading, 
    actionLoading, 
    error, 
    fetchSubmissions, 
    approveSubmission, 
    rejectSubmission 
  };
}