# Personal Resume Builder

Private, single-owner resume builder with a FlowCV-like desktop editing workflow, one production-quality template, persistent Supabase storage, PDF/DOCX/TXT import, and professional PDF export.

## Product scope
- My Resumes library with real resume previews
- create / rename / duplicate / delete / download
- live Content + Customize editor
- autosave to Supabase
- one/two-column layout
- professional typography, spacing, heading, color, header, photo, link and footer controls
- A4 + Letter
- PDF/DOCX/TXT import into editable data
- text-based selectable/clickable PDF output
- no billing, subscriptions, AI writing, cover letters, job tracker or public resume webpage
- desktop editor for v1

## Infrastructure
- Next.js + TypeScript
- Supabase Postgres + private Storage
- Vercel Free
- server-side Supabase access; no secret keys in browser code

The remote Supabase foundation is already created. See `docs/DATABASE.md` and `supabase/migrations/`.

## Start here for Codex
Codex must read root `AGENTS.md` and `PROJECT_STATE.md` first. The project is intentionally specification-first so multiple workers can operate with small scoped contexts instead of repeatedly consuming one huge prompt.

Primary docs:
- `docs/PRODUCT_SPEC.md`
- `docs/DASHBOARD_SPEC.md`
- `docs/EDITOR_SPEC.md`
- `docs/RENDERER_SPEC.md`
- `docs/IMPORT_SPEC.md`
- `docs/FLOWCV_SETTINGS.md`
- `docs/DOMAIN_SCHEMA.md`
- `docs/DATABASE.md`
- `docs/VISUAL_SPEC.md`
- `docs/INTERACTIONS.md`
- `docs/FEATURE_MATRIX.md`
- `docs/ACCEPTANCE_TESTS.md`
- `docs/AGENT_ORCHESTRATION.md`

## Codex kickoff prompt
Use a short prompt rather than re-pasting product requirements:

> Use `$resume-builder-orchestrator`. Read the repository instructions and execute `docs/AGENT_ORCHESTRATION.md`. Build the product through Foundation, parallel feature workers, serial integration, and parallel persistence/visual QA. Do not mark complete until the feature matrix and acceptance tests pass.

## Security
Never commit real Supabase secrets. Use `.env.example` as the contract and configure real values in local/Vercel environment variables only.

## Reference data
Automated fixtures are anonymized because this repository is public. The original user-provided CVs and FlowCV screenshots were used to derive the specifications but personal contact data is not committed here.
