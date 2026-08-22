set local check_function_bodies = off;

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "service_role";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "service_role";

create extension "pg_trgm" schema "public";

create extension "unaccent" schema "public";

create table "public"."contributor_stats" (
  "id"                     uuid   not null default gen_random_uuid(),
  "user_id"                uuid,
  "display_name"           text,
  "total_contributions"    bigint default 0,
  "verified_contributions" bigint default 0,
  constraint "contributor_stats_pkey" primary key (id)
);

alter table "public"."contributor_stats"
  enable row level security;

create table "public"."edit_history" (
  "id"            uuid                     not null default gen_random_uuid(),
  "edition_id"    uuid                     not null,
  "field_name"    text                     not null,
  "old_value"     jsonb,
  "new_value"     jsonb,
  "submission_id" uuid,
  "changed_at"    timestamp with time zone default now(),
  constraint "edit_history_pkey" primary key (id),
  "changed_by"    uuid                     default auth.uid()
);

alter table "public"."edit_history"
  enable row level security;

create table "public"."edition_tags" (
  "farsi_edition_id" uuid not null,
  "taxonomy_id"      uuid not null,
  constraint "edition_tags_pkey" primary key (farsi_edition_id, taxonomy_id)
);

alter table "public"."edition_tags"
  enable row level security;

create table "public"."external_references" (
  "id"               uuid                     not null default gen_random_uuid(),
  "farsi_edition_id" uuid                     not null,
  "url"              text                     not null,
  "ref_type"         text                     not null,
  "last_checked_at"  timestamp with time zone,
  "http_status"      smallint,
  "is_stale"         boolean                  default false,
  "created_at"       timestamp with time zone default now(),
  constraint "external_references_pkey" primary key (id),
  constraint "valid_url_format" check ((url ~ '^https?://'::text))
);

alter table "public"."external_references"
  enable row level security;

create table "public"."farsi_editions" (
  "id"                         uuid                     not null default gen_random_uuid(),
  "work_id"                    uuid                     not null,
  "title_fa"                   text                     not null,
  "translator_fa"              text[]                   default '{}'::text[],
  "publication_status"         text                     default 'published'::text,
  "publisher"                  text,
  "is_in_collection"           boolean                  default false,
  "collection_title"           text,
  "publication_year_solar"     integer,
  "publication_year_gregorian" integer,
  "original_year"              integer,
  "isbn"                       text,
  "page_count"                 integer,
  "cast_men"                   integer,
  "cast_women"                 integer,
  "cast_nonspecific"           integer,
  "cast_total"                 integer,
  "synopsis"                   text,
  "is_verified"                boolean                  default false,
  "flag_count"                 integer                  default 0,
  "submitter_name"             text,
  "submitter_email"            text,
  "created_at"                 timestamp with time zone default now(),
  "updated_at"                 timestamp with time zone default now(),
  constraint "farsi_editions_pkey" primary key (id)
);

alter table "public"."farsi_editions"
  enable row level security;

create table "public"."flags" (
  "id"            uuid                     not null default gen_random_uuid(),
  "edition_id"    uuid                     not null,
  "user_id"       uuid,
  "description"   text,
  "field_name"    text,
  "current_value" jsonb,
  "resolved_by"   uuid,
  "resolved_at"   timestamp with time zone,
  "created_at"    timestamp with time zone default now(),
  constraint "flags_pkey" primary key (id)
);

alter table "public"."flags"
  enable row level security;

create table "public"."pending_submissions" (
  "id"           uuid                     not null default gen_random_uuid(),
  "payload"      jsonb                    not null,
  "edition_id"   uuid,
  "field_name"   text,
  "submitted_by" uuid,
  "submitted_at" timestamp with time zone default now(),
  "reviewed_by"  uuid,
  "reviewed_at"  timestamp with time zone,
  "review_notes" text,
  constraint "pending_submissions_pkey" primary key (id)
);

alter table "public"."pending_submissions"
  enable row level security;

create table "public"."taxonomy" (
  "id"          uuid                     not null default gen_random_uuid(),
  "parent_id"   uuid,
  "label_fa"    text                     not null,
  "label_en"    text,
  "definition"  text,
  "category"    text                     not null,
  "is_approved" boolean                  default false,
  "created_at"  timestamp with time zone default now(),
  constraint "taxonomy_pkey" primary key (id)
);

alter table "public"."taxonomy"
  enable row level security;

create table "public"."user_roles" (
  "id"         uuid                     not null default gen_random_uuid(),
  "user_id"    uuid                     not null,
  "granted_by" uuid,
  "granted_at" timestamp with time zone default now(),
  constraint "user_roles_pkey" primary key (id),
  constraint "user_roles_user_id_key" unique (user_id)
);

alter table "public"."user_roles"
  enable row level security;

create table "public"."works" (
  "id"                 uuid                     not null default gen_random_uuid(),
  "original_title"     text,
  "source_language"    text                     default 'fa'::text,
  "playwright_fa"      text[]                   default '{}'::text[],
  "created_at"         timestamp with time zone default now(),
  "updated_at"         timestamp with time zone default now(),
  "alternative_titles" text[]                   default '{}'::text[],
  constraint "works_pkey" primary key (id)
);

alter table "public"."works"
  enable row level security;

create type "public"."action_type_enum" as enum (
  'new_submission',
  'direct_edit',
  'edit_suggestion',
  'flag',
  'delete_suggestion'
);

alter table "public"."pending_submissions"
  add column "action_type" public.action_type_enum not null default 'new_submission'::public.action_type_enum;

create type "public"."flag_status_enum" as enum (
  'open',
  'resolved',
  'dismissed'
);

alter table "public"."flags"
  add column "status" public.flag_status_enum default 'open'::public.flag_status_enum;

create type "public"."flag_type_enum" as enum (
  'wrong_title',
  'wrong_author',
  'wrong_translator',
  'wrong_year',
  'duplicate',
  'inappropriate_content',
  'other'
);

alter table "public"."flags"
  add column "flag_type" public.flag_type_enum not null;

create type "public"."submission_status_enum" as enum (
  'pending',
  'approved',
  'rejected'
);

alter table "public"."pending_submissions"
  add column "status" public.submission_status_enum default 'pending'::public.submission_status_enum;

create type "public"."user_role_enum" as enum (
  'guest',
  'contributor',
  'moderator',
  'admin'
);

alter table "public"."user_roles"
  add column "role" public.user_role_enum not null default 'contributor'::public.user_role_enum;

create or replace function public.approve_pending_submission (
  submission_id uuid
)
  returns json
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
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
$function$;

create or replace function public.get_edition_full (
  p_edition_id uuid
)
  returns table (
    edition_id                 uuid,
    title_fa                   text,
    publisher                  text,
    publication_status         text,
    publication_year_solar     integer,
    publication_year_gregorian integer,
    original_year              integer,
    page_count                 integer,
    isbn                       text,
    synopsis                   text,
    cast_men                   integer,
    cast_women                 integer,
    cast_nonspecific           integer,
    cast_total                 integer,
    is_in_collection           boolean,
    collection_title           text,
    translator_fa              text[],
    is_verified                boolean,
    flag_count                 integer,
    work_id                    uuid,
    work_playwright_fa         text[],
    work_original_title        text,
    work_source_language       text,
    work_alternative_titles    text[],
    work_edition_count         bigint,
    edition_tags               json,
    external_references        json
  )
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$BEGIN
  RETURN QUERY
  SELECT
    e.id AS edition_id,
    e.title_fa,
    e.publisher,
    e.publication_status,
    e.publication_year_solar,
    e.publication_year_gregorian,
    e.original_year,
    e.page_count,
    e.isbn,
    e.synopsis,
    e.cast_men,
    e.cast_women,
    e.cast_nonspecific,
    e.cast_total,
    e.is_in_collection,
    e.collection_title,
    e.translator_fa,
    e.is_verified,
    e.flag_count,
    w.id AS work_id,
    w.playwright_fa AS work_playwright_fa,
    w.original_title AS work_original_title,
    w.source_language AS work_source_language,
    w.alternative_titles AS work_alternative_titles,
    (SELECT COUNT(*) FROM farsi_editions fe2 WHERE fe2.work_id = w.id) AS work_edition_count,
    (
      SELECT json_agg(json_build_object(
        'taxonomy_id', et.taxonomy_id,
        'taxonomy', json_build_object('id', t.id, 'label_fa', t.label_fa)
      ))
      FROM edition_tags et
      INNER JOIN taxonomy t ON t.id = et.taxonomy_id
      WHERE et.farsi_edition_id = e.id
    ) AS edition_tags,
    (
      SELECT json_agg(json_build_object(
        'id', er.id,
        'url', er.url,
        'ref_type', er.ref_type
      ))
      FROM external_references er
      WHERE er.farsi_edition_id = e.id
    ) AS external_references
  FROM farsi_editions e
  INNER JOIN works w ON w.id = e.work_id
  WHERE e.id = p_edition_id;
END;$function$;

create or replace function public.get_user_role()
  returns public.user_role_enum
  language sql
  stable
  security definer
  AS $function$
  SELECT COALESCE(
    (SELECT role FROM user_roles WHERE user_id = auth.uid()),
    'guest'
  );
$function$;

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
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
$function$;

create or replace function public.immutable_array_to_string (
  arr text[],
  sep text
)
  returns text
  language sql
  immutable
  strict
  AS $function$
    SELECT array_to_string(arr, sep);
$function$;

create or replace function public.normalize_farsi_text (
  input_text text
)
  returns text
  language sql
  immutable
  AS $function$
  SELECT
    translate(
      translate(
        translate(
          COALESCE(input_text, ''),
          'ي', 'ی'  -- فقط ي عربی به ی فارسی تبدیل می‌شود
        ),
        'ك', 'ک'
      ),
      'ة', 'ه'
    );
$function$;

create or replace function public.reject_pending_submission (
  submission_id uuid,
  reason        text default null::text
)
  returns json
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
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
$function$;

create or replace function public.resolve_flag (
  flag_id    uuid,
  resolution text
)
  returns json
  language plpgsql
  security definer
  AS $function$
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
$function$;

create or replace function public.search_archive (
  search_query text
)
  returns table (
    id                         uuid,
    work_id                    uuid,
    title_fa                   text,
    translator_fa              text[],
    publisher                  text,
    publication_year_solar     integer,
    publication_year_gregorian integer,
    isbn                       text,
    page_count                 integer,
    cast_men                   integer,
    cast_women                 integer,
    cast_nonspecific           integer,
    cast_total                 integer,
    synopsis                   text,
    is_verified                boolean,
    created_at                 timestamp with time zone,
    updated_at                 timestamp with time zone,
    is_in_collection           boolean,
    collection_title           text,
    works                      jsonb
  )
  language plpgsql
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

create or replace function public.search_duplicates (
  title_query text
)
  returns table (
    id                         uuid,
    title_fa                   text,
    publisher                  text,
    publication_status         text,
    publication_year_solar     integer,
    publication_year_gregorian integer,
    original_year              integer,
    page_count                 integer,
    isbn                       text,
    synopsis                   text,
    cast_men                   integer,
    cast_women                 integer,
    cast_nonspecific           integer,
    cast_total                 integer,
    is_in_collection           boolean,
    collection_title           text,
    translator_fa              text[],
    work_id                    uuid,
    work_playwright_fa         text[],
    work_original_title        text,
    work_source_language       text,
    work_alternative_titles    text[],
    edition_tags               json,
    external_references        json,
    created_at                 timestamp with time zone
  )
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
BEGIN
  RETURN QUERY
  SELECT
    fe.id,
    fe.title_fa,
    fe.publisher,
    fe.publication_status,
    fe.publication_year_solar,
    fe.publication_year_gregorian,
    fe.original_year,
    fe.page_count,
    fe.isbn,
    fe.synopsis,
    fe.cast_men,
    fe.cast_women,
    fe.cast_nonspecific,
    fe.cast_total,
    fe.is_in_collection,
    fe.collection_title,
    fe.translator_fa,
    w.id AS work_id,
    w.playwright_fa AS work_playwright_fa,
    w.original_title AS work_original_title,
    w.source_language AS work_source_language,
    w.alternative_titles AS work_alternative_titles,
    (
      SELECT json_agg(json_build_object(
        'taxonomy_id', et.taxonomy_id,
        'taxonomy', json_build_object('id', t.id, 'label_fa', t.label_fa)
      ))
      FROM edition_tags et
      INNER JOIN taxonomy t ON t.id = et.taxonomy_id
      WHERE et.farsi_edition_id = fe.id
    ) AS edition_tags,
    (
      SELECT json_agg(json_build_object(
        'id', er.id,
        'url', er.url,
        'ref_type', er.ref_type
      ))
      FROM external_references er
      WHERE er.farsi_edition_id = fe.id
    ) AS external_references,
    fe.created_at AS created_at
  FROM farsi_editions fe
  INNER JOIN works w ON w.id = fe.work_id
  WHERE
    -- Search in title_fa (normalized)
    normalize_farsi_text(fe.title_fa) ILIKE '%' || normalize_farsi_text(title_query) || '%'
    -- Search in original_title (case-insensitive, not normalized)
    OR w.original_title ILIKE '%' || title_query || '%'
    -- Search in alternative_titles array (normalized)
    OR EXISTS (
      SELECT 1 FROM unnest(w.alternative_titles) AS alt
      WHERE normalize_farsi_text(alt) ILIKE '%' || normalize_farsi_text(title_query) || '%'
    )
  ORDER BY fe.created_at DESC
  LIMIT 3;
END;
$function$;

create or replace function public.search_editions (
  search_term   text    default ''::text,
  search_scope  text    default 'all'::text,
  playwrights   text[]  default '{}'::text[],
  translators   text[]  default '{}'::text[],
  source_type   text    default 'all'::text,
  year_min      integer default null::integer,
  year_max      integer default null::integer,
  status        text    default 'all'::text,
  tags          uuid[]  default '{}'::uuid[],
  cast_min      integer default null::integer,
  cast_max      integer default null::integer,
  verified_only boolean default false,
  has_synopsis  boolean default false,
  in_collection boolean default false,
  has_links     boolean default false,
  page_number   integer default 1,
  page_size     integer default 20
)
  returns table (
    edition_id                 uuid,
    title_fa                   text,
    publisher                  text,
    publication_status         text,
    publication_year_solar     integer,
    publication_year_gregorian integer,
    original_year              integer,
    page_count                 integer,
    isbn                       text,
    synopsis                   text,
    cast_men                   integer,
    cast_women                 integer,
    cast_nonspecific           integer,
    cast_total                 integer,
    is_in_collection           boolean,
    collection_title           text,
    translator_fa              text[],
    is_verified                boolean,
    flag_count                 integer,
    work_id                    uuid,
    work_playwright_fa         text[],
    work_original_title        text,
    work_source_language       text,
    work_alternative_titles    text[],
    work_edition_count         bigint,
    edition_tags               json,
    external_references        json,
    total_count                bigint
  )
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
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

    WHERE (NOT verified_only OR e.is_verified = true)
    AND (NOT has_synopsis OR (e.synopsis IS NOT NULL AND e.synopsis != ''))
    AND (NOT in_collection OR e.is_in_collection = true)
    AND (status = 'all' OR e.publication_status = status)
    AND (year_min IS NULL OR e.publication_year_solar >= year_min)
    AND (year_max IS NULL OR e.publication_year_solar <= year_max)
    AND (cast_min IS NULL OR e.cast_total >= cast_min)
    AND (cast_max IS NULL OR e.cast_total <= cast_max)
    AND (source_type = 'all' OR
         (source_type = 'fa' AND w.source_language = 'fa') OR
         (source_type = 'translated' AND w.source_language != 'fa'))

    AND (
      search_term = '' OR
      (search_scope = 'title' AND (
        e.title_fa ILIKE search_pattern OR 
        EXISTS (SELECT 1 FROM unnest(w.alternative_titles) AS alt WHERE alt ILIKE search_pattern)
      )) OR
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
        EXISTS (SELECT 1 FROM unnest(w.alternative_titles) AS alt WHERE alt ILIKE search_pattern) OR
        e.publisher ILIKE search_pattern OR
        e.synopsis ILIKE search_pattern OR
        e.collection_title ILIKE search_pattern OR
        EXISTS (SELECT 1 FROM unnest(w.playwright_fa) AS pw WHERE pw ILIKE search_pattern) OR
        EXISTS (SELECT 1 FROM unnest(e.translator_fa) AS tr WHERE tr ILIKE search_pattern)
      ))
    )

    AND (array_length(playwrights, 1) IS NULL OR w.playwright_fa && playwrights)
    AND (array_length(translators, 1) IS NULL OR e.translator_fa && translators)
    AND (
      array_length(tags, 1) IS NULL OR
      (
        SELECT COUNT(DISTINCT et.taxonomy_id)
        FROM edition_tags et
        WHERE et.farsi_edition_id = e.id
        AND et.taxonomy_id = ANY(tags)
      ) = array_length(tags, 1)
    )
    AND (NOT has_links OR EXISTS (
      SELECT 1 FROM external_references er
      WHERE er.farsi_edition_id = e.id
    ))
  ),

  count_query AS (
    SELECT COUNT(*) as cnt FROM filtered_editions
  ),

  paginated AS (
    SELECT fe.*, w.id as w_id, w.playwright_fa as w_playwright_fa,
           w.original_title as w_original_title, w.source_language as w_source_language,
           w.alternative_titles as w_alternative_titles,
           -- 🆕 Count all editions for this work
           (SELECT COUNT(*) FROM farsi_editions fe2 WHERE fe2.work_id = w.id) as w_edition_count
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
    p.w_alternative_titles,
    p.w_edition_count,  -- 🆕 NEW FIELD
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
$function$;

create or replace function public.search_editions_for_linking (
  search_term text
)
  returns table (
    edition_id              uuid,
    title_fa                text,
    translator_fa           text[],
    publisher               text,
    publication_year_solar  integer,
    work_id                 uuid,
    work_original_title     text,
    work_playwright_fa      text[],
    work_source_language    text,
    work_alternative_titles text[]
  )
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    fe.id AS edition_id,
    fe.title_fa,
    fe.translator_fa,
    fe.publisher,
    fe.publication_year_solar,
    w.id AS work_id,
    w.original_title AS work_original_title,
    w.playwright_fa AS work_playwright_fa,
    w.source_language AS work_source_language,
    w.alternative_titles AS work_alternative_titles
  FROM farsi_editions fe
  INNER JOIN works w ON w.id = fe.work_id
  WHERE
    fe.title_fa ILIKE '%' || search_term || '%'
    OR w.original_title ILIKE '%' || search_term || '%'
    OR EXISTS (
      SELECT 1 FROM unnest(w.alternative_titles) AS alt
      WHERE alt ILIKE '%' || search_term || '%'
    )
    OR EXISTS (
      SELECT 1 FROM unnest(w.playwright_fa) AS pw
      WHERE pw ILIKE '%' || search_term || '%'
    )
  ORDER BY fe.title_fa
  LIMIT 8;
END;
$function$;

create or replace function public.search_playwrights (
  search_term text    default ''::text,
  limit_val   integer default 50
)
  returns table (
    name text
  )
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
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
$function$;

create or replace function public.search_tags (
  search_term text    default ''::text,
  limit_val   integer default 50
)
  returns table (
    id       uuid,
    label_fa text
  )
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
BEGIN
  RETURN QUERY
  SELECT t.id, t.label_fa
  FROM taxonomy t
  WHERE (search_term = '' OR t.label_fa ILIKE '%' || search_term || '%')
  AND t.is_approved = true
  ORDER BY t.label_fa
  LIMIT limit_val;
END;
$function$;

create or replace function public.search_translators (
  search_term text    default ''::text,
  limit_val   integer default 50
)
  returns table (
    name text
  )
  language plpgsql
  security definer
  set search_path to 'public'
  AS $function$
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
$function$;

create or replace function public.trg_normalize_farsi_editions()
  returns trigger
  language plpgsql
  AS $function$
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
$function$;

create or replace function public.trg_normalize_taxonomy()
  returns trigger
  language plpgsql
  AS $function$
BEGIN
  NEW.label_fa   := normalize_farsi_text(NEW.label_fa);
  NEW.definition := normalize_farsi_text(NEW.definition);
  RETURN NEW;
END;
$function$;

create or replace function public.trg_normalize_works()
  returns trigger
  language plpgsql
  AS $function$
BEGIN
  NEW.original_title := normalize_farsi_text(NEW.original_title);
  IF NEW.playwright_fa IS NOT NULL THEN
    NEW.playwright_fa := ARRAY(
      SELECT normalize_farsi_text(unnest(NEW.playwright_fa))
    );
  END IF;
  RETURN NEW;
END;
$function$;

create or replace function public.update_updated_at()
  returns trigger
  language plpgsql
  AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

create or replace function public.validate_translator_requirement()
  returns trigger
  language plpgsql
  AS $function$
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
$function$;

alter table "public"."edit_history"
  add constraint "edit_history_edition_id_fkey" foreign key (edition_id) references public.farsi_editions(id) on delete cascade;

alter table "public"."edition_tags"
  add constraint "edition_tags_farsi_edition_id_fkey" foreign key (farsi_edition_id) references public.farsi_editions(id) on delete cascade;

alter table "public"."external_references"
  add constraint "external_references_farsi_edition_id_fkey" foreign key (farsi_edition_id) references public.farsi_editions(id) on delete cascade;

alter table "public"."flags"
  add constraint "flags_edition_id_fkey" foreign key (edition_id) references public.farsi_editions(id) on delete cascade;

alter table "public"."pending_submissions"
  add constraint "pending_submissions_edition_id_fkey" foreign key (edition_id) references public.farsi_editions(id) on delete cascade;

alter table "public"."edit_history"
  add constraint "edit_history_submission_id_fkey" foreign key (submission_id) references public.pending_submissions(id);

alter table "public"."edition_tags"
  add constraint "edition_tags_taxonomy_id_fkey" foreign key (taxonomy_id) references public.taxonomy(id) on delete cascade;

alter table "public"."taxonomy"
  add constraint "taxonomy_parent_id_fkey" foreign key (parent_id) references public.taxonomy(id) on delete set null;

alter table "public"."farsi_editions"
  add constraint "farsi_editions_work_id_fkey" foreign key (work_id) references public.works(id) on delete cascade;

create index idx_edition_tags_edition on public.edition_tags using btree (farsi_edition_id);

create index idx_edition_tags_taxonomy on public.edition_tags using btree (taxonomy_id);

create index idx_editions_created on public.farsi_editions using btree (created_at desc);

create index idx_editions_publisher on public.farsi_editions using btree (publisher);

create index idx_editions_title on public.farsi_editions using btree (title_fa text_pattern_ops);

create index idx_editions_translator on public.farsi_editions using gin (translator_fa);

create index idx_editions_verified on public.farsi_editions using btree (is_verified);

create index idx_editions_year_solar on public.farsi_editions using btree (publication_year_solar);

create index idx_extref_edition on public.external_references using btree (farsi_edition_id);

create index idx_flags_edition on public.flags using btree (edition_id);

create index idx_flags_status on public.flags using btree (status);

create index idx_history_edition on public.edit_history using btree (edition_id);

create index idx_pending_action on public.pending_submissions using btree (action_type);

create index idx_pending_status on public.pending_submissions using btree (status);

create index idx_roles_user on public.user_roles using btree (user_id);

create index idx_taxonomy_approved on public.taxonomy using btree (is_approved);

create index idx_taxonomy_category on public.taxonomy using btree (category);

create index idx_taxonomy_parent on public.taxonomy using btree (parent_id);

create unique index idx_unique_user_flag on public.flags using btree (edition_id, user_id, flag_type)
  where (user_id is not null);

create index idx_works_playwright on public.works using gin (playwright_fa);

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create trigger trg_editions_normalize
  before insert or update on public.farsi_editions
  for each row
  execute function public.trg_normalize_farsi_editions();

create trigger trg_editions_updated_at
  before update on public.farsi_editions
  for each row
  execute function public.update_updated_at();

create trigger trg_validate_translator
  before insert or update on public.farsi_editions
  for each row
  execute function public.validate_translator_requirement();

create trigger trg_taxonomy_normalize
  before insert or update on public.taxonomy
  for each row
  execute function public.trg_normalize_taxonomy();

create trigger trg_works_normalize
  before insert or update on public.works
  for each row
  execute function public.trg_normalize_works();

create trigger trg_works_updated_at
  before update on public.works
  for each row
  execute function public.update_updated_at();

create policy "Admins read stats" on "public"."contributor_stats"
  for select
  to PUBLIC
  using ((public.get_user_role() = 'admin'::public.user_role_enum));

create policy "Moderator write stats" on "public"."contributor_stats"
  for all
  to PUBLIC
  using ((public.get_user_role() = ANY (ARRAY['moderator'::public.user_role_enum, 'admin'::public.user_role_enum])));

create policy "Moderators insert history" on "public"."edit_history"
  for insert
  to PUBLIC
  with check ((public.get_user_role() = ANY (ARRAY['moderator'::public.user_role_enum, 'admin'::public.user_role_enum])));

create policy "Moderators read history" on "public"."edit_history"
  for select
  to PUBLIC
  using ((public.get_user_role() = ANY (ARRAY['moderator'::public.user_role_enum, 'admin'::public.user_role_enum])));

create policy "Moderator write edition_tags" on "public"."edition_tags"
  for all
  to PUBLIC
  using ((public.get_user_role() = ANY (ARRAY['moderator'::public.user_role_enum, 'admin'::public.user_role_enum])));

create policy "Public read edition_tags" on "public"."edition_tags"
  for select
  to PUBLIC
  using (true);

create policy "Moderator write extref" on "public"."external_references"
  for all
  to PUBLIC
  using ((public.get_user_role() = ANY (ARRAY['moderator'::public.user_role_enum, 'admin'::public.user_role_enum])));

create policy "Public read extref" on "public"."external_references"
  for select
  to PUBLIC
  using (true);

create policy "Moderator write editions" on "public"."farsi_editions"
  for all
  to PUBLIC
  using ((public.get_user_role() = ANY (ARRAY['moderator'::public.user_role_enum, 'admin'::public.user_role_enum])));

create policy "Public read editions" on "public"."farsi_editions"
  for select
  to PUBLIC
  using (((is_verified = true) or (public.get_user_role() = ANY (ARRAY['moderator'::public.user_role_enum, 'admin'::public.user_role_enum]))));

create policy "Anyone flag" on "public"."flags"
  for insert
  to PUBLIC
  with check (true);

create policy "Moderator manage flags" on "public"."flags"
  for all
  to PUBLIC
  using ((public.get_user_role() = ANY (ARRAY['moderator'::public.user_role_enum, 'admin'::public.user_role_enum])));

create policy "Submitter read own flags" on "public"."flags"
  for select
  to PUBLIC
  using ((user_id = auth.uid()));

create policy "Anyone submit" on "public"."pending_submissions"
  for insert
  to PUBLIC
  with check (true);

create policy "Moderator read all" on "public"."pending_submissions"
  for select
  to PUBLIC
  using ((public.get_user_role() = ANY (ARRAY['moderator'::public.user_role_enum, 'admin'::public.user_role_enum])));

create policy "Moderator update" on "public"."pending_submissions"
  for update
  to PUBLIC
  using ((public.get_user_role() = ANY (ARRAY['moderator'::public.user_role_enum, 'admin'::public.user_role_enum])));

create policy "Submitter read own" on "public"."pending_submissions"
  for select
  to PUBLIC
  using ((submitted_by = auth.uid()));

create policy "Moderator write taxonomy" on "public"."taxonomy"
  for all
  to PUBLIC
  using ((public.get_user_role() = ANY (ARRAY['moderator'::public.user_role_enum, 'admin'::public.user_role_enum])));

create policy "Public read taxonomy" on "public"."taxonomy"
  for select
  to PUBLIC
  using (((is_approved = true) or (public.get_user_role() = ANY (ARRAY['moderator'::public.user_role_enum, 'admin'::public.user_role_enum]))));

create policy "Admin manage roles" on "public"."user_roles"
  for all
  to PUBLIC
  using ((public.get_user_role() = 'admin'::public.user_role_enum));

create policy "Moderator write works" on "public"."works"
  for all
  to PUBLIC
  using ((public.get_user_role() = ANY (ARRAY['moderator'::public.user_role_enum, 'admin'::public.user_role_enum])));

create policy "Public read works" on "public"."works"
  for select
  to PUBLIC
  using (true);

comment on extension "pg_trgm" is 'text similarity measurement and index searching based on trigrams';

comment on extension "unaccent" is 'text search dictionary that removes accents';

revoke all on function "public"."approve_pending_submission"(uuid) from public;

grant execute on function "public"."approve_pending_submission"(uuid) to "authenticated", "postgres", "service_role";

grant execute on function "public"."get_edition_full"(uuid) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."get_user_role"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."handle_new_user"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."immutable_array_to_string"(text[], text) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."normalize_farsi_text"(text) to public, "anon", "authenticated", "postgres", "service_role";

revoke all on function "public"."reject_pending_submission"(uuid, text) from public;

grant execute on function "public"."reject_pending_submission"(uuid, text) to "authenticated", "postgres", "service_role";

grant execute on function "public"."resolve_flag"(uuid, text) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."search_archive"(text) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."search_duplicates"(text) to public, "anon", "authenticated", "postgres", "service_role";

grant execute
  on function "public"."search_editions"(text, text, text[], text[], text, integer, integer, text, uuid[], integer, integer, boolean, boolean, boolean, boolean, integer, integer)
  to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."search_editions_for_linking"(text) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."search_playwrights"(text, integer) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."search_tags"(text, integer) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."search_translators"(text, integer) to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."trg_normalize_farsi_editions"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."trg_normalize_taxonomy"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."trg_normalize_works"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."update_updated_at"() to public, "anon", "authenticated", "postgres", "service_role";

grant execute on function "public"."validate_translator_requirement"() to public, "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."contributor_stats" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."edit_history" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."edition_tags" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."external_references" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."farsi_editions" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."flags" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."pending_submissions" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."taxonomy" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."user_roles" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."works" to "anon", "authenticated", "postgres", "service_role";

grant usage on type "public"."action_type_enum" to "postgres";

grant usage on type "public"."flag_status_enum" to "postgres";

grant usage on type "public"."flag_type_enum" to "postgres";

grant usage on type "public"."submission_status_enum" to "postgres";

grant usage on type "public"."user_role_enum" to "postgres";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "anon";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "service_role";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "anon";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "authenticated";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "service_role";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "anon";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "authenticated";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "service_role";

