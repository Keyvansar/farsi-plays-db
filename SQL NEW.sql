-- ============================================================
-- FARSI PLAYS DATABASE - COMPLETE SCHEMA v2.0
-- ============================================================
-- Self-contained: Run this in SQL Editor to initialize a fresh DB
-- Covers: works, editions, taxonomy, tags, references, moderation,
--         user roles, edit history, flags, contributor stats
-- ============================================================


-- ============================================================
-- SECTION 1: ENUMS
-- ============================================================

DROP TYPE IF EXISTS action_type_enum CASCADE;
CREATE TYPE action_type_enum AS ENUM (
  'new_submission',
  'direct_edit',
  'edit_suggestion',
  'flag'
);

DROP TYPE IF EXISTS user_role_enum CASCADE;
CREATE TYPE user_role_enum AS ENUM (
  'guest',
  'contributor',
  'moderator',
  'admin'
);

DROP TYPE IF EXISTS flag_type_enum CASCADE;
CREATE TYPE flag_type_enum AS ENUM (
  'wrong_title',
  'wrong_author',
  'wrong_translator',
  'wrong_year',
  'duplicate',
  'inappropriate_content',
  'other'
);

DROP TYPE IF EXISTS submission_status_enum CASCADE;
CREATE TYPE submission_status_enum AS ENUM (
  'pending',
  'approved',
  'rejected'
);

DROP TYPE IF EXISTS flag_status_enum CASCADE;
CREATE TYPE flag_status_enum AS ENUM (
  'open',
  'resolved',
  'dismissed'
);


-- ============================================================
-- SECTION 2: TABLES
-- ============================================================

-- Drop in reverse dependency order
DROP TABLE IF EXISTS flags CASCADE;
DROP TABLE IF EXISTS edit_history CASCADE;
DROP TABLE IF EXISTS pending_submissions CASCADE;
DROP TABLE IF EXISTS contributor_stats CASCADE;
DROP TABLE IF EXISTS edition_tags CASCADE;
DROP TABLE IF EXISTS external_references CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS farsi_editions CASCADE;
DROP TABLE IF EXISTS taxonomy CASCADE;
DROP TABLE IF EXISTS works CASCADE;


-- ----- WORKS -----
CREATE TABLE works (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_title  TEXT,
  source_language TEXT DEFAULT 'fa',
  playwright_fa   TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);


-- ----- TAXONOMY (Categories, Genres, Themes) -----
CREATE TABLE taxonomy (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES taxonomy(id) ON DELETE SET NULL,
  label_fa    TEXT NOT NULL,
  label_en    TEXT,
  definition  TEXT,
  category    TEXT NOT NULL,  -- e.g., 'genre', 'theme', 'era', 'form'
  is_approved BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ----- FARSI EDITIONS -----
CREATE TABLE farsi_editions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id                     UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  
  title_fa                    TEXT NOT NULL,
  translator_fa               TEXT[] DEFAULT '{}',
  publication_status          TEXT DEFAULT 'published',
  publisher                   TEXT,
  
  is_in_collection            BOOLEAN DEFAULT false,
  collection_title            TEXT,
  
  publication_year_solar      INTEGER,
  publication_year_gregorian  INTEGER,
  original_year               INTEGER,
  isbn                        TEXT,
  page_count                  INTEGER,
  
  cast_men                    INTEGER,
  cast_women                  INTEGER,
  cast_nonspecific            INTEGER,
  cast_total                  INTEGER,
  
  synopsis                    TEXT,
  
  is_verified                 BOOLEAN DEFAULT false,
  flag_count                  INTEGER DEFAULT 0,
  submitter_name              TEXT,
  submitter_email             TEXT,
  
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);


-- ----- EDITION TAGS (Junction: editions ↔ taxonomy) -----
CREATE TABLE edition_tags (
  farsi_edition_id UUID NOT NULL REFERENCES farsi_editions(id) ON DELETE CASCADE,
  taxonomy_id      UUID NOT NULL REFERENCES taxonomy(id) ON DELETE CASCADE,
  PRIMARY KEY (farsi_edition_id, taxonomy_id)
);


-- ----- EXTERNAL REFERENCES -----
CREATE TABLE external_references (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farsi_edition_id UUID NOT NULL REFERENCES farsi_editions(id) ON DELETE CASCADE,
  url              TEXT NOT NULL,
  ref_type         TEXT NOT NULL,  -- 'ebook', 'article', 'review', 'video', 'other'
  last_checked_at  TIMESTAMPTZ,
  http_status      SMALLINT,
  is_stale         BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now()
);


-- ----- USER ROLES -----
CREATE TABLE user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE,
  role       user_role_enum NOT NULL DEFAULT 'contributor',
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT now()
);


-- ----- PENDING SUBMISSIONS -----
CREATE TABLE pending_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type  action_type_enum NOT NULL DEFAULT 'new_submission',
  payload      JSONB NOT NULL,
  edition_id   UUID REFERENCES farsi_editions(id) ON DELETE CASCADE,
  field_name   TEXT,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  status       submission_status_enum DEFAULT 'pending',
  reviewed_by  UUID,
  reviewed_at  TIMESTAMPTZ,
  review_notes TEXT
);


-- ----- EDIT HISTORY -----
CREATE TABLE edit_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id    UUID NOT NULL REFERENCES farsi_editions(id) ON DELETE CASCADE,
  field_name    TEXT NOT NULL,
  old_value     JSONB,
  new_value     JSONB,
  changed_by    UUID,
  submission_id UUID REFERENCES pending_submissions(id),
  changed_at    TIMESTAMPTZ DEFAULT now()
);


-- ----- FLAGS -----
CREATE TABLE flags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id    UUID NOT NULL REFERENCES farsi_editions(id) ON DELETE CASCADE,
  user_id       UUID,
  flag_type     flag_type_enum NOT NULL,
  description   TEXT,
  field_name    TEXT,
  current_value JSONB,
  status        flag_status_enum DEFAULT 'open',
  resolved_by   UUID,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);


-- ----- CONTRIBUTOR STATS -----
CREATE TABLE contributor_stats (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID,
  display_name           TEXT,
  total_contributions    BIGINT DEFAULT 0,
  verified_contributions BIGINT DEFAULT 0
);


-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

-- Search performance
CREATE INDEX idx_editions_title ON farsi_editions (title_fa text_pattern_ops);
CREATE INDEX idx_editions_publisher ON farsi_editions (publisher);
CREATE INDEX idx_editions_year_solar ON farsi_editions (publication_year_solar);
CREATE INDEX idx_editions_verified ON farsi_editions (is_verified);
CREATE INDEX idx_editions_created ON farsi_editions (created_at DESC);
CREATE INDEX idx_works_playwright ON works USING gin(playwright_fa);
CREATE INDEX idx_editions_translator ON farsi_editions USING gin(translator_fa);

-- Taxonomy
CREATE INDEX idx_taxonomy_category ON taxonomy (category);
CREATE INDEX idx_taxonomy_parent ON taxonomy (parent_id);
CREATE INDEX idx_taxonomy_approved ON taxonomy (is_approved);

-- Junction tables
CREATE INDEX idx_edition_tags_edition ON edition_tags (farsi_edition_id);
CREATE INDEX idx_edition_tags_taxonomy ON edition_tags (taxonomy_id);
CREATE INDEX idx_extref_edition ON external_references (farsi_edition_id);

-- Moderation
CREATE INDEX idx_pending_status ON pending_submissions (status);
CREATE INDEX idx_pending_action ON pending_submissions (action_type);
CREATE INDEX idx_flags_edition ON flags (edition_id);
CREATE INDEX idx_flags_status ON flags (status);
CREATE INDEX idx_history_edition ON edit_history (edition_id);

-- Roles
CREATE INDEX idx_roles_user ON user_roles (user_id);


-- ============================================================
-- SECTION 4: FUNCTIONS
-- ============================================================

-- ----- Helper: Get current user's role -----
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role_enum
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM user_roles WHERE user_id = auth.uid()),
    'guest'
  );
$$;


-- ----- Helper: Immutable array_to_string (for search indexes) -----
CREATE OR REPLACE FUNCTION public.immutable_array_to_string(arr text[], sep text)
RETURNS text
LANGUAGE sql
IMMUTABLE STRICT
AS $function$
    SELECT array_to_string(arr, sep);
$function$;


-- ----- Helper: Normalize Farsi text -----
CREATE OR REPLACE FUNCTION normalize_farsi_text(input_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 
    translate(
      translate(
        translate(
          COALESCE(input_text, ''),
          'يئ',
          'ی'
        ),
        'ك',
        'ک'
      ),
      'ة',
      'ه'
    );
$$;


-- ----- Helper: Auto-update timestamps -----
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ----- Trigger: Normalize works -----
CREATE OR REPLACE FUNCTION trg_normalize_works()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.original_title := normalize_farsi_text(NEW.original_title);
  IF NEW.playwright_fa IS NOT NULL THEN
    NEW.playwright_fa := ARRAY(
      SELECT normalize_farsi_text(unnest(NEW.playwright_fa))
    );
  END IF;
  RETURN NEW;
END;
$$;


-- ----- Trigger: Normalize editions -----
CREATE OR REPLACE FUNCTION trg_normalize_farsi_editions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.title_fa := normalize_farsi_text(NEW.title_fa);
  NEW.publisher := normalize_farsi_text(NEW.publisher);
  NEW.collection_title := normalize_farsi_text(NEW.collection_title);
  IF NEW.translator_fa IS NOT NULL THEN
    NEW.translator_fa := ARRAY(
      SELECT normalize_farsi_text(unnest(NEW.translator_fa))
    );
  END IF;
  RETURN NEW;
END;
$$;


-- ----- Trigger: Normalize taxonomy -----
CREATE OR REPLACE FUNCTION trg_normalize_taxonomy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.label_fa   := normalize_farsi_text(NEW.label_fa);
  NEW.definition := normalize_farsi_text(NEW.definition);
  RETURN NEW;
END;
$$;


-- ----- Trigger: Validate translator requirement -----
CREATE OR REPLACE FUNCTION validate_translator_requirement()
RETURNS TRIGGER
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

    RETURN NEW;
END;
$$;


-- ----- Search Archive Function -----
CREATE OR REPLACE FUNCTION public.search_archive(search_query text)
RETURNS TABLE(
  id uuid, work_id uuid, title_fa text, translator_fa text[],
  publisher text, publication_year_solar integer,
  publication_year_gregorian integer, isbn text, page_count integer,
  cast_men integer, cast_women integer, cast_nonspecific integer,
  cast_total integer, synopsis text, is_verified boolean,
  created_at timestamp with time zone, updated_at timestamp with time zone,
  is_in_collection boolean, collection_title text, works jsonb
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        fe.id, fe.work_id, fe.title_fa, fe.translator_fa,
        fe.publisher,
        (fe.publication_year_solar)::int,
        (fe.publication_year_gregorian)::int,
        fe.isbn,
        (fe.page_count)::int,
        (fe.cast_men)::int,
        (fe.cast_women)::int,
        (fe.cast_nonspecific)::int,
        (fe.cast_total)::int,
        fe.synopsis, fe.is_verified, fe.created_at, fe.updated_at,
        fe.is_in_collection, fe.collection_title,
        jsonb_build_object(
            'original_title', w.original_title,
            'playwright_fa', w.playwright_fa,
            'source_language', w.source_language
        ) AS works
    FROM public.farsi_editions fe
    JOIN public.works w ON fe.work_id = w.id
    WHERE 
        search_query IS NULL OR search_query = '' OR
        fe.title_fa ILIKE '%' || search_query || '%' OR
        public.immutable_array_to_string(fe.translator_fa, ' '::text) ILIKE '%' || search_query || '%' OR
        public.immutable_array_to_string(w.playwright_fa, ' '::text) ILIKE '%' || search_query || '%'
    ORDER BY fe.created_at DESC
    LIMIT 30;
END;
$function$;


-- ----- Main: Approve Pending Submission -----
CREATE OR REPLACE FUNCTION approve_pending_submission(submission_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission  RECORD;
  v_payload     JSONB;
  v_action_type TEXT;
  v_edition_id  UUID;
  v_work_id     UUID;
  v_field_name  TEXT;
  v_new_value   JSONB;
  v_old_value   JSONB;
  v_user_id     UUID;
  v_sql         TEXT;
  v_tag_record  RECORD;
  v_ref_record  RECORD;
  v_taxonomy_id UUID;
BEGIN
  SELECT * INTO v_submission 
  FROM pending_submissions 
  WHERE id = submission_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Submission not found or already processed');
  END IF;
  
  v_payload     := v_submission.payload;
  v_action_type := v_submission.action_type::TEXT;
  v_edition_id  := v_submission.edition_id;
  v_field_name  := v_submission.field_name;
  v_user_id     := auth.uid();
  
  -- ============================================================
  -- NEW SUBMISSION
  -- ============================================================
  IF v_action_type = 'new_submission' THEN
    
    INSERT INTO works (original_title, source_language, playwright_fa)
    VALUES (
      v_payload->>'original_title',
      COALESCE(v_payload->>'source_language', 'fa'),
      COALESCE(
        (SELECT array_agg(x) FROM jsonb_array_elements_text(v_payload->'playwright_fa') AS x),
        '{}'
      )
    )
    RETURNING id INTO v_work_id;
    
    INSERT INTO farsi_editions (
      work_id, title_fa, translator_fa, publication_status, publisher,
      is_in_collection, collection_title,
      publication_year_solar, publication_year_gregorian, original_year,
      isbn, page_count,
      cast_men, cast_women, cast_nonspecific, cast_total,
      synopsis, is_verified, submitter_name, submitter_email
    ) VALUES (
      v_work_id,
      v_payload->>'title_fa',
      COALESCE(
        (SELECT array_agg(x) FROM jsonb_array_elements_text(v_payload->'translator_fa') AS x),
        '{}'
      ),
      COALESCE(v_payload->>'publication_status', 'published'),
      v_payload->>'publisher',
      COALESCE((v_payload->>'is_in_collection')::BOOLEAN, false),
      v_payload->>'collection_title',
      NULLIF(v_payload->>'publication_year_solar', '')::INTEGER,
      NULLIF(v_payload->>'publication_year_gregorian', '')::INTEGER,
      NULLIF(v_payload->>'original_year', '')::INTEGER,
      v_payload->>'isbn',
      NULLIF(v_payload->>'page_count', '')::INTEGER,
      NULLIF(v_payload->>'cast_men', '')::INTEGER,
      NULLIF(v_payload->>'cast_women', '')::INTEGER,
      NULLIF(v_payload->>'cast_nonspecific', '')::INTEGER,
      NULLIF(v_payload->>'cast_total', '')::INTEGER,
      v_payload->>'synopsis',
      true,
      v_payload->>'submitter_name',
      v_payload->>'submitter_email'
    )
    RETURNING id INTO v_edition_id;
    
    -- Insert external references into separate table
    IF v_payload ? 'external_references' AND jsonb_typeof(v_payload->'external_references') = 'array' THEN
      FOR v_ref_record IN 
        SELECT * FROM jsonb_to_recordset(v_payload->'external_references') AS x(url text, ref_type text)
      LOOP
        IF v_ref_record.url IS NOT NULL AND v_ref_record.url != '' THEN
          INSERT INTO external_references (farsi_edition_id, url, ref_type)
          VALUES (v_edition_id, v_ref_record.url, COALESCE(v_ref_record.ref_type, 'other'));
        END IF;
      END LOOP;
    END IF;
    
    -- Insert tags into taxonomy + edition_tags
    IF v_payload ? 'tags' AND jsonb_typeof(v_payload->'tags') = 'array' THEN
      FOR v_tag_record IN 
        SELECT * FROM jsonb_array_elements_text(v_payload->'tags') AS x(tag text)
      LOOP
        IF v_tag_record.tag IS NOT NULL AND v_tag_record.tag != '' THEN
          -- Find or create the taxonomy entry
          SELECT id INTO v_taxonomy_id FROM taxonomy WHERE label_fa = v_tag_record.tag LIMIT 1;
          
          IF v_taxonomy_id IS NULL THEN
            INSERT INTO taxonomy (label_fa, category, is_approved)
            VALUES (v_tag_record.tag, 'user_tag', false)
            RETURNING id INTO v_taxonomy_id;
          END IF;
          
          -- Link to edition
          INSERT INTO edition_tags (farsi_edition_id, taxonomy_id)
          VALUES (v_edition_id, v_taxonomy_id)
          ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;
    
  -- ============================================================
  -- DIRECT EDIT / EDIT SUGGESTION
  -- ============================================================
  ELSIF v_action_type IN ('direct_edit', 'edit_suggestion') THEN
    
    IF v_edition_id IS NULL OR v_field_name IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Missing edition_id or field_name');
    END IF;
    
    v_new_value := v_payload->'new_value';
    
    -- Get old value
    v_sql := format('SELECT %I::TEXT FROM farsi_editions WHERE id = $1', v_field_name);
    EXECUTE v_sql INTO v_old_value USING v_edition_id;
    
    -- Apply update with type casting
    CASE v_field_name
      WHEN 'page_count', 'cast_men', 'cast_women', 'cast_nonspecific', 
           'cast_total', 'publication_year_solar', 'publication_year_gregorian', 
           'original_year' THEN
        v_sql := format('UPDATE farsi_editions SET %I = $1::INTEGER WHERE id = $2', v_field_name);
        EXECUTE v_sql USING NULLIF(v_new_value::TEXT, '')::INTEGER, v_edition_id;
        
      WHEN 'is_in_collection', 'is_verified' THEN
        v_sql := format('UPDATE farsi_editions SET %I = $1::BOOLEAN WHERE id = $2', v_field_name);
        EXECUTE v_sql USING (v_new_value::TEXT)::BOOLEAN, v_edition_id;
        
      WHEN 'translator_fa', 'tags' THEN
        v_sql := format(
          'UPDATE farsi_editions SET %I = (SELECT array_agg(x) FROM jsonb_array_elements_text($1) AS x) WHERE id = $2',
          v_field_name
        );
        EXECUTE v_sql USING v_new_value, v_edition_id;
        
      ELSE
        v_sql := format('UPDATE farsi_editions SET %I = $1::TEXT WHERE id = $2', v_field_name);
        EXECUTE v_sql USING v_new_value::TEXT, v_edition_id;
    END CASE;
    
    -- Log to edit history
    INSERT INTO edit_history (edition_id, field_name, old_value, new_value, changed_by, submission_id)
    VALUES (v_edition_id, v_field_name, to_jsonb(v_old_value), v_new_value, v_user_id, submission_id);
    
  -- ============================================================
  -- FLAG
  -- ============================================================
  ELSIF v_action_type = 'flag' THEN
    
    IF v_edition_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Missing edition_id for flag');
    END IF;
    
    INSERT INTO flags (edition_id, user_id, flag_type, description, field_name, current_value)
    VALUES (
      v_edition_id,
      v_submission.submitted_by,
      COALESCE((v_payload->>'flag_type')::flag_type_enum, 'other'),
      v_payload->>'description',
      v_payload->>'field_name',
      v_payload->'current_value'
    );
    
    UPDATE farsi_editions SET flag_count = flag_count + 1 WHERE id = v_edition_id;
    
  END IF;
  
  -- Mark as approved
  UPDATE pending_submissions 
  SET status = 'approved', reviewed_by = v_user_id, reviewed_at = now() 
  WHERE id = submission_id;
  
  RETURN json_build_object('success', true, 'action_type', v_action_type);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ----- Main: Reject Pending Submission -----
CREATE OR REPLACE FUNCTION reject_pending_submission(submission_id UUID, reason TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE pending_submissions 
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_notes = reason
  WHERE id = submission_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Submission not found or already processed');
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$;


-- ----- Main: Resolve a Flag -----
CREATE OR REPLACE FUNCTION resolve_flag(flag_id UUID, resolution TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flag RECORD;
BEGIN
  SELECT * INTO v_flag FROM flags WHERE id = flag_id AND status = 'open';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Flag not found or already resolved');
  END IF;
  
  UPDATE flags 
  SET status = resolution::flag_status_enum, resolved_by = auth.uid(), resolved_at = now()
  WHERE id = flag_id;
  
  UPDATE farsi_editions SET flag_count = GREATEST(flag_count - 1, 0) WHERE id = v_flag.edition_id;
  
  RETURN json_build_object('success', true);
END;
$$;


-- ============================================================
-- SECTION 5: TRIGGERS
-- ============================================================

CREATE TRIGGER trg_works_updated_at
  BEFORE UPDATE ON works
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_editions_updated_at
  BEFORE UPDATE ON farsi_editions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_works_normalize
  BEFORE INSERT OR UPDATE ON works
  FOR EACH ROW EXECUTE FUNCTION trg_normalize_works();

CREATE TRIGGER trg_editions_normalize
  BEFORE INSERT OR UPDATE ON farsi_editions
  FOR EACH ROW EXECUTE FUNCTION trg_normalize_farsi_editions();

CREATE TRIGGER trg_taxonomy_normalize
  BEFORE INSERT OR UPDATE ON taxonomy
  FOR EACH ROW EXECUTE FUNCTION trg_normalize_taxonomy();

CREATE TRIGGER trg_validate_translator
  BEFORE INSERT OR UPDATE ON farsi_editions
  FOR EACH ROW EXECUTE FUNCTION validate_translator_requirement();


-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE farsi_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE edition_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_stats ENABLE ROW LEVEL SECURITY;

-- Works: Public read
CREATE POLICY "Public read works" ON works FOR SELECT USING (true);
CREATE POLICY "Moderator write works" ON works FOR ALL USING (get_user_role() IN ('moderator', 'admin'));

-- Editions: Public read verified, moderator write
CREATE POLICY "Public read editions" ON farsi_editions FOR SELECT USING (is_verified = true OR get_user_role() IN ('moderator', 'admin'));
CREATE POLICY "Moderator write editions" ON farsi_editions FOR ALL USING (get_user_role() IN ('moderator', 'admin'));

-- Taxonomy: Public read approved, moderator write
CREATE POLICY "Public read taxonomy" ON taxonomy FOR SELECT USING (is_approved = true OR get_user_role() IN ('moderator', 'admin'));
CREATE POLICY "Moderator write taxonomy" ON taxonomy FOR ALL USING (get_user_role() IN ('moderator', 'admin'));

-- Edition tags: Public read, moderator write
CREATE POLICY "Public read edition_tags" ON edition_tags FOR SELECT USING (true);
CREATE POLICY "Moderator write edition_tags" ON edition_tags FOR ALL USING (get_user_role() IN ('moderator', 'admin'));

-- External references: Public read, moderator write
CREATE POLICY "Public read extref" ON external_references FOR SELECT USING (true);
CREATE POLICY "Moderator write extref" ON external_references FOR ALL USING (get_user_role() IN ('moderator', 'admin'));

-- User roles: Admin only
CREATE POLICY "Admin manage roles" ON user_roles FOR ALL USING (get_user_role() IN ('admin'));

-- Pending submissions: Anyone submit, moderator review
CREATE POLICY "Anyone submit" ON pending_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Submitter read own" ON pending_submissions FOR SELECT USING (submitted_by = auth.uid());
CREATE POLICY "Moderator read all" ON pending_submissions FOR SELECT USING (get_user_role() IN ('moderator', 'admin'));
CREATE POLICY "Moderator update" ON pending_submissions FOR UPDATE USING (get_user_role() IN ('moderator', 'admin'));

-- Edit history: Public read
CREATE POLICY "Public read history" ON edit_history FOR SELECT USING (true);
CREATE POLICY "System write history" ON edit_history FOR INSERT WITH CHECK (true);

-- Flags: Anyone flag, moderator manage
CREATE POLICY "Anyone flag" ON flags FOR INSERT WITH CHECK (true);
CREATE POLICY "Submitter read own flags" ON flags FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Moderator manage flags" ON flags FOR ALL USING (get_user_role() IN ('moderator', 'admin'));

-- Contributor stats: Public read
CREATE POLICY "Public read stats" ON contributor_stats FOR SELECT USING (true);
CREATE POLICY "Moderator write stats" ON contributor_stats FOR ALL USING (get_user_role() IN ('moderator', 'admin'));


-- ============================================================
-- SECTION 7: SEED DATA (Taxonomy Categories)
-- ============================================================

-- Pre-populate common taxonomy categories
INSERT INTO taxonomy (label_fa, label_en, category, is_approved) VALUES
  ('کمدی', 'Comedy', 'genre', true),
  ('تراژدی', 'Tragedy', 'genre', true),
  ('درام', 'Drama', 'genre', true),
  ('تاریخی', 'Historical', 'genre', true),
  ('موزیکال', 'Musical', 'genre', true),
  ('تک‌گویی', 'Monologue', 'form', true),
  ('چند شخصیتی', 'Multi-character', 'form', true),
  ('کودک و نوجوان', 'Children & Youth', 'genre', true),
  ('آیینی', 'Ritual', 'genre', true),
  ('پوچی', 'Absurd', 'genre', true);


-- ============================================================
-- DONE! 🎉
-- ============================================================
-- Next step: Insert your admin user role
-- Replace 'YOUR-USER-UUID' with your Supabase Auth user ID:
--
-- INSERT INTO user_roles (user_id, role) VALUES ('YOUR-USER-UUID', 'admin');
-- ============================================================