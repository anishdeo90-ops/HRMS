create table if not exists hrms.attendance_days (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references hrms.employees(id) on delete cascade,
  work_date date not null,
  shift_name text,
  first_in timestamptz,
  last_out timestamptz,
  worked_minutes integer,
  extra_minutes integer not null default 0,
  day_status text not null default 'absent' check (day_status in ('present','half_day','absent','weekly_off','holiday','on_leave','on_duty','wfh')),
  payable_fraction numeric(3,1) not null default 0 check (payable_fraction in (0, 0.5, 1)),
  penalty_reason text,
  is_regularized boolean not null default false,
  source text not null default 'system',
  comments text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, employee_id, work_date)
);

create table if not exists hrms.attendance_punches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  attendance_day_id uuid references hrms.attendance_days(id) on delete cascade,
  employee_id uuid not null references hrms.employees(id) on delete cascade,
  punched_at timestamptz not null default now(),
  direction text not null check (direction in ('in','out')),
  source text not null default 'web' check (source in ('web','mobile','biometric','frs','manual','import')),
  location text,
  is_rejected boolean not null default false,
  rejection_reason text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hrms.leave_types (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  annual_quota_days numeric(6,2),
  is_paid boolean not null default true,
  allows_half_day boolean not null default true,
  requires_document boolean not null default false,
  carry_forward_cap_days numeric(6,2),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists hrms.leave_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references hrms.employees(id) on delete cascade,
  leave_type_id uuid not null references hrms.leave_types(id),
  from_date date not null,
  to_date date not null,
  days numeric(6,2) not null check (days > 0),
  day_portion text not null default 'full_day' check (day_portion in ('full_day','first_half','second_half')),
  include_weekends boolean not null default false,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hrms.approval_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  request_code text not null,
  request_type text not null check (request_type in ('leave','regularization','on_duty','comp_off','wfh','week_off_swap','early_in_out','expense_claim','goal','candidate_offer','separation')),
  employee_id uuid not null references hrms.employees(id) on delete cascade,
  subject text not null,
  from_date date,
  to_date date,
  days numeric(6,2),
  amount_paise integer,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  source_table text,
  source_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, request_code)
);

create table if not exists hrms.approval_steps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid not null references hrms.approval_requests(id) on delete cascade,
  sequence integer not null,
  approver_source text not null default 'manager',
  approver_employee_id uuid references hrms.employees(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','skipped')),
  acted_at timestamptz,
  comment text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, sequence)
);

create table if not exists hrms.tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  ticket_code text not null,
  subject text not null,
  category text not null,
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  raised_by_id uuid not null references hrms.employees(id) on delete cascade,
  assigned_to_employee_id uuid references hrms.employees(id) on delete set null,
  description text,
  related_product text,
  related_entity_type text,
  related_entity_id text,
  resolved_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, ticket_code)
);

create table if not exists hrms.separations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references hrms.employees(id) on delete cascade,
  separation_type text not null check (separation_type in ('resignation','termination','retirement','absconding')),
  resignation_date date not null,
  notice_days integer not null default 0,
  last_working_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  clearance_pending text[] not null default array[]::text[],
  exit_interview_done boolean not null default false,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists attendance_days_org_date_idx on hrms.attendance_days(org_id, work_date);
create index if not exists attendance_punches_employee_idx on hrms.attendance_punches(employee_id, punched_at desc);
create index if not exists leave_requests_employee_idx on hrms.leave_requests(employee_id, created_at desc);
create index if not exists approval_requests_status_idx on hrms.approval_requests(org_id, status, request_type);
create index if not exists tickets_status_idx on hrms.tickets(org_id, status);
create index if not exists separations_status_idx on hrms.separations(org_id, status);

do $$
declare
  table_ref text;
  rel_name text;
begin
  foreach table_ref in array array[
    'hrms.attendance_days',
    'hrms.attendance_punches',
    'hrms.leave_types',
    'hrms.leave_requests',
    'hrms.approval_requests',
    'hrms.approval_steps',
    'hrms.tickets',
    'hrms.separations'
  ] loop
    rel_name := split_part(table_ref, '.', 2);
    execute format('alter table %s enable row level security', table_ref);
    execute format('drop policy if exists "%s_select_member" on %s', replace(table_ref, '.', '_'), table_ref);
    execute format('create policy "%s_select_member" on %s for select to authenticated using (exists (select 1 from public.org_members m where m.org_id = %I.org_id and m.profile_id = (select auth.uid()) and m.is_active))', replace(table_ref, '.', '_'), table_ref, rel_name);
    execute format('drop policy if exists "%s_write_member" on %s', replace(table_ref, '.', '_'), table_ref);
    execute format('create policy "%s_write_member" on %s for all to authenticated using (exists (select 1 from public.org_members m where m.org_id = %I.org_id and m.profile_id = (select auth.uid()) and m.is_active)) with check (exists (select 1 from public.org_members m where m.org_id = %I.org_id and m.profile_id = (select auth.uid()) and m.is_active))', replace(table_ref, '.', '_'), table_ref, rel_name, rel_name);
  end loop;
end $$;

drop policy if exists "public_entity_events_insert_member" on public.entity_events;
create policy "public_entity_events_insert_member" on public.entity_events
  for insert to authenticated
  with check (
    actor_profile_id = (select auth.uid())
    and exists (
      select 1 from public.org_members m
      where m.org_id = entity_events.org_id
        and m.profile_id = (select auth.uid())
        and m.is_active
    )
  );

grant usage on schema hrms to authenticated, service_role;
grant select, insert, update, delete on
  hrms.attendance_days,
  hrms.attendance_punches,
  hrms.leave_types,
  hrms.leave_requests,
  hrms.approval_requests,
  hrms.approval_steps,
  hrms.tickets,
  hrms.separations
to authenticated;
grant all on all tables in schema hrms to service_role;

with org as (select id from public.organizations where slug = 'hirerabbits')
insert into hrms.leave_types (org_id, name, code, annual_quota_days, is_paid, allows_half_day, requires_document, carry_forward_cap_days)
select org.id, v.name, v.code, v.quota, true, true, v.requires_document, v.carry
from org
cross join (values
  ('Earned Leave','EL',18::numeric,false,30::numeric),
  ('Casual Leave','CL',8::numeric,false,0::numeric),
  ('Sick Leave','SL',12::numeric,true,0::numeric),
  ('Compensatory Off','CO',null::numeric,false,null::numeric)
) as v(name, code, quota, requires_document, carry)
on conflict (org_id, code) do nothing;

create or replace function public.hrms_current_context()
returns jsonb
language plpgsql
stable
set search_path = public, hrms
as $$
declare
  v_org_id uuid;
  v_employee_id uuid;
begin
  select m.org_id into v_org_id
  from public.org_members m
  where m.profile_id = (select auth.uid()) and m.is_active
  order by m.created_at
  limit 1;

  if v_org_id is null then
    raise exception 'No active organization' using errcode = '42501';
  end if;

  select e.id into v_employee_id
  from hrms.employees e
  where e.org_id = v_org_id and e.profile_id = (select auth.uid())
  order by e.created_at
  limit 1;

  if v_employee_id is null then
    select e.id into v_employee_id
    from hrms.employees e
    where e.org_id = v_org_id
    order by e.created_at
    limit 1;
  end if;

  return jsonb_build_object('org_id', v_org_id, 'employee_id', v_employee_id);
end;
$$;

create or replace function public.hrms_next_code(sequence_name text, code_prefix text)
returns text
language plpgsql
set search_path = public, hrms
as $$
declare
  v_org_id uuid := (public.hrms_current_context()->>'org_id')::uuid;
  v_prefix text;
  v_next integer;
begin
  insert into public.sequences (org_id, sequence_key, prefix, next_value)
  values (v_org_id, sequence_name, code_prefix, 1)
  on conflict (org_id, sequence_key) do nothing;

  select prefix, next_value into v_prefix, v_next
  from public.sequences
  where org_id = v_org_id and sequence_key = sequence_name
  for update;

  update public.sequences
  set next_value = v_next + 1
  where org_id = v_org_id and sequence_key = sequence_name;

  return v_prefix || lpad(v_next::text, 4, '0');
end;
$$;

create or replace function public.hrms_approval_rows(scope text default 'team')
returns jsonb
language sql
stable
set search_path = public, hrms
as $$
  with ctx as (
    select (public.hrms_current_context()->>'org_id')::uuid org_id,
           (public.hrms_current_context()->>'employee_id')::uuid employee_id
  ),
  rows as (
    select
      ar.id,
      ar.request_code,
      ar.request_type,
      ar.employee_id,
      e.employee_code,
      e.full_name as employee_name,
      dep.name as department,
      ar.subject,
      ar.from_date,
      ar.to_date,
      ar.days,
      ar.amount_paise,
      ar.reason,
      ar.created_at as applied_at,
      ar.status,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'sequence', s.sequence,
          'approver_source', s.approver_source,
          'approver_name', approver.full_name,
          'status', s.status,
          'acted_at', s.acted_at,
          'comment', s.comment
        ) order by s.sequence)
        from hrms.approval_steps s
        left join hrms.employees approver on approver.id = s.approver_employee_id
        where s.request_id = ar.id
      ), '[]'::jsonb) as steps
    from hrms.approval_requests ar
    join ctx on ctx.org_id = ar.org_id
    join hrms.employees e on e.id = ar.employee_id
    left join lateral (
      select a.department_id
      from hrms.employee_assignments a
      where a.employee_id = e.id and a.is_primary and a.effective_to is null
      order by a.effective_from desc
      limit 1
    ) a on true
    left join hrms.departments dep on dep.id = a.department_id
    where scope <> 'me' or ar.employee_id = ctx.employee_id
    order by ar.created_at desc
  )
  select coalesce(jsonb_agg(to_jsonb(rows)), '[]'::jsonb) from rows;
$$;

create or replace function public.hrms_attendance_rows(scope text default 'me', month_filter text default null, work_date_filter date default null)
returns jsonb
language sql
stable
set search_path = public, hrms
as $$
  with ctx as (
    select (public.hrms_current_context()->>'org_id')::uuid org_id,
           (public.hrms_current_context()->>'employee_id')::uuid employee_id
  ),
  days as (
    select
      d.id,
      d.employee_id,
      e.full_name as employee_name,
      e.employee_code,
      d.work_date,
      d.shift_name,
      d.first_in,
      d.last_out,
      d.worked_minutes,
      d.extra_minutes,
      d.day_status,
      d.payable_fraction,
      d.penalty_reason,
      d.is_regularized,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', p.id,
          'punched_at', p.punched_at,
          'direction', p.direction,
          'source', p.source,
          'location', p.location
        ) order by p.punched_at)
        from hrms.attendance_punches p
        where p.attendance_day_id = d.id
      ), '[]'::jsonb) as punches
    from hrms.attendance_days d
    join ctx on ctx.org_id = d.org_id
    join hrms.employees e on e.id = d.employee_id
    where (scope <> 'me' or d.employee_id = ctx.employee_id)
      and (month_filter is null or d.work_date::text like month_filter || '%')
      and (work_date_filter is null or d.work_date = work_date_filter)
    order by d.work_date desc, e.full_name
  )
  select coalesce(jsonb_agg(to_jsonb(days)), '[]'::jsonb) from days;
$$;

create or replace function public.hrms_leave_balances()
returns jsonb
language sql
stable
set search_path = public, hrms
as $$
  with ctx as (
    select (public.hrms_current_context()->>'org_id')::uuid org_id,
           (public.hrms_current_context()->>'employee_id')::uuid employee_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'leave_type_id', lt.id,
    'leave_type', lt.name,
    'opening', 0,
    'accrued', coalesce(lt.annual_quota_days, 0),
    'used', coalesce(used.days, 0),
    'balance', greatest(coalesce(lt.annual_quota_days, 0) - coalesce(used.days, 0), 0)
  ) order by lt.name), '[]'::jsonb)
  from hrms.leave_types lt
  join ctx on ctx.org_id = lt.org_id
  left join (
    select leave_type_id, sum(days) as days
    from hrms.leave_requests lr
    join ctx c on c.employee_id = lr.employee_id
    where lr.status in ('pending','approved')
    group by leave_type_id
  ) used on used.leave_type_id = lt.id
  where lt.is_active;
$$;

create or replace function public.hrms_me()
returns jsonb
language sql
stable
set search_path = public, hrms
as $$
  with ctx as (
    select (public.hrms_current_context()->>'employee_id')::uuid employee_id
  )
  select jsonb_build_object(
    'employee', (select to_jsonb(e) from public.hrms_employee_directory e join ctx on e.id = ctx.employee_id),
    'attendance', public.hrms_attendance_rows('me', to_char(current_date, 'YYYY-MM'), null),
    'leave_types', coalesce((
      select jsonb_agg(to_jsonb(lt) order by lt.name)
      from hrms.leave_types lt
      where lt.org_id = (public.hrms_current_context()->>'org_id')::uuid
        and lt.is_active
    ), '[]'::jsonb),
    'leave_balances', public.hrms_leave_balances(),
    'requests', public.hrms_approval_rows('me')
  );
$$;

create or replace function public.hrms_attendance(payload jsonb default '{}'::jsonb)
returns jsonb
language sql
stable
set search_path = public, hrms
as $$
  select jsonb_build_object(
    'rows', public.hrms_attendance_rows(coalesce(payload->>'scope', 'me'), nullif(payload->>'month', ''), nullif(payload->>'work_date', '')::date),
    'employees', coalesce((select jsonb_agg(to_jsonb(e) order by e.name) from public.hrms_employee_directory e where e.status <> 'separated'), '[]'::jsonb),
    'departments', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'is_active', d.is_active) order by d.name) from hrms.departments d where d.org_id = (public.hrms_current_context()->>'org_id')::uuid and d.is_active), '[]'::jsonb)
  );
$$;

create or replace function public.hrms_record_punch(payload jsonb)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_ctx jsonb := public.hrms_current_context();
  v_org_id uuid := (v_ctx->>'org_id')::uuid;
  v_employee_id uuid := coalesce(nullif(payload->>'employee_id', '')::uuid, (v_ctx->>'employee_id')::uuid);
  v_day_id uuid;
  v_punch_id uuid;
  v_punched_at timestamptz := coalesce(nullif(payload->>'punched_at', '')::timestamptz, now());
  v_direction text := coalesce(nullif(payload->>'direction', ''), 'in');
begin
  insert into hrms.attendance_days (org_id, employee_id, work_date, day_status, payable_fraction, source, created_by, updated_by)
  values (v_org_id, v_employee_id, (v_punched_at at time zone 'Asia/Kolkata')::date, 'present', 1, 'web', (select auth.uid()), (select auth.uid()))
  on conflict (org_id, employee_id, work_date) do update
    set updated_by = (select auth.uid()), updated_at = now(), day_status = 'present', payable_fraction = 1
  returning id into v_day_id;

  insert into hrms.attendance_punches (org_id, attendance_day_id, employee_id, punched_at, direction, source, location, created_by, updated_by)
  values (v_org_id, v_day_id, v_employee_id, v_punched_at, v_direction, coalesce(nullif(payload->>'source', ''), 'web'), nullif(payload->>'location', ''), (select auth.uid()), (select auth.uid()))
  returning id into v_punch_id;

  update hrms.attendance_days
  set first_in = least(coalesce(first_in, v_punched_at), v_punched_at),
      last_out = case when v_direction = 'out' then greatest(coalesce(last_out, v_punched_at), v_punched_at) else last_out end,
      worked_minutes = case
        when first_in is not null and (v_direction = 'out' or last_out is not null)
        then greatest(0, extract(epoch from (greatest(coalesce(last_out, v_punched_at), v_punched_at) - first_in))::int / 60)
        else worked_minutes
      end,
      updated_at = now()
  where id = v_day_id;

  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  values (v_org_id, 'hrms', 'attendance_punch', v_punch_id::text, 'attendance.punched', 'Attendance punch recorded', jsonb_build_object('employee_id', v_employee_id, 'direction', v_direction), (select auth.uid()));

  return (select to_jsonb(x) from (select * from hrms.attendance_punches where id = v_punch_id) x);
end;
$$;

create or replace function public.hrms_record_manual_attendance(payload jsonb)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_ctx jsonb := public.hrms_current_context();
  v_org_id uuid := (v_ctx->>'org_id')::uuid;
  v_employee_id uuid := nullif(payload->>'employee_id', '')::uuid;
  v_work_date date := coalesce(nullif(payload->>'work_date', '')::date, current_date);
  v_day_id uuid;
  v_first timestamptz := (v_work_date::text || ' ' || coalesce(nullif(payload->>'first_in', ''), '09:30') || '+05:30')::timestamptz;
  v_last timestamptz := (v_work_date::text || ' ' || coalesce(nullif(payload->>'last_out', ''), '18:30') || '+05:30')::timestamptz;
begin
  if v_employee_id is null then
    raise exception 'employee_id is required' using errcode = '22023';
  end if;

  insert into hrms.attendance_days (org_id, employee_id, work_date, first_in, last_out, worked_minutes, day_status, payable_fraction, is_regularized, source, comments, created_by, updated_by)
  values (v_org_id, v_employee_id, v_work_date, v_first, v_last, greatest(0, extract(epoch from (v_last - v_first))::int / 60), coalesce(nullif(payload->>'day_status', ''), 'present'), 1, true, 'manual_admin', nullif(payload->>'reason', ''), (select auth.uid()), (select auth.uid()))
  on conflict (org_id, employee_id, work_date) do update
    set first_in = excluded.first_in, last_out = excluded.last_out, worked_minutes = excluded.worked_minutes,
        day_status = excluded.day_status, payable_fraction = excluded.payable_fraction,
        is_regularized = true, source = 'manual_admin', comments = excluded.comments,
        updated_by = (select auth.uid()), updated_at = now()
  returning id into v_day_id;

  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  values (v_org_id, 'hrms', 'attendance_day', v_day_id::text, 'attendance.manual_recorded', 'Manual attendance recorded', payload, (select auth.uid()));

  return (select to_jsonb(x) from (select * from hrms.attendance_days where id = v_day_id) x);
end;
$$;

create or replace function public.hrms_create_approval_request(payload jsonb)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_ctx jsonb := public.hrms_current_context();
  v_org_id uuid := (v_ctx->>'org_id')::uuid;
  v_employee_id uuid := coalesce(nullif(payload->>'employee_id', '')::uuid, (v_ctx->>'employee_id')::uuid);
  v_request_id uuid;
  v_code text := public.hrms_next_code('approval_request', 'REQ-');
  v_manager_id uuid;
begin
  select a.reporting_manager_id into v_manager_id
  from hrms.employee_assignments a
  where a.employee_id = v_employee_id and a.is_primary and a.effective_to is null
  order by a.effective_from desc
  limit 1;

  insert into hrms.approval_requests (org_id, request_code, request_type, employee_id, subject, from_date, to_date, days, reason, source_table, source_id, payload, created_by, updated_by)
  values (
    v_org_id,
    v_code,
    coalesce(nullif(payload->>'request_type', ''), 'regularization'),
    v_employee_id,
    coalesce(nullif(payload->>'subject', ''), initcap(replace(coalesce(payload->>'request_type', 'request'), '_', ' '))),
    nullif(payload->>'from_date', '')::date,
    nullif(payload->>'to_date', '')::date,
    nullif(payload->>'days', '')::numeric,
    nullif(payload->>'reason', ''),
    nullif(payload->>'source_table', ''),
    nullif(payload->>'source_id', '')::uuid,
    payload,
    (select auth.uid()),
    (select auth.uid())
  )
  returning id into v_request_id;

  insert into hrms.approval_steps (org_id, request_id, sequence, approver_source, approver_employee_id, created_by, updated_by)
  values (v_org_id, v_request_id, 1, case when v_manager_id is null then 'admin' else 'manager' end, v_manager_id, (select auth.uid()), (select auth.uid()));

  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  values (v_org_id, 'hrms', 'approval_request', v_request_id::text, 'approval.created', 'Approval request created', payload, (select auth.uid()));

  return (select elem from jsonb_array_elements(public.hrms_approval_rows('team')) elem where elem->>'id' = v_request_id::text limit 1);
end;
$$;

create or replace function public.hrms_create_leave(payload jsonb)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_ctx jsonb := public.hrms_current_context();
  v_org_id uuid := (v_ctx->>'org_id')::uuid;
  v_employee_id uuid := (v_ctx->>'employee_id')::uuid;
  v_leave_id uuid;
  v_request jsonb;
  v_type_name text;
begin
  insert into hrms.leave_requests (org_id, employee_id, leave_type_id, from_date, to_date, days, day_portion, include_weekends, reason, created_by, updated_by)
  values (v_org_id, v_employee_id, (payload->>'leave_type_id')::uuid, (payload->>'from_date')::date, (payload->>'to_date')::date, (payload->>'days')::numeric, coalesce(payload->>'day_portion', 'full_day'), coalesce((payload->>'include_weekends')::boolean, false), nullif(payload->>'reason', ''), (select auth.uid()), (select auth.uid()))
  returning id into v_leave_id;

  select name into v_type_name from hrms.leave_types where id = (payload->>'leave_type_id')::uuid;
  v_request := public.hrms_create_approval_request(payload || jsonb_build_object(
    'request_type', 'leave',
    'subject', coalesce(v_type_name, 'Leave'),
    'source_table', 'hrms.leave_requests',
    'source_id', v_leave_id
  ));

  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  values (v_org_id, 'hrms', 'leave_request', v_leave_id::text, 'leave.created', 'Leave request submitted', payload, (select auth.uid()));

  return v_request;
end;
$$;

create or replace function public.hrms_update_leave(request_id uuid, payload jsonb)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_org_id uuid := (public.hrms_current_context()->>'org_id')::uuid;
begin
  update hrms.leave_requests
  set status = coalesce(payload->>'status', 'cancelled'), updated_by = (select auth.uid()), updated_at = now()
  where id = request_id and org_id = v_org_id;

  update hrms.approval_requests
  set status = coalesce(payload->>'status', 'cancelled'), updated_by = (select auth.uid()), updated_at = now()
  where source_table = 'hrms.leave_requests' and source_id = request_id and org_id = v_org_id;

  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  values (v_org_id, 'hrms', 'leave_request', request_id::text, 'leave.updated', 'Leave request updated', payload, (select auth.uid()));

  return jsonb_build_object('id', request_id, 'status', coalesce(payload->>'status', 'cancelled'));
end;
$$;

create or replace function public.hrms_decide_approval(request_id uuid, decision text, comment text default null)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_org_id uuid := (public.hrms_current_context()->>'org_id')::uuid;
  v_request hrms.approval_requests%rowtype;
begin
  if decision not in ('approved','rejected') then
    raise exception 'decision must be approved or rejected' using errcode = '22023';
  end if;

  update hrms.approval_steps
  set status = decision, acted_at = now(), comment = nullif(comment, ''), updated_by = (select auth.uid()), updated_at = now()
  where request_id = hrms_decide_approval.request_id and org_id = v_org_id and sequence = 1;

  update hrms.approval_requests
  set status = decision, updated_by = (select auth.uid()), updated_at = now()
  where id = request_id and org_id = v_org_id
  returning * into v_request;

  if v_request.source_table = 'hrms.leave_requests' and v_request.source_id is not null then
    update hrms.leave_requests set status = decision, updated_by = (select auth.uid()), updated_at = now()
    where id = v_request.source_id and org_id = v_org_id;
  end if;

  if decision = 'approved' and v_request.request_type in ('regularization','on_duty','wfh') then
    perform public.hrms_record_manual_attendance(v_request.payload || jsonb_build_object('employee_id', v_request.employee_id, 'work_date', v_request.from_date, 'day_status', case when v_request.request_type = 'wfh' then 'wfh' when v_request.request_type = 'on_duty' then 'on_duty' else 'present' end, 'reason', v_request.reason));
  end if;

  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  values (v_org_id, 'hrms', 'approval_request', request_id::text, 'approval.' || decision, 'Approval request ' || decision, jsonb_build_object('comment', comment), (select auth.uid()));

  return (select elem from jsonb_array_elements(public.hrms_approval_rows('team')) elem where elem->>'id' = request_id::text limit 1);
end;
$$;

create or replace function public.hrms_approvals()
returns jsonb
language sql
stable
set search_path = public, hrms
as $$
  select jsonb_build_object(
    'requests', public.hrms_approval_rows('team'),
    'departments', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'is_active', d.is_active) order by d.name) from hrms.departments d where d.org_id = (public.hrms_current_context()->>'org_id')::uuid and d.is_active), '[]'::jsonb),
    'pending_tasks', coalesce((
      select jsonb_agg(jsonb_build_object('label', initcap(replace(request_type, '_', ' ')) || ' requests', 'count', count, 'href', '/hrms/team/approvals', 'hint', 'Waiting on an approval step') order by count desc)
      from (
        select request_type, count(*)::int
        from hrms.approval_requests
        where org_id = (public.hrms_current_context()->>'org_id')::uuid and status = 'pending'
        group by request_type
      ) x
    ), '[]'::jsonb)
  );
$$;

create or replace function public.hrms_tickets(payload jsonb default '{}'::jsonb)
returns jsonb
language sql
stable
set search_path = public, hrms
as $$
  with ctx as (
    select (public.hrms_current_context()->>'org_id')::uuid org_id,
           (public.hrms_current_context()->>'employee_id')::uuid employee_id
  ),
  rows as (
    select
      t.id,
      t.ticket_code,
      t.subject,
      t.category,
      t.priority,
      t.status,
      t.raised_by_id,
      raised.full_name as raised_by,
      assigned.full_name as assigned_to,
      t.created_at,
      t.resolved_at
    from hrms.tickets t
    join ctx on ctx.org_id = t.org_id
    join hrms.employees raised on raised.id = t.raised_by_id
    left join hrms.employees assigned on assigned.id = t.assigned_to_employee_id
    order by t.created_at desc
  )
  select jsonb_build_object(
    'tickets', coalesce((select jsonb_agg(to_jsonb(rows)) from rows), '[]'::jsonb),
    'categories', jsonb_build_array(
      jsonb_build_object('id','cat-hr','name','HR'),
      jsonb_build_object('id','cat-payroll','name','Payroll'),
      jsonb_build_object('id','cat-it','name','IT'),
      jsonb_build_object('id','cat-admin','name','Admin')
    ),
    'me', (select to_jsonb(e) from public.hrms_employee_directory e join ctx on e.id = ctx.employee_id)
  );
$$;

create or replace function public.hrms_create_ticket(payload jsonb)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_ctx jsonb := public.hrms_current_context();
  v_org_id uuid := (v_ctx->>'org_id')::uuid;
  v_employee_id uuid := (v_ctx->>'employee_id')::uuid;
  v_ticket_id uuid;
  v_code text := public.hrms_next_code('ticket', 'TCK-');
begin
  insert into hrms.tickets (org_id, ticket_code, subject, category, priority, raised_by_id, description, related_product, related_entity_type, related_entity_id, created_by, updated_by)
  values (v_org_id, v_code, payload->>'subject', coalesce(nullif(payload->>'category', ''), 'HR'), coalesce(nullif(payload->>'priority', ''), 'medium'), v_employee_id, nullif(payload->>'description', ''), nullif(payload->>'related_product', ''), nullif(payload->>'related_entity_type', ''), nullif(payload->>'related_entity_id', ''), (select auth.uid()), (select auth.uid()))
  returning id into v_ticket_id;

  if nullif(payload->>'related_entity_id', '') is not null then
    insert into public.entity_links (org_id, source_product, source_entity_type, source_entity_id, target_product, target_entity_type, target_entity_id, link_type, metadata, created_by)
    values (v_org_id, coalesce(nullif(payload->>'related_product', ''), 'hrms'), coalesce(nullif(payload->>'related_entity_type', ''), 'unknown'), payload->>'related_entity_id', 'hrms', 'ticket', v_ticket_id::text, 'related_ticket', '{}'::jsonb, (select auth.uid()))
    on conflict do nothing;
  end if;

  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  values (v_org_id, 'hrms', 'ticket', v_ticket_id::text, 'ticket.created', 'Ticket raised', payload, (select auth.uid()));

  return (select elem from jsonb_array_elements(public.hrms_tickets()->'tickets') elem where elem->>'id' = v_ticket_id::text limit 1);
end;
$$;

create or replace function public.hrms_update_ticket(ticket_id uuid, payload jsonb)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_org_id uuid := (public.hrms_current_context()->>'org_id')::uuid;
begin
  update hrms.tickets
  set status = coalesce(payload->>'status', status),
      resolved_at = case when coalesce(payload->>'status', status) in ('resolved','closed') then now() else resolved_at end,
      updated_by = (select auth.uid()),
      updated_at = now()
  where id = ticket_id and org_id = v_org_id;

  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  values (v_org_id, 'hrms', 'ticket', ticket_id::text, 'ticket.updated', 'Ticket updated', payload, (select auth.uid()));

  return (select elem from jsonb_array_elements(public.hrms_tickets()->'tickets') elem where elem->>'id' = ticket_id::text limit 1);
end;
$$;

create or replace function public.hrms_separations()
returns jsonb
language sql
stable
set search_path = public, hrms
as $$
  with ctx as (select (public.hrms_current_context()->>'org_id')::uuid org_id),
  rows as (
    select
      s.id,
      s.employee_id,
      e.employee_code,
      e.full_name as employee_name,
      dep.name as department,
      des.name as designation,
      s.separation_type,
      s.resignation_date,
      s.notice_days,
      s.last_working_date,
      s.reason,
      s.status,
      s.clearance_pending,
      s.exit_interview_done
    from hrms.separations s
    join ctx on ctx.org_id = s.org_id
    join hrms.employees e on e.id = s.employee_id
    left join lateral (
      select a.department_id, a.designation_id
      from hrms.employee_assignments a
      where a.employee_id = e.id and a.is_primary and a.effective_to is null
      order by a.effective_from desc
      limit 1
    ) a on true
    left join hrms.departments dep on dep.id = a.department_id
    left join hrms.designations des on des.id = a.designation_id
    order by s.created_at desc
  )
  select jsonb_build_object(
    'separations', coalesce((select jsonb_agg(to_jsonb(rows)) from rows), '[]'::jsonb),
    'employees', coalesce((select jsonb_agg(to_jsonb(e) order by e.name) from public.hrms_employee_directory e where e.status <> 'separated'), '[]'::jsonb)
  );
$$;

create or replace function public.hrms_create_separation(payload jsonb)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_org_id uuid := (public.hrms_current_context()->>'org_id')::uuid;
  v_sep_id uuid;
  v_employee_id uuid := (payload->>'employee_id')::uuid;
begin
  insert into hrms.separations (org_id, employee_id, separation_type, resignation_date, notice_days, last_working_date, reason, created_by, updated_by)
  values (v_org_id, v_employee_id, coalesce(payload->>'separation_type', 'resignation'), (payload->>'resignation_date')::date, coalesce(nullif(payload->>'notice_days', '')::int, 0), coalesce(nullif(payload->>'last_working_date', '')::date, (payload->>'resignation_date')::date + coalesce(nullif(payload->>'notice_days', '')::int, 0)), nullif(payload->>'reason', ''), (select auth.uid()), (select auth.uid()))
  returning id into v_sep_id;

  perform public.hrms_create_approval_request(payload || jsonb_build_object('request_type', 'separation', 'employee_id', v_employee_id, 'subject', 'Separation request', 'from_date', payload->>'resignation_date', 'source_table', 'hrms.separations', 'source_id', v_sep_id));

  insert into public.entity_links (org_id, source_product, source_entity_type, source_entity_id, target_product, target_entity_type, target_entity_id, link_type, metadata, created_by)
  values (v_org_id, 'hrms', 'employee', v_employee_id::text, 'hrms', 'separation', v_sep_id::text, 'employee_separation', '{}'::jsonb, (select auth.uid()))
  on conflict do nothing;

  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  values (v_org_id, 'hrms', 'separation', v_sep_id::text, 'separation.created', 'Separation request created', payload, (select auth.uid()));

  return (select elem from jsonb_array_elements(public.hrms_separations()->'separations') elem where elem->>'id' = v_sep_id::text limit 1);
end;
$$;

create or replace function public.hrms_team_reports()
returns jsonb
language sql
stable
set search_path = public, hrms
as $$
  select jsonb_build_object(
    'branches', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'is_active', is_active) order by name) from hrms.branches where org_id = (public.hrms_current_context()->>'org_id')::uuid and is_active), '[]'::jsonb),
    'departments', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'is_active', is_active) order by name) from hrms.departments where org_id = (public.hrms_current_context()->>'org_id')::uuid and is_active), '[]'::jsonb)
  );
$$;

revoke all on function public.hrms_current_context() from public, anon;
revoke all on function public.hrms_next_code(text, text) from public, anon;
revoke all on function public.hrms_approval_rows(text) from public, anon;
revoke all on function public.hrms_attendance_rows(text, text, date) from public, anon;
revoke all on function public.hrms_leave_balances() from public, anon;
revoke all on function public.hrms_me() from public, anon;
revoke all on function public.hrms_attendance(jsonb) from public, anon;
revoke all on function public.hrms_record_punch(jsonb) from public, anon;
revoke all on function public.hrms_record_manual_attendance(jsonb) from public, anon;
revoke all on function public.hrms_create_approval_request(jsonb) from public, anon;
revoke all on function public.hrms_create_leave(jsonb) from public, anon;
revoke all on function public.hrms_update_leave(uuid, jsonb) from public, anon;
revoke all on function public.hrms_decide_approval(uuid, text, text) from public, anon;
revoke all on function public.hrms_approvals() from public, anon;
revoke all on function public.hrms_tickets(jsonb) from public, anon;
revoke all on function public.hrms_create_ticket(jsonb) from public, anon;
revoke all on function public.hrms_update_ticket(uuid, jsonb) from public, anon;
revoke all on function public.hrms_separations() from public, anon;
revoke all on function public.hrms_create_separation(jsonb) from public, anon;
revoke all on function public.hrms_team_reports() from public, anon;

grant execute on function public.hrms_current_context() to authenticated;
grant execute on function public.hrms_next_code(text, text) to authenticated;
grant execute on function public.hrms_approval_rows(text) to authenticated;
grant execute on function public.hrms_attendance_rows(text, text, date) to authenticated;
grant execute on function public.hrms_leave_balances() to authenticated;
grant execute on function public.hrms_me() to authenticated;
grant execute on function public.hrms_attendance(jsonb) to authenticated;
grant execute on function public.hrms_record_punch(jsonb) to authenticated;
grant execute on function public.hrms_record_manual_attendance(jsonb) to authenticated;
grant execute on function public.hrms_create_approval_request(jsonb) to authenticated;
grant execute on function public.hrms_create_leave(jsonb) to authenticated;
grant execute on function public.hrms_update_leave(uuid, jsonb) to authenticated;
grant execute on function public.hrms_decide_approval(uuid, text, text) to authenticated;
grant execute on function public.hrms_approvals() to authenticated;
grant execute on function public.hrms_tickets(jsonb) to authenticated;
grant execute on function public.hrms_create_ticket(jsonb) to authenticated;
grant execute on function public.hrms_update_ticket(uuid, jsonb) to authenticated;
grant execute on function public.hrms_separations() to authenticated;
grant execute on function public.hrms_create_separation(jsonb) to authenticated;
grant execute on function public.hrms_team_reports() to authenticated;
