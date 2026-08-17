import { supabase } from '../../lib/supabase';

// Fields that can be suggested for edit when completing a duplicate (non-moderators)
const SUGGESTABLE_FIELDS = [
    'title_fa', 'translator_fa', 'publication_status', 'publisher', 'collection_title',
    'publication_year_solar', 'publication_year_gregorian', 'original_year', 'isbn',
    'page_count', 'cast_men', 'cast_women', 'cast_nonspecific', 'cast_total', 'synopsis',
    'alternative_titles',
];

/**
 * Get the current user's role from the database.
 */
export const getUserRole = async (user) => {
    if (!user) return null;
    const { data } = await supabase.rpc('get_user_role');
    return data;
};

/**
 * Convert form data to database payload format.
 */
export const buildPayload = (formData) => ({
    title_fa: (formData.title_fa || '').trim(),
    playwright_fa: (formData.playwright_fa || '').split(/[,،]/).map(s => s.trim()).filter(Boolean),
    source_language: formData.source_language || 'fa',
    translator_fa: formData.source_language !== 'fa'
        ? (formData.translator_fa || '').split(/[,،]/).map(s => s.trim()).filter(Boolean)
        : [],
    publication_status: formData.publication_status || 'published',
    publisher: formData.publisher || null,
    is_in_collection: !!formData.is_in_collection,
    collection_title: formData.is_in_collection ? (formData.collection_title || null) : null,
    original_title: formData.original_title || null,
    alternative_titles: (formData.alternative_titles || '').split(/[,،]/).map(s => s.trim()).filter(Boolean),
    publication_year_solar: formData.publication_year_solar ? parseInt(formData.publication_year_solar) : null,
    publication_year_gregorian: formData.publication_year_gregorian ? parseInt(formData.publication_year_gregorian) : null,
    original_year: formData.original_year ? parseInt(formData.original_year) : null,
    isbn: formData.isbn || null,
    page_count: formData.page_count ? parseInt(formData.page_count) : null,
    cast_men: formData.cast_men ? parseInt(formData.cast_men) : null,
    cast_women: formData.cast_women ? parseInt(formData.cast_women) : null,
    cast_nonspecific: formData.cast_nonspecific ? parseInt(formData.cast_nonspecific) : null,
    cast_total: formData.cast_unknown ? null : (formData.cast_total ? parseInt(formData.cast_total) : null),
    synopsis: formData.synopsis || null,
    tags: (formData.tags || []).filter(Boolean),
    external_references: (formData.external_references || []).filter(r => r && r.url),
    submitter_name: formData.submitter_name || null,
    submitter_email: formData.submitter_email || null,
});

/**
 * Attach tags and external links to an edition.
 */
export const attachTagsAndLinks = async (editionId, p) => {
    for (const label of p.tags) {
        let { data: tax } = await supabase.from('taxonomy').select('id').eq('label_fa', label).maybeSingle();
        if (!tax) {
            const { data: newTax } = await supabase
                .from('taxonomy')
                .insert({ label_fa: label, category: 'user_tag', is_approved: false })
                .select('id')
                .single();
            tax = newTax;
        }
        if (tax) {
            await supabase.from('edition_tags').upsert({
                farsi_edition_id: editionId,
                taxonomy_id: tax.id,
            });
        }
    }

    if (p.external_references.length > 0) {
        await supabase.from('external_references').insert(
            p.external_references.map(r => ({
                farsi_edition_id: editionId,
                url: r.url,
                ref_type: r.ref_type || 'other',
            }))
        );
    }
};

/**
 * Direct insert: create new work + new edition (moderators/admins).
 */
export const insertDirectly = async (p) => {
    const { data: work, error: workErr } = await supabase
        .from('works')
        .insert({
            original_title: p.original_title,
            source_language: p.source_language,
            playwright_fa: p.playwright_fa,
            alternative_titles: p.alternative_titles,
        })
        .select('id')
        .single();
    if (workErr) throw workErr;

    const { data: edition, error: edErr } = await supabase
        .from('farsi_editions')
        .insert({
            work_id: work.id,
            title_fa: p.title_fa,
            translator_fa: p.translator_fa,
            publication_status: p.publication_status,
            publisher: p.publisher,
            is_in_collection: p.is_in_collection,
            collection_title: p.collection_title,
            publication_year_solar: p.publication_year_solar,
            publication_year_gregorian: p.publication_year_gregorian,
            original_year: p.original_year,
            isbn: p.isbn,
            page_count: p.page_count,
            cast_men: p.cast_men,
            cast_women: p.cast_women,
            cast_nonspecific: p.cast_nonspecific,
            cast_total: p.cast_total,
            synopsis: p.synopsis,
            is_verified: true,
        })
        .select('id')
        .single();
    if (edErr) throw edErr;

    await attachTagsAndLinks(edition.id, p);
    return edition.id;
};

/**
 * Insert a new edition under an existing work (new edition mode).
 */
export const insertNewEdition = async (p, existingWorkId) => {
    const { data: edition, error: edErr } = await supabase
        .from('farsi_editions')
        .insert({
            work_id: existingWorkId,
            title_fa: p.title_fa,
            translator_fa: p.translator_fa,
            publication_status: p.publication_status,
            publisher: p.publisher,
            is_in_collection: p.is_in_collection,
            collection_title: p.collection_title,
            publication_year_solar: p.publication_year_solar,
            publication_year_gregorian: p.publication_year_gregorian,
            original_year: p.original_year,
            isbn: p.isbn,
            page_count: p.page_count,
            cast_men: p.cast_men,
            cast_women: p.cast_women,
            cast_nonspecific: p.cast_nonspecific,
            cast_total: p.cast_total,
            synopsis: p.synopsis,
            is_verified: true,
        })
        .select('id')
        .single();
    if (edErr) throw edErr;

    await attachTagsAndLinks(edition.id, p);
    return edition.id;
};

/**
 * Queue a new edition as pending submission (non-moderators).
 */
export const queueNewEdition = async (p, existingWorkId, user) => {
    const { error } = await supabase.from('pending_submissions').insert({
        action_type: 'new_submission',
        submitted_by: user?.id || null,
        payload: {
            ...p,
            existing_work_id: existingWorkId,
        },
    });
    if (error) throw error;
};

/**
 * Direct update of existing edition (moderators completing a duplicate).
 */
export const updateExisting = async (p, selectedMergeTarget) => {
    const ed = selectedMergeTarget;
    const workId = ed.works?.id;

    if (workId) {
        const { error: workErr } = await supabase
            .from('works')
            .update({
                playwright_fa: p.playwright_fa,
                original_title: p.original_title,
                source_language: p.source_language,
                alternative_titles: p.alternative_titles,
            })
            .eq('id', workId);
        if (workErr) throw workErr;
    }

    const { error: edErr } = await supabase
        .from('farsi_editions')
        .update({
            title_fa: p.title_fa,
            translator_fa: p.translator_fa,
            publication_status: p.publication_status,
            publisher: p.publisher,
            is_in_collection: p.is_in_collection,
            collection_title: p.collection_title,
            publication_year_solar: p.publication_year_solar,
            publication_year_gregorian: p.publication_year_gregorian,
            original_year: p.original_year,
            isbn: p.isbn,
            page_count: p.page_count,
            cast_men: p.cast_men,
            cast_women: p.cast_women,
            cast_nonspecific: p.cast_nonspecific,
            cast_total: p.cast_total,
            synopsis: p.synopsis,
        })
        .eq('id', ed.id);
    if (edErr) throw edErr;

    const existingUrls = (ed.external_references || []).map(r => r.url);
    const newRefs = p.external_references.filter(r => !existingUrls.includes(r.url));
    if (newRefs.length > 0) {
        await supabase.from('external_references').insert(
            newRefs.map(r => ({ farsi_edition_id: ed.id, url: r.url, ref_type: r.ref_type || 'other' }))
        );
    }

    for (const label of p.tags) {
        let { data: tax } = await supabase.from('taxonomy').select('id').eq('label_fa', label).maybeSingle();
        if (!tax) {
            const { data: newTax } = await supabase
                .from('taxonomy')
                .insert({ label_fa: label, category: 'user_tag', is_approved: false })
                .select('id')
                .single();
            tax = newTax;
        }
        if (tax) {
            await supabase.from('edition_tags').upsert({
                farsi_edition_id: ed.id,
                taxonomy_id: tax.id,
            });
        }
    }

    return ed.id;
};

/**
 * Queue edit suggestions for unlocked fields (non-moderators completing a duplicate).
 */
export const queueCompletionSuggestions = async (p, selectedMergeTarget, lockedFields, user) => {
    const ed = selectedMergeTarget;

    const getCurrentValue = (field) => {
        const work = ed.works || {};
        switch (field) {
            case 'title_fa': return ed.title_fa || '';
            case 'translator_fa': return Array.isArray(ed.translator_fa) ? ed.translator_fa.join('، ') : (ed.translator_fa || '');
            case 'publication_status': return ed.publication_status || '';
            case 'publisher': return ed.publisher || '';
            case 'collection_title': return ed.collection_title || '';
            case 'publication_year_solar': return ed.publication_year_solar?.toString() || '';
            case 'publication_year_gregorian': return ed.publication_year_gregorian?.toString() || '';
            case 'original_year': return ed.original_year?.toString() || '';
            case 'isbn': return ed.isbn || '';
            case 'page_count': return ed.page_count?.toString() || '';
            case 'cast_men': return ed.cast_men?.toString() || '';
            case 'cast_women': return ed.cast_women?.toString() || '';
            case 'cast_nonspecific': return ed.cast_nonspecific?.toString() || '';
            case 'cast_total': return ed.cast_total?.toString() || '';
            case 'synopsis': return ed.synopsis || '';
            case 'alternative_titles': return Array.isArray(work.alternative_titles) ? work.alternative_titles.join('، ') : (work.alternative_titles || '');
            default: return '';
        }
    };

    const getNewValue = (field) => {
        switch (field) {
            case 'title_fa': return p.title_fa;
            case 'translator_fa': return p.translator_fa.join('، ');
            case 'publication_status': return p.publication_status;
            case 'publisher': return p.publisher || '';
            case 'collection_title': return p.collection_title || '';
            case 'publication_year_solar': return p.publication_year_solar?.toString() || '';
            case 'publication_year_gregorian': return p.publication_year_gregorian?.toString() || '';
            case 'original_year': return p.original_year?.toString() || '';
            case 'isbn': return p.isbn || '';
            case 'page_count': return p.page_count?.toString() || '';
            case 'cast_men': return p.cast_men?.toString() || '';
            case 'cast_women': return p.cast_women?.toString() || '';
            case 'cast_nonspecific': return p.cast_nonspecific?.toString() || '';
            case 'cast_total': return p.cast_total?.toString() || '';
            case 'synopsis': return p.synopsis || '';
            case 'alternative_titles': return p.alternative_titles.join('، ');
            default: return '';
        }
    };

    for (const field of SUGGESTABLE_FIELDS) {
        if (lockedFields[field]) continue;
        const newValue = getNewValue(field);
        if (!newValue) continue;

        await supabase.from('pending_submissions').insert({
            action_type: 'edit_suggestion',
            edition_id: ed.id,
            field_name: field,
            submitted_by: user?.id || null,
            payload: {
                title_fa: ed.title_fa,
                field_label: field,
                current_value: String(getCurrentValue(field)),
                new_value: String(newValue),
                note: 'تکمیل اثر از فرم ثبت',
            },
        });
    }
};

/**
 * Link an edition to a different work.
 */
export const linkEditionToWork = async (editionId, newWorkId) => {
    const { error } = await supabase
        .from('farsi_editions')
        .update({ work_id: newWorkId })
        .eq('id', editionId);
    if (error) throw error;
};

/**
 * Search works by title, original title, alternative titles, or playwright
 * for linking purposes.
 */
export const searchWorksForLinking = async (searchTerm) => {
    const { data, error } = await supabase.rpc('search_editions_for_linking', {
        search_term: searchTerm,
    });

    if (error) throw error;

    // Map RPC results to the format expected by EditModal
    return (data || []).map(row => ({
        id: row.edition_id,
        title_fa: row.title_fa,
        translator_fa: row.translator_fa,
        publisher: row.publisher,
        publication_year_solar: row.publication_year_solar,
        works: {
            id: row.work_id,
            original_title: row.work_original_title,
            playwright_fa: row.work_playwright_fa,
            source_language: row.work_source_language,
            alternative_titles: row.work_alternative_titles,
        },

    }));

};
/**
 * 🆕 Fetch full edition data (with works, tags, references) by id.
 * Used when switching between editions in PlayDetailModal.
 */
export const getEditionFull = async (editionId) => {
    const { data, error } = await supabase.rpc('get_edition_full', {
        p_edition_id: editionId,
    });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const row = data[0];
    return {
        id: row.edition_id,
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
        is_verified: row.is_verified,
        flag_count: row.flag_count,
        work_edition_count: row.work_edition_count,
        works: {
            id: row.work_id,
            playwright_fa: row.work_playwright_fa,
            original_title: row.work_original_title,
            source_language: row.work_source_language,
            alternative_titles: row.work_alternative_titles,
        },
        edition_tags: row.edition_tags || [],
        external_references: row.external_references || [],
    };
};