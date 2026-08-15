


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."action_type_enum" AS ENUM (
    'new_submission',
    'direct_edit',
    'edit_suggestion',
    'flag',
    'delete_suggestion'
);


ALTER TYPE "public"."action_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."flag_status_enum" AS ENUM (
    'open',
    'resolved',
    'dismissed'
);


ALTER TYPE "public"."flag_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."flag_type_enum" AS ENUM (
    'wrong_title',
    'wrong_author',
    'wrong_translator',
    'wrong_year',
    'duplicate',
    'inappropriate_content',
    'other'
);


ALTER TYPE "public"."flag_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."submission_status_enum" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."submission_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."user_role_enum" AS ENUM (
    'guest',
    'contributor',
    'moderator',
    'admin'
);


ALTER TYPE "public"."user_role_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_pending_submission"("submission_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_submission  RECORD;
  v_payload     JSONB;
  v_action_type TEXT;
  v_edition_id  UUID;
  v_work_id     UUID;
  v_field_name  TEXT;
  v_new_value_text TEXT;
  v_old_value   TEXT;
  v_user_id     UUID;
  v_sql         TEXT;
  v_ref_record  RECORD;
  v_tag_label   TEXT;
  v_taxonomy_id UUID;
  v_caller_role user_role_enum;
  v_allowed_fields TEXT[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  v_caller_role := get_user_role();
  IF v_caller_role NOT IN ('moderator', 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  SELECT * INTO v_submission FROM pending_submissions WHERE id = submission_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Submission not found or already processed');
  END IF;
  
  v_payload := v_submission.payload;
  v_action_type := v_submission.action_type::TEXT;
  v_edition_id := v_submission.edition_id;
  v_field_name := v_submission.field_name;
  v_new_value_text := v_payload->>'new_value';

  -- 🔒 SECURITY: Whitelist of allowed fields for edits
  v_allowed_fields := ARRAY[
    'title_fa', 'translator_fa', 'publication_status', 'publisher', 
    'is_in_collection', 'collection_title', 'publication_year_solar', 
    'publication_year_gregorian', 'original_year', 'isbn', 'page_count', 
    'cast_men', 'cast_women', 'cast_nonspecific', 'cast_total', 'synopsis'
  ];

  IF v_action_type = 'new_submission' THEN
    -- ... (Keep existing new_submission logic exactly as is) ...
    INSERT INTO works (original_title, source_language, playwright_fa)
    VALUES (v_payload->>'original_title', COALESCE(v_payload->>'source_language', 'fa'), COALESCE((SELECT array_agg(x) FROM jsonb_array_elements_text(v_payload->'playwright_fa') AS x), '{}'))
    RETURNING id INTO v_work_id;
    
    INSERT INTO farsi_editions (work_id, title_fa, translator_fa, publication_status, publisher, is_in_collection, collection_title, publication_year_solar, publication_year_gregorian, original_year, isbn, page_count, cast_men, cast_women, cast_nonspecific, cast_total, synopsis, is_verified, submitter_name, submitter_email)
    VALUES (v_work_id, v_payload->>'title_fa', COALESCE((SELECT array_agg(x) FROM jsonb_array_elements_text(v_payload->'translator_fa') AS x), '{}'), COALESCE(v_payload->>'publication_status', 'published'), v_payload->>'publisher', COALESCE((v_payload->>'is_in_collection')::BOOLEAN, false), v_payload->>'collection_title', NULLIF(v_payload->>'publication_year_solar', '')::INTEGER, NULLIF(v_payload->>'publication_year_gregorian', '')::INTEGER, NULLIF(v_payload->>'original_year', '')::INTEGER, v_payload->>'isbn', NULLIF(v_payload->>'page_count', '')::INTEGER, NULLIF(v_payload->>'cast_men', '')::INTEGER, NULLIF(v_payload->>'cast_women', '')::INTEGER, NULLIF(v_payload->>'cast_nonspecific', '')::INTEGER, NULLIF(v_payload->>'cast_total', '')::INTEGER, v_payload->>'synopsis', true, v_payload->>'submitter_name', v_payload->>'submitter_email')
    RETURNING id INTO v_edition_id;
    
    IF v_payload ? 'external_references' AND jsonb_typeof(v_payload->'external_references') = 'array' THEN
      FOR v_ref_record IN SELECT * FROM jsonb_to_recordset(v_payload->'external_references') AS x(url text, ref_type text) LOOP
        IF v_ref_record.url IS NOT NULL AND v_ref_record.url != '' AND v_ref_record.url ~ '^https?://' THEN
          INSERT INTO external_references (farsi_edition_id, url, ref_type) VALUES (v_edition_id, v_ref_record.url, COALESCE(v_ref_record.ref_type, 'other'));
        END IF;
      END LOOP;
    END IF;
    
    IF v_payload ? 'tags' AND jsonb_typeof(v_payload->'tags') = 'array' THEN
      FOR v_tag_label IN SELECT jsonb_array_elements_text(v_payload->'tags') LOOP
        IF v_tag_label IS NOT NULL AND v_tag_label != '' THEN
          SELECT id INTO v_taxonomy_id FROM taxonomy WHERE label_fa = v_tag_label LIMIT 1;
          IF v_taxonomy_id IS NULL THEN
            INSERT INTO taxonomy (label_fa, category, is_approved) VALUES (v_tag_label, 'user_tag', false) RETURNING id INTO v_taxonomy_id;
          END IF;
          INSERT INTO edition_tags (farsi_edition_id, taxonomy_id) VALUES (v_edition_id, v_taxonomy_id) ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;

  ELSIF v_action_type IN ('direct_edit', 'edit_suggestion') THEN
    
    -- 🔒 SECURITY CHECK: Reject unauthorized fields
    IF v_field_name IS NULL OR NOT (v_field_name = ANY(v_allowed_fields)) THEN
      RETURN json_build_object('success', false, 'error', 'Invalid or unauthorized field name');
    END IF;

    IF v_edition_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Missing edition_id');
    END IF;
    
    v_sql := format('SELECT %I::TEXT FROM farsi_editions WHERE id = $1', v_field_name);
    EXECUTE v_sql INTO v_old_value USING v_edition_id;
    
    CASE v_field_name
      WHEN 'page_count', 'cast_men', 'cast_women', 'cast_nonspecific', 'cast_total', 'publication_year_solar', 'publication_year_gregorian', 'original_year' THEN
        v_sql := format('UPDATE farsi_editions SET %I = $1::INTEGER WHERE id = $2', v_field_name);
        EXECUTE v_sql USING NULLIF(v_new_value_text, '')::INTEGER, v_edition_id;
      WHEN 'is_in_collection', 'is_verified' THEN
        v_sql := format('UPDATE farsi_editions SET %I = $1::BOOLEAN WHERE id = $2', v_field_name);
        EXECUTE v_sql USING (v_new_value_text)::BOOLEAN, v_edition_id;
      WHEN 'translator_fa' THEN
        v_sql := format('UPDATE farsi_editions SET %I = string_to_array($1, '','') WHERE id = $2', v_field_name);
        EXECUTE v_sql USING v_new_value_text, v_edition_id;
      ELSE
        v_sql := format('UPDATE farsi_editions SET %I = $1 WHERE id = $2', v_field_name);
        EXECUTE v_sql USING v_new_value_text, v_edition_id;
    END CASE;
    
    INSERT INTO edit_history (edition_id, field_name, old_value, new_value, changed_by, submission_id)
    VALUES (v_edition_id, v_field_name, to_jsonb(v_old_value), to_jsonb(v_new_value_text), v_user_id, submission_id);

  ELSIF v_action_type = 'delete_suggestion' THEN
    IF v_edition_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Missing edition_id'); END IF;
    IF v_caller_role = 'admin' THEN
      DELETE FROM farsi_editions WHERE id = v_edition_id;
      DELETE FROM works WHERE id NOT IN (SELECT DISTINCT work_id FROM farsi_editions);
    ELSE
      UPDATE farsi_editions SET is_verified = false WHERE id = v_edition_id;
    END IF;

  ELSIF v_action_type = 'flag' THEN
    IF v_edition_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Missing edition_id'); END IF;
    INSERT INTO flags (edition_id, user_id, flag_type, description, field_name, current_value)
    VALUES (v_edition_id, v_submission.submitted_by, COALESCE((v_payload->>'flag_type')::flag_type_enum, 'other'), v_payload->>'description', v_payload->>'field_name', v_payload->'current_value');
    UPDATE farsi_editions SET flag_count = flag_count + 1 WHERE id = v_edition_id;
  END IF;
  
  UPDATE pending_submissions SET status = 'approved', reviewed_by = v_user_id, reviewed_at = now() WHERE id = submission_id;
  RETURN json_build_object('success', true, 'action_type', v_action_type);
EXCEPTION
  WHEN OTHERS THEN RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$_$;


ALTER FUNCTION "public"."approve_pending_submission"("submission_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "public"."user_role_enum"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    (SELECT role FROM user_roles WHERE user_id = auth.uid()),
    'guest'
  );
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  BEGIN
    IF NEW.invited_at IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role, granted_by, granted_at)
      VALUES (NEW.id, 'moderator', NULL, now())
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Failed to assign role to new user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."immutable_array_to_string"("arr" "text"[], "sep" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
    SELECT array_to_string(arr, sep);
$$;


ALTER FUNCTION "public"."immutable_array_to_string"("arr" "text"[], "sep" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_farsi_text"("input_text" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
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


ALTER FUNCTION "public"."normalize_farsi_text"("input_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_pending_submission"("submission_id" "uuid", "reason" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_caller_role user_role_enum;
BEGIN
  -- 🔒 SECURITY CHECK: Reject unauthenticated callers
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- 🔒 SECURITY CHECK: Only moderators/admins can reject
  v_caller_role := get_user_role();
  IF v_caller_role NOT IN ('moderator', 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  UPDATE pending_submissions 
  SET status = 'rejected', reviewed_by = v_user_id, reviewed_at = now(), review_notes = reason
  WHERE id = submission_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Submission not found or already processed');
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."reject_pending_submission"("submission_id" "uuid", "reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_flag"("flag_id" "uuid", "resolution" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."resolve_flag"("flag_id" "uuid", "resolution" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_archive"("search_query" "text") RETURNS TABLE("id" "uuid", "work_id" "uuid", "title_fa" "text", "translator_fa" "text"[], "publisher" "text", "publication_year_solar" integer, "publication_year_gregorian" integer, "isbn" "text", "page_count" integer, "cast_men" integer, "cast_women" integer, "cast_nonspecific" integer, "cast_total" integer, "synopsis" "text", "is_verified" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "is_in_collection" boolean, "collection_title" "text", "works" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."search_archive"("search_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_editions"("search_term" "text" DEFAULT ''::"text", "search_scope" "text" DEFAULT 'all'::"text", "playwrights" "text"[] DEFAULT '{}'::"text"[], "translators" "text"[] DEFAULT '{}'::"text"[], "source_type" "text" DEFAULT 'all'::"text", "year_min" integer DEFAULT NULL::integer, "year_max" integer DEFAULT NULL::integer, "status" "text" DEFAULT 'all'::"text", "tags" "uuid"[] DEFAULT '{}'::"uuid"[], "cast_min" integer DEFAULT NULL::integer, "cast_max" integer DEFAULT NULL::integer, "verified_only" boolean DEFAULT false, "has_synopsis" boolean DEFAULT false, "in_collection" boolean DEFAULT false, "has_links" boolean DEFAULT false, "page_number" integer DEFAULT 1, "page_size" integer DEFAULT 20) RETURNS TABLE("edition_id" "uuid", "title_fa" "text", "publisher" "text", "publication_status" "text", "publication_year_solar" integer, "publication_year_gregorian" integer, "original_year" integer, "page_count" integer, "isbn" "text", "synopsis" "text", "cast_men" integer, "cast_women" integer, "cast_nonspecific" integer, "cast_total" integer, "is_in_collection" boolean, "collection_title" "text", "translator_fa" "text"[], "is_verified" boolean, "flag_count" integer, "work_id" "uuid", "work_playwright_fa" "text"[], "work_original_title" "text", "work_source_language" "text", "edition_tags" json, "external_references" json, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  offset_val INTEGER;
  total BIGINT;
  search_pattern TEXT;
BEGIN
  offset_val := (page_number - 1) * page_size;
  search_pattern := '%' || search_term || '%';

  RETURN QUERY
  WITH filtered_editions AS (
    SELECT DISTINCT e.*
    FROM farsi_editions e
    INNER JOIN works w ON w.id = e.work_id
    
    -- Filter: Verified only
    WHERE (NOT verified_only OR e.is_verified = true)
    
    -- Filter: Has synopsis
    AND (NOT has_synopsis OR (e.synopsis IS NOT NULL AND e.synopsis != ''))
    
    -- Filter: In collection
    AND (NOT in_collection OR e.is_in_collection = true)
    
    -- Filter: Publication status
    AND (status = 'all' OR e.publication_status = status)
    
    -- Filter: Year range
    AND (year_min IS NULL OR e.publication_year_solar >= year_min)
    AND (year_max IS NULL OR e.publication_year_solar <= year_max)
    
    -- Filter: Cast range
    AND (cast_min IS NULL OR e.cast_total >= cast_min)
    AND (cast_max IS NULL OR e.cast_total <= cast_max)
    
    -- Filter: Source type
    AND (source_type = 'all' OR 
         (source_type = 'fa' AND w.source_language = 'fa') OR
         (source_type = 'translated' AND w.source_language != 'fa'))
    
    -- Filter: Text search (scope-specific with proper array handling)
    AND (
      search_term = '' OR
      (search_scope = 'title' AND e.title_fa ILIKE search_pattern) OR
      (search_scope = 'publisher' AND e.publisher ILIKE search_pattern) OR
      (search_scope = 'synopsis' AND e.synopsis ILIKE search_pattern) OR
      (search_scope = 'author' AND EXISTS (
        SELECT 1 FROM unnest(w.playwright_fa) AS pw WHERE pw ILIKE search_pattern
      )) OR
      (search_scope = 'translator' AND EXISTS (
        SELECT 1 FROM unnest(e.translator_fa) AS tr WHERE tr ILIKE search_pattern
      )) OR
      (search_scope = 'all' AND (
        e.title_fa ILIKE search_pattern OR
        e.publisher ILIKE search_pattern OR
        e.synopsis ILIKE search_pattern OR
        e.collection_title ILIKE search_pattern OR
        EXISTS (SELECT 1 FROM unnest(w.playwright_fa) AS pw WHERE pw ILIKE search_pattern) OR
        EXISTS (SELECT 1 FROM unnest(e.translator_fa) AS tr WHERE tr ILIKE search_pattern)
      ))
    )
    
    -- Filter: Playwrights (array overlap for exact filter values)
    AND (array_length(playwrights, 1) IS NULL OR w.playwright_fa && playwrights)
    
    -- Filter: Translators (array overlap for exact filter values)
    AND (array_length(translators, 1) IS NULL OR e.translator_fa && translators)
    
    -- Filter: Tags (AND logic - edition must have ALL selected tags)
    AND (
      array_length(tags, 1) IS NULL OR
      (
        SELECT COUNT(DISTINCT et.taxonomy_id)
        FROM edition_tags et
        WHERE et.farsi_edition_id = e.id
        AND et.taxonomy_id = ANY(tags)
      ) = array_length(tags, 1)
    )
    
    -- Filter: Has links
    AND (NOT has_links OR EXISTS (
      SELECT 1 FROM external_references er 
      WHERE er.farsi_edition_id = e.id
    ))
  ),
  
  -- Get total count
  count_query AS (
    SELECT COUNT(*) as cnt FROM filtered_editions
  ),
  
  -- Paginate
  paginated AS (
    SELECT fe.*, w.id as w_id, w.playwright_fa as w_playwright_fa, 
           w.original_title as w_original_title, w.source_language as w_source_language
    FROM filtered_editions fe
    INNER JOIN works w ON w.id = fe.work_id
    ORDER BY fe.created_at DESC
    LIMIT page_size OFFSET offset_val
  )
  
  SELECT 
    p.id as edition_id,
    p.title_fa,
    p.publisher,
    p.publication_status,
    p.publication_year_solar,
    p.publication_year_gregorian,
    p.original_year,
    p.page_count,
    p.isbn,
    p.synopsis,
    p.cast_men,
    p.cast_women,
    p.cast_nonspecific,
    p.cast_total,
    p.is_in_collection,
    p.collection_title,
    p.translator_fa,
    p.is_verified,
    p.flag_count,
    p.w_id as work_id,
    p.w_playwright_fa,
    p.w_original_title,
    p.w_source_language,
    (
      SELECT json_agg(json_build_object(
        'taxonomy_id', et.taxonomy_id,
        'taxonomy', json_build_object('id', t.id, 'label_fa', t.label_fa)
      ))
      FROM edition_tags et
      INNER JOIN taxonomy t ON t.id = et.taxonomy_id
      WHERE et.farsi_edition_id = p.id
    ) as edition_tags,
    (
      SELECT json_agg(json_build_object(
        'id', er.id,
        'url', er.url,
        'ref_type', er.ref_type
      ))
      FROM external_references er
      WHERE er.farsi_edition_id = p.id
    ) as external_references,
    (SELECT cnt FROM count_query) as total_count
  FROM paginated p;
END;
$$;


ALTER FUNCTION "public"."search_editions"("search_term" "text", "search_scope" "text", "playwrights" "text"[], "translators" "text"[], "source_type" "text", "year_min" integer, "year_max" integer, "status" "text", "tags" "uuid"[], "cast_min" integer, "cast_max" integer, "verified_only" boolean, "has_synopsis" boolean, "in_collection" boolean, "has_links" boolean, "page_number" integer, "page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_playwrights"("search_term" "text" DEFAULT ''::"text", "limit_val" integer DEFAULT 50) RETURNS TABLE("name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT pw::TEXT as name
  FROM works, LATERAL unnest(playwright_fa) AS pw
  WHERE (
    search_term = '' OR 
    pw ILIKE search_term || '%' OR        -- Matches if FIRST name starts with search term
    pw ILIKE '% ' || search_term || '%'   -- Matches if LAST/MIDDLE name starts with search term
  )
  ORDER BY pw
  LIMIT limit_val;
END;
$$;


ALTER FUNCTION "public"."search_playwrights"("search_term" "text", "limit_val" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_tags"("search_term" "text" DEFAULT ''::"text", "limit_val" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "label_fa" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.label_fa
  FROM taxonomy t
  WHERE (search_term = '' OR t.label_fa ILIKE '%' || search_term || '%')
  AND t.is_approved = true
  ORDER BY t.label_fa
  LIMIT limit_val;
END;
$$;


ALTER FUNCTION "public"."search_tags"("search_term" "text", "limit_val" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_translators"("search_term" "text" DEFAULT ''::"text", "limit_val" integer DEFAULT 50) RETURNS TABLE("name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT tr::TEXT as name
  FROM farsi_editions, LATERAL unnest(translator_fa) AS tr
  WHERE (
    search_term = '' OR 
    tr ILIKE search_term || '%' OR        -- Matches if FIRST name starts with search term
    tr ILIKE '% ' || search_term || '%'   -- Matches if LAST/MIDDLE name starts with search term
  )
  ORDER BY tr
  LIMIT limit_val;
END;
$$;


ALTER FUNCTION "public"."search_translators"("search_term" "text", "limit_val" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_normalize_farsi_editions"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."trg_normalize_farsi_editions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_normalize_taxonomy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.label_fa   := normalize_farsi_text(NEW.label_fa);
  NEW.definition := normalize_farsi_text(NEW.definition);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_normalize_taxonomy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_normalize_works"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."trg_normalize_works"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_translator_requirement"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."validate_translator_requirement"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."contributor_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "display_name" "text",
    "total_contributions" bigint DEFAULT 0,
    "verified_contributions" bigint DEFAULT 0
);


ALTER TABLE "public"."contributor_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."edit_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "edition_id" "uuid" NOT NULL,
    "field_name" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "changed_by" "uuid" DEFAULT "auth"."uid"(),
    "submission_id" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."edit_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."edition_tags" (
    "farsi_edition_id" "uuid" NOT NULL,
    "taxonomy_id" "uuid" NOT NULL
);


ALTER TABLE "public"."edition_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."external_references" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "farsi_edition_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "ref_type" "text" NOT NULL,
    "last_checked_at" timestamp with time zone,
    "http_status" smallint,
    "is_stale" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_url_format" CHECK (("url" ~ '^https?://'::"text"))
);


ALTER TABLE "public"."external_references" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farsi_editions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_id" "uuid" NOT NULL,
    "title_fa" "text" NOT NULL,
    "translator_fa" "text"[] DEFAULT '{}'::"text"[],
    "publication_status" "text" DEFAULT 'published'::"text",
    "publisher" "text",
    "is_in_collection" boolean DEFAULT false,
    "collection_title" "text",
    "publication_year_solar" integer,
    "publication_year_gregorian" integer,
    "original_year" integer,
    "isbn" "text",
    "page_count" integer,
    "cast_men" integer,
    "cast_women" integer,
    "cast_nonspecific" integer,
    "cast_total" integer,
    "synopsis" "text",
    "is_verified" boolean DEFAULT false,
    "flag_count" integer DEFAULT 0,
    "submitter_name" "text",
    "submitter_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."farsi_editions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "edition_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "flag_type" "public"."flag_type_enum" NOT NULL,
    "description" "text",
    "field_name" "text",
    "current_value" "jsonb",
    "status" "public"."flag_status_enum" DEFAULT 'open'::"public"."flag_status_enum",
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action_type" "public"."action_type_enum" DEFAULT 'new_submission'::"public"."action_type_enum" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "edition_id" "uuid",
    "field_name" "text",
    "submitted_by" "uuid",
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."submission_status_enum" DEFAULT 'pending'::"public"."submission_status_enum",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text"
);


ALTER TABLE "public"."pending_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."taxonomy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_id" "uuid",
    "label_fa" "text" NOT NULL,
    "label_en" "text",
    "definition" "text",
    "category" "text" NOT NULL,
    "is_approved" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."taxonomy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."user_role_enum" DEFAULT 'contributor'::"public"."user_role_enum" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."works" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "original_title" "text",
    "source_language" "text" DEFAULT 'fa'::"text",
    "playwright_fa" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."works" OWNER TO "postgres";


ALTER TABLE ONLY "public"."contributor_stats"
    ADD CONSTRAINT "contributor_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."edit_history"
    ADD CONSTRAINT "edit_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."edition_tags"
    ADD CONSTRAINT "edition_tags_pkey" PRIMARY KEY ("farsi_edition_id", "taxonomy_id");



ALTER TABLE ONLY "public"."external_references"
    ADD CONSTRAINT "external_references_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farsi_editions"
    ADD CONSTRAINT "farsi_editions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flags"
    ADD CONSTRAINT "flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_submissions"
    ADD CONSTRAINT "pending_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."taxonomy"
    ADD CONSTRAINT "taxonomy_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."works"
    ADD CONSTRAINT "works_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_edition_tags_edition" ON "public"."edition_tags" USING "btree" ("farsi_edition_id");



CREATE INDEX "idx_edition_tags_taxonomy" ON "public"."edition_tags" USING "btree" ("taxonomy_id");



CREATE INDEX "idx_editions_created" ON "public"."farsi_editions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_editions_publisher" ON "public"."farsi_editions" USING "btree" ("publisher");



CREATE INDEX "idx_editions_title" ON "public"."farsi_editions" USING "btree" ("title_fa" "text_pattern_ops");



CREATE INDEX "idx_editions_translator" ON "public"."farsi_editions" USING "gin" ("translator_fa");



CREATE INDEX "idx_editions_verified" ON "public"."farsi_editions" USING "btree" ("is_verified");



CREATE INDEX "idx_editions_year_solar" ON "public"."farsi_editions" USING "btree" ("publication_year_solar");



CREATE INDEX "idx_extref_edition" ON "public"."external_references" USING "btree" ("farsi_edition_id");



CREATE INDEX "idx_flags_edition" ON "public"."flags" USING "btree" ("edition_id");



CREATE INDEX "idx_flags_status" ON "public"."flags" USING "btree" ("status");



CREATE INDEX "idx_history_edition" ON "public"."edit_history" USING "btree" ("edition_id");



CREATE INDEX "idx_pending_action" ON "public"."pending_submissions" USING "btree" ("action_type");



CREATE INDEX "idx_pending_status" ON "public"."pending_submissions" USING "btree" ("status");



CREATE INDEX "idx_roles_user" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_taxonomy_approved" ON "public"."taxonomy" USING "btree" ("is_approved");



CREATE INDEX "idx_taxonomy_category" ON "public"."taxonomy" USING "btree" ("category");



CREATE INDEX "idx_taxonomy_parent" ON "public"."taxonomy" USING "btree" ("parent_id");



CREATE UNIQUE INDEX "idx_unique_user_flag" ON "public"."flags" USING "btree" ("edition_id", "user_id", "flag_type") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_works_playwright" ON "public"."works" USING "gin" ("playwright_fa");



CREATE OR REPLACE TRIGGER "trg_editions_normalize" BEFORE INSERT OR UPDATE ON "public"."farsi_editions" FOR EACH ROW EXECUTE FUNCTION "public"."trg_normalize_farsi_editions"();



CREATE OR REPLACE TRIGGER "trg_editions_updated_at" BEFORE UPDATE ON "public"."farsi_editions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_taxonomy_normalize" BEFORE INSERT OR UPDATE ON "public"."taxonomy" FOR EACH ROW EXECUTE FUNCTION "public"."trg_normalize_taxonomy"();



CREATE OR REPLACE TRIGGER "trg_validate_translator" BEFORE INSERT OR UPDATE ON "public"."farsi_editions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_translator_requirement"();



CREATE OR REPLACE TRIGGER "trg_works_normalize" BEFORE INSERT OR UPDATE ON "public"."works" FOR EACH ROW EXECUTE FUNCTION "public"."trg_normalize_works"();



CREATE OR REPLACE TRIGGER "trg_works_updated_at" BEFORE UPDATE ON "public"."works" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."edit_history"
    ADD CONSTRAINT "edit_history_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "public"."farsi_editions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."edit_history"
    ADD CONSTRAINT "edit_history_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."pending_submissions"("id");



ALTER TABLE ONLY "public"."edition_tags"
    ADD CONSTRAINT "edition_tags_farsi_edition_id_fkey" FOREIGN KEY ("farsi_edition_id") REFERENCES "public"."farsi_editions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."edition_tags"
    ADD CONSTRAINT "edition_tags_taxonomy_id_fkey" FOREIGN KEY ("taxonomy_id") REFERENCES "public"."taxonomy"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."external_references"
    ADD CONSTRAINT "external_references_farsi_edition_id_fkey" FOREIGN KEY ("farsi_edition_id") REFERENCES "public"."farsi_editions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farsi_editions"
    ADD CONSTRAINT "farsi_editions_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flags"
    ADD CONSTRAINT "flags_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "public"."farsi_editions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pending_submissions"
    ADD CONSTRAINT "pending_submissions_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "public"."farsi_editions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."taxonomy"
    ADD CONSTRAINT "taxonomy_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."taxonomy"("id") ON DELETE SET NULL;



CREATE POLICY "Admin manage roles" ON "public"."user_roles" USING (("public"."get_user_role"() = 'admin'::"public"."user_role_enum"));



CREATE POLICY "Admins read stats" ON "public"."contributor_stats" FOR SELECT USING (("public"."get_user_role"() = 'admin'::"public"."user_role_enum"));



CREATE POLICY "Anyone flag" ON "public"."flags" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone submit" ON "public"."pending_submissions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Moderator manage flags" ON "public"."flags" USING (("public"."get_user_role"() = ANY (ARRAY['moderator'::"public"."user_role_enum", 'admin'::"public"."user_role_enum"])));



CREATE POLICY "Moderator read all" ON "public"."pending_submissions" FOR SELECT USING (("public"."get_user_role"() = ANY (ARRAY['moderator'::"public"."user_role_enum", 'admin'::"public"."user_role_enum"])));



CREATE POLICY "Moderator update" ON "public"."pending_submissions" FOR UPDATE USING (("public"."get_user_role"() = ANY (ARRAY['moderator'::"public"."user_role_enum", 'admin'::"public"."user_role_enum"])));



CREATE POLICY "Moderator write edition_tags" ON "public"."edition_tags" USING (("public"."get_user_role"() = ANY (ARRAY['moderator'::"public"."user_role_enum", 'admin'::"public"."user_role_enum"])));



CREATE POLICY "Moderator write editions" ON "public"."farsi_editions" USING (("public"."get_user_role"() = ANY (ARRAY['moderator'::"public"."user_role_enum", 'admin'::"public"."user_role_enum"])));



CREATE POLICY "Moderator write extref" ON "public"."external_references" USING (("public"."get_user_role"() = ANY (ARRAY['moderator'::"public"."user_role_enum", 'admin'::"public"."user_role_enum"])));



CREATE POLICY "Moderator write stats" ON "public"."contributor_stats" USING (("public"."get_user_role"() = ANY (ARRAY['moderator'::"public"."user_role_enum", 'admin'::"public"."user_role_enum"])));



CREATE POLICY "Moderator write taxonomy" ON "public"."taxonomy" USING (("public"."get_user_role"() = ANY (ARRAY['moderator'::"public"."user_role_enum", 'admin'::"public"."user_role_enum"])));



CREATE POLICY "Moderator write works" ON "public"."works" USING (("public"."get_user_role"() = ANY (ARRAY['moderator'::"public"."user_role_enum", 'admin'::"public"."user_role_enum"])));



CREATE POLICY "Moderators insert history" ON "public"."edit_history" FOR INSERT WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['moderator'::"public"."user_role_enum", 'admin'::"public"."user_role_enum"])));



CREATE POLICY "Moderators read history" ON "public"."edit_history" FOR SELECT USING (("public"."get_user_role"() = ANY (ARRAY['moderator'::"public"."user_role_enum", 'admin'::"public"."user_role_enum"])));



CREATE POLICY "Public read edition_tags" ON "public"."edition_tags" FOR SELECT USING (true);



CREATE POLICY "Public read editions" ON "public"."farsi_editions" FOR SELECT USING ((("is_verified" = true) OR ("public"."get_user_role"() = ANY (ARRAY['moderator'::"public"."user_role_enum", 'admin'::"public"."user_role_enum"]))));



CREATE POLICY "Public read extref" ON "public"."external_references" FOR SELECT USING (true);



CREATE POLICY "Public read taxonomy" ON "public"."taxonomy" FOR SELECT USING ((("is_approved" = true) OR ("public"."get_user_role"() = ANY (ARRAY['moderator'::"public"."user_role_enum", 'admin'::"public"."user_role_enum"]))));



CREATE POLICY "Public read works" ON "public"."works" FOR SELECT USING (true);



CREATE POLICY "Submitter read own" ON "public"."pending_submissions" FOR SELECT USING (("submitted_by" = "auth"."uid"()));



CREATE POLICY "Submitter read own flags" ON "public"."flags" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."contributor_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."edit_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."edition_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."external_references" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."farsi_editions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."taxonomy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."works" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_pending_submission"("submission_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_pending_submission"("submission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_pending_submission"("submission_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."immutable_array_to_string"("arr" "text"[], "sep" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."immutable_array_to_string"("arr" "text"[], "sep" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."immutable_array_to_string"("arr" "text"[], "sep" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_farsi_text"("input_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_farsi_text"("input_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_farsi_text"("input_text" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reject_pending_submission"("submission_id" "uuid", "reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_pending_submission"("submission_id" "uuid", "reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_pending_submission"("submission_id" "uuid", "reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_flag"("flag_id" "uuid", "resolution" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_flag"("flag_id" "uuid", "resolution" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_flag"("flag_id" "uuid", "resolution" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_archive"("search_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_archive"("search_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_archive"("search_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_editions"("search_term" "text", "search_scope" "text", "playwrights" "text"[], "translators" "text"[], "source_type" "text", "year_min" integer, "year_max" integer, "status" "text", "tags" "uuid"[], "cast_min" integer, "cast_max" integer, "verified_only" boolean, "has_synopsis" boolean, "in_collection" boolean, "has_links" boolean, "page_number" integer, "page_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_editions"("search_term" "text", "search_scope" "text", "playwrights" "text"[], "translators" "text"[], "source_type" "text", "year_min" integer, "year_max" integer, "status" "text", "tags" "uuid"[], "cast_min" integer, "cast_max" integer, "verified_only" boolean, "has_synopsis" boolean, "in_collection" boolean, "has_links" boolean, "page_number" integer, "page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_editions"("search_term" "text", "search_scope" "text", "playwrights" "text"[], "translators" "text"[], "source_type" "text", "year_min" integer, "year_max" integer, "status" "text", "tags" "uuid"[], "cast_min" integer, "cast_max" integer, "verified_only" boolean, "has_synopsis" boolean, "in_collection" boolean, "has_links" boolean, "page_number" integer, "page_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_playwrights"("search_term" "text", "limit_val" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_playwrights"("search_term" "text", "limit_val" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_playwrights"("search_term" "text", "limit_val" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_tags"("search_term" "text", "limit_val" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_tags"("search_term" "text", "limit_val" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_tags"("search_term" "text", "limit_val" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_translators"("search_term" "text", "limit_val" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_translators"("search_term" "text", "limit_val" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_translators"("search_term" "text", "limit_val" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_normalize_farsi_editions"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_normalize_farsi_editions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_normalize_farsi_editions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_normalize_taxonomy"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_normalize_taxonomy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_normalize_taxonomy"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_normalize_works"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_normalize_works"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_normalize_works"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_translator_requirement"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_translator_requirement"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_translator_requirement"() TO "service_role";



GRANT ALL ON TABLE "public"."contributor_stats" TO "anon";
GRANT ALL ON TABLE "public"."contributor_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."contributor_stats" TO "service_role";



GRANT ALL ON TABLE "public"."edit_history" TO "anon";
GRANT ALL ON TABLE "public"."edit_history" TO "authenticated";
GRANT ALL ON TABLE "public"."edit_history" TO "service_role";



GRANT ALL ON TABLE "public"."edition_tags" TO "anon";
GRANT ALL ON TABLE "public"."edition_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."edition_tags" TO "service_role";



GRANT ALL ON TABLE "public"."external_references" TO "anon";
GRANT ALL ON TABLE "public"."external_references" TO "authenticated";
GRANT ALL ON TABLE "public"."external_references" TO "service_role";



GRANT ALL ON TABLE "public"."farsi_editions" TO "anon";
GRANT ALL ON TABLE "public"."farsi_editions" TO "authenticated";
GRANT ALL ON TABLE "public"."farsi_editions" TO "service_role";



GRANT ALL ON TABLE "public"."flags" TO "anon";
GRANT ALL ON TABLE "public"."flags" TO "authenticated";
GRANT ALL ON TABLE "public"."flags" TO "service_role";



GRANT ALL ON TABLE "public"."pending_submissions" TO "anon";
GRANT ALL ON TABLE "public"."pending_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."taxonomy" TO "anon";
GRANT ALL ON TABLE "public"."taxonomy" TO "authenticated";
GRANT ALL ON TABLE "public"."taxonomy" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."works" TO "anon";
GRANT ALL ON TABLE "public"."works" TO "authenticated";
GRANT ALL ON TABLE "public"."works" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







