# Interaction Contract

This document defines behavior, not only appearance. Every listed action must be implemented and persistence-tested.

| Action | Immediate UI result | Persist? | Renderer/PDF impact |
|---|---|---:|---:|
| Create resume | New row/card, open editor | Yes | Yes |
| Rename resume | Title updates in toolbar/library | Yes | No document layout effect |
| Duplicate resume | Independent deep copy | Yes | Identical at creation |
| Delete resume | Card disappears after confirm | Yes | N/A |
| Edit text field | Preview updates instantly | Yes, debounced | Yes |
| Rich-text edit | Preview updates instantly | Yes | Yes |
| Add section | Section appears and opens | Yes | Yes |
| Hide/show section | Preview hides/shows it | Yes | Yes |
| Rename section heading | Heading updates | Yes | Yes |
| Drag section | Order updates with drop feedback | Yes | Yes |
| Drag entry | Entry order updates | Yes | Yes |
| Move section between columns | Placement updates | Yes | Yes |
| Change font | Preview font changes | Yes | Yes |
| Change font size | Preview reflows immediately | Yes | Yes |
| Change spacing | Preview reflows immediately | Yes | Yes |
| Change accent color | Semantic targets update | Yes | Yes |
| Change page A4/Letter | Physical preview geometry changes | Yes | Yes |
| Change date format | Dates reformat | Yes | Yes |
| Upload photo | Preview header updates | Yes | Yes |
| Crop/reposition photo | Preview transform updates | Yes | Yes |
| Download PDF | Show progress then file download | No new resume mutation required | Must match saved/current state |
| Import resume | Parsed editable resume opens | Yes | Yes |

## Dashboard card
- Entire preview/card main area is clickable and opens editor.
- Overflow menu click must not also open card.
- Delete opens confirmation with resume title.
- Duplicate should create `Original title - Copy` (or deterministic equivalent) and immediately appear in sorted library.
- Download from dashboard must work without first opening editor.

## Editor toolbar
- Content and Customize are mutually selected main modes.
- Download is always reachable.
- Resume title changes are persisted independently of document content.
- Save indicator reflects actual persistence, not a timer-only fake state.

## Content accordion/list
- Section headers have clear expand/collapse affordance.
- Drag handle is distinct from expand/collapse.
- Add Entry appends a correctly initialized entry and focuses/opens it.
- Delete entry requires confirmation when substantial content exists or provides an immediate undo affordance.
- Hidden entries/sections remain editable but clearly marked hidden.

## Customize controls
- Selecting a category scrolls/navigates the settings column without losing current preview state.
- Slider/step controls update on keyboard and +/- buttons.
- Undo/redo is optional for v1 unless implemented robustly. Do not show controls that do not work.

## Autosave sequence
1. User changes local state.
2. Renderer updates synchronously from local state.
3. Save status becomes dirty/Saving.
4. Debounce around 750ms.
5. Server validates canonical schema and optimistic version.
6. On success update lock version/status to Saved.
7. On failure retain local state and expose Retry.

Multiple rapid changes must coalesce and an older request must never overwrite a newer request.

## Import sequence
1. Choose Import existing resume from create flow or Add Content import entry point.
2. Choose file.
3. Validate type/size before upload.
4. Upload to private bucket through trusted server path.
5. Mark import parsing.
6. Extract and classify supported sections.
7. Show/import into normal editor; ambiguous/unclassified text must remain recoverable.
8. Mark completed or failed with retryable error.

## PDF sequence
- Use current editor state; flush pending autosave or explicitly render from the current validated client snapshot so export is never one save behind.
- Show generation progress/disabled duplicate click state.
- Download sanitized `<resume-title>.pdf`.
- Do not mutate resume content merely because export occurred.
