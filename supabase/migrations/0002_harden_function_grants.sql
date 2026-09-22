-- Harden function execution for an app with no browser-side Supabase access.
-- The remote project already has these restrictions; keep them reproducible.

revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- This helper may exist from project-level RLS hardening. If present, keep it non-callable
-- through anonymous/authenticated Data API RPC endpoints.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable' and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$$;
