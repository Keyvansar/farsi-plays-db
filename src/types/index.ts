// ===== Core domain types for the plays database =====

export interface Work {
    id: string;
    original_title: string | null;
    playwright_fa: string[];
    source_language: string;
    alternative_titles: string[];
}

export interface Taxonomy {
    id: string;
    label_fa: string;
}

export interface EditionTag {
    taxonomy_id: string;
    taxonomy: Taxonomy;
}

export interface ExternalReference {
    id: string;
    url: string;
    ref_type: string;
}

export interface Edition {
    id: string;
    work_id: string;
    title_fa: string;
    publisher: string | null;
    publication_status: string;
    publication_year_solar: number | null;
    publication_year_gregorian: number | null;
    original_year: number | null;
    page_count: number | null;
    isbn: string | null;
    synopsis: string | null;
    cast_men: number | null;
    cast_women: number | null;
    cast_nonspecific: number | null;
    cast_total: number | null;
    is_in_collection: boolean;
    collection_title: string | null;
    translator_fa: string[];
    is_verified: boolean;
    flag_count: number;
    work_edition_count?: number;
    works?: Work;
    edition_tags?: EditionTag[];
    external_references?: ExternalReference[];
}

export type UserRole = 'guest' | 'contributor' | 'moderator' | 'admin';

export interface PendingSubmission {
    id: string;
    action_type: string;
    edition_id: string | null;
    field_name: string | null;
    submitted_by: string | null;
    payload: Record<string, unknown>;
    status: string;
    submitted_at: string;
}