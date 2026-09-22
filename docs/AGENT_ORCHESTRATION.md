# Codex Agent Orchestration

## Goal
Minimize repeated context/token usage while still using parallel work where it is safe. The repository files are the shared brain. Do not paste the full specification into every subagent prompt.

## Universal rule
Every worker reads:
- root `AGENTS.md`
- `PROJECT_STATE.md`
- only the domain docs explicitly listed for that worker
- existing code in its ownership area

Workers should not independently reread every screenshot/spec unless necessary.

## Phase 0 — coordinator audit
One coordinator only.
Tasks:
1. read required root docs;
2. inspect repository state;
3. make concise implementation plan;
4. create/confirm package scripts and milestone checklist;
5. do not start parallel workers until canonical domain contracts are merged.

## Phase 1 — foundation (SERIAL)
One Foundation agent owns:
- Next.js/TypeScript setup
- dependencies
- environment validation
- Supabase server client
- canonical `ResumeDocument` Zod/types/defaults
- canonical `ResumeDesign` Zod/types/defaults
- data repository interfaces
- basic route/server-action contracts
- test/lint/Playwright scaffolding
- import/export interfaces, not full implementations

Read:
- `docs/SCOPE.md`
- `docs/PRODUCT_SPEC.md`
- `docs/DATABASE.md`
- `docs/FLOWCV_SETTINGS.md`

May modify shared files such as package.json and canonical schemas.

Foundation exits only after typecheck/lint/build succeeds. After merge, canonical schema files are locked interfaces; later agents propose coordinator-owned changes instead of racing on them.

## Phase 2 — parallel feature workers
Run these simultaneously only after Foundation.

### Worker A: Dashboard / library
Owns:
- `src/features/dashboard/**`
- library page components/routes that do not alter canonical schemas

Reads:
- `docs/PRODUCT_SPEC.md` sections 2-3
- `docs/INTERACTIONS.md`
- `docs/VISUAL_SPEC.md` dashboard section

Builds:
- My Resumes grid
- New resume
- real renderer thumbnail integration
- rename/duplicate/delete menus
- loading/empty/error states
- direct dashboard download wiring to shared export interface

Must not implement a second thumbnail renderer.

### Worker B: Content editor
Owns:
- `src/features/editor/content/**`
- shared editor shell only if coordinator assigns it exclusively

Reads:
- `docs/PRODUCT_SPEC.md` sections 4-8
- `docs/INTERACTIONS.md`
- Add Content portion of `docs/FLOWCV_SETTINGS.md`
- `docs/VISUAL_SPEC.md` editor/content sections

Builds all content section editing, Add Content modal, rich text, visibility, entry CRUD/reorder and autosave UI integration.

Does not own document visual renderer internals.

### Worker C: Customize editor
Owns:
- `src/features/editor/customize/**`

Reads:
- `docs/FLOWCV_SETTINGS.md`
- `docs/INTERACTIONS.md`
- `docs/VISUAL_SPEC.md` customize section

Builds every required design control and binds them to canonical `ResumeDesign`.

Does not invent hidden FlowCV settings. Follow documented requirements.

### Worker D: Resume renderer
Owns:
- `src/features/resume-renderer/**`
- print stylesheet associated exclusively with renderer

Reads:
- `docs/PRODUCT_SPEC.md` rendering/export sections
- `docs/FLOWCV_SETTINGS.md`
- `docs/VISUAL_SPEC.md`
- fixture data

Builds the single high-quality template, A4/Letter, one/two columns, typography/colors/spacing/header/photo/links/footer, multi-page behavior.

Must not build separate dashboard/PDF templates.

### Worker E: Import
Owns:
- `src/features/import/**`
- import route handlers if assigned exclusively

Reads:
- import sections of `docs/PRODUCT_SPEC.md`
- `docs/DATABASE.md`
- `docs/INTERACTIONS.md`

Builds zero-paid-service PDF/DOCX/TXT extraction, private source storage workflow, section classification, error/retry behavior.

Never invent missing resume facts. Preserve unclassified material.

## Phase 3 — integration (SERIAL)
One Integration agent owns shared wiring:
- resolve imports/contracts
- editor shell composition
- autosave orchestration
- renderer connections to dashboard/editor/export
- route integration
- any canonical schema changes proposed by workers
- package/shared config changes

Integration agent does not redesign feature work without a failing requirement.

Run full typecheck/lint/unit/build before QA.

## Phase 4 — parallel QA

### Worker F: Persistence/security QA
Reads:
- `docs/DATABASE.md`
- `docs/ACCEPTANCE_TESTS.md`
- `docs/FEATURE_MATRIX.md`

Tests create/edit/reload/duplicate/delete/autosave ordering/import storage/security. Files issues or minimal scoped fixes. Prioritize the exact failure mode from the previous prototype: controls that appear to work but are not persisted.

### Worker G: Visual/PDF QA
Reads:
- `docs/VISUAL_SPEC.md`
- `docs/FLOWCV_SETTINGS.md`
- `docs/ACCEPTANCE_TESTS.md`
- fixture data

Runs Playwright fixed-viewport screenshots and PDF inspection. Reports discrepancies by feature/measurement rather than vague 'looks different'.

## Phase 5 — targeted fixes
Coordinator routes each defect to the module owner. Avoid a single giant 'fix everything' context.

Examples:
- DB/reload failure -> persistence/data owner
- editor control state -> content/customize owner
- preview/PDF discrepancy -> renderer owner
- dashboard visual/behavior -> dashboard owner
- parser -> import owner

## File ownership / collision policy
Parallel agents must not edit the same files simultaneously.

Suggested ownership:
- `src/domain/**` -> Foundation/Coordinator only after Phase 1
- `src/data/**` -> Foundation/Integration
- `src/features/dashboard/**` -> Dashboard worker
- `src/features/editor/content/**` -> Content worker
- `src/features/editor/customize/**` -> Customize worker
- `src/features/resume-renderer/**` -> Renderer worker
- `src/features/import/**` -> Import worker
- `tests/**` -> QA workers in separate clearly named files
- `package.json`, root configs -> Foundation/Coordinator only

## Credit-saving prompt templates
Coordinator should send short prompts, e.g.:

`Use the repository instructions. You are the Renderer worker from docs/AGENT_ORCHESTRATION.md. Read only the renderer-listed docs and existing canonical schemas. Implement your ownership area, run scoped tests, and report changed files + failures.`

Do not paste entire product specs into subagent prompts.

## Status memory
Update `PROJECT_STATE.md` after each merged phase with only concise status and locked decisions. Do not use chat history as project memory.

## Completion gate
The coordinator may declare complete only when:
- feature matrix is actually verified;
- acceptance tests pass;
- production build passes;
- database persistence and security checks pass;
- visual/PDF QA has no material open defects.
