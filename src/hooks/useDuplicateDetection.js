import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeFarsi } from '../utils/textUtils';

/**
 * Custom hook for detecting duplicate editions by title
 * and managing the merge/complete/new-edition mode selection.
 */
export function useDuplicateDetection(watchedTitle) {
    const [duplicateMatches, setDuplicateMatches] = useState([]);
    const [selectedMergeTarget, setSelectedMergeTarget] = useState(null);
    const [isCompletingDuplicate, setIsCompletingDuplicate] = useState(false);
    const [isNewEdition, setIsNewEdition] = useState(false); // 🆕
    const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
    const [lockedFields, setLockedFields] = useState({});

    // ===== DUPLICATE DETECTION =====
    useEffect(() => {
        // 🛛 FIX: Only check length, no more normalizeFarsi here (done in RPC)
        if (!watchedTitle || watchedTitle.length < 3) {
            setDuplicateMatches([]);
            setSelectedMergeTarget(null);
            setIsCompletingDuplicate(false);
            setIsNewEdition(false);
            setLockedFields({});
            return;
        }

        const checkDuplicate = async () => {
            setIsCheckingDuplicate(true);
            try {
                // 🆕 Use RPC that searches title_fa + original_title + alternative_titles
                const { data, error } = await supabase.rpc('search_duplicates', {
                    title_query: watchedTitle || '',
                });

                if (error) throw error;

                // Map RPC result to the format expected by DuplicateWarning
                const matches = (data || []).map(row => ({
                    id: row.id,
                    title_fa: row.title_fa,
                    publisher: row.publisher,
                    publication_status: row.publication_status,
                    publication_year_solar: row.publication_year_solar,
                    publication_year_gregorian: row.publication_year_gregorian,
                    original_year: row.original_year,
                    page_count: row.page_count,
                    isbn: row.isbn,
                    synopsis: row.synopsis,
                    cast_men: row.cast_men,
                    cast_women: row.cast_women,
                    cast_nonspecific: row.cast_nonspecific,
                    cast_total: row.cast_total,
                    is_in_collection: row.is_in_collection,
                    collection_title: row.collection_title,
                    translator_fa: row.translator_fa,
                    works: {
                        id: row.work_id,
                        playwright_fa: row.work_playwright_fa,
                        original_title: row.work_original_title,
                        source_language: row.work_source_language,
                        alternative_titles: row.work_alternative_titles,
                    },
                    edition_tags: row.edition_tags || [],
                    external_references: row.external_references || [],
                }));

                setDuplicateMatches(matches);
                setSelectedMergeTarget(prev =>
                    prev && matches.find(d => d.id === prev.id) ? prev : null
                );
            } catch (err) {
                console.error('Error checking for duplicates:', err);
            } finally {
                setIsCheckingDuplicate(false);
            }

        };

        const delayDebounceFn = setTimeout(checkDuplicate, 800);
        return () => clearTimeout(delayDebounceFn);
    }, [watchedTitle]);

    // ===== MODE CHANGE HANDLER (called from DuplicateWarning) =====
    const handleModeChange = (mode) => {
        if (mode === 'complete') {
            setIsCompletingDuplicate(true);
            setIsNewEdition(false);
        } else if (mode === 'new_edition') {
            setIsCompletingDuplicate(false);
            setIsNewEdition(true);
        } else {
            setIsCompletingDuplicate(false);
            setIsNewEdition(false);
            setLockedFields({});
        }
    };

    // ===== SELECT/DSELECT A MATCH =====
    const handleSelectMatch = (match) => {
        setSelectedMergeTarget(match);
        if (!match) {
            setIsCompletingDuplicate(false);
            setIsNewEdition(false);
            setLockedFields({});
        }
    };

    // ===== RESET ALL STATE =====
    const resetDuplicateState = () => {
        setDuplicateMatches([]);
        setSelectedMergeTarget(null);
        setIsCompletingDuplicate(false);
        setIsNewEdition(false);
        setLockedFields({});
    };

    return {
        duplicateMatches,
        selectedMergeTarget,
        isCompletingDuplicate,
        isNewEdition,
        isCheckingDuplicate,
        lockedFields,
        setLockedFields,
        handleSelectMatch,
        handleModeChange,
        resetDuplicateState,
    };
}