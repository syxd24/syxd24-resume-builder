# Persistence and Security QA — 2026-09-24

## Automated coverage

Command:

```powershell
node node_modules/vitest/vitest.mjs run --config tests/persistence/vitest.config.ts --configLoader runner
```

Result: **6 files passed, 16 tests passed**.

Covered behavior:

- canonical content/design JSON round trip, including section and entry order, visibility, columns, rich-text spans, and photo transforms;
- create/list/get/update/rename/duplicate/delete repository behavior;
- optimistic `lock_version` conflict rejection;
- serialized autosave ordering and failed-save retry;
- import source-first private storage, uploaded/parsing/completed/failed states, retry, and explicit failed-import deletion;
- upload MIME, size, signature, and path validation;
- server-only secret boundary, migration hardening, and built-browser-chunk secret scan.
- reference-aware photo replacement/removal, resume-delete cleanup, shared-photo preservation, and failed signed-URL rollback.

`--configLoader runner` is required in this workspace. The default bundled config loader attempts to traverse a sandbox-denied parent directory before loading the nested Vitest config.

## Live Supabase verification

Project `nfivvjwpxyelnrdayhbf` reported `ACTIVE_HEALTHY` on Postgres 17.6.1.

Read-only catalog and role probes established:

- `public.resumes` and `public.resume_imports` both have RLS enabled;
- `anon` and `authenticated` have no SELECT, INSERT, UPDATE, or DELETE table privileges on either table;
- direct `anon` SELECT, INSERT, UPDATE, and DELETE attempts against `public.resumes` each failed with SQLSTATE `42501`;
- `resume-assets` is private, limited to 5 MiB, and allows JPEG/PNG/WebP;
- `resume-imports` is private, limited to 15 MiB, and allows PDF/DOCX/TXT;
- there are no browser-access policies on either application table or `storage.objects`;
- `anon` saw zero private-bucket objects, and a direct object INSERT failed RLS with SQLSTATE `42501`;
- `public.set_updated_at()` and `public.rls_auto_enable()` are not executable by `anon` or `authenticated`;
- the Security Advisor reports only two expected INFO notices for RLS-enabled tables with no policies. That is intentional for this trusted-server-only architecture.

A disposable live-data exercise then verified:

- exact section order changed from `summary, experience, skills` to `skills, summary, experience`;
- exact entry order and secondary-column placement survived JSONB storage;
- language/page format and the complete photo transform survived round trip;
- the accepted write advanced `lock_version` from 0 to 1;
- a delayed write constrained to version 0 updated zero rows and did not replace the latest title;
- a duplicate received a different UUID and could change its full name/accent without changing the original;
- an import record linked to the duplicate and was cascade-cleaned with the disposable resume;
- cleanup finished with zero QA resumes and zero QA import rows remaining.

## Photo asset lifecycle closure

The earlier photo lifecycle failure is closed. Server-side cleanup now:

- compares the persisted old and new photo paths after an accepted resume update;
- removes an old object only when no remaining resume JSON references it;
- preserves a photo shared by a duplicate;
- applies the same reference-aware rule after deleting a resume; and
- rolls back a newly uploaded object if signed-URL creation fails.

The persistence suite exercises those cases directly. Live localhost UI/API evidence is recorded separately by the `@live` Playwright workflow once `.env.local` supplies the trusted server key.
