create extension if not exists pgcrypto;

create schema if not exists hrms;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Asia/Kolkata',
  fiscal_year_start_month smallint not null default 4 check (fiscal_year_start_month between 1 and 12),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, profile_id)
);

create table if not exists public.organization_products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_key text not null check (product_key in ('ats','hrms','payroll','crm')),
  is_enabled boolean not null default true,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, product_key)
);

create table if not exists public.sequences (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  sequence_key text not null,
  prefix text not null default '',
  next_value integer not null default 1,
  unique (org_id, sequence_key)
);

create table if not exists hrms.branches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  timezone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists hrms.business_units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  head_employee_id uuid,
  name text not null,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists hrms.departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  business_unit_id uuid references hrms.business_units(id) on delete set null,
  parent_id uuid references hrms.departments(id) on delete set null,
  name text not null,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists hrms.function_roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists hrms.designations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  function_role_id uuid references hrms.function_roles(id) on delete set null,
  name text not null,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists hrms.employment_types (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists hrms.shifts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  start_time time,
  end_time time,
  working_hours numeric(5,2) not null default 8,
  break_minutes integer not null default 0,
  grace_in_minutes integer not null default 0,
  grace_out_minutes integer not null default 0,
  half_day_after_minutes integer,
  attendance_mode text not null default 'working_hours_only' check (attendance_mode in ('working_hours_only','strict_shift_timing')),
  week_off_days text[] not null default array['Saturday','Sunday'],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists hrms.employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  employee_code text not null,
  first_name text not null,
  middle_name text,
  last_name text,
  full_name text not null,
  work_email text not null,
  mobile text,
  photo_url text,
  date_of_joining date,
  confirmation_date date,
  probation_end_date date,
  status text not null default 'active' check (status in ('active','probation','notice','separated','on_leave')),
  date_of_birth date,
  gender text,
  blood_group text,
  marital_status text,
  nationality text not null default 'Indian',
  personal_email text,
  current_address text,
  permanent_address text,
  emergency_contact_name text,
  emergency_contact_relation text,
  emergency_contact_number text,
  payroll_enabled boolean not null default true,
  source_candidate_id text,
  custom_fields jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, employee_code),
  unique (org_id, work_email)
);

alter table hrms.business_units
  add constraint business_units_head_employee_id_fkey
  foreign key (head_employee_id) references hrms.employees(id) on delete set null;

create table if not exists hrms.employee_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references hrms.employees(id) on delete cascade,
  branch_id uuid references hrms.branches(id) on delete set null,
  business_unit_id uuid references hrms.business_units(id) on delete set null,
  department_id uuid references hrms.departments(id) on delete set null,
  designation_id uuid references hrms.designations(id) on delete set null,
  function_role_id uuid references hrms.function_roles(id) on delete set null,
  employment_type_id uuid references hrms.employment_types(id) on delete set null,
  shift_id uuid references hrms.shifts(id) on delete set null,
  reporting_manager_id uuid references hrms.employees(id) on delete set null,
  assistant_manager_id uuid references hrms.employees(id) on delete set null,
  buddy_id uuid references hrms.employees(id) on delete set null,
  effective_from date not null default current_date,
  effective_to date,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

create unique index if not exists employee_assignments_one_current_primary
  on hrms.employee_assignments(employee_id)
  where is_primary and effective_to is null;

create table if not exists public.entity_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  source_product text not null,
  source_entity_type text not null,
  source_entity_id text not null,
  target_product text not null,
  target_entity_type text not null,
  target_entity_id text not null,
  link_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (org_id, source_product, source_entity_type, source_entity_id, target_product, target_entity_type, target_entity_id, link_type)
);

create table if not exists public.entity_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_key text not null,
  entity_type text not null,
  entity_id text not null,
  event_type text not null,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  actor_profile_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists org_members_profile_id_idx on public.org_members(profile_id);
create index if not exists org_members_org_id_idx on public.org_members(org_id);
create index if not exists employees_org_id_idx on hrms.employees(org_id);
create index if not exists employees_profile_id_idx on hrms.employees(profile_id);
create index if not exists employee_assignments_employee_id_idx on hrms.employee_assignments(employee_id);
create index if not exists employee_assignments_reporting_manager_id_idx on hrms.employee_assignments(reporting_manager_id);
create index if not exists entity_links_source_idx on public.entity_links(org_id, source_product, source_entity_type, source_entity_id);
create index if not exists entity_links_target_idx on public.entity_links(org_id, target_product, target_entity_type, target_entity_id);
create index if not exists entity_events_entity_idx on public.entity_events(org_id, product_key, entity_type, entity_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.organization_products enable row level security;
alter table public.sequences enable row level security;
alter table public.entity_links enable row level security;
alter table public.entity_events enable row level security;

create policy "organizations_select_member" on public.organizations
  for select to authenticated
  using (exists (
    select 1 from public.org_members m
    where m.org_id = organizations.id
      and m.profile_id = (select auth.uid())
      and m.is_active
  ));

create policy "org_members_select_own_or_hr" on public.org_members
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin','hr_manager')
    )
  );

create policy "org_members_write_hr" on public.org_members
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin','hr_manager')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin','hr_manager')
  ));

do $$
declare
  table_ref text;
  rel_name text;
begin
  foreach table_ref in array array[
    'public.organization_products',
    'public.sequences',
    'public.entity_links',
    'public.entity_events',
    'hrms.branches',
    'hrms.business_units',
    'hrms.departments',
    'hrms.function_roles',
    'hrms.designations',
    'hrms.employment_types',
    'hrms.shifts',
    'hrms.employees',
    'hrms.employee_assignments'
  ] loop
    rel_name := split_part(table_ref, '.', 2);
    execute format('alter table %s enable row level security', table_ref);
    execute format('create policy "%s_select_member" on %s for select to authenticated using (exists (select 1 from public.org_members m where m.org_id = %I.org_id and m.profile_id = (select auth.uid()) and m.is_active))', replace(table_ref, '.', '_'), table_ref, rel_name);
    execute format('create policy "%s_write_hr" on %s for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in (''admin'',''hr_manager''))) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in (''admin'',''hr_manager'')))', replace(table_ref, '.', '_'), table_ref);
  end loop;
end $$;

grant usage on schema hrms to authenticated, service_role;
grant select, insert, update, delete on all tables in schema hrms to authenticated;
grant all on all tables in schema hrms to service_role;
grant select, insert, update, delete on public.organizations, public.org_members, public.organization_products, public.sequences, public.entity_links, public.entity_events to authenticated;
grant all on public.organizations, public.org_members, public.organization_products, public.sequences, public.entity_links, public.entity_events to service_role;

insert into public.organizations (name, slug)
values ('HireRabbits', 'hirerabbits')
on conflict (slug) do update set name = excluded.name;

with org as (
  select id from public.organizations where slug = 'hirerabbits'
)
insert into public.org_members (org_id, profile_id, role_key)
select org.id, p.id, coalesce(nullif(p.role, ''), 'employee')
from org
cross join public.profiles p
on conflict (org_id, profile_id) do update set role_key = excluded.role_key, is_active = true;

with org as (
  select id from public.organizations where slug = 'hirerabbits'
)
insert into public.organization_products (org_id, product_key, is_enabled)
select org.id, product_key, true
from org
cross join (values ('ats'), ('hrms')) as products(product_key)
on conflict (org_id, product_key) do update set is_enabled = excluded.is_enabled;

with org as (
  select id from public.organizations where slug = 'hirerabbits'
)
insert into public.sequences (org_id, sequence_key, prefix, next_value)
select org.id, 'employee_code', 'HR-', greatest(1, (select count(*)::int + 1 from public.profiles))
from org
on conflict (org_id, sequence_key) do nothing;

with org as (
  select id from public.organizations where slug = 'hirerabbits'
)
insert into hrms.employment_types (org_id, name, code)
select org.id, v.name, v.code
from org
cross join (values ('Permanent','PERM'), ('Contract','CTR'), ('Intern','INT'), ('Consultant','CON')) as v(name, code)
on conflict (org_id, name) do nothing;

with org as (
  select id from public.organizations where slug = 'hirerabbits'
)
insert into hrms.shifts (
  org_id, name, code, start_time, end_time, working_hours, break_minutes,
  grace_in_minutes, grace_out_minutes, half_day_after_minutes, attendance_mode, week_off_days
)
select
  org.id, 'General Shift', 'GEN', time '09:30', time '18:30', 8, 60,
  15, 15, 240, 'strict_shift_timing', array['Saturday','Sunday']
from org
on conflict (org_id, name) do nothing;

with org as (
  select id from public.organizations where slug = 'hirerabbits'
),
numbered as (
  select p.*, row_number() over (order by p.created_at nulls last, p.id) as rn
  from public.profiles p
)
insert into hrms.employees (
  org_id, profile_id, employee_code, first_name, last_name, full_name, work_email,
  status, date_of_joining, created_by
)
select
  org.id,
  n.id,
  'HR-' || lpad(n.rn::text, 4, '0'),
  coalesce(nullif(split_part(coalesce(n.name, n.email, 'Employee'), ' ', 1), ''), 'Employee'),
  nullif(trim(replace(coalesce(n.name, ''), split_part(coalesce(n.name, ''), ' ', 1), '')), ''),
  coalesce(nullif(n.name, ''), n.email, 'Employee'),
  lower(coalesce(nullif(n.email, ''), n.id::text || '@unknown.local')),
  case when n.role = 'candidate' then 'probation' else 'active' end,
  current_date,
  n.id
from org
cross join numbered n
on conflict (org_id, work_email) do nothing;

with org as (
  select id from public.organizations where slug = 'hirerabbits'
)
insert into hrms.employee_assignments (org_id, employee_id, effective_from)
select e.org_id, e.id, coalesce(e.date_of_joining, current_date)
from hrms.employees e
join org on org.id = e.org_id
on conflict do nothing;

create or replace view public.hrms_employee_directory
with (security_invoker = true)
as
select
  e.id,
  e.org_id,
  e.profile_id,
  e.employee_code,
  e.full_name as name,
  e.work_email as email,
  e.mobile,
  e.photo_url,
  d.name as designation,
  dep.name as department,
  parent_dep.name as sub_department,
  bu.name as business_unit,
  b.name as branch,
  et.name as employment_type,
  fr.name as function_role,
  manager.id as reporting_manager_id,
  manager.full_name as reporting_manager,
  e.date_of_joining,
  e.confirmation_date,
  e.probation_end_date,
  e.status,
  e.date_of_birth,
  e.gender,
  e.blood_group,
  e.marital_status,
  e.nationality,
  e.personal_email,
  e.emergency_contact_name,
  e.emergency_contact_relation,
  e.emergency_contact_number,
  e.current_address,
  e.permanent_address,
  s.name as shift_name,
  null::text as work_location,
  s.attendance_mode,
  null::integer as ctc_annual_paise,
  e.source_candidate_id
from hrms.employees e
left join lateral (
  select *
  from hrms.employee_assignments a
  where a.employee_id = e.id
    and a.is_primary
    and a.effective_from <= current_date
    and (a.effective_to is null or a.effective_to >= current_date)
  order by a.effective_from desc
  limit 1
) a on true
left join hrms.branches b on b.id = a.branch_id
left join hrms.business_units bu on bu.id = a.business_unit_id
left join hrms.departments dep on dep.id = a.department_id
left join hrms.departments parent_dep on parent_dep.id = dep.parent_id
left join hrms.designations d on d.id = a.designation_id
left join hrms.function_roles fr on fr.id = a.function_role_id
left join hrms.employment_types et on et.id = a.employment_type_id
left join hrms.shifts s on s.id = a.shift_id
left join hrms.employees manager on manager.id = a.reporting_manager_id
where exists (
  select 1 from public.org_members m
  where m.org_id = e.org_id
    and m.profile_id = (select auth.uid())
    and m.is_active
)
and (
  e.profile_id = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin','hr_manager')
  )
  or a.reporting_manager_id in (
    select me.id
    from hrms.employees me
    where me.profile_id = (select auth.uid())
  )
);

create or replace function public.hrms_options()
returns jsonb
language plpgsql
stable
set search_path = public, hrms
as $$
declare
  v_org_id uuid;
begin
  select m.org_id into v_org_id
  from public.org_members m
  where m.profile_id = (select auth.uid())
    and m.is_active
  order by m.created_at
  limit 1;

  if v_org_id is null then
    raise exception 'No active organization' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'branches', coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from (select id, name, code, is_active from hrms.branches where org_id = v_org_id and is_active) x), '[]'::jsonb),
    'business_units', coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from (select id, name, code, is_active from hrms.business_units where org_id = v_org_id and is_active) x), '[]'::jsonb),
    'departments', coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from (select id, name, code, is_active, parent_id, business_unit_id from hrms.departments where org_id = v_org_id and is_active) x), '[]'::jsonb),
    'designations', coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from (select id, name, code, is_active, function_role_id from hrms.designations where org_id = v_org_id and is_active) x), '[]'::jsonb),
    'function_roles', coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from (select id, name, description, is_active from hrms.function_roles where org_id = v_org_id and is_active) x), '[]'::jsonb),
    'employment_types', coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from (select id, name, code, is_active from hrms.employment_types where org_id = v_org_id and is_active) x), '[]'::jsonb),
    'shifts', coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from (select id, name, code, is_active, start_time, end_time, working_hours, break_minutes, grace_in_minutes, grace_out_minutes, half_day_after_minutes, attendance_mode, week_off_days from hrms.shifts where org_id = v_org_id and is_active) x), '[]'::jsonb),
    'employees', coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from (select id, name, employee_code, email, status from public.hrms_employee_directory where org_id = v_org_id and status <> 'separated') x), '[]'::jsonb)
  );
end;
$$;

create or replace function public.hrms_create_employee(payload jsonb)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_org_id uuid;
  v_employee_id uuid;
  v_code text;
  v_prefix text;
  v_next integer;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin','hr_manager')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  select m.org_id into v_org_id
  from public.org_members m
  where m.profile_id = (select auth.uid())
    and m.is_active
  order by m.created_at
  limit 1;

  if v_org_id is null then
    raise exception 'No active organization' using errcode = '42501';
  end if;

  v_code := nullif(payload->>'employee_code', '');
  if v_code is null then
    insert into public.sequences (org_id, sequence_key, prefix, next_value)
    values (v_org_id, 'employee_code', 'HR-', 1)
    on conflict (org_id, sequence_key) do nothing;

    select prefix, next_value into v_prefix, v_next
    from public.sequences
    where org_id = v_org_id and sequence_key = 'employee_code'
    for update;

    v_code := v_prefix || lpad(v_next::text, 4, '0');

    update public.sequences
    set next_value = v_next + 1
    where org_id = v_org_id and sequence_key = 'employee_code';
  end if;

  insert into hrms.employees (
    org_id, employee_code, first_name, middle_name, last_name, full_name, work_email, mobile,
    date_of_joining, status, date_of_birth, gender, blood_group, marital_status, personal_email,
    current_address, payroll_enabled, created_by, custom_fields
  )
  values (
    v_org_id,
    v_code,
    nullif(payload->>'first_name', ''),
    nullif(payload->>'middle_name', ''),
    nullif(payload->>'last_name', ''),
    concat_ws(' ', nullif(payload->>'first_name', ''), nullif(payload->>'middle_name', ''), nullif(payload->>'last_name', '')),
    lower(nullif(payload->>'work_email', '')),
    nullif(payload->>'mobile', ''),
    nullif(payload->>'date_of_joining', '')::date,
    coalesce(nullif(payload->>'status', ''), 'active'),
    nullif(payload->>'date_of_birth', '')::date,
    nullif(payload->>'gender', ''),
    nullif(payload->>'blood_group', ''),
    nullif(payload->>'marital_status', ''),
    nullif(payload->>'personal_email', ''),
    nullif(payload->>'current_address', ''),
    coalesce((payload->>'payroll_enabled')::boolean, true),
    (select auth.uid()),
    coalesce(payload->'custom_fields', '{}'::jsonb)
  )
  returning id into v_employee_id;

  insert into hrms.employee_assignments (
    org_id, employee_id, branch_id, business_unit_id, department_id, designation_id, function_role_id,
    employment_type_id, shift_id, reporting_manager_id, assistant_manager_id, buddy_id, effective_from
  )
  values (
    v_org_id,
    v_employee_id,
    nullif(payload->>'branch_id', '')::uuid,
    nullif(payload->>'business_unit_id', '')::uuid,
    nullif(payload->>'department_id', '')::uuid,
    nullif(payload->>'designation_id', '')::uuid,
    nullif(payload->>'function_role_id', '')::uuid,
    nullif(payload->>'employment_type_id', '')::uuid,
    nullif(payload->>'shift_id', '')::uuid,
    nullif(payload->>'reporting_manager_id', '')::uuid,
    nullif(payload->>'assistant_manager_id', '')::uuid,
    nullif(payload->>'buddy_id', '')::uuid,
    coalesce(nullif(payload->>'date_of_joining', '')::date, current_date)
  );

  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  values (v_org_id, 'hrms', 'employee', v_employee_id::text, 'employee.created', 'Employee created', jsonb_build_object('employee_code', v_code), (select auth.uid()));

  return (select to_jsonb(row) from public.hrms_employee_directory row where row.id = v_employee_id);
end;
$$;

create or replace function public.hrms_master_rows(master_slug text)
returns jsonb
language plpgsql
stable
set search_path = public, hrms
as $$
declare
  v_org_id uuid;
begin
  select m.org_id into v_org_id
  from public.org_members m
  where m.profile_id = (select auth.uid())
    and m.is_active
  order by m.created_at
  limit 1;

  if v_org_id is null then
    raise exception 'No active organization' using errcode = '42501';
  end if;

  case master_slug
    when 'branch' then
      return coalesce((
        select jsonb_agg(to_jsonb(x) order by x.name)
        from (
          select b.id, b.name, b.code, b.is_active, coalesce(c.employee_count, 0)::int as employee_count
          from hrms.branches b
          left join (
            select branch_id, count(*) as employee_count
            from hrms.employee_assignments
            where org_id = v_org_id and is_primary and effective_to is null
            group by branch_id
          ) c on c.branch_id = b.id
          where b.org_id = v_org_id
        ) x
      ), '[]'::jsonb);
    when 'business-unit' then
      return coalesce((
        select jsonb_agg(to_jsonb(x) order by x.name)
        from (
          select bu.id, bu.name, bu.code, bu.is_active, bu.head_employee_id, h.full_name as head_name,
                 coalesce(c.employee_count, 0)::int as employee_count
          from hrms.business_units bu
          left join hrms.employees h on h.id = bu.head_employee_id
          left join (
            select business_unit_id, count(*) as employee_count
            from hrms.employee_assignments
            where org_id = v_org_id and is_primary and effective_to is null
            group by business_unit_id
          ) c on c.business_unit_id = bu.id
          where bu.org_id = v_org_id
        ) x
      ), '[]'::jsonb);
    when 'department' then
      return coalesce((
        select jsonb_agg(to_jsonb(x) order by x.name)
        from (
          select d.id, d.name, d.code, d.is_active, d.business_unit_id as parent_id, bu.name as parent_name,
                 coalesce(c.employee_count, 0)::int as employee_count
          from hrms.departments d
          left join hrms.business_units bu on bu.id = d.business_unit_id
          left join (
            select department_id, count(*) as employee_count
            from hrms.employee_assignments
            where org_id = v_org_id and is_primary and effective_to is null
            group by department_id
          ) c on c.department_id = d.id
          where d.org_id = v_org_id and d.parent_id is null
        ) x
      ), '[]'::jsonb);
    when 'sub-department' then
      return coalesce((
        select jsonb_agg(to_jsonb(x) order by x.name)
        from (
          select d.id, d.name, d.code, d.is_active, d.parent_id, p.name as parent_name,
                 coalesce(c.employee_count, 0)::int as employee_count
          from hrms.departments d
          join hrms.departments p on p.id = d.parent_id
          left join (
            select department_id, count(*) as employee_count
            from hrms.employee_assignments
            where org_id = v_org_id and is_primary and effective_to is null
            group by department_id
          ) c on c.department_id = d.id
          where d.org_id = v_org_id and d.parent_id is not null
        ) x
      ), '[]'::jsonb);
    when 'designation' then
      return coalesce((
        select jsonb_agg(to_jsonb(x) order by x.name)
        from (
          select d.id, d.name, d.code, d.is_active, coalesce(c.employee_count, 0)::int as employee_count
          from hrms.designations d
          left join (
            select designation_id, count(*) as employee_count
            from hrms.employee_assignments
            where org_id = v_org_id and is_primary and effective_to is null
            group by designation_id
          ) c on c.designation_id = d.id
          where d.org_id = v_org_id
        ) x
      ), '[]'::jsonb);
    when 'employment-type' then
      return coalesce((
        select jsonb_agg(to_jsonb(x) order by x.name)
        from (
          select et.id, et.name, et.code, et.is_active, coalesce(c.employee_count, 0)::int as employee_count
          from hrms.employment_types et
          left join (
            select employment_type_id, count(*) as employee_count
            from hrms.employee_assignments
            where org_id = v_org_id and is_primary and effective_to is null
            group by employment_type_id
          ) c on c.employment_type_id = et.id
          where et.org_id = v_org_id
        ) x
      ), '[]'::jsonb);
    when 'function-role' then
      return coalesce((
        select jsonb_agg(to_jsonb(x) order by x.name)
        from (
          select fr.id, fr.name, null::text as code, fr.description, fr.is_active,
                 coalesce(c.employee_count, 0)::int as employee_count
          from hrms.function_roles fr
          left join (
            select function_role_id, count(*) as employee_count
            from hrms.employee_assignments
            where org_id = v_org_id and is_primary and effective_to is null
            group by function_role_id
          ) c on c.function_role_id = fr.id
          where fr.org_id = v_org_id
        ) x
      ), '[]'::jsonb);
    else
      raise exception 'Unsupported HRMS master: %', master_slug using errcode = '22023';
  end case;
end;
$$;

create or replace function public.hrms_save_master(master_slug text, payload jsonb)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_org_id uuid;
  v_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin','hr_manager')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  select m.org_id into v_org_id
  from public.org_members m
  where m.profile_id = (select auth.uid())
    and m.is_active
  order by m.created_at
  limit 1;

  if v_org_id is null then
    raise exception 'No active organization' using errcode = '42501';
  end if;

  v_id := nullif(payload->>'id', '')::uuid;

  case master_slug
    when 'branch' then
      if v_id is null then
        insert into hrms.branches (org_id, name, code, is_active)
        values (v_org_id, payload->>'name', nullif(payload->>'code', ''), coalesce((payload->>'is_active')::boolean, true))
        returning id into v_id;
      else
        update hrms.branches
        set name = payload->>'name', code = nullif(payload->>'code', ''), is_active = coalesce((payload->>'is_active')::boolean, true)
        where id = v_id and org_id = v_org_id;
      end if;
    when 'business-unit' then
      if v_id is null then
        insert into hrms.business_units (org_id, name, code, head_employee_id, is_active)
        values (v_org_id, payload->>'name', nullif(payload->>'code', ''), nullif(payload->>'head_employee_id', '')::uuid, coalesce((payload->>'is_active')::boolean, true))
        returning id into v_id;
      else
        update hrms.business_units
        set name = payload->>'name', code = nullif(payload->>'code', ''), head_employee_id = nullif(payload->>'head_employee_id', '')::uuid, is_active = coalesce((payload->>'is_active')::boolean, true)
        where id = v_id and org_id = v_org_id;
      end if;
    when 'department' then
      if v_id is null then
        insert into hrms.departments (org_id, name, code, business_unit_id, is_active)
        values (v_org_id, payload->>'name', nullif(payload->>'code', ''), nullif(payload->>'parent_id', '')::uuid, coalesce((payload->>'is_active')::boolean, true))
        returning id into v_id;
      else
        update hrms.departments
        set name = payload->>'name', code = nullif(payload->>'code', ''), business_unit_id = nullif(payload->>'parent_id', '')::uuid, is_active = coalesce((payload->>'is_active')::boolean, true)
        where id = v_id and org_id = v_org_id and parent_id is null;
      end if;
    when 'sub-department' then
      if v_id is null then
        insert into hrms.departments (org_id, name, parent_id, is_active)
        values (v_org_id, payload->>'name', nullif(payload->>'parent_id', '')::uuid, coalesce((payload->>'is_active')::boolean, true))
        returning id into v_id;
      else
        update hrms.departments
        set name = payload->>'name', parent_id = nullif(payload->>'parent_id', '')::uuid, is_active = coalesce((payload->>'is_active')::boolean, true)
        where id = v_id and org_id = v_org_id and parent_id is not null;
      end if;
    when 'designation' then
      if v_id is null then
        insert into hrms.designations (org_id, name, code, is_active)
        values (v_org_id, payload->>'name', nullif(payload->>'code', ''), coalesce((payload->>'is_active')::boolean, true))
        returning id into v_id;
      else
        update hrms.designations
        set name = payload->>'name', code = nullif(payload->>'code', ''), is_active = coalesce((payload->>'is_active')::boolean, true)
        where id = v_id and org_id = v_org_id;
      end if;
    when 'employment-type' then
      if v_id is null then
        insert into hrms.employment_types (org_id, name, code, is_active)
        values (v_org_id, payload->>'name', nullif(payload->>'code', ''), coalesce((payload->>'is_active')::boolean, true))
        returning id into v_id;
      else
        update hrms.employment_types
        set name = payload->>'name', code = nullif(payload->>'code', ''), is_active = coalesce((payload->>'is_active')::boolean, true)
        where id = v_id and org_id = v_org_id;
      end if;
    when 'function-role' then
      if v_id is null then
        insert into hrms.function_roles (org_id, name, description, is_active)
        values (v_org_id, payload->>'name', nullif(payload->>'description', ''), coalesce((payload->>'is_active')::boolean, true))
        returning id into v_id;
      else
        update hrms.function_roles
        set name = payload->>'name', description = nullif(payload->>'description', ''), is_active = coalesce((payload->>'is_active')::boolean, true)
        where id = v_id and org_id = v_org_id;
      end if;
    else
      raise exception 'Unsupported HRMS master: %', master_slug using errcode = '22023';
  end case;

  return (
    select elem
    from jsonb_array_elements(public.hrms_master_rows(master_slug)) elem
    where elem->>'id' = v_id::text
    limit 1
  );
end;
$$;

create or replace function public.hrms_set_master_active(master_slug text, row_id uuid, active boolean)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_payload jsonb;
begin
  select elem || jsonb_build_object('is_active', active) into v_payload
  from jsonb_array_elements(public.hrms_master_rows(master_slug)) elem
  where elem->>'id' = row_id::text
  limit 1;

  if v_payload is null then
    raise exception 'HRMS master row not found' using errcode = '02000';
  end if;

  return public.hrms_save_master(master_slug, v_payload);
end;
$$;

revoke all on function public.hrms_options() from public, anon;
revoke all on function public.hrms_create_employee(jsonb) from public, anon;
revoke all on function public.hrms_master_rows(text) from public, anon;
revoke all on function public.hrms_save_master(text, jsonb) from public, anon;
revoke all on function public.hrms_set_master_active(text, uuid, boolean) from public, anon;
grant execute on function public.hrms_options() to authenticated;
grant execute on function public.hrms_create_employee(jsonb) to authenticated;
grant execute on function public.hrms_master_rows(text) to authenticated;
grant execute on function public.hrms_save_master(text, jsonb) to authenticated;
grant execute on function public.hrms_set_master_active(text, uuid, boolean) to authenticated;
grant select on public.hrms_employee_directory to authenticated;
