# Farsi Plays Database — Project State (2026-08-13)

> Purpose: seed document for a fresh AI chat session. Contains everything needed to continue work without prior context.

---

## 1. Overview

- **Project:** بانک اطلاعات نمایشنامه‌های فارسی / Farsi Plays Database
- **Mission:** open-source, research-oriented catalog of Persian-language plays and performance texts
- **Live:** https://farsiplays.netlify.app
- **Repo:** https://github.com/Keyvansar/farsi-plays-db
- **Version:** 0.1.0
- **UI:** Persian, RTL (`dir="rtl"` on containers). No i18n yet. Bilingual README.

## 2. Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS 4 |
| Forms/Validation | React Hook Form + Zod |
| Routing | React Router DOM 7 |
| Backend/DB | Supabase (PostgreSQL) |
| Linting | Oxlint (`npm run lint`) |
| Hosting | Netlify |

## 3. Repository Structure

```text
src/
├── App.jsx                  # auth state + router + nav layout + ProfileSetupGate (name+password on first login)
├── main.jsx
├── lib/supabase.js          # Supabase client (import.meta.env)
├── schemas/editionSchema.js # SHARED Zod schema (Submit + Edit single source of truth)
├── hooks/
│   ├── useSearch.js         # URL-synced search state + search_editions RPC fetch + pagination
│   └── useCastTotal.js      # shared cast auto-calculation (men+women+nonspecific)
├── utils/textUtils.js       # normalizeFarsi, parseNamesToArray (Persian typography handling)
└── components/
    ├── LoginForm.jsx
    ├── SubmitView.jsx       # draft persistence, duplicate detection, role-aware routing
    ├── ModerationView.jsx   # pending queue, bulk approve/reject via RPC
    ├── AccountView.jsx      # display name + password change, role display
    ├── ResetPasswordView.jsx# /reset-password route (Supabase recovery token)
    ├── ui/
    │   ├── Modal.jsx            # shared modal: focus trap, Escape, aria-modal, backdrop click
    │   ├── ErrorBoundary.jsx    # class boundary wrapping each route
    │   ├── FieldError.jsx       # role="alert" error text, aria-describedby wiring
    │   ├── AutocompleteSelect.jsx # debounced multi-select; CRASH-PROOF: normalizes any option shape
    │   └── SearchSkeleton.jsx
    ├── search/
    │   ├── SearchView.jsx       # pure UI; uses useSearch
    │   ├── FilterSidebar.jsx    # 3× AutocompleteSelect + scalar filters; NO preloaded options
    │   ├── SearchResults.jsx / PlayCard.jsx / Pagination.jsx
    │   ├── PlayDetailModal.jsx
    │   ├── EditModal.jsx        # moderators: direct apply with confirmation diff
    │   ├── EditSuggestModal.jsx # mode prop: 'suggest' | 'flag'
    │   └── DeleteConfirmModal.jsx
    └── submit/
        ├── RequiredFields.jsx   # props: isCheckingDuplicate, lockedFields
        ├── OptionalFields.jsx   # props: castWarning, lockedFields; contains TagsSection + ExternalLinksSection
        ├── TagsSection.jsx      # useFieldArray; props: lockedFields
        ├── ExternalLinksSection.jsx
        └── DuplicateWarning.jsx # props: matches, selectedMatch, onSelect, isChecking, isCompleting, onChange
```

Root files: `README.md` (bilingual, finalized), `LICENSE` (MIT), `.env.example`, `SECURITY.md`, `CONTRIBUTING.md`, `.prettierrc`, `.github/workflows/ci.yml` (oxlint + build), `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md`, `public/_redirects`, `supabase_schema.sql` (consolidation in progress).

## 4. Database (Supabase PostgreSQL)

### Tables
`works` (playwright_fa[], source_language, original_title) · `farsi_editions` (work_id FK, title_fa, translator_fa[], publisher, publication_status, years solar/gregorian/original, isbn, page_count, cast_* ints, synopsis, is_verified, flag_count, collection fields) · `taxonomy` (label_fa, category, is_approved) · `edition_tags` (M2M) · `external_references` (url, ref_type) · `pending_submissions` (action_type enum: new_submission | edit_suggestion | flag | delete_suggestion; payload jsonb) · `edit_history` · `flags` · `user_roles` (guest|contributor|moderator|admin) · `contributor_stats`

### Constraints / indexes
- `external_references.url` CHECK `^https?://`
- Unique index on `flags(edition_id, user_id, flag_type) WHERE user_id IS NOT NULL`

### RPC functions (all SECURITY DEFINER)
- `search_editions(...)` — full server-side filter + pagination + total_count (text scopes, arrays, tags AND-logic, year/cast ranges, booleans)
- `search_playwrights(search_term, limit)` / `search_translators(...)` — prefix match on FIRST or LAST name (`ILIKE 'ت%' OR ILIKE '% ت%'`)
- `search_tags(search_term, limit)` — approved taxonomy only
- `approve_pending_submission(submission_id)` — strict field whitelist; handles all 4 action types
- `get_user_role()` — current user's role

### Triggers
- `handle_new_user` — invited users (invited_at NOT NULL) auto-get `moderator` role; wrapped in EXCEPTION guard

### Security model
- RLS enabled on all tables; untrusted writes go through `pending_submissions`
- Invite-only accounts (Supabase dashboard invites)
- Only anon key in browser; `.env.local` git-ignored

## 5. Auth & Deployment Config (already done)

- Supabase Auth → URL Configuration: Site URL `https://farsiplays.netlify.app`, redirect includes `/reset-password`
- Reset-password email template links to `{{ .SiteURL }}/reset-password`
- Netlify SPA routing via `public/_redirects`: `/*  /index.html  200`
- First-login gate forces display_name + password (App.jsx ProfileSetupGate)

## 6. Key Behaviors (do not regress)

- **SubmitView:** localStorage draft (`submission_draft`) with debounce + `skipDraftSave` ref; 10s client cooldown; duplicate detection (normalized title, 800ms debounce); "complete this record" flow = `reset()` pre-fill + `lockedFields` map; moderators insert directly (verified), others queue as `new_submission`; completing duplicate as non-moderator queues per-field `edit_suggestion`s for previously-empty fields
- **EditModal:** diff confirmation step; works-table fields (playwright_fa, original_title, source_language) routed to `works`; Farsi comma split `/[,،]/` for array fields; tags/links diffed and applied
- **AutocompleteSelect:** internally normalizes options (string | {name} | {id,label_fa} | {value,label}) — FilterSidebar mapping mistakes can no longer crash the app
- **Search:** all filtering server-side via `search_editions`; URL params persist filters (q, scope, page, pw, tr, tags, src, ymin/ymax, status, cmin/cmax, ver, syn, col, lnk)

## 7. Completed Work (Phases 1–14) — DO NOT redo

1–7: DB foundation, search UI, duplicate/merge UX, edit/suggest workflow, flag/delete, moderation dashboard, best practices · 8: critical bug fixes (works-table edits, Farsi comma split, merge includes tags/links, URL sanitization) · 9: security round 2 (RPC whitelist, unique flags, trigger guard) · 10: `search_editions` RPC architecture · Extra: accounts/password reset · 11: shared schema/Modal/ErrorBoundary/FieldError/useCastTotal, try/catch, console cleanup · 12: useSearch hook + debounced crash-proof autocomplete · 13: a11y (focus trap, aria-live count, aria-describedby, skeletons) · 14: README/LICENSE/.env.example/SECURITY.md/CONTRIBUTING.md/issue templates/CI/.prettierrc/version 0.1.0

## 8. Open Items & Roadmap

**Phase 15 — Testing (next):** Vitest + RTL unit tests (`textUtils`, `editionSchema`, `useCastTotal`); component tests (`LoginForm`, `PlayCard`); E2E critical path (search → detail)
**Phase 16 — Backlog:** gradual TS migration (start `supabase gen types`), React Query, server-side submission rate limit, FTS/pg_trgm indexes, CSV/JSON export, English UI, PWA, cover images (Supabase Storage), contributor analytics, `supabase db dump` schema consolidation, App.jsx/ModerationView split + React.lazy (optional)

## 9. Rules for the AI Assistant

1. When editing code >10 lines, provide the COMPLETE updated file
2. Treat attached log files as STALE unless the user pastes a fresh error inline in the message body
3. The AutocompleteSelect `[object Object]` crash is RESOLVED — never re-litigate it
4. Wrap large markdown deliverables in 4-backtick fences (inner ``` must not break the outer fence)
5. Persian UI strings inline; keep RTL; keep bilingual section headers in docs
6. Server-side filtering only (RPCs); never client-side filtering of large arrays
7. `editionSchema.js` is the single validation source; shared UI lives in `components/ui/`

## 10. Known Quirks / Lessons Learned

- Copying RENDERED markdown from chat strips `#`/`-` markers → always copy from code blocks or use 4-backtick fences
- Nested triple-backtick fences inside a triple-backtick fence break the outer fence
- Stale re-attached files cause "ghost memory" confusion → user will state current status explicitly; trust explicit statements over attachments
- Supabase RPCs returning tables yield arrays of row OBJECTS (`{name}`, `{id,label_fa}`) — always extract fields or normalize

## 11. Quick Commands

```bash
npm install && npm run dev     # local dev
npm run lint                   # oxlint
npm run build                  # production build
```

---
*End of state document. Continue from Phase 15 (Testing) unless the user specifies otherwise.*