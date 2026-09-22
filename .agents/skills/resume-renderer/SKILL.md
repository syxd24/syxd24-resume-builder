---
name: resume-renderer
description: Build or refine the single production-quality resume renderer, physical page layout, FlowCV-like design settings effects, pagination, dashboard thumbnail and text-based PDF output.
---

# Resume Renderer Skill

Read only what is needed:
- `/AGENTS.md`
- `/PROJECT_STATE.md`
- `/docs/RENDERER_SPEC.md`
- `/docs/FLOWCV_SETTINGS.md`
- renderer portions of `/docs/VISUAL_SPEC.md`
- canonical resume/design schemas
- fixture data

Own only `src/features/resume-renderer/**` and assigned print styles.

Rules:
- one renderer shared by editor, thumbnail and PDF;
- do not access Supabase directly;
- every relevant design setting must have a visible rendering effect;
- preserve selectable text and clickable links in PDF;
- no screenshot/raster PDF shortcut;
- A4/Letter and multipage must be tested;
- do not shrink typography unreasonably to force one page.

After changes run scoped unit/visual tests and report concrete remaining visual discrepancies.
