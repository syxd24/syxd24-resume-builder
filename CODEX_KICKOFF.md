# Codex Kickoff

Use this exact short instruction in Codex:

> Use `$resume-builder-orchestrator`. Read `AGENTS.md`, `PROJECT_STATE.md`, and `docs/AGENT_ORCHESTRATION.md`, then execute the repository plan. Build Foundation serially, run the independent feature workers in parallel with strict file ownership, integrate serially, then run persistence/security QA and visual/PDF QA in parallel. Use the repository docs/fixtures as the source of truth. Do not stop at scaffolding and do not mark complete until `docs/FEATURE_MATRIX.md` and `docs/ACCEPTANCE_TESTS.md` actually pass.

## Do not paste the full product specification into the Codex prompt
All requirements are already stored in the repository. Subagents should receive only their role name from `AGENT_ORCHESTRATION.md` and read their scoped docs themselves.

## Recommended first coordinator actions
1. inspect repo and confirm empty application state;
2. implement Foundation only;
3. run typecheck/lint/build;
4. update `PROJECT_STATE.md` with completed Foundation contracts;
5. launch Dashboard, Content Editor, Customize Editor, Renderer and Import workers only after canonical schemas/data interfaces exist.

## Environment before live Supabase integration
Codex may build against mocked repository interfaces initially, but before persistence acceptance tests set these in its environment/Vercel project:
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `APP_URL`

Never use a `NEXT_PUBLIC_` secret variable.
