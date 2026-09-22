---
name: visual-pdf-qa
description: Run visual regression and PDF fidelity QA for the FlowCV-style editor and single resume renderer using fixed fixtures, page geometry checks, screenshots and semantic PDF checks.
---

# Visual / PDF QA Skill

Read:
- `/AGENTS.md`
- `/docs/VISUAL_SPEC.md`
- `/docs/RENDERER_SPEC.md`
- `/docs/FLOWCV_SETTINGS.md`
- `/docs/ACCEPTANCE_TESTS.md`

Use fixed viewport and fixture data. Disable animations for screenshot tests.

Verify separately:
1. app/editor chrome (dashboard, Content, Add Content, Customize);
2. resume document rendering;
3. PDF semantics and page geometry.

For visual discrepancies, report concrete evidence such as width/spacing/font/page-break differences instead of vague judgments.

PDF must keep selectable text, links, fonts, A4/Letter dimensions and material preview parity. Never approve a rasterized screenshot PDF.
