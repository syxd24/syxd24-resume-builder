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
- Application foundation: pending Codex.
- Dashboard: pending Codex.
- Editor: pending Codex.
- Renderer/PDF: pending Codex.
- Import: pending Codex.
- QA: pending Codex.

## Next action
Launch Codex on this repository and execute `CODEX_KICKOFF.md` / issue #1 using `$resume-builder-orchestrator`.
