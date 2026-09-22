---
name: persistence-qa
description: Verify that every resume/editor/design action truly persists through the trusted server/Supabase path, survives reload, handles stale autosave ordering, and keeps private data inaccessible to anonymous clients.
---

# Persistence QA Skill

Read:
- `/AGENTS.md`
- `/docs/DATABASE.md`
- `/docs/INTERACTIONS.md`
- `/docs/ACCEPTANCE_TESTS.md`
- `/docs/FEATURE_MATRIX.md`

Primary objective: catch controls that appear to work in React but are not stored/restored.

Test:
- create/list/get
- content round trip
- design round trip
- section/entry order
- column placement
- rename/duplicate/delete
- photo asset path/transform
- import records
- rapid autosave stale-request ordering
- simulated save failure/retry
- browser bundle secret leakage
- anonymous database/storage access denial

Do not declare a feature persistent based only on successful API status; hard-refresh and verify exact restored state.
