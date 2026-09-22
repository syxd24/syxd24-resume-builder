# Product Specification

## 1. Product goal
Build a private resume builder with the editing quality and workflow depth of the supplied FlowCV references, while using an original implementation and one built-in resume template. The app is for one owner and should feel like a polished SaaS product, not an internal CRUD form.

## 2. Resume library (`/resumes`)
The authenticated-account concepts visible in FlowCV are not needed. This app opens directly to the personal resume library.

### Layout
- Left navigation can be minimal: Resume plus a small owner/settings area if useful.
- Main heading: `My Resumes`.
- Responsive card grid on desktop.
- First card is a dashed `+ New resume` card.
- Saved cards show the actual rendered resume scaled down, title, relative edited time, page format and overflow menu.

### Actions
- Click card/thumbnail -> open editor.
- Overflow: Edit, Download PDF, Rename, Duplicate, Delete.
- Delete requires confirmation.
- Duplicate performs a deep copy of content/design/page/language but creates a new UUID and independent future state.
- No free/pro count restriction.

## 3. New resume flow
Clicking `New resume` creates a database row immediately using the default `ResumeDocument` and `ResumeDesign`, then opens the editor. Since v1 has one template, do not reproduce a multi-template marketplace. A small create/import chooser is acceptable:
- Start blank
- Import existing resume

## 4. Editor shell (`/resumes/[id]`)
Desktop-first workspace modeled on the supplied editor references.

### Top toolbar
- Back/Overview or library navigation.
- Content tab.
- Customize tab.
- Resume title/selector area.
- Download button.
- Overflow menu for rename/duplicate/delete.
- Do not implement AI Tools.

### Main area
- Left controls/editor column.
- Right neutral workspace containing white physical page preview.
- Sticky or persistent toolbar where useful.
- Preview updates on every local state change without manual generation.
- Multi-page documents render as stacked physical pages with clear gaps.

## 5. Personal/header content
Fields:
- full name
- job title
- email
- phone
- address/location
- website
- LinkedIn
- GitHub
- arbitrary custom links
- optional profile photo

Allow hiding optional fields. Links must be preserved as clickable URLs in PDF where appropriate.

## 6. Content sections
Implement section types shown in the supplied Add Content reference:
- Education
- Professional Experience
- Skills
- Languages
- Certificates
- Interests
- Projects
- Courses
- Awards
- Organisations
- Publications
- References
- Declaration
- Custom

Also keep Summary/Profile available as a core section.

### Common section behavior
- add section
- rename heading where meaningful
- hide/show
- delete optional section
- reorder sections using drag handle
- place section in primary/secondary column when layout permits
- persist all ordering/visibility/placement

### Entry behavior
For list-like sections: add, edit, duplicate where useful, hide, delete, drag reorder.

## 7. Section field definitions

### Summary/Profile
Rich text with paragraphs, bold, italic, underline, links, bullets and numbered lists. Store structured editor output safely and render predictably.

### Professional Experience
- title/position
- company/employer
- company URL
- location
- start month/year
- end month/year
- current role toggle
- rich description

### Education
- degree/program
- school/institution
- URL
- location
- start/end dates
- current toggle
- description

### Skills
- name
- optional level
- optional description/category

Support text/list and level visualization modes defined by design settings.

### Languages
- language
- proficiency
- optional detail

### Projects
- title
- URL
- subtitle/role
- start/end dates
- description

### Certificates
- certificate/title
- issuer/information
- URL
- date

### Courses
- course title
- provider/institution
- URL
- date or date range
- description

### Awards
- award
- issuer
- date
- URL
- description

### Organisations
- organisation
- role
- location
- URL
- start/end dates
- description

### Publications
- title
- publisher/source
- date
- URL
- description

### Interests
- name
- optional description/URL

### References
- name
- job title
- organisation
- email
- phone
- optional note

### Declaration
- free text declaration
- optional place/date/signature image

### Custom
Custom sections use configurable generic entries: title, subtitle, URL, location, start/end dates and rich description. Multiple custom sections are allowed.

## 8. Autosave
- Local editor state updates immediately.
- Validate through canonical schema.
- Debounce server persistence around 600-1000ms; target 750ms.
- Visible states: `Saving…`, `Saved`, `Save failed – Retry`.
- Failed network save must not wipe local edits.
- Navigation/refresh must not silently lose a pending save; flush or warn appropriately.
- Every persistent content/design field must reload identically.

## 9. Customization
Implement the complete setting inventory in `docs/FLOWCV_SETTINGS.md`. The UI should follow the reference pattern: category navigation at far left, white setting cards in the control column, live paper preview at right.

## 10. Page rendering
- A4 and US Letter.
- Accurate physical aspect ratio.
- Configurable margins/spacing.
- White pages on warm/light-neutral editor workspace.
- One-column and two-column arrangements.
- Multi-page pagination without clipping or overlapping.
- Avoid splitting headings from first content line where practical.
- Avoid orphaned one-line entries where practical.

## 11. Import
### Flow
1. User selects PDF/DOCX/TXT.
2. Validate size/type.
3. Store original privately in `resume-imports`.
4. Extract text/structure with a zero-cost implementation.
5. Map into `ResumeDocument`.
6. Open an editable review state/editor.
7. Persist imported resume as normal resume data.

The parser may use heuristics. Never silently invent missing dates, employers or section data. Preserve raw/unclassified text in a safe fallback/custom section if needed rather than discarding it.

## 12. PDF export
- Available from editor and library card.
- Uses the same semantic renderer/styles as preview wherever technically possible.
- Text remains selectable.
- Links remain clickable.
- No watermark.
- No browser header/footer.
- Correct page format and page breaks.
- Filename derived from resume title, sanitized.
- PDF need not be permanently stored; generate on demand. Optional cached latest export is acceptable only if it cannot become stale.

## 13. Performance/UX
- Skeletons during dashboard loading.
- No empty-state flash before data resolves.
- Debounced autosave instead of one request per keystroke.
- Avoid full-page rerender when only a small control changes if possible.
- Smooth drag/reorder with clear handles and drop feedback.
- Destructive actions have confirmations.
- Keyboard focus states and accessible labels are required.

## 14. Error handling
- Database save errors visible and retryable.
- Import parsing errors explain that the source was kept and can be retried.
- PDF export errors do not alter saved resume state.
- Missing/corrupt design settings fall back through schema defaults instead of crashing renderer.
