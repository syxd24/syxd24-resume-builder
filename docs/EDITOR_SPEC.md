# Editor Specification

## Route
`/resumes/[resumeId]`

## Shell
Desktop-first split editor based on supplied FlowCV references.

Top toolbar:
- back/library or Overview control
- Content
- Customize
- resume title/selector area
- Download
- overflow menu

Do not implement AI Tools.

Main workspace:
- left: content/customize controls
- right: live physical page preview
- muted app/workspace background, white paper

## Content mode
### Personal details card
Show compact contact summary plus edit affordance and photo area. Editing supports full name, job title, email, phone, location/address, website and arbitrary named links.

### Section cards
- icon + heading
- expand/collapse
- drag handle distinct from expand/collapse
- optional `Edit Heading`
- expanded entry rows
- visibility toggle
- Add Entry where applicable
- delete where applicable

### Add Content modal
Mirror supplied reference structure: large modal with import banner and desktop grid of section choices. Required choices and order where practical:
1. Education
2. Professional Experience
3. Skills
4. Languages
5. Certificates
6. Interests
7. Projects
8. Courses
9. Awards
10. Organisations
11. Publications
12. References
13. Declaration
14. Custom

Summary/Profile and Personal Details are core editor concepts and need not appear as optional tiles if always present.

## Rich text
Use a lightweight structured editor, not raw untrusted HTML if avoidable. Required marks/features:
- bold
- italic
- underline
- links
- unordered list
- ordered list
- paragraphs/line breaks

Rendering/export must sanitize and preserve semantic content.

## Reordering
Use accessible drag-and-drop (e.g. dnd-kit):
- section order
- list entry order
- section placement between primary/secondary columns in layout mode

Persist order as canonical document/layout state immediately through autosave.

## Customize mode
Far-left category rail + settings cards + preview. Categories and settings are defined in `FLOWCV_SETTINGS.md`.

Control conventions:
- dropdown for enumerated values
- slider + numeric/relative value + +/- buttons for stepped sizes/spacing
- color picker + hex field
- segmented/chip selectors for layout variants
- checkboxes/switches for semantic toggles

Every design control must write to canonical `ResumeDesign`; no local-only design settings.

## Autosave
Editor local state is optimistic and immediate. Autosave coordinator owns persistence, not individual form fields.

Requirements:
- debounce target 750ms
- coalesce rapid changes
- optimistic concurrency with `lock_version`
- status: Saving / Saved / Save failed – Retry
- retain unsaved state on failure
- flush pending save on deliberate route change where possible
- warn only when there is a real risk of losing unsaved local changes

## Form behavior
- Do not save on every keypress directly to Supabase.
- Fields use controlled/shared form state or predictable state store.
- Validation should be helpful, not overly strict: phone/location/job-title can be free text.
- URL fields should normalize common missing protocols without corrupting display labels.
- Date fields support month/year resume use; do not require exact day for jobs/education.

## Undo/redo
Optional for v1. If implemented, use document-state history that also handles design changes coherently. If not implemented, do not show nonfunctional undo/redo controls even if visible in FlowCV reference screenshots.

## Keyboard/accessibility
- Tab order follows visible controls.
- drag actions have keyboard alternative where library permits.
- icons have accessible names/tooltips.
- destructive actions cannot be triggered by ambiguous icon-only controls without accessible labeling.
