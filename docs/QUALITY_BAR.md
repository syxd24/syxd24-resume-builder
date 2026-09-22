# Quality Bar — Non-Negotiable

This application must feel as easy and polished to edit as the supplied FlowCV references while producing professional, typography-accurate resumes. Do not trade away editing quality, print quality, or visual fidelity for implementation speed.

## Resume output quality

- The resume renderer is the highest-priority subsystem.
- Text in exported PDFs must remain selectable/searchable; never export the whole page as a raster screenshot.
- Font rendering must be crisp at normal and high-DPI displays and in PDF output.
- Use properly licensed/open fonts. If the exact reference font is unavailable, choose the closest metrically/visually compatible alternative and document the difference.
- Body text, headings, name, entry headings, dates, icons, rules and bullets must have consistent baseline alignment and optical spacing.
- Respect A4 and Letter physical dimensions, margins, line height and page breaks.
- Prevent orphaned headings, clipped text, overlapping sections and accidental split of small entries across pages.
- Links in PDF output must remain clickable.
- The live editor preview, dashboard thumbnail and exported PDF must be driven by the same renderer/layout tokens so the user does not see different typography or pagination after export.

## Editing experience

The target is FlowCV-like ease of use, not merely feature presence.

- Immediate live preview after every edit.
- Autosave must be quiet, reliable and visible through a small Saving/Saved/Error state.
- Section cards must be easy to scan, expand/collapse, reorder, hide and edit.
- Adding content must use the supplied modal pattern and section catalog.
- Customize navigation must stay persistent and fast to switch between Document, Layout, Font Size, Spacing, Entries, Headings, Font, Colors, Header, Photo, Links, Footer and Sections.
- Sliders/segmented controls/dropdowns must update the preview without a page reload.
- Drag-and-drop must have clear hover/drop affordances.
- Density should match the reference product: compact controls, generous whitespace around groups, no oversized generic SaaS UI.
- Desktop interaction quality is the priority for v1.

## Golden resume fidelity

Use `fixtures/golden-resume.json` and the supplied real CV references as regression targets for realistic density. A one-page technical CV with dense experience/projects/skills and a one-page customer-service CV with dense languages/skills must render cleanly without forced oversizing or excessive whitespace.

## Acceptance gate

Do not mark renderer/editor work complete unless all of the following are true:

1. the same content produces stable pagination across repeated renders;
2. changing font size, line height, margins, column width and section order updates preview immediately and persists after reload;
3. exported PDF matches the live preview in structure, typography, spacing and page count;
4. dense one-page fixtures remain readable and professional;
5. no full-page rasterization is used;
6. the editor is fast enough that ordinary typing, reordering and settings changes feel immediate on a normal laptop;
7. visual QA compares screenshots/PDFs against the supplied FlowCV references before sign-off.
