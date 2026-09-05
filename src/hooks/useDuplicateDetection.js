import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { normalizeFarsi } from '../utils/textUtils';

// 🆕 Extracted fetch function (pure, takes input, returns data)
async function fetchDuplicateMatches(titleQuery) {
    const normalizedTitle = normalizeFarsi(titleQuery);

    const { data, error } = await supabase
        .from('farsi_editions')
        .select(`
      id,
      title_fa,
      publisher,
      publication_status,
      publication_year_solar,
      publication_year_gregorian,
      original_year,
      page_count,
      isbn,
      synopsis,
      cast_men,
      cast_women,
      cast_nonspecific,
      cast_total,
      is_in_collection,
      collection_title,
      translator_fa,
      works!inner(id, playwright_fa, original_title, source_language, alternative_titles),
      edition_tags(taxonomy_id, taxonomy(id, label_fa)),
      external_references(id, url, ref_type)
    `)
        .ilike('title_fa', `%${normalizedTitle}%`)
        .limit(3);

    if (error) throw error;
    return data || [];
}

export function useDuplicateDetection(watchedTitle) {
    // 🆕 Compute whether the query should run (replaces the length < 3 check)
    const normalizedTitle = useMemo(
        () => normalizeFarsi(watchedTitle || ''),
        [watchedTitle]
    );
    const shouldSearch = normalizedTitle.length >= 3;

    // 🆕 React Query handles:
    //   - automatic cancellation when watchedTitle changes (replaces manual debounce clearTimeout)
    //   - caching results per title (typing "مکبث" twice is instant the second time)
    //   - `isFetching` flag for the spinner
    const {
        data: duplicateMatches = [],
        isFetching: isCheckingDuplicate,
    } = useQuery({
        queryKey: ['duplicate_detection', normalizedTitle],
        queryFn: () => fetchDuplicateMatches(watchedTitle),
        enabled: shouldSearch,
        staleTime: 5 * 60 * 1000,   // 5 min — duplicates rarely change
        placeholderData: [],         // keep previous results visible while refetching
    });

    // ===== UI STATE (kept local — user interaction, not server data) =====
    const [selectedMergeTarget, setSelectedMergeTarget] = useState(null);
    const [isCompletingDuplicate, setIsCompletingDuplicate] = useState(false);
    const [isNewEdition, setIsNewEdition] = useState(false);
    const [lockedFields, setLockedFields] = useState({});

    // ===== Re-validate selection when matches change =====
    // Preserves the original behavior: if the previously selected match is no
    // longer in the results, drop it. This also clears everything when the
    // query is disabled (title too short) and returns empty.
    useEffect(() => {
        if (!shouldSearch) {
            // Title too short — wipe everything
            setSelectedMergeTarget(null);
            setIsCompletingDuplicate(false);
            setIsNewEdition(false);
            setLockedFields({});
            return;
        }

        // If the current selection is gone from results, deselect
        if (selectedMergeTarget) {
            const stillPresent = duplicateMatches.some(m => m.id === selectedMergeTarget.id);
            if (!stillPresent) {
                setSelectedMergeTarget(null);
                setIsCompletingDuplicate(false);
                setIsNewEdition(false);
                setLockedFields({});
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duplicateMatches, shouldSearch]);

    // ===== MODE CHANGE HANDLER =====
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

    // ===== SELECT / DESELECT A MATCH =====
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