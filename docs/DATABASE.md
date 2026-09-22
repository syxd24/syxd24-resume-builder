# Database and Storage Contract

## Remote project
Supabase project ref: `nfivvjwpxyelnrdayhbf`.

The initial schema has already been applied remotely. Repository migrations must remain the reproducible source for future environments.

## Security model
This app intentionally has no end-user login UI, but resume data is private. Therefore:
- browser code must not get a Supabase secret/service-role key;
- browser code must not have direct public CRUD access to resume tables;
- Next.js server-side code/route handlers perform trusted database/storage operations;
- `public.resumes` and `public.resume_imports` have RLS enabled;
- `anon` and `authenticated` direct table privileges are revoked;
- private Storage buckets have no public access policies.

If a later version adds real user accounts, migrate to user-owned rows and authenticated RLS rather than weakening this boundary.

## `public.resumes`
Purpose: one row per editable resume.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `title text not null default 'Untitled Resume'`
- `content jsonb not null default '{}'`
- `design jsonb not null default '{}'`
- `language text not null default 'en-GB'`
- `page_format text not null default 'A4'`, constrained to A4/Letter
- `sort_order integer not null default 0`
- `source_import_path text null`
- `source_import_type text null`, constrained to pdf/docx/txt
- `lock_version bigint not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes:
- updated_at descending
- sort_order + updated_at descending

`updated_at` is maintained by trigger.

### Content JSON contract
Application code owns schema validation. Store one canonical structured document, approximately:
```json
{
  "version": 1,
  "personal": {},
  "summary": {},
  "sections": [
    {
      "id": "uuid",
      "type": "experience",
      "heading": "Professional Experience",
      "visible": true,
      "column": "primary",
      "entries": []
    }
  ]
}
```

Avoid maintaining duplicated order arrays if order can be represented canonically by array order. If a separate layout map is needed, keep a single documented source of truth.

### Design JSON contract
Application code owns `ResumeDesign` validation/defaults. Use semantic settings, not raw arbitrary CSS:
```json
{
  "version": 1,
  "document": {},
  "layout": {},
  "typography": {},
  "spacing": {},
  "entries": {},
  "headings": {},
  "colors": {},
  "header": {},
  "photo": {},
  "links": {},
  "footer": {},
  "sections": {}
}
```

Never persist transient UI state such as open accordions, hover states or drag previews in `design`.

## `public.resume_imports`
Purpose: track source files and parsing state.

Columns:
- `id uuid primary key`
- `resume_id uuid null references resumes(id) on delete cascade`
- `original_name text not null`
- `storage_path text not null unique`
- `mime_type text not null`
- `status text` constrained to uploaded/parsing/completed/failed
- `error_message text null`
- created/updated timestamps

The source file remains private and can be retained for retry/debugging. Never expose bucket-wide listing publicly.

## Storage buckets
### `resume-assets`
Private. Current remote limits:
- max file size 5 MiB
- allowed: JPEG, PNG, WebP

Recommended object path:
`resumes/<resume-id>/photo/<uuid>.<ext>`

The app should optimize/crop client-side or server-side before upload where practical, but preserve sufficient resolution for print.

### `resume-imports`
Private. Current remote limits:
- max file size 15 MiB
- PDF
- DOCX
- TXT

Recommended path:
`imports/<resume-id-or-pending-id>/<uuid>/<sanitized-original-name>`

## Autosave concurrency
Use `lock_version` or an equivalent updated-at optimistic concurrency strategy to avoid a delayed older save overwriting a newer edit.

Recommended mutation contract:
1. client sends document/design + expected lock version;
2. server updates only if current lock version matches;
3. server increments lock version;
4. conflict returns current server version and requires deterministic reconciliation rather than silent overwrite.

For this single-owner app conflicts are rare, but stale debounced requests can still occur.

## Data access layer
UI components must not call Supabase directly. Create repository functions such as:
- `listResumes()`
- `getResume(id)`
- `createResume()`
- `updateResume(id, patch, expectedVersion)`
- `renameResume(id, title)`
- `duplicateResume(id)`
- `deleteResume(id)`
- `createImport(...)`
- `updateImportStatus(...)`

All route/server-action inputs must be validated.
