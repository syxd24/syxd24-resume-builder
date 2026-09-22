---
name: resume-editor
description: Implement FlowCV-like resume content and customization editing, drag/reorder, rich text, autosave state and persistent design controls using the canonical schemas.
---

# Resume Editor Skill

Read:
- `/AGENTS.md`
- `/PROJECT_STATE.md`
- `/docs/EDITOR_SPEC.md`
- `/docs/FLOWCV_SETTINGS.md`
- `/docs/INTERACTIONS.md`
- relevant `/docs/VISUAL_SPEC.md` sections
- canonical schemas

For Content tasks own `src/features/editor/content/**`.
For Customize tasks own `src/features/editor/customize/**` unless the coordinator assigns narrower ownership.

Rules:
- no direct Supabase calls from field components;
- all persistent values map to canonical schema fields;
- preview updates immediately from local state;
- autosave coordinator handles persistence, not each input;
- every drag order/visibility/column assignment persists;
- do not show nonfunctional controls;
- do not invent undocumented hidden FlowCV features.

Verify reload persistence for every control implemented.
