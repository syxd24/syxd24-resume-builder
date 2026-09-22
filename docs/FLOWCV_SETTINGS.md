# FlowCV Reference Settings Inventory

This file records what is visible in the owner's supplied FlowCV screenshots and translates it into v1 implementation requirements. Where a specific numeric range/default was not visible, do not invent a FlowCV value; choose a safe internal range and document it in code/tests.

## Customize navigation observed
The supplied screenshots visibly show these categories in the left customization navigation:
- Document
- Templates
- Layout
- Font Size
- Spacing
- Entries
- Headings
- Font
- Colors
- Header
- Photo
- Links
- Footer
- Sections

Because this project has one template, `Templates` may be represented as a locked template preview/info state rather than a marketplace.

## Document
Observed controls:
- Language dropdown; screenshot shows `English (UK)`.
- Date Format dropdown; screenshot shows `DD/MM/YYYY`.
- Page Format dropdown; screenshot shows `A4`.
- A Design Templates card is visible below Document Settings in the reference; v1 does not need multiple templates.

Required v1:
- Language metadata at least English (UK), German, Polish. Labels remain manually renameable.
- Date formats at minimum `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`, and month/year-friendly resume formats.
- Page format A4 / Letter.
- All settings update preview and persist.

## Layout
The exact expanded Layout screenshot was not supplied. The product references elsewhere show one- and two-column resume examples, so v1 must support:
- one column
- two columns
- mixed/header plus body columns where compatible with the single template
- primary/secondary section placement
- adjustable column ratio within sensible limits
- column gap

Treat these as project requirements, not claims about exact hidden FlowCV control names/ranges.

## Font Size
Observed controls and labels:
- Base Font Size; screenshot value `10.5pt`
- Full Name; screenshot displays a relative `+11pt`
- Section Headings; screenshot displays `+3pt`
- Entry Header; screenshot displays `+0pt`
- Each row uses a stepped slider plus minus/plus buttons.

Required v1:
- Preserve this interaction pattern: stepped control, visible effective/relative value, +/- buttons.
- Sensible guardrails to prevent broken pages.
- Store concrete normalized design values, not only slider indexes.

## Spacing
Observed:
- `Line Height`; screenshot value `1.15`
- `Space Between Elements`; row is visible partially
- same stepped slider + +/- interaction pattern

Required v1 spacing controls:
- line height
- page margins
- section gap
- entry gap
- paragraph/list gap
- heading-to-content gap
- header gap
- column gap where applicable

Only Line Height and Space Between Elements were explicitly visible; additional controls are v1 requirements derived from the requested editing quality.

## Entries
Category is explicitly visible in navigation. Expanded controls were not supplied.

Required v1:
- entry title/company ordering where applicable
- date/location alignment option
- description indentation toggle/amount
- gap between entries
- consistent metadata separator

Do not claim exact parity with hidden FlowCV options that are not represented in supplied evidence.

## Headings
Category is explicitly visible. Expanded controls were not supplied.

Required v1:
- heading style variants appropriate to the single template: simple, underline/rule, boxed/background treatment where compatible
- heading text alignment where compatible
- optional section icon visibility
- heading rule thickness/spacing controlled through design tokens rather than arbitrary CSS fields

## Font
Observed:
- Body Font dropdown; screenshot shows `Alegreya`.
- Name Font dropdown; screenshot shows `Same as body font`.

Required v1:
- Curated zero-cost font list using local/system or Google-font-compatible families that can render consistently in preview/PDF.
- At minimum include robust sans-serif and serif choices.
- Body font and name font independently configurable; name may inherit body.
- Fonts used in export must match preview as closely as technically possible.

## Colors
Observed controls:
- target tiles: `Full Page`, `Header`, `Border`
- modes: `Single`, `Multi`, `Image`
- visible color palette with custom color-wheel option
- `Apply Accent Color` checklist appears below palette in one screenshot
- readable checklist items include `Name`, `Job title`, `Headings`, and other resume elements; exact full list is not fully legible in supplied screenshot

Required v1:
- accent color
- body/primary text
- secondary text
- border/rule color
- optional header/background color
- hex color input plus picker
- accent application toggles for the important semantic targets: name, job title, section headings, icons/markers, links, skill indicators and decorative rules

`Multi` and `Image` color modes are visible in reference, but v1 may keep the one-template implementation focused on single/multi semantic colors unless image backgrounds are explicitly needed. Do not add image-background complexity solely to mimic a disabled/unused reference control.

## Header
Observed:
- `Text Alignment` control with left and center options visible
- `Details Arrangement` variants shown as selectable layout chips
- `Line Style` row with several icon/button choices
- `Advanced Settings` collapsible row

Required v1:
- left / center header alignment; right may be supported if visually sound
- contact-details arrangement variants
- optional separator/rule style
- name/job-title positioning
- contact icon visibility
- photo relationship to header

## Photo
Observed:
- dedicated `Photo` customization card/category
- explanatory copy indicates photo settings depend on uploaded image

Required v1:
- upload/remove
- crop/reposition/zoom in editor or equivalent non-destructive transform state
- size
- shape (circle/square/rounded where template allows)
- grayscale toggle
- alignment/placement compatible with header layout
- persist transform settings separately from original asset

## Links
Observed:
- `Link Styling` card
- visible checkboxes include `Underline`, `Blue color`, and `No icon`/icon-related behavior in reference; a small style selector is also visible
- `Advanced Settings` collapsible row

Required v1:
- underline toggle
- link color behavior (inherit/accent/standard-link style)
- URL/contact icon visibility
- preserve clickable targets in exported PDF

## Footer
Observed:
- dedicated Footer card
- visible checkbox options include `Page numbers`, `Email`, `Name`
- `Advanced Settings` collapsible row

Required v1:
- page number toggle
- optional name/email footer fields
- alignment and spacing that do not overlap body content

## Sections
Observed:
- `Section Customizations` control appears below Footer.

Required v1:
- per-section heading rename
- visibility
- order
- column assignment
- optional section-specific presentation overrides only where necessary

## Content/Add section reference
The Add Content modal explicitly shows:
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
- Import resume entry point (`Already have a resume? Import resume`)

These are required section types in the v1 domain model in addition to core Personal Details and Summary/Profile.

## General persistence contract
For every control in this file:
1. changing it updates local preview immediately;
2. it maps to a typed `ResumeDesign` property;
3. autosave persists it to `resumes.design`;
4. refresh restores it identically;
5. renderer/PDF uses the same value where relevant.

A control that only changes editor chrome or exists without renderer effect is a failed implementation.
