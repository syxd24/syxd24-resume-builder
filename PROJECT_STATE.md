# Project State

## Product
Personal, single-owner resume builder with a FlowCV-like desktop workflow and editing depth.

## Locked decisions
- No user-facing login or account system.
- No public resume webpage/share URL.
- PDF download is required.
- PDF sharing means producing a clean downloadable PDF the owner can send anywhere; no hosted public CV page is required.
- Import existing resume is required: PDF, DOCX, TXT. Import should prefill editable structured resume content and preserve the original source file.
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

RLS is enabled and anon/authenticated table grants are revoked. The web app must access Supabase from trusted server-side code only.

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

Two real one-page CV PDFs were supplied and must be used as realistic regression fixtures: Syed Suhel Ahmed and Jana Szefler.

## Current milestone status
- Product evidence: sufficient for v1 specification.
- Supabase foundation: created remotely.
- Repository specification: in progress.
- Application foundation: pending Codex.
- Dashboard: pending.
- Editor: pending.
- Renderer/PDF: pending.
- Import: pending.
- QA: pending.
