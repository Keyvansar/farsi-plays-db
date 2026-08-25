-- ══════════════════════════════════════════════════════════════════
-- Phase 3: enforce the "verified-only" publication model in RPCs.
--
-- Problem: get_edition_full and search_editions are SECURITY DEFINER,
-- so they bypass RLS and exposed UNVERIFIED editions to anonymous
-- callers. search_duplicates and search_editions_for_linking were
-- also executable by anon.
--
-- Fix:
--   1. get_edition_full  → non-moderators can only open verified rows.
--   2. search_editions   → verified_only=false silently downgraded to
--      true for anyone below moderator.
--   3. search_duplicates / search_editions_for_linking → revoked from
--      anon/PUBLIC, granted to authenticated. They deliberately still
--      return unverified rows to logged-in users so duplicate checking
--      catches queued submissions.
--
-- Note: search_archive() needs no change — it is SECURITY INVOKER, so
-- RLS already filters it per caller.
-- ══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 1. get_edition_full: verified rows for the public, all rows for mods
-- ──────────────────────────────────────────────────────────────────
create or replace function public.get_edition_full (
  p_edition_id uuid
)
returns table (
  edition_id uuid,
  title_fa text,
  publisher text,
  publication_status text,
  publication_year_solar integer,
  publication_year_gregorian integer,
  original_year integer,
  page_count integer,
  isbn text,
  synopsis text,
  cast_men integer,
  cast_women integer,
  cast_nonspecific integer,
  cast_total integer,
  is_in_collection boolean,
  collection_title text,
  translator_fa text[],
  is_verified boolean,
  flag_count integer,
  work_id uuid,
  work_playwright_fa text[],
  work_original_title text,
  work_source_language text,
  work_alternative_titles text[],
  work_edition_count bigint,
  edition_tags json,
  external_references json
)
language plpgsql
security definer
set search_path to 'public'
AS $function$
BEGIN
  -- ▼▼▼ NEW GUARD (Phase 3) ▼▼▼
  -- Guests/contributors may only open VERIFIED editions.
  -- Moderators/admins keep access to preview pending items.
  IF get_user_role() NOT IN ('moderator'::user_role_enum, 'admin'::user_role_enum)
     AND NOT EXISTS (
       SELECT 1 FROM farsi_editions fe
       WHERE fe.id = p_edition_id AND fe.is_verified = true
     )
  THEN
    RETURN; -- returns zero rows → client treats it as "not found"
  END IF;
  -- ▲▲▲ NEW GUARD ▲▲▲

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
END;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- 2. search_editions: force verified_only for non-moderators
-- ──────────────────────────────────────────────────────────────────
create or replace function public.search_editions (
  search_term text default ''::text,
  search_scope text default 'all'::text,
  playwrights text[] default '{}'::text[],
  translators text[] default '{}'::text[],
  source_type text default 'all'::text,
  year_min integer default null::integer,
  year_max integer default null::integer,
  status text default 'all'::text,
  tags uuid[] default '{}'::uuid[],
  cast_min integer default null::integer,
  cast_max integer default null::integer,
  verified_only boolean default false,
  has_synopsis boolean default false,
  in_collection boolean default false,
  has_links boolean default false,
  page_number integer default 1,
  page_size integer default 20
)
returns table (
  edition_id uuid,
  title_fa text,
  publisher text,
  publication_status text,
  publication_year_solar integer,
  publication_year_gregorian integer,
  original_year integer,
  page_count integer,
  isbn text,
  synopsis text,
  cast_men integer,
  cast_women integer,
  cast_nonspecific integer,
  cast_total integer,
  is_in_collection boolean,
  collection_title text,
  translator_fa text[],
  is_verified boolean,
  flag_count integer,
  work_id uuid,
  work_playwright_fa text[],
  work_original_title text,
  work_source_language text,
  work_alternative_titles text[],
  work_edition_count bigint,
  edition_tags json,
  external_references json,
  total_count bigint
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
  -- ▼▼▼ NEW GUARD (Phase 3) ▼▼▼
  -- Only moderators/admins may request unverified results; everyone
  -- else is silently downgraded to verified-only mode.
  IF verified_only = false
     AND get_user_role() NOT IN ('moderator'::user_role_enum, 'admin'::user_role_enum)
  THEN
    verified_only := true;
  END IF;
  -- ▲▲▲ NEW GUARD ▲▲▲

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
    p.w_edition_count,
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

-- ──────────────────────────────────────────────────────────────────
-- 3. Submission helpers become members-only tools
--    (they intentionally still see unverified rows for logged-in
--    users, so duplicate detection catches queued items)
-- ──────────────────────────────────────────────────────────────────
revoke execute on function "public"."search_duplicates"(text) from public;
revoke execute on function "public"."search_duplicates"(text) from "anon";
grant  execute on function "public"."search_duplicates"(text) to "authenticated", "postgres", "service_role";

revoke execute on function "public"."search_editions_for_linking"(text) from public;
revoke execute on function "public"."search_editions_for_linking"(text) from "anon";
grant  execute on function "public"."search_editions_for_linking"(text) to "authenticated", "postgres", "service_role";