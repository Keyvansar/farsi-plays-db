import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const DRAFT_KEY = 'submission_draft';

/**
 * Custom hook for managing form draft persistence via localStorage.
 * Handles: load on mount, debounced save, clear with race-condition protection.
 */
export function useSubmitDraft(watch, reset, emptyFormValues) {
    const draftTimer = useRef(null);
    const skipDraftSave = useRef(false);
    const isClearing = useRef(false);
    const draftRestored = useRef(false);

    // ===== LOAD DRAFT ON MOUNT (Strict Mode safe) =====
    useEffect(() => {
        if (draftRestored.current) return;
        draftRestored.current = true;

        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                reset({ ...emptyFormValues, ...parsed });
                toast.info('📄 پیش‌نویس قبلی بازیابی شد.');
            } catch (e) {
                localStorage.removeItem(DRAFT_KEY);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ===== DEBOUNCED SAVE =====
    useEffect(() => {
        const subscription = watch((value, { name }) => {
            if (!name) return;
            if (isClearing.current) return;

            if (draftTimer.current) clearTimeout(draftTimer.current);
            draftTimer.current = setTimeout(() => {
                if (!skipDraftSave.current && !isClearing.current) {
                    localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
                }
            }, 800);
        });
        return () => {
            subscription.unsubscribe();
            if (draftTimer.current) clearTimeout(draftTimer.current);
        };
    }, [watch]);

    // ===== CLEAR DRAFT =====
    const clearDraft = () => {
        isClearing.current = true;
        skipDraftSave.current = true;

        if (draftTimer.current) {
            clearTimeout(draftTimer.current);
            draftTimer.current = null;
        }

        reset(emptyFormValues);
        localStorage.removeItem(DRAFT_KEY);

        setTimeout(() => {
            isClearing.current = false;
            skipDraftSave.current = false;
        }, 1200);
    };

    // ===== DELETE DRAFT (after successful submission) =====
    const deleteDraft = () => {
        if (draftTimer.current) clearTimeout(draftTimer.current);
        skipDraftSave.current = true;
        localStorage.removeItem(DRAFT_KEY);
    };

    // ===== RE-ENABLE SAVE (called after reset in submission) =====
    const reEnableSave = () => {
        isClearing.current = false;
        skipDraftSave.current = false;
    };

    // ===== BLOCK SAVE TEMPORARILY (used during programmatic reset) =====
    const blockSave = () => {
        skipDraftSave.current = true;
    };

    // ===== UNBLOCK SAVE =====
    const unblockSave = () => {
        skipDraftSave.current = false;
    };

    return {
        clearDraft,
        deleteDraft,
        reEnableSave,
        blockSave,
        unblockSave,
        isClearing,
    };
}