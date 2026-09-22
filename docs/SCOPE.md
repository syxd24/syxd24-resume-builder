# Scope

## In scope

### Resume library
- Persistent My Resumes dashboard.
- First card is always `+ New resume`.
- Real scaled resume thumbnail, not placeholder art.
- Create, open/edit, rename, duplicate, delete.
- Download PDF from dashboard.
- Sort saved resumes by `updated_at desc` by default.
- Show title, last edited information, and page format.
- Expected personal usage: 4-5 resumes, but no artificial count limit.

### Resume editor
- Desktop-first split workspace with controls left and live page preview right.
- Content editing.
- Add/remove/hide/show/reorder sections.
- Add/edit/duplicate/delete/reorder entries where applicable.
- FlowCV-like customization categories defined in `FLOWCV_SETTINGS.md`.
- Immediate WYSIWYG update.
- Debounced autosave with Saving/Saved/Error states.
- A4 and Letter.
- One-column, two-column and mixed section placement where supported by the one template.
- Photo upload/crop/position settings sufficient for professional resume use.

### Supported content sections
- Personal details/header
- Summary/Profile
- Professional Experience
- Education
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
- Custom sections

### Import
- PDF
- DOCX
- TXT
- Original source stored privately in Supabase Storage.
- Parsed content becomes normal editable `ResumeDocument` data.
- Import review must allow correction; do not pretend extraction is perfect.

### Export
- Professional text-based PDF.
- Selectable text.
- Clickable hyperlinks.
- No watermark.
- No browser header/footer.
- Correct A4/Letter geometry.
- Preview/PDF visual consistency.

### Infrastructure
- Next.js/TypeScript.
- Supabase Postgres + Storage.
- Vercel Free.
- No paid runtime dependency required for core functionality.

## Explicitly out of scope for v1
- FlowCV branding/logo.
- FlowCV proprietary source/template assets.
- Pricing/billing/subscriptions/Pro gating.
- Cover Letter product.
- Job Tracker.
- AI writing/AI Tools.
- Template marketplace or many templates.
- Public hosted resume page or public share slug.
- End-user account/signup/login UI.
- Multi-user/team collaboration.
- Full mobile editor.
- Analytics/advertising.

## Security boundary
Although there is no user-facing login, this is not a public writable database application. The deployed frontend must call trusted Next.js server-side handlers/actions. Supabase secret credentials remain server-side. Browser code must never have unrestricted mutation access to resume tables or private buckets.
