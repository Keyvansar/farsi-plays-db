-- Phase 2: align flag_type_enum with the options offered in the UI.
--
-- UI source (src/components/EditSuggestModal.jsx) offers:
--   wrong_info, duplicate, spam, copyright, other
--
-- Enum previously contained only:
--   wrong_title, wrong_author, wrong_translator, wrong_year,
--   duplicate, inappropriate_content, other
--
-- This migration adds the three missing values so that approving any
-- flag submitted through the UI no longer fails on the enum cast in
-- approve_pending_submission.
--
-- NOTE: keep this migration free of any statement that USES these new
-- values (Postgres does not allow using a newly added enum value in
-- the same transaction that adds it).

ALTER TYPE public.flag_type_enum ADD VALUE IF NOT EXISTS 'wrong_info';
ALTER TYPE public.flag_type_enum ADD VALUE IF NOT EXISTS 'spam';
ALTER TYPE public.flag_type_enum ADD VALUE IF NOT EXISTS 'copyright';