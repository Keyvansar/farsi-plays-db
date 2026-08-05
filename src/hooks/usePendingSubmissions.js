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
      const exactErrorMessage = err.message || err.details || err.hint;
      setError(`خطای سرور: ${exactErrorMessage || 'عدم دسترسی به جدول (بررسی قوانین RLS)'}`);
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
      alert('خطا در تأیید اثر: ' + (err.message || 'مشکل در سمت پایگاه داده رخ داده است.'));
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
      alert('خطا در حذف اثر: ' + (err.message || 'دسترسی شما برای حذف مجاز نیست.'));
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