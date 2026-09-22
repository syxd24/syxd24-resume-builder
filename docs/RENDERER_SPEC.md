# Resume Renderer and PDF Specification

## Core rule
There is one semantic `ResumeRenderer` implementation. Editor preview, dashboard thumbnail and print/PDF output must reuse it or the same underlying render tree/styles. Do not maintain independent resume templates for different surfaces.

## Template target
One professional template capable of reproducing the quality of the user's supplied PDFs and the clean FlowCV examples:
- prominent name/header
- compact contact row with optional icons/links
- clear section headings, commonly with horizontal rule
- dense but readable body typography
- entry header + optional right-aligned date/location metadata
- bullet descriptions
- grid/list variants for skills/languages/certificates
- optional photo/header variants

Do not force all content onto one page by shrinking below readable print sizes. Allow correct multipage output.

## Input contracts
Renderer receives validated:
- `ResumeDocument`
- `ResumeDesign`
- page format
- optional render mode (`editor`, `thumbnail`, `print`) that may change chrome/scale only, not semantic content/layout decisions.

Renderer must not read Supabase directly.

## Physical page
Support:
- A4: 210mm x 297mm
- Letter: 8.5in x 11in

Use print-safe CSS and explicit page dimensions. Browser/editor scaling occurs outside the paper root.

## Layout
Required:
- one column
- two column
- mixed/header plus body columns where compatible
- primary/secondary section placement
- adjustable column ratio and gap within safe ranges

Avoid arbitrary CSS strings persisted from users. Design schema uses semantic numeric/enumerated tokens.

## Typography
Implement:
- body font
- optional separate/inherited name font
- base font size
- full name offset/size
- section heading offset/size
- entry header offset/size
- line height
- sensible weights

Font loading must be deterministic for browser and PDF. Prefer fonts available through zero-cost web/static bundling and ensure export waits for fonts before printing.

## Spacing
Semantic tokens:
- top/right/bottom/left page margins or safe symmetric variants
- header gap
- section gap
- heading-to-body gap
- entry gap
- paragraph/list gap
- column gap

Clamp values to avoid impossible layouts.

## Colors
Semantic targets:
- body text
- secondary/meta text
- accent
- heading
- border/rule
- optional header/background
- links

Accent target toggles control which semantic parts inherit accent. Maintain sufficient contrast.

## Header
Support:
- left/center alignment at minimum
- name, job title, contact details
- detail arrangement variants
- optional divider/line style
- optional photo placement
- contact/link icons where enabled

## Photo
Render non-destructively from stored original + transform settings:
- crop/position
- zoom
- size
- circle/square/rounded variants where compatible
- grayscale

Use `object-fit`/transform math that prints identically.

## Section rendering
Each supported section type has a dedicated typed renderer or a generic entry renderer where structure is genuinely shared. Avoid one huge switch component with duplicated style literals.

### Experience/Education/Projects/etc.
- title/employer/institution hierarchy
- date/location metadata
- description rich text
- avoid page break between entry header and first description line when possible

### Skills/Languages
Support text/grid and optional level visualization. Level visualization must remain legible in monochrome print and not depend only on color.

### Custom sections
Use generic typed entries while preserving rich description, metadata and links.

## Pagination
Browser CSS print pagination is preferred if it preserves selectable text.

Requirements:
- no clipped content
- no duplicated content
- no overlapping pages
- avoid orphaned headings where possible (`break-after: avoid`, grouped wrappers)
- allow long entries to split when necessary rather than overflow
- footer reserves space when enabled

Editor preview must materially reflect print page boundaries. If exact automatic browser pagination cannot be previewed directly, implement a shared measured pagination layer rather than creating a separate layout algorithm for PDF.

## PDF
Preferred zero-paid-service strategy: trusted server/browser Chromium print-to-PDF or another local text-based print pipeline compatible with Vercel limits. Do not use paid external PDF APIs.

PDF requirements:
- selectable text
- clickable links
- embedded/available fonts
- no rasterized whole-page screenshots
- no headers/footers from browser defaults
- correct page size
- exact current content/design
- sanitized filename

## Thumbnail
Dashboard thumbnail wraps the same renderer in a scaled container. It may disable text selection/pointer interaction and use CSS scale, but may not simplify content into a fake template.

## Renderer tests
- snapshot structural tests for section variants
- Playwright visual screenshots at fixed viewport/zoom
- A4/Letter geometry checks
- long multipage fixture
- link existence
- photo transform state
- color/font/spacing setting coverage
