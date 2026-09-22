---
name: resume-builder-orchestrator
description: Coordinate implementation of the personal FlowCV-style resume builder with credit-efficient subagents, strict file ownership, milestone gates, persistence checks, and visual/PDF QA.
---

# Resume Builder Orchestrator

Before implementation read:
- `/AGENTS.md`
- `/PROJECT_STATE.md`
- `/docs/AGENT_ORCHESTRATION.md`
- `/docs/FEATURE_MATRIX.md`
- `/docs/ACCEPTANCE_TESTS.md`

## Workflow
1. Audit repository and current milestone.
2. Run Foundation serially.
3. Lock canonical domain/data interfaces.
4. Launch only independent workers described in `AGENT_ORCHESTRATION.md`.
5. Prevent workers from editing the same files concurrently.
6. Integrate serially.
7. Run persistence/security QA and visual/PDF QA in parallel.
8. Route defects back to the owning module.
9. Update `PROJECT_STATE.md` concisely after merged phases.

## Credit discipline
- Do not paste whole product specs into worker prompts.
- Workers read only their listed repository docs and ownership code.
- Reuse fixture/test results rather than asking every worker to re-research the product.
- Prefer targeted follow-up tasks over restarting large-context agents.

## Completion rule
Do not report completion while material `FEATURE_MATRIX` rows remain unchecked or acceptance tests fail.
