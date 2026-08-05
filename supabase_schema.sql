-- ==========================================
-- FARSI PLAYS DATABASE: FINAL SCHEMA CONFIG
-- ==========================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 0. TABLE DEFINITIONS: Core Schema
CREATE TABLE IF NOT EXISTS public.works (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    original_title text,
    playwright_fa text[],
    source_language text DEFAULT 'fa',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.farsi_editions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id uuid REFERENCES public.works(id) ON DELETE CASCADE,
    title_fa text,
    translator_fa text[],
    publisher text,
    publication_year_solar int,
    publication_year_gregorian int,
    isbn text,
    page_count int,
    cast_men int,
    cast_women int,
    cast_nonspecific int,
    cast_total int,
    synopsis text,
    is_verified boolean DEFAULT false,
    is_in_collection boolean DEFAULT false,
    collection_title text,
    publication_status text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pending_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payload jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 0b. UTILITY FUNCTION: Farsi Text Normalization
CREATE OR REPLACE FUNCTION public.normalize_farsi_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE 
        WHEN input IS NULL THEN NULL
        ELSE regexp_replace(
            regexp_replace(
                regexp_replace(input, N'[يٴى]+', 'ی', 'g'),
                N'[كٯک]+', 'ک', 'g'
            ),
            N'[ةهٕٖٔ]+', 'ه', 'g'
        )
    END;
$$;

-- 1. UTILITY: Immutable Array-to-String for Indexing
CREATE OR REPLACE FUNCTION public.immutable_array_to_string(arr text[], sep text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
    SELECT array_to_string(arr, sep);
$$;

-- 2. INDEXES: Fast Fuzzy Array Searching
CREATE INDEX IF NOT EXISTS idx_works_playwright_fa_trgm 
ON public.works USING gin ((public.immutable_array_to_string(playwright_fa, ' '::text)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_farsi_editions_translator_fa_trgm 
ON public.farsi_editions USING gin ((public.immutable_array_to_string(translator_fa, ' '::text)) gin_trgm_ops);

-- 3. TRIGGERS: Normalization & Array Unnesting
CREATE OR REPLACE FUNCTION public.trg_normalize_works()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.original_title := public.normalize_farsi_text(NEW.original_title);
    IF NEW.playwright_fa IS NOT NULL THEN
        NEW.playwright_fa := (
            SELECT array_agg(public.normalize_farsi_text(x)) FROM unnest(NEW.playwright_fa) AS x
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_normalize_farsi_editions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.title_fa := public.normalize_farsi_text(NEW.title_fa);
    NEW.synopsis := public.normalize_farsi_text(NEW.synopsis);
    IF NEW.translator_fa IS NOT NULL THEN
        NEW.translator_fa := (
            SELECT array_agg(public.normalize_farsi_text(x)) FROM unnest(NEW.translator_fa) AS x
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_translator_requirement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    lang text;
    translator_count int;
BEGIN
    SELECT source_language INTO lang FROM public.works WHERE id = NEW.work_id;
    translator_count := array_length(NEW.translator_fa, 1);

    IF lang IS DISTINCT FROM 'fa' AND (NEW.translator_fa IS NULL OR translator_count IS NULL OR translator_count = 0) THEN
        RAISE EXCEPTION 'Translator name is required when original language is not Farsi (source_language=%)', lang;
    END IF;

    IF lang = 'fa' AND NEW.translator_fa IS NOT NULL AND translator_count > 0 THEN
        NULL; 
    END IF;

    RETURN NEW;
END;
$$;

-- 3b. TRIGGER ATTACHMENT: Attach triggers to tables
CREATE TRIGGER trg_normalize_works_before_insert
    BEFORE INSERT OR UPDATE ON public.works
    FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_works();

CREATE TRIGGER trg_normalize_farsi_editions_before_insert
    BEFORE INSERT OR UPDATE ON public.farsi_editions
    FOR EACH ROW EXECUTE FUNCTION public.trg_normalize_farsi_editions();

CREATE TRIGGER trg_validate_translator_requirement
    BEFORE INSERT OR UPDATE ON public.farsi_editions
    FOR EACH ROW EXECUTE FUNCTION public.validate_translator_requirement();

-- 4. RLS POLICIES: Security Architecture
ALTER TABLE public.pending_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public inserts" ON public.pending_submissions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow staff to select" ON public.pending_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff to delete" ON public.pending_submissions FOR DELETE TO authenticated USING (true);

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.works FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.works FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.works FOR UPDATE TO authenticated USING (true);

ALTER TABLE public.farsi_editions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.farsi_editions FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.farsi_editions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.farsi_editions FOR UPDATE TO authenticated USING (true);

-- 5. RPCS: Core Business Logic (Search & Approve)
CREATE OR REPLACE FUNCTION public.search_archive(search_query text)
RETURNS TABLE (
    id uuid, work_id uuid, title_fa text, translator_fa text[], publisher text,
    publication_year_solar int, publication_year_gregorian int, isbn text, page_count int,
    cast_men int, cast_women int, cast_nonspecific int, cast_total int, synopsis text,
    is_verified boolean, created_at timestamptz, updated_at timestamptz, is_in_collection boolean,
    collection_title text, works jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fe.id, fe.work_id, fe.title_fa, fe.translator_fa, fe.publisher, 
        (fe.publication_year_solar)::int, (fe.publication_year_gregorian)::int, fe.isbn, 
        (fe.page_count)::int, (fe.cast_men)::int, (fe.cast_women)::int, 
        (fe.cast_nonspecific)::int, (fe.cast_total)::int, fe.synopsis, fe.is_verified, 
        fe.created_at, fe.updated_at, fe.is_in_collection, fe.collection_title,
        jsonb_build_object(
            'original_title', w.original_title, 'playwright_fa', w.playwright_fa, 'source_language', w.source_language
        ) AS works
    FROM public.farsi_editions fe
    JOIN public.works w ON fe.work_id = w.id
    WHERE 
        search_query IS NULL OR search_query = '' OR
        fe.title_fa ILIKE '%' || search_query || '%' OR
        public.immutable_array_to_string(fe.translator_fa, ' '::text) ILIKE '%' || search_query || '%' OR
        public.immutable_array_to_string(w.playwright_fa, ' '::text) ILIKE '%' || search_query || '%'
    ORDER BY fe.created_at DESC LIMIT 30;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_pending_submission(submission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p jsonb; v_work_id uuid; v_is_in_collection boolean; v_collection_title text;
    v_action_type text; v_target_edition_id uuid; v_target_work_id uuid;
    v_playwright_fa text[]; v_translator_fa text[];
BEGIN
    SELECT payload INTO p FROM public.pending_submissions WHERE id = submission_id;
    IF p IS NULL THEN RAISE EXCEPTION 'Submission % not found', submission_id; END IF;

    v_action_type := p->>'action_type';
    v_target_edition_id := (p->>'edition_id')::uuid;
    v_is_in_collection := coalesce((p->>'is_in_collection')::boolean, false);
    v_collection_title := p->>'collection_title';

    -- Safely parse arrays
    IF jsonb_typeof(p->'playwright_fa') = 'array' THEN
        v_playwright_fa := ARRAY(SELECT jsonb_array_elements_text(p->'playwright_fa'));
    ELSIF p->>'playwright_fa' IS NOT NULL THEN
        v_playwright_fa := string_to_array(p->>'playwright_fa', '،');
    ELSE
        v_playwright_fa := ARRAY[]::text[];
    END IF;

    IF jsonb_typeof(p->'translator_fa') = 'array' THEN
        v_translator_fa := ARRAY(SELECT jsonb_array_elements_text(p->'translator_fa'));
    ELSIF p->>'translator_fa' IS NOT NULL THEN
        v_translator_fa := string_to_array(p->>'translator_fa', '،');
    ELSE
        v_translator_fa := ARRAY[]::text[];
    END IF;

    -- Handle flag action type - just delete the submission as flags are for review only
    IF v_action_type = 'flag' THEN
        -- For flag submissions, we just acknowledge and delete them
        -- The moderator should manually review the flagged issues
        DELETE FROM public.pending_submissions WHERE id = submission_id;
        RETURN;
    END IF;

    -- Handle direct edits and edit suggestions for existing editions
    IF v_action_type IN ('direct_edit', 'edit_suggestion') AND v_target_edition_id IS NOT NULL THEN
        -- Get the work_id from the edition
        SELECT work_id INTO v_target_work_id FROM public.farsi_editions WHERE id = v_target_edition_id;
        
        IF v_target_work_id IS NULL THEN
            RAISE EXCEPTION 'Edition % not found', v_target_edition_id;
        END IF;

        -- Update works table if playwright or source_language changed
        UPDATE public.works
        SET 
            original_title = COALESCE(p->>'original_title', original_title),
            playwright_fa = COALESCE(v_playwright_fa, playwright_fa),
            source_language = COALESCE(p->>'source_language', source_language)
        WHERE id = v_target_work_id;

        -- Update farsi_editions table with all fields
        UPDATE public.farsi_editions
        SET
            title_fa = COALESCE(p->>'title_fa', title_fa),
            translator_fa = COALESCE(v_translator_fa, translator_fa),
            publisher = COALESCE(p->>'publisher', publisher),
            publication_year_solar = COALESCE((p->>'publication_year_solar')::int, publication_year_solar),
            publication_year_gregorian = COALESCE((p->>'publication_year_gregorian')::int, publication_year_gregorian),
            isbn = COALESCE(p->>'isbn', isbn),
            page_count = COALESCE((p->>'page_count')::int, page_count),
            cast_men = COALESCE((p->>'cast_men')::int, cast_men),
            cast_women = COALESCE((p->>'cast_women')::int, cast_women),
            cast_nonspecific = COALESCE((p->>'cast_nonspecific')::int, cast_nonspecific),
            cast_total = COALESCE((p->>'cast_total')::int, cast_total),
            synopsis = COALESCE(p->>'synopsis', synopsis),
            is_in_collection = COALESCE((p->>'is_in_collection')::boolean, is_in_collection),
            collection_title = COALESCE(p->>'collection_title', collection_title),
            publication_status = COALESCE(p->>'publication_status', publication_status)
        WHERE id = v_target_edition_id;

    ELSIF v_action_type = 'merge' AND v_target_edition_id IS NOT NULL THEN
        SELECT work_id INTO v_target_work_id FROM public.farsi_editions WHERE id = v_target_edition_id;

        UPDATE public.works
        SET original_title = COALESCE(original_title, p->>'original_title'), source_language = COALESCE(source_language, p->>'source_language')
        WHERE id = v_target_work_id;

        UPDATE public.farsi_editions
        SET
            publication_status = COALESCE(publication_status, p->>'publication_status'),
            publisher = COALESCE(publisher, p->>'publisher'),
            publication_year_solar = COALESCE(publication_year_solar, (p->>'publication_year_solar')::int),
            publication_year_gregorian = COALESCE(publication_year_gregorian, (p->>'publication_year_gregorian')::int),
            isbn = COALESCE(isbn, p->>'isbn'),
            page_count = COALESCE(page_count, (p->>'page_count')::int),
            cast_men = COALESCE(cast_men, (p->>'cast_men')::int),
            cast_women = COALESCE(cast_women, (p->>'cast_women')::int),
            cast_nonspecific = COALESCE(cast_nonspecific, (p->>'cast_nonspecific')::int),
            cast_total = COALESCE(cast_total, (p->>'cast_total')::int),
            synopsis = COALESCE(synopsis, p->>'synopsis'),
            is_in_collection = COALESCE(NULLIF(is_in_collection, false), v_is_in_collection),
            collection_title = COALESCE(collection_title, v_collection_title)
        WHERE id = v_target_edition_id;

    ELSE
        -- Original behavior: insert new edition
        INSERT INTO public.works (original_title, playwright_fa, source_language)
        VALUES (p->>'original_title', v_playwright_fa, coalesce(p->>'source_language', 'fa')) RETURNING id INTO v_work_id;

        INSERT INTO public.farsi_editions (
            work_id, title_fa, translator_fa, publisher, publication_year_solar, publication_year_gregorian, 
            page_count, cast_men, cast_women, cast_nonspecific, cast_total, synopsis, is_verified, is_in_collection, collection_title, isbn
        ) VALUES (
            v_work_id, p->>'title_fa', v_translator_fa, p->>'publisher', (p->>'publication_year_solar')::int, (p->>'publication_year_gregorian')::int, 
            (p->>'page_count')::int, (p->>'cast_men')::int, (p->>'cast_women')::int, (p->>'cast_nonspecific')::int, (p->>'cast_total')::int, 
            p->>'synopsis', true, v_is_in_collection, v_collection_title, p->>'isbn'
        );
    END IF;

    DELETE FROM public.pending_submissions WHERE id = submission_id;
END;
$$;