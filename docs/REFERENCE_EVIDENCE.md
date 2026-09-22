# Supplied Reference Evidence

This repository intentionally does not copy FlowCV branding/assets. The owner supplied screenshots and two resume PDFs during specification. The relevant evidence has been distilled into the specs below so implementation agents do not need to repeatedly consume large image context.

## Screenshot set summarized

### Marketing/start page
Observed FlowCV landing page establishes overall visual language: off-white background, dark navy/purple text and CTA, clean large typography, resume paper mockup.

Not required in v1: marketing landing page. `/` may redirect directly to `/resumes`.

### My Resumes library
Observed:
- left sidebar
- `My Resumes` heading
- dashed `New resume` portrait card
- saved resume card with actual page preview
- title, edited timestamp, A4 metadata
- overflow button
- FlowCV promotional/plan items in sidebar/text

Project adaptation: retain resume-library workflow; remove Pro/pricing/student/cover-letter/job-tracker items.

### New resume/template chooser
Observed:
- `Start building your resume`
- template-category pills
- multiple large template previews
- `Import existing resume` button

Project adaptation: one template only. Replace marketplace with simple blank/import choice.

### Content editor
Observed:
- top modes Overview / Content / Customize / AI Tools
- resume selector, Download and overflow at top right
- left content cards and right live white page preview
- personal details card with contact placeholders + photo circle
- Summary, Skills and Organisations section cards
- expanded section shows drag handle, `New Entry`, visibility button, Add Entry and delete

Project adaptation: no AI Tools.

### Add content modal
Observed large modal with import banner and section tiles:
Education, Professional Experience, Skills, Languages,
Certificates, Interests, Projects, Courses,
Awards, Organisations, Publications, References,
Declaration, Custom.

### Customize / Document
Observed category rail:
Document, Templates, Layout, Font Size, Spacing, Entries, Headings, Font, Colors, Header, Photo, Links, Footer, Sections.

Observed Document card:
- Language = English (UK)
- Date Format = DD/MM/YYYY
- Page Format = A4

### Customize / Font Size + Spacing
Observed:
- Base Font Size = 10.5pt
- Full Name = +11pt
- Section Headings = +3pt
- Entry Header = +0pt
- ticked sliders with minus/plus square buttons
- Line Height = 1.15
- Space Between Elements row partially visible

### Customize / Font + Colors
Observed:
- Body Font = Alegreya
- Name Font = Same as body font
- Colors targets Full Page / Header / Border
- modes Single / Multi / Image
- palette circles + custom color wheel
- Apply Accent Color checklist below

### Customize / Header / Photo / Links / Footer
Observed zoomed-out full settings view:
- Header Text Alignment
- Details Arrangement variants
- Line Style variants
- Header Advanced Settings
- dedicated Photo card
- Link Styling with checkbox-style options
- Footer with Page numbers / Email / Name options
- Section Customizations control

Exact hidden advanced values were not legible/supplied; `FLOWCV_SETTINGS.md` distinguishes observed facts from v1 requirements rather than inventing exact FlowCV internals.

## Resume PDF fixtures supplied
Two real one-page PDFs were supplied:
- a dense technical/AI/backend resume containing Summary, Professional Experience, Projects, Skills, Education, Languages, Certificates;
- a dense multilingual customer-service/compliance-oriented resume containing Summary, Professional Experience, Skills, Education, Languages, Certificates.

Because this GitHub repository is public, do not commit the owners' personal emails, phone numbers or full source PDFs as fixtures without explicit instruction. Use anonymized fixtures with equivalent section density/length for automated tests.

## Evidence hierarchy
When implementation choices conflict:
1. explicit locked scope/product docs
2. observed evidence in this file / `FLOWCV_SETTINGS.md`
3. product-quality judgment for unspecified details

Do not search for or copy FlowCV proprietary source code.
