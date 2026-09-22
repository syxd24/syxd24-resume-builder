# Dashboard / Resume Library Spec

## Goal
The library is the persistent storage surface for all resumes, modeled on the supplied FlowCV `My Resumes` screenshot but without billing/promotional items.

## Route
`/resumes`

## Desktop structure
- Minimal left rail/sidebar may contain only Resume and a small owner/settings area.
- Main content starts with `My Resumes`.
- First grid item is always a tall dashed `+ New resume` card.
- Remaining grid items are saved resume cards ordered by `updated_at desc` unless explicit sort is introduced later.

## Resume card anatomy
- Actual resume rendered through shared `ResumeRenderer`, scaled down to fit a portrait thumbnail.
- White page thumbnail on neutral background.
- Resume title below thumbnail.
- Relative edited time and page format below title.
- Three-dot overflow action button.

Do not generate separate screenshot thumbnails unless performance later requires it. Initial implementation must reuse the semantic renderer so dashboard always reflects current content/design.

## Interactions
### Click card
Open `/resumes/[id]`.

### New resume
Offer:
- Start blank
- Import existing resume

Blank creates DB row before navigation.

### Overflow menu
- Edit
- Download PDF
- Rename
- Duplicate
- Delete

### Rename
Inline/popover/dialog is acceptable. Validate non-empty trimmed title and persist immediately.

### Duplicate
Deep-copy document/design/language/page format into a new UUID. Title default: `<original> - Copy`. Do not copy import-tracking identity in a way that links future edits.

### Delete
Confirmation required. Deleting a resume should cascade its import records. Associated private assets should be cleaned by server-side workflow where safe; DB deletion must not expose bucket paths publicly.

### Download
May call server export route using saved resume state. Must not require editor navigation.

## Loading/error/empty
- Skeleton cards while listing loads.
- Never flash empty state before the request resolves.
- Empty DB still shows New resume prominently.
- Error state includes Retry.

## Visual acceptance
At ~1440x900:
- card proportions resemble printed page;
- page is legible enough to look like the actual resume, even though body text need not be readable at thumbnail scale;
- grid spacing is balanced and does not stretch cards absurdly on wide screens;
- destructive actions are not primary/high-emphasis.

## Performance
For expected 4-5 resumes, live scaled renderers are acceptable. Keep architecture simple. If many resumes later cause performance issues, optimize via memoization or cached thumbnails without changing source-of-truth behavior.
