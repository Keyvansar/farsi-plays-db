-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.works (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_title text,
  source_language text DEFAULT 'fa'::text,
  playwright_fa ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT works_pkey PRIMARY KEY (id)
);
CREATE TABLE public.taxonomy (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_id uuid,
  label_fa text NOT NULL,
  label_en text,
  definition text,
  category text NOT NULL,
  is_approved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT taxonomy_pkey PRIMARY KEY (id),
  CONSTRAINT taxonomy_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.taxonomy(id)
);
CREATE TABLE public.farsi_editions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL,
  title_fa text NOT NULL,
  translator_fa ARRAY DEFAULT '{}'::text[],
  publication_status text DEFAULT 'published'::text,
  publisher text,
  is_in_collection boolean DEFAULT false,
  collection_title text,
  publication_year_solar integer,
  publication_year_gregorian integer,
  original_year integer,
  isbn text,
  page_count integer,
  cast_men integer,
  cast_women integer,
  cast_nonspecific integer,
  cast_total integer,
  synopsis text,
  is_verified boolean DEFAULT false,
  flag_count integer DEFAULT 0,
  submitter_name text,
  submitter_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT farsi_editions_pkey PRIMARY KEY (id),
  CONSTRAINT farsi_editions_work_id_fkey FOREIGN KEY (work_id) REFERENCES public.works(id)
);
CREATE TABLE public.edition_tags (
  farsi_edition_id uuid NOT NULL,
  taxonomy_id uuid NOT NULL,
  CONSTRAINT edition_tags_pkey PRIMARY KEY (farsi_edition_id, taxonomy_id),
  CONSTRAINT edition_tags_farsi_edition_id_fkey FOREIGN KEY (farsi_edition_id) REFERENCES public.farsi_editions(id),
  CONSTRAINT edition_tags_taxonomy_id_fkey FOREIGN KEY (taxonomy_id) REFERENCES public.taxonomy(id)
);
CREATE TABLE public.external_references (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  farsi_edition_id uuid NOT NULL,
  url text NOT NULL CHECK (url ~ '^https?://'::text),
  ref_type text NOT NULL,
  last_checked_at timestamp with time zone,
  http_status smallint,
  is_stale boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT external_references_pkey PRIMARY KEY (id),
  CONSTRAINT external_references_farsi_edition_id_fkey FOREIGN KEY (farsi_edition_id) REFERENCES public.farsi_editions(id)
);
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role USER-DEFINED NOT NULL DEFAULT 'contributor'::user_role_enum,
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pending_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action_type USER-DEFINED NOT NULL DEFAULT 'new_submission'::action_type_enum,
  payload jsonb NOT NULL,
  edition_id uuid,
  field_name text,
  submitted_by uuid,
  submitted_at timestamp with time zone DEFAULT now(),
  status USER-DEFINED DEFAULT 'pending'::submission_status_enum,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  CONSTRAINT pending_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT pending_submissions_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.farsi_editions(id)
);
CREATE TABLE public.edit_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid DEFAULT auth.uid(),
  submission_id uuid,
  changed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT edit_history_pkey PRIMARY KEY (id),
  CONSTRAINT edit_history_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.farsi_editions(id),
  CONSTRAINT edit_history_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.pending_submissions(id)
);
CREATE TABLE public.flags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL,
  user_id uuid,
  flag_type USER-DEFINED NOT NULL,
  description text,
  field_name text,
  current_value jsonb,
  status USER-DEFINED DEFAULT 'open'::flag_status_enum,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT flags_pkey PRIMARY KEY (id),
  CONSTRAINT flags_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES public.farsi_editions(id)
);
CREATE TABLE public.contributor_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  display_name text,
  total_contributions bigint DEFAULT 0,
  verified_contributions bigint DEFAULT 0,
  CONSTRAINT contributor_stats_pkey PRIMARY KEY (id)
);