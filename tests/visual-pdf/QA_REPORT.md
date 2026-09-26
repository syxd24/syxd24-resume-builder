# Visual and PDF QA — 2026-09-25

## Automated visual coverage

Command:

```powershell
npm run test:visual
```

Result: **11 tests passed**.

The checked baselines cover the desktop and 390 px dashboard, content editing, tablet and mobile editor overflow, Add Content, document/font/color customization, the golden one-page renderer, a seven-page stress document, and A4/Letter PDF generation. Manual inspection found no clipped application controls, horizontal document overflow, duplicated stress entries, escaped page content, or renderer-only placeholder output.

## PDF semantic inspection

The generated files were inspected with `tests/visual-pdf/inspect_pdfs.py` using the bundled workspace Python runtime and `pypdf`.

- `golden-a4.pdf`: 1 page, 2,000 extracted characters, Palatino embedded fonts, name present, and seven unique `http`, `mailto`, or `tel` links.
- `golden-letter.pdf`: 2 pages, 1,999 extracted characters, the same fonts, name, and links.
- `stress-a4.pdf`: 7 pages, 18,196 extracted characters, name present, final `Platform Engineer 48` present, and five unique links.

`pdfinfo` also verified A4 at approximately 595 × 842 points, Letter at 612 × 792 points, tagged PDFs, and exact preview/PDF page-count parity.
