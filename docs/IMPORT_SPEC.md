# Resume Import Specification

## Scope
Import PDF, DOCX and TXT into the normal editable resume model without paid external services.

## Principles
- Preserve the original source privately.
- Extract supported information conservatively.
- Never invent missing facts.
- Never silently discard unclassified text.
- Imported resumes become ordinary `ResumeDocument` + `ResumeDesign` rows and can be edited/autosaved/exported like blank-created resumes.

## Supported files
Remote storage bucket currently allows:
- PDF
- DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
- TXT
- maximum 15 MiB

Validate extension and MIME type server-side. Do not trust client MIME alone.

## Pipeline
1. User chooses Import existing resume.
2. Create a pending resume/import context.
3. Upload source through trusted server code into private `resume-imports` bucket.
4. Insert `resume_imports` row with `uploaded`.
5. Set `parsing`.
6. Extract text and useful structure.
7. Classify into canonical sections.
8. Store structured resume data.
9. Mark `completed` and open editor.
10. On failure mark `failed`, keep original file, expose retry/error.

## Extraction implementation
Choose well-maintained zero-cost libraries compatible with the runtime.

### PDF
Use textual PDF extraction when embedded text exists. Do not OCR by default. Scanned/image-only PDFs should return an explicit unsupported/low-confidence path rather than hallucinating text. OCR may be considered later as a separate optional feature.

### DOCX
Parse paragraphs, runs, lists and links where possible. Formatting is evidence for headings but should not override content semantics blindly.

### TXT
Treat line structure and common headings as signals.

## Classification
Recognize common heading variants, case-insensitively, for:
- Summary/Profile/Objective
- Experience/Employment/Professional Experience
- Education
- Skills/Technical Skills
- Languages
- Projects
- Certificates/Certifications
- Courses
- Awards
- Organisations/Organizations/Volunteer
- Publications
- References
- Interests

For dates, parse only when text clearly expresses a date/range. Preserve original display text if parsing is uncertain.

## Ambiguity/fallback
Anything that cannot be confidently classified must be retained in one of:
- `unclassifiedBlocks` in import metadata during review, or
- a generated Custom section such as `Imported Content`.

The user must be able to see and correct it. Do not drop it.

## Personal details
Extract obvious email/phone/URL/location/name only when strongly supported by source layout/text. Do not infer country, nationality, job title or contact data that is absent.

## Review
The import may open directly in the normal editor with a small banner indicating imported content should be reviewed. A separate wizard is optional; do not add complexity unless it improves correction of ambiguous extraction.

## Storage paths
Recommended:
`imports/<resume-id-or-pending-id>/<import-uuid>/<sanitized-filename>`

Never expose raw storage path as a public URL.

## Tests
Fixtures should cover:
- text PDF with standard headings
- two-column PDF
- DOCX with bullets
- plain TXT
- malformed document
- scanned/image-only PDF behavior
- unusual heading labels mapped to Custom/unknown rather than lost

## Quality metric
The import feature is successful if it saves manual retyping while preserving all recoverable source text. It is not required to perfectly reproduce the source document's original visual design; imported data uses this app's single template and design system.
