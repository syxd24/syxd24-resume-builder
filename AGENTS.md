# Codex Repository Instructions

## Product objective
Build a production-quality personal resume builder based on the supplied FlowCV reference screenshots and PDFs. Reproduce the interaction model and editing depth, but do not copy FlowCV branding, logos, proprietary source code, or proprietary visual assets.

## Mandatory reading before implementation
Read, in this order:
1. `PROJECT_STATE.md`
2. `docs/SCOPE.md`
3. `docs/PRODUCT_SPEC.md`
4. `docs/FLOWCV_SETTINGS.md`
5. `docs/DATABASE.md`
6. `docs/AGENT_ORCHESTRATION.md`
7. `docs/FEATURE_MATRIX.md`
8. `docs/ACCEPTANCE_TESTS.md`

For visual work also read `docs/VISUAL_SPEC.md` and inspect the supplied reference screenshots/PDFs when available locally.

## Locked architecture
- Next.js + TypeScript, strict mode.
- Supabase Postgres is the source of truth for resume content and design state.
- Supabase Storage is only for binary assets and imported source files.
- The deployed app has no end-user login UI. Supabase secrets stay server-side on Vercel.
- Never expose a Supabase secret/service-role key to browser code.
- One shared `ResumeDocument` schema and one shared `ResumeDesign` schema.
- One shared `ResumeRenderer` must power editor preview, dashboard thumbnail, and print/PDF output wherever technically possible.
- Every persistent editor setting must round-trip through Supabase. No setting may live only in React state.
- Autosave is mandatory and must survive refresh/browser restart.
- One production-quality resume template only.

## Product quality bar
This is not a prototype. Do not leave TODO buttons, fake saves, placeholder controls, generic thumbnails, or disconnected settings. A control is incomplete until its effect is visible in the renderer and persists after reload.

## Implementation conventions
- Prefer small typed modules and explicit domain schemas.
- Use Zod for runtime validation of persisted JSON.
- Separate domain, data access, editor UI, renderer, import, and export concerns.
- Do not couple form components directly to Supabase.
- Use accessible controls and keyboard-operable drag handles/actions.
- Desktop editor is the target. Dashboard may degrade gracefully on narrow screens; full mobile editing is out of scope.

## Testing / definition of done
Before calling any milestone complete:
- run TypeScript checks
- run lint
- run unit tests
- run production build
- run relevant Playwright tests
- verify persistence by refresh/reopen
- verify renderer effects visually

The project is not complete until `docs/FEATURE_MATRIX.md` and `docs/ACCEPTANCE_TESTS.md` pass.

## Scope discipline
Do not implement payments, subscriptions, pricing, cover letters, job tracker, AI writing tools, template marketplace, public resume webpages, or team collaboration unless the user explicitly changes scope.
