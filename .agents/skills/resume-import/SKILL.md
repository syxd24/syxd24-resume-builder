---
name: resume-import
description: Implement private zero-paid-service PDF/DOCX/TXT resume import, conservative section extraction and mapping into the canonical editable resume model.
---

# Resume Import Skill

Read:
- `/AGENTS.md`
- `/PROJECT_STATE.md`
- `/docs/IMPORT_SPEC.md`
- `/docs/DATABASE.md`
- canonical schemas

Own only `src/features/import/**` and import-specific route handlers assigned by the coordinator.

Rules:
- store source privately before/while parsing;
- validate MIME, size and path server-side;
- do not OCR image-only PDFs by default;
- never invent absent facts;
- retain ambiguous/unclassified text for user correction;
- imported output must validate as normal `ResumeDocument`;
- no paid APIs/services.

Test PDF, DOCX, TXT, malformed input and scanned/image-only behavior.
