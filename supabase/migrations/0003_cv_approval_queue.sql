-- Persist AI-approved CV edits independently of ChatGPT conversation state.
-- Only privileged server/SQL connector roles may read or call these operations.
create table if not exists public.cv_approved_edits (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  target_key text not null,
  edit jsonb not null,
  staged_version bigint not null,
  status text not null default 'pending' check (status in ('pending','applied','rejected')),
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  rejected_at timestamptz
);
create index if not exists cv_approved_edits_resume_status_idx
  on public.cv_approved_edits (resume_id,status,created_at,id);
create unique index if not exists cv_approved_edits_one_pending_target_idx
  on public.cv_approved_edits (resume_id,target_key) where status='pending';
alter table public.cv_approved_edits enable row level security;
revoke all on public.cv_approved_edits from public,anon,authenticated;
grant select,insert,update,delete on public.cv_approved_edits to service_role;

-- A stable semantic key prevents two queued edits of the same field.
create or replace function public.cv_edit_target(p_edit jsonb)
returns text language plpgsql immutable security invoker
set search_path = '' as $$
declare
  k text := p_edit->>'kind';
  s text := p_edit->>'sectionId';
  e text := coalesce(p_edit->>'entryId','');
  n text := coalesce(p_edit->>'blockIndex','');
begin
  if k not in ('summary','experience-bullet','skill-entry','section')
     or s is null or length(s)=0 or length(s)>250
     or jsonb_typeof(p_edit)<>'object' then
    raise exception 'Unsupported CV edit target';
  end if;
  if k in ('experience-bullet','skill-entry') and (length(e)=0 or length(e)>250) then
    raise exception 'Missing entryId';
  end if;
  if k in ('summary','experience-bullet') and (n !~ '^[0-9]{1,4}$') then
    raise exception 'Invalid blockIndex';
  end if;
  return k || ':' || s || ':' || e || ':' || n;
end;
$$;

-- Resolve indices at execution time: array order may have changed since staging.
-- Both before and after must be complete JSON blocks, not arbitrary text fragments.
create or replace function public.cv_edit_path(p_content jsonb,p_edit jsonb)
returns text[] language plpgsql stable security invoker
set search_path = '' as $$
declare
  k text := p_edit->>'kind';
  sid text := p_edit->>'sectionId';
  eid text := p_edit->>'entryId';
  sec jsonb;
  ent jsonb;
  v_section integer;
  v_entry integer;
  v_path text[];
  v_before jsonb := p_edit->'before';
  v_after jsonb := p_edit->'after';
begin
  perform public.cv_edit_target(p_edit);
  select (ordinality-1)::integer,item into v_section,sec
  from jsonb_array_elements(p_content->'sections') with ordinality as t(item,ordinality)
  where item->>'id'=sid;
  if v_section is null then raise exception 'CV section not found'; end if;

  if k='section' then
    v_path:=array['sections',v_section::text];
    if v_after->>'id' is distinct from sid or
       v_after->>'type' is distinct from sec->>'type' or
       jsonb_typeof(v_after)<>'object' then
      raise exception 'Invalid replacement section';
    end if;
  elsif k='summary' then
    if sec->>'type'<>'summary' then raise exception 'Not a summary section'; end if;
    v_path:=array['sections',v_section::text,'content',(p_edit->>'blockIndex')::integer::text];
  else
    if (k='experience-bullet' and sec->>'type'<>'experience')
      or (k='skill-entry' and sec->>'type'<>'skills') then
      raise exception 'Wrong CV section type';
    end if;
    select (ordinality-1)::integer,item into v_entry,ent
    from jsonb_array_elements(sec->'entries') with ordinality as t(item,ordinality)
    where item->>'id'=eid;
    if v_entry is null then raise exception 'CV entry not found'; end if;
    if k='skill-entry' then
      v_path:=array['sections',v_section::text,'entries',v_entry::text];
      if v_after->>'id' is distinct from eid or jsonb_typeof(v_after)<>'object'
      then raise exception 'Invalid replacement skill entry'; end if;
    else
      v_path:=array['sections',v_section::text,'entries',v_entry::text,'description',(p_edit->>'blockIndex')::integer::text];
    end if;
  end if;

  if v_before is null or v_after is null or p_content #> v_path is distinct from v_before then
    raise exception 'CV field changed since approval; no edits applied';
  end if;
  if k in ('summary','experience-bullet') and (
    jsonb_typeof(v_after)<>'object'
    or v_after->>'type' is distinct from v_before->>'type'
    or jsonb_typeof(v_after->'text')<>'string'
    or (k='experience-bullet' and v_before->>'type'<>'bullet')
  ) then raise exception 'Invalid replacement rich-text block'; end if;
  return v_path;
end;
$$;

create or replace function public.cv_stage_edit(
  p_resume_id uuid,p_edit jsonb,p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql volatile security invoker
set search_path = '' as $$
declare
  v_resume public.resumes%rowtype;
  v_existing public.cv_approved_edits%rowtype;
  v_new public.cv_approved_edits%rowtype;
  v_target text;
begin
  select * into v_existing from public.cv_approved_edits where request_id=p_request_id;
  if found then
    if v_existing.resume_id<>p_resume_id or v_existing.edit<>p_edit then
      raise exception 'Request ID already used for another edit';
    end if;
    return jsonb_build_object('id',v_existing.id,'status',v_existing.status,'staged_version',v_existing.staged_version,'duplicate',true);
  end if;
  select * into strict v_resume from public.resumes where id=p_resume_id for share;
  perform public.cv_edit_path(v_resume.content,p_edit);
  v_target:=public.cv_edit_target(p_edit);
  insert into public.cv_approved_edits(request_id,resume_id,target_key,edit,staged_version)
  values (p_request_id,p_resume_id,v_target,p_edit,v_resume.lock_version)
  returning * into v_new;
  return jsonb_build_object('id',v_new.id,'status',v_new.status,'staged_version',v_new.staged_version,'duplicate',false);
end;
$$;

create or replace function public.cv_status(p_resume_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'request_id',request_id,'kind',edit->>'kind',
    'target_key',target_key,'edit',edit,'staged_version',staged_version,
    'created_at',created_at
  ) order by created_at,id),'[]'::jsonb)
  from public.cv_approved_edits
  where resume_id=p_resume_id and status='pending';
$$;

create or replace function public.cv_reject_edit(p_edit_id uuid)
returns boolean language plpgsql volatile security invoker set search_path = '' as $$
declare v_status text;
begin
  update public.cv_approved_edits set status='rejected',rejected_at=now()
  where id=p_edit_id and status='pending'
  returning status into v_status;
  if found then return true; end if;
  return exists (select 1 from public.cv_approved_edits where id=p_edit_id and status='rejected');
end;
$$;

-- Resume lock and approval statuses are committed in the same DB transaction.
create or replace function public.cv_apply_all(p_resume_id uuid,p_expected_version bigint)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_resume public.resumes%rowtype;
  v_row public.cv_approved_edits%rowtype;
  v_content jsonb;
  v_path text[];
  v_count integer:=0;
  v_version bigint;
begin
  select * into strict v_resume from public.resumes where id=p_resume_id for update;
  if v_resume.lock_version<>p_expected_version then
    raise exception 'CV_VERSION_CONFLICT: expected %, current %',p_expected_version,v_resume.lock_version;
  end if;
  v_content:=v_resume.content;
  for v_row in
    select * from public.cv_approved_edits
    where resume_id=p_resume_id and status='pending'
    order by created_at,id for update
  loop
    v_path:=public.cv_edit_path(v_content,v_row.edit);
    v_content:=jsonb_set(v_content,v_path,v_row.edit->'after',false);
    if v_content #> v_path is distinct from v_row.edit->'after' then
      raise exception 'CV edit verification failed';
    end if;
    v_count:=v_count+1;
  end loop;
  if v_count=0 then
    return jsonb_build_object('applied_count',0,'lock_version',v_resume.lock_version);
  end if;
  update public.resumes set content=v_content,lock_version=lock_version+1
  where id=p_resume_id and lock_version=p_expected_version
  returning lock_version into v_version;
  if v_version is null then raise exception 'CV_VERSION_CONFLICT'; end if;
  update public.cv_approved_edits set status='applied',applied_at=now()
  where resume_id=p_resume_id and status='pending';
  return jsonb_build_object('applied_count',v_count,'lock_version',v_version);
end;
$$;

-- Immediate approved edits never consume unrelated queued approvals.
create or replace function public.cv_apply_now(
  p_resume_id uuid,p_expected_version bigint,p_edit jsonb,
  p_request_id uuid default gen_random_uuid()
) returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_resume public.resumes%rowtype;
  v_existing public.cv_approved_edits%rowtype;
  v_path text[];
  v_target text;
  v_version bigint;
begin
  select * into v_existing from public.cv_approved_edits where request_id=p_request_id;
  if found then
    if v_existing.resume_id<>p_resume_id or v_existing.edit<>p_edit or v_existing.status<>'applied' then
      raise exception 'Request ID already used for another edit';
    end if;
    return jsonb_build_object('applied_count',0,'duplicate',true,'edit_id',v_existing.id);
  end if;
  select * into strict v_resume from public.resumes where id=p_resume_id for update;
  if v_resume.lock_version<>p_expected_version then
    raise exception 'CV_VERSION_CONFLICT: expected %, current %',p_expected_version,v_resume.lock_version;
  end if;
  v_path:=public.cv_edit_path(v_resume.content,p_edit);
  v_target:=public.cv_edit_target(p_edit);
  if exists(select 1 from public.cv_approved_edits
            where resume_id=p_resume_id and target_key=v_target and status='pending') then
    raise exception 'Edit already paused: reject it or use CV APPLY ALL';
  end if;
  update public.resumes
  set content=jsonb_set(content,v_path,p_edit->'after',false),
      lock_version=lock_version+1
  where id=p_resume_id and lock_version=p_expected_version
  returning lock_version into v_version;
  if v_version is null then raise exception 'CV_VERSION_CONFLICT'; end if;
  insert into public.cv_approved_edits(request_id,resume_id,target_key,edit,staged_version,status,applied_at)
  values(p_request_id,p_resume_id,v_target,p_edit,p_expected_version,'applied',now());
  return jsonb_build_object('applied_count',1,'lock_version',v_version,'duplicate',false);
end;
$$;

-- PUBLIC is a PostgreSQL grant role, not the schema; revoke both it and API roles.
revoke execute on function public.cv_edit_target(jsonb) from public,anon,authenticated;
revoke execute on function public.cv_edit_path(jsonb,jsonb) from public,anon,authenticated;
revoke execute on function public.cv_stage_edit(uuid,jsonb,uuid) from public,anon,authenticated;
revoke execute on function public.cv_status(uuid) from public,anon,authenticated;
revoke execute on function public.cv_reject_edit(uuid) from public,anon,authenticated;
revoke execute on function public.cv_apply_all(uuid,bigint) from public,anon,authenticated;
revoke execute on function public.cv_apply_now(uuid,bigint,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.cv_edit_target(jsonb) to service_role;
grant execute on function public.cv_edit_path(jsonb,jsonb) to service_role;
grant execute on function public.cv_stage_edit(uuid,jsonb,uuid) to service_role;
grant execute on function public.cv_status(uuid) to service_role;
grant execute on function public.cv_reject_edit(uuid) to service_role;
grant execute on function public.cv_apply_all(uuid,bigint) to service_role;
grant execute on function public.cv_apply_now(uuid,bigint,jsonb,uuid) to service_role;
