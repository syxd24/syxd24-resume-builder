# Acceptance Tests

These are product-level acceptance tests. Automate with Playwright/unit tests where practical and run manually where browser/PDF inspection is required.

## A. Resume library persistence
1. Open `/resumes` with empty DB fixture.
2. Create `Resume Germany`, `Resume Netherlands`, `Resume Ireland`.
3. Return to library after each.
4. Reload browser.
5. All three remain and most recently edited is first after New Resume.
6. Each card shows actual document thumbnail, title and page format.

Fail if any resume is local-only, disappears after reload, or thumbnail is generic placeholder art.

## B. Resume content round trip
1. Create a resume.
2. Fill personal details.
3. Add Summary, Experience, Education, Skills, Languages, Projects and Certificates.
4. Add at least two entries to Experience and reorder them.
5. Hide one optional section.
6. Wait for `Saved`.
7. Hard refresh.
8. Verify every field, rich-text mark, order and hidden state matches.

## C. Design round trip
1. Change page format.
2. Change base/name/section/entry font sizes.
3. Change body/name font.
4. Change line height and multiple spacing values.
5. Change accent/border colors and accent targets.
6. Change header alignment/arrangement.
7. Change link/footer settings.
8. Move a section to secondary column.
9. Wait for `Saved`, hard refresh.
10. Verify controls and rendered result are identical.

Fail if any control visually works but resets after reload.

## D. Rapid autosave ordering
1. Type quickly into Summary for at least 10 seconds while changing another field.
2. Trigger enough edits to produce overlapping debounce opportunities.
3. Wait for Saved.
4. Reload.
5. Final latest text must be present.

Fail if an older delayed request overwrites newer state.

## E. Save failure recovery
1. Simulate failed save/network interruption.
2. Make edits.
3. Verify local preview keeps edits and status reports failure.
4. Restore connection and retry.
5. Verify persisted state after refresh.

## F. Duplicate independence
1. Fully customize `Resume Germany`.
2. Duplicate it.
3. Confirm new UUID and copied content/design.
4. Edit duplicate name, color and experience.
5. Verify original remains unchanged after reload.

## G. Delete
1. Delete a resume with content.
2. Confirmation must include the resume title or otherwise make target unambiguous.
3. Confirm.
4. Reload library; resume remains absent.

## H. Photo
1. Upload supported image.
2. Crop/reposition and change shape/grayscale if implemented.
3. Verify preview.
4. Reload and verify transform state.
5. Export PDF and verify same photo treatment.
6. Delete/replace photo and ensure stale asset is not rendered.

## I. Add Content coverage
From Add Content modal create each supported section at least once:
Education, Professional Experience, Skills, Languages, Certificates, Interests, Projects, Courses, Awards, Organisations, Publications, References, Declaration, Custom.

Verify each produces a real editable section rather than a placeholder.

## J. Drag/drop
1. Create at least 8 sections.
2. Reorder sections.
3. Reorder Experience entries.
4. Move Skills to secondary column in two-column mode.
5. Reload and verify exact order/placement.

## K. Import PDF
1. Import a representative resume PDF.
2. Original file is stored privately.
3. Parsed resume opens as normal editable data.
4. Verify common sections are classified without inventing unsupported facts.
5. Any unclassified text remains recoverable instead of silently discarded.
6. Edit parsed content, reload, verify persistence.

## L. Import DOCX/TXT
Repeat import checks for DOCX and TXT with supported fixtures.

## M. Import failure
1. Upload malformed/unsupported content with valid extension where possible.
2. Import record becomes failed with understandable error.
3. App remains usable.
4. User can retry or delete failed import.

## N. A4/Letter geometry
1. Render identical resume in A4 and Letter.
2. Preview aspect ratio visibly changes correctly.
3. Export both.
4. PDF page dimensions match selected format.

## O. PDF fidelity
Use the golden realistic fixture.
Verify:
- text selectable;
- links clickable;
- no watermark;
- no browser header/footer;
- typography and colors match preview;
- section/entry order identical;
- photo identical;
- page count agrees with preview pagination;
- no clipped/overlapping content;
- filename derived from resume title.

## P. Multi-page stress
Create intentionally long 3+ page resume.
Verify:
- all content appears once;
- no page overlap;
- section heading is not stranded at bottom when avoidable;
- footer/page number does not collide with body;
- PDF and preview break at materially same locations.

## Q. Dashboard download
Download saved resume directly from overflow menu without opening editor. Verify result uses latest saved design/content.

## R. Security
- Browser bundle does not contain Supabase secret/service-role key.
- Direct anon client cannot SELECT/INSERT/UPDATE/DELETE resume rows.
- Private Storage files are not publicly enumerable/downloadable without trusted server authorization.
- Upload route validates MIME type/size and sanitized paths.

## S. Build quality
Run:
- TypeScript
- lint
- unit tests
- Playwright
- production `next build`

No unresolved runtime console errors in normal library/editor/import/export workflows.

## T. Visual regression
At fixed desktop viewport compare stable screenshots of:
- library
- Content editor
- Add Content modal
- Customize Document
- Customize Font Size
- Customize Colors
- golden resume

Regressions in page scale, panel geometry, typography, or control alignment must be investigated before completion.
