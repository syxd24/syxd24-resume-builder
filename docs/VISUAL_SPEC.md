# Visual Specification

## Reference principle
The supplied FlowCV screenshots are the visual/interaction reference for editor density, panel hierarchy, rounded cards, muted workspace, page preview proportions, toolbars and dashboard cards. Reproduce the quality and layout logic, not FlowCV logos/trademarks.

## Global visual language observed
- Warm off-white/light beige application background.
- Very dark navy/purple primary text and buttons.
- Pink/magenta accent used for active editor state in FlowCV; this project may use an original accent while preserving contrast/hierarchy.
- White cards with soft border/shadow and medium-large radius.
- Compact but readable controls.
- Strong heading hierarchy with generous top-level spacing.
- Resume page itself is clean white paper with minimal/no artificial card chrome inside the document.

## Dashboard
Reference screenshot approximately shows:
- left sidebar around 215px on a 1365px-wide viewport;
- content begins with `My Resumes` heading;
- New resume dashed card and actual resume card share a tall portrait ratio;
- saved card thumbnail is a real page scaled down;
- metadata sits directly beneath thumbnail/card;
- overflow three-dot button aligned near lower-right metadata area.

Implement exact responsive measurements from CSS design tokens rather than scattered inline values. Primary desktop target should look balanced from roughly 1280-1920px.

## Editor shell
Observed:
- horizontal top toolbar with rounded outer container/edge treatment;
- top modes (Overview/Content/Customize/AI Tools in reference) on left;
- resume selector + Download + overflow on right;
- v1 removes AI Tools;
- main editor uses two large vertical regions: controls left and resume page right;
- preview workspace is muted neutral; page is white.

Recommended desktop proportions:
- control region roughly 38-44% at common 1366px viewport depending on mode;
- preview region consumes remaining width;
- customize mode may use a narrow category rail + settings cards + preview.

Treat these as starting proportions to visually compare against screenshots, not immutable pixel requirements.

## Content mode
Observed content cards:
- large white rounded cards;
- clear section icon + heading;
- compact chevron at far right;
- expanded section exposes entry rows, drag handles, eye/visibility button, Add Entry, delete;
- personal details/header card includes contact-line placeholders and circular photo area.

Requirements:
- 16-24px card padding depending density;
- consistent 12-16px radius family;
- subtle border/shadow only;
- section controls align predictably on an 8px spacing grid;
- drag handles should be visually low-emphasis until hover/focus.

## Add Content modal
Supplied screenshot shows:
- large centered modal over darkened editor;
- title `Add content`;
- import-existing-resume banner near title;
- four-column grid at desktop width;
- light-gray section tiles with icon, title, one-line/two-line description;
- final row includes Declaration and Custom.

Required section order should follow the reference where practical:
Education, Professional Experience, Skills, Languages,
Certificates, Interests, Projects, Courses,
Awards, Organisations, Publications, References,
Declaration, Custom.

## Customize mode
Observed:
- narrow text category navigation at far left;
- selected category has colored left rule/accent text;
- white settings cards around 370-410px wide in shown viewport;
- live page occupies right side;
- settings use label above input/dropdown, generous vertical rhythm;
- sliders show ticks, colored active segment/handle, numeric value, minus and plus square buttons.

Requirements:
- category navigation stays visible during settings scroll where practical;
- settings cards preserve one consistent width and padding system;
- no horizontal jitter when switching categories;
- page preview stays anchored/usable as controls expand.

## Paper preview
- Render real A4/Letter aspect ratio.
- Use CSS dimensions proportional to physical units, then scale visually with transform/zoom wrapper.
- White paper, subtle shadow, no rounded corners in printed output.
- Multi-page: identical paper sizes stacked with 24-40px visual gap.
- Workspace should never crop page content silently; allow scroll.

## Resume template quality target
The user's supplied PDFs are dense, professional single-page documents. The renderer must handle:
- strong name/contact header;
- horizontal rules under section headings;
- dense multi-line summary;
- experience entries with role/employer on left and date/location metadata aligned right where space permits;
- bullet descriptions;
- dense categorized skills;
- education metadata;
- multi-column language/certificate blocks where appropriate.

Text must remain readable at print size; do not shrink arbitrarily to force a single page. Multi-page output is acceptable and preferable to unreadably small typography.

## Visual regression baselines
Create Playwright screenshots for at least:
- library at 1440x900 with two resumes;
- editor Content with expanded Experience;
- Add Content modal;
- Customize/Document;
- Customize/Font Size;
- Customize/Colors;
- golden resume page 1 at fixed zoom;
- golden two-page stress fixture.

Use stable fixture data and disable animation during screenshot capture.

## Originality constraint
Do not use FlowCV logo, name, proprietary illustrations or copied template assets. Use the reference for proportions, interaction patterns and quality bar only.
