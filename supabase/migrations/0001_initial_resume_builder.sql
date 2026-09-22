create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled Resume',
  content jsonb not null default '{}'::jsonb,
  design jsonb not null default '{}'::jsonb,
  language text not null default 'en-GB',
  page_format text not null default 'A4' check (page_format in ('A4', 'Letter')),
  sort_order integer not null default 0,
  source_import_path text,
  source_import_type text check (source_import_type is null or source_import_type in ('pdf', 'docx', 'txt')),
  lock_version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resumes_updated_at_idx on public.resumes (updated_at desc);
create index if not exists resumes_sort_order_idx on public.resumes (sort_order, updated_at desc);

drop trigger if exists set_resumes_updated_at on public.resumes;
create trigger set_resumes_updated_at
before update on public.resumes
for each row execute function public.set_updated_at();

create table if not exists public.resume_imports (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid references public.resumes(id) on delete cascade,
  original_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'parsing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resume_imports_resume_id_idx on public.resume_imports (resume_id);
create index if not exists resume_imports_status_idx on public.resume_imports (status);

drop trigger if exists set_resume_imports_updated_at on public.resume_imports;
create trigger set_resume_imports_updated_at
before update on public.resume_imports
for each row execute function public.set_updated_at();

alter table public.resumes enable row level security;
alter table public.resume_imports enable row level security;

revoke all on table public.resumes from anon, authenticated;
revoke all on table public.resume_imports from anon, authenticated;
grant select, insert, update, delete on table public.resumes to service_role;
grant select, insert, update, delete on table public.resume_imports to service_role;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('resume-assets', 'resume-assets', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('resume-imports', 'resume-imports', false, 15728640, array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Intentionally no anon/authenticated storage policies.
-- Vercel/Next.js server-side code is the only application path to these private buckets.
