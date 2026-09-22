# Canonical Domain Schema Requirements

Foundation agent must implement these as strict TypeScript + Zod contracts. Exact property names may be adjusted once during Foundation, but semantics must remain and later agents must treat the resulting types as locked interfaces.

## Common primitives

### ResumeDate
Resume dates are frequently month/year rather than exact calendar dates.
```ts
type ResumeDate = {
  year?: number
  month?: number // 1-12
  raw?: string   // preserve import text when parsing is uncertain
}
```

### DateRange
```ts
type DateRange = {
  start?: ResumeDate
  end?: ResumeDate
  current?: boolean
}
```

### ResumeLink
```ts
type ResumeLink = {
  id: string
  label: string
  url: string
  visible: boolean
}
```

### RichText
Choose a stable structured editor JSON format. It must serialize to JSONB, be sanitized on render, support paragraphs, bold, italic, underline, links, unordered/ordered lists, and plain-text extraction for import/tests.

## Personal details
```ts
type PersonalDetails = {
  fullName: string
  jobTitle?: string
  email?: string
  phone?: string
  location?: string
  address?: string
  website?: string
  links: ResumeLink[]
  photo?: {
    storagePath: string
    alt?: string
  }
}
```

## Section envelope
Every section has stable identity and common layout metadata.
```ts
type SectionBase = {
  id: string
  type: SectionType
  heading: string
  visible: boolean
  column: 'primary' | 'secondary' | 'full'
}
```

Array order is canonical section order. Do not also maintain a conflicting `sectionOrder` unless there is a documented reason.

## Required section types
`summary`, `experience`, `education`, `skills`, `languages`, `certificates`, `interests`, `projects`, `courses`, `awards`, `organisations`, `publications`, `references`, `declaration`, `custom`.

## Entry requirements
Each list entry gets:
- stable `id`
- `visible: boolean`
- section-specific fields

### Experience
position, employer, employerUrl, location, dateRange, description rich text.

### Education
degree/program, institution, institutionUrl, location, dateRange, description.

### Skill
name, optional level (normalized 0-100 or enumerated mapping), optional description/category.

### Language
name, proficiency label, optional normalized level, optional detail.

### Project
title, url, subtitle/role, dateRange, description.

### Certificate
title, issuer/information, url, date.

### Course
title, provider, url, date/dateRange, description.

### Award
title, issuer, date, url, description.

### Organisation
name, role, location, url, dateRange, description.

### Publication
title, publisher/source, date, url, description.

### Interest
name, optional description, optional url.

### Reference
name, jobTitle, organisation, email, phone, note.

### Declaration
text, optional place/date/signature asset path.

### Custom entry
A generic but typed combination of title, subtitle, url, location, dateRange, description. Multiple custom sections allowed.

## ResumeDocument
```ts
type ResumeDocument = {
  version: 1
  personal: PersonalDetails
  sections: ResumeSection[]
}
```

Summary should be represented as a section so its order/visibility behaves consistently.

## ResumeDesign
Persist semantic tokens, not arbitrary CSS.

Suggested shape:
```ts
type ResumeDesign = {
  version: 1
  document: {
    language: string
    dateFormat: string
    pageFormat: 'A4' | 'Letter'
  }
  layout: {
    mode: 'one-column' | 'two-column' | 'mixed'
    secondaryWidthPct: number
    columnGapMm: number
  }
  typography: {
    bodyFont: string
    nameFont: string | 'inherit'
    baseSizePt: number
    nameOffsetPt: number
    sectionHeadingOffsetPt: number
    entryHeaderOffsetPt: number
    lineHeight: number
  }
  spacing: {
    marginTopMm: number
    marginRightMm: number
    marginBottomMm: number
    marginLeftMm: number
    headerGapMm: number
    sectionGapMm: number
    headingGapMm: number
    entryGapMm: number
    paragraphGapMm: number
  }
  entries: {
    metadataAlign: 'left' | 'right' | 'inline'
    descriptionIndent: boolean
    experienceTitleFirst: boolean
    educationDegreeFirst: boolean
  }
  headings: {
    style: 'simple' | 'rule' | 'underline' | 'boxed'
    iconMode: 'none' | 'outline' | 'filled'
  }
  colors: {
    body: string
    secondary: string
    accent: string
    heading: string
    border: string
    headerBackground: string
    link: string
    accentTargets: {
      name: boolean
      jobTitle: boolean
      headings: boolean
      icons: boolean
      links: boolean
      skillIndicators: boolean
      rules: boolean
    }
  }
  header: {
    alignment: 'left' | 'center' | 'right'
    detailsArrangement: string
    lineStyle: string
    showIcons: boolean
  }
  photo: {
    visible: boolean
    shape: 'circle' | 'square' | 'rounded'
    sizeMm: number
    grayscale: boolean
    zoom: number
    x: number
    y: number
  }
  links: {
    underline: boolean
    colorMode: 'inherit' | 'accent' | 'standard'
    showIcons: boolean
  }
  footer: {
    pageNumbers: boolean
    showName: boolean
    showEmail: boolean
  }
  sections: Record<string, unknown>
}
```

The final schema may refine enumerations after renderer experiments, but every setting must have a default and safe min/max validation.

## Defaults
Reference-observed starting points that are safe to use unless visual testing indicates otherwise:
- page: A4
- language: en-GB
- date format: DD/MM/YYYY
- base font size: 10.5pt
- name offset: +11pt
- section heading offset: +3pt
- entry header offset: +0pt
- line height: 1.15

Other defaults must be chosen for professional readability and documented in code, not guessed as FlowCV facts.
