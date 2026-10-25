# Project State

## Product
Personal, single-owner resume builder with a FlowCV-like desktop workflow and editing depth.

## Locked decisions
- No application-level user-facing login/account system.
- Production must be private through Vercel Authentication / Deployment Protection rather than exposing the personal dashboard publicly.
- No public resume webpage/share URL.
- PDF download is required.
- PDF sharing means producing a clean downloadable PDF the owner can send anywhere; no hosted public CV page is required.
- Import existing resume is required: PDF, DOCX, TXT. Import should prefill editable structured resume content and preserve the original source file privately.
- Desktop editor only for v1.
- Vercel Free deployment.
- Supabase Free for persistence/storage.
- One production-quality resume template, not a template marketplace.
- Practical resume count is unlimited; expected use is 4-5 resumes.

## Existing backend
Supabase project ref: `nfivvjwpxyelnrdayhbf`.

Initial schema already exists remotely:
- `public.resumes`
- `public.resume_imports`
- private bucket `resume-assets`
- private bucket `resume-imports`

RLS is enabled and anon/authenticated table grants are revoked. The web app must access Supabase from trusted server-side code only. Security advisor currently reports only the expected informational notice that RLS-enabled tables have no client policies; this is intentional because browser roles have no table access.

Repository migrations reproduce the remote foundation under `supabase/migrations/`.

## Canonical ownership contracts to create during foundation
- Resume schema: `src/domain/resume/schema.ts`
- Design schema: `src/domain/resume/design-schema.ts`
- Repository/data access: `src/data/resumes/`
- Renderer: `src/features/resume-renderer/ResumeRenderer.tsx`

After foundation these contracts should be treated as stable interfaces; parallel workers must not casually mutate them.

## Target routes
- `/` -> redirect to resume library
- `/resumes` -> My Resumes library
- `/resumes/[resumeId]` -> editor
- `/api/resumes/*` -> trusted server-side CRUD/autosave/export support as needed
- `/api/import/*` -> import pipeline as needed

## Product reference evidence supplied by owner
Screenshots show:
- FlowCV-style My Resumes library with New resume card and saved resume cards.
- New-resume/template selection flow.
- Editor top navigation: Overview, Content, Customize, AI Tools, resume selector, Download, overflow menu.
- Content editor with live page preview.
- Add Content modal with Education, Professional Experience, Skills, Languages, Certificates, Interests, Projects, Courses, Awards, Organisations, Publications, References, Declaration and Custom.
- Customize navigation: Document, Templates, Layout, Font Size, Spacing, Entries, Headings, Font, Colors, Header, Photo, Links, Footer, Sections.
- Document settings shown: language, date format, page format.
- Font Size settings shown: Base Font Size, Full Name, Section Headings, Entry Header.
- Spacing controls shown: Line Height and Space Between Elements, with additional spacing controls expected in the same pattern.
- Font controls shown: Body Font and Name Font.
- Colors controls shown: Full Page/Header/Border targets, Single/Multi/Image modes, palette, and checkboxes determining where accent color applies.
- Header controls shown: text alignment, details arrangement, line style and advanced settings.
- Photo, Link Styling, Footer and Section Customizations are visible as separate configurable groups.

Two real one-page CV PDFs were supplied during specification and used to derive realistic section-density requirements. Because the GitHub repository is public, personal contact details/source PDFs are not committed; `fixtures/golden-resume.json` is anonymized but preserves similar density and section variety.

## Repository readiness
The repository now contains:
- root Codex instructions
- locked scope/product/editor/dashboard/renderer/import specifications
- FlowCV settings/evidence map
- canonical domain-schema requirements
- database/storage contract and migrations
- visual/interaction specs
- feature matrix and acceptance tests
- credit-efficient multi-agent orchestration
- scoped Codex Skills
- anonymized golden resume/default design fixtures
- environment/security/deployment guidance
- `CODEX_KICKOFF.md`
- GitHub issue #1 as the implementation entry point

## Current milestone status
- Product evidence: sufficient for v1 specification.
- Supabase foundation: complete remotely and documented.
- Repository specification/agent architecture: complete for v1 kickoff.
- Application foundation: complete (2026-09-22). Next.js/strict TypeScript, pinned dependencies/lockfile, server-only environment and Supabase client, canonical Zod domain/design contracts, typed repositories with `lock_version` conflict protection, CRUD/autosave API contracts, import/export interfaces, and Vitest/Playwright/lint scaffolding are in place.
- Foundation gates: TypeScript, lint, 8 unit tests, production build, and the 1-test Chromium shell smoke check pass.
- Locked interfaces: `src/domain/resume/schema.ts`, `src/domain/resume/design-schema.ts`, and `src/data/resumes/` are coordinator-owned after Foundation; feature workers must propose changes rather than edit them concurrently.
- Dashboard: implemented with persisted CRUD, real shared-renderer thumbnails, loading/error states, and direct PDF download.
- Editor: implemented with all content/customize controls, accessible ordering, photo workflow, live preview, and serialized 750 ms optimistic autosave with retry.
- Renderer/PDF: implemented as one semantic A4/Letter renderer for preview/thumbnail/print, deterministic multipage splitting, private signed assets, and selectable-text Chromium PDF export.
- Import: implemented for PDF/DOCX/TXT with private-source-first storage, conservative classification, fallback content preservation, and retry/delete failure handling.
- Integration gates (2026-09-26): Next.js 16.3.6 production build passes with 14 routes; TypeScript and lint pass; 59 unit/component/persistence tests pass; `npm audit` reports zero vulnerabilities.
- Persistence/security QA: complete for repository round trips, optimistic conflicts, stale autosave ordering, server-only secrets, private storage, anonymous denial, private import retention, and reference-aware photo cleanup. Live Supabase catalog/data probes passed against project `nfivvjwpxyelnrdayhbf`.
- Visual/PDF QA: 11 Playwright checks pass across desktop/mobile dashboard, tablet/mobile editor, content/customize controls, golden renderer, seven-page stress renderer, and A4/Letter PDF generation. Semantic inspection confirms selectable text, embedded Palatino fonts, clickable links, page geometry, and preview/PDF page parity.
- Responsive polish: dashboard and editor layouts adapt without horizontal document overflow at 390 px and 1024 px, controls wrap/stack cleanly, and interactive motion respects reduced-motion preferences.
- Local acceptance automation: `tests/e2e/live-workflows.spec.ts` covers blank create, save/reload, duplicate, delete, PDF/DOCX/TXT import, photo upload, PDF export, and cleanup. It is intentionally gated by `npm run env:check` and cannot run until the ignored `.env.local` contains the server-only Supabase secret.
- Import/personal-details milestone (2026-10-20): header-aware PDF/DOCX/TXT classification now maps contact data, links, work authorization, visa/nationality/date-of-birth details, section entries, dates, locations, and bullets without creating a spurious `Imported Content` section for recognized source text. Personal details now support typed and custom fields with edit, order, visibility, and removal controls. The shared renderer uses distinct, high-contrast contact icons in preview, thumbnails, print, and PDF.
- Milestone gates (2026-10-20): strict TypeScript, lint, the full unit/component suite, the Chromium shell smoke test, the 15-test visual/PDF suite, and the Next.js 16.3.6 production build pass. Regression coverage includes the supplied malformed-import layout, legacy documents without optional details, editor field operations, icon selection/visibility, custom-field preview behavior, multipage layout, A4/Letter geometry, PDF text, and PDF links.
- Production infrastructure check (2026-10-20): Vercel production environment variable names and deployment linkage are present. Supabase project `nfivvjwpxyelnrdayhbf` is `ACTIVE_HEALTHY`, and the live acceptance workflow passes create/save/reload, custom-detail persistence/removal, duplication/deletion, PDF/DOCX/TXT import, photo storage, PDF export, and test-artifact cleanup.
- PDF export production fix (2026-10-20): server-side Chromium now opens the print route on the origin of the incoming export request instead of the separately configured `APP_URL`, preventing Vercel exports from falling back to `http://localhost:3000`. The export route also explicitly traces Chromium's Brotli runtime assets and resolves them from the stable project-root package path rather than a Turbopack-generated junction. The regression test, full 76-test suite, TypeScript, lint, production build, and a real 161 KB local PDF export pass.
- Editor UX overhaul (2026-10-25): experience and other long-form fields now use one safe unified rich-text surface with inline marks, semantic lists, links, multi-bullet paste, native undo/redo, and legacy `RichText` compatibility. The desktop editor is a contained 45/55 independently scrolling workspace with an accessible draggable divider, fit-width/fit-page/100% zoom, mobile edit/preview tabs, refreshed entry cards, and a sticky Done action. The shared renderer and pagination model preserve line breaks and list geometry in preview, thumbnails, and PDFs. TypeScript, lint, the full unit suite, production build, 17 visual/PDF checks, and the live Supabase create/save/reload/export/import/upload/cleanup workflow pass.

## Next action
Deploy the editor overhaul and run a short production smoke check for rich-text save/reload and PDF output.
