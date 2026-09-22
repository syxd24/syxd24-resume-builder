# Deployment and Privacy

## Target
- Vercel Hobby / Free
- Supabase Free
- no paid runtime dependency required

## Important: personal data must not be exposed publicly
The application intentionally has no application-level account/signup/login system. Therefore production must be protected at the deployment boundary.

### Required production setting
Enable **Vercel Authentication** for **All Deployments** in Vercel Deployment Protection. As of September 2026 this is available on every Vercel plan, including Hobby, and can protect production deployments. The owner signs into Vercel; the app itself does not implement a user/account system.

This is preferred over building a custom password/login layer for v1 and preserves the owner's `no app login` requirement while keeping the resume dashboard private.

Do not deploy the production resume library as an unprotected public URL.

## Environment variables
Configure in Vercel project settings, never commit real values:
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `APP_URL`

Do not prefix secret credentials with `NEXT_PUBLIC_`.

## Supabase boundary
- direct anon/authenticated CRUD is revoked on application tables;
- Storage buckets are private;
- Next.js server code uses trusted Supabase credentials;
- deployment protection controls who can invoke the personal app UI/server routes from the web.

Defense in depth: application route handlers still validate IDs, file types, payload schema and upload limits even though deployment is owner-protected.

## Vercel steps after first deployment
1. Import this GitHub repo into Vercel.
2. Set Framework to Next.js if not auto-detected.
3. Add server environment variables.
4. Deploy.
5. Open Project -> Security -> Deployment Protection.
6. Enable Vercel Authentication for All Deployments.
7. Open production URL in a private/incognito window and confirm it requires authorized Vercel access.
8. After signing in, verify resume library, autosave, import and PDF export.

## Free-tier discipline
- Generate PDF on demand rather than storing every export.
- Store structured resume content in Postgres, not as repeated files.
- Compress/resize profile images before upload.
- Avoid server jobs/queues/paid APIs for import.
- Expected 4-5 personal resumes are negligible relative to normal free-tier database/storage limits.
