# Local development

## Required environment

1. Copy `.env.example` to `.env.local`.
2. Set `SUPABASE_URL` to the project API URL.
3. Set `SUPABASE_SECRET_KEY` to a modern `sb_secret_…` key. A legacy `service_role` JWT also works. Never use a publishable/anon key here and never prefix the secret with `NEXT_PUBLIC_`.
4. Keep `APP_URL=http://localhost:3000` for the default local server. PDF export opens the trusted print route through this origin.
5. Run `npm run env:check`; values are validated without being printed.

The configured Supabase project must already contain the migrations in `supabase/migrations`, including the private `resume-assets` and `resume-imports` buckets. Browser roles intentionally have no direct table or Storage access; all application access goes through the Next.js server.

## Run and verify

```powershell
npm install
npx playwright install chromium
npm run env:check
npm run dev
```

Open `http://localhost:3000/resumes`. A complete local smoke run should create a blank resume, wait for `Saved`, reload it, duplicate and delete it, import PDF/DOCX/TXT fixtures, upload/replace/remove a photo, and export a selectable-text PDF.

Do not commit `.env.local`; it is ignored by Git.
