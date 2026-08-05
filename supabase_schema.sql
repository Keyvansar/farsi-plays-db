-- ==========================================
-- FARSI PLAYS DATABASE: FINAL SCHEMA CONFIG
-- ==========================================

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
    v_target_edition_id := (p->>'target_edition_id')::uuid;
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

    IF v_action_type = 'merge' AND v_target_edition_id IS NOT NULL THEN
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