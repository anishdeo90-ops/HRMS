create table if not exists hrms.org_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  setting_key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, setting_key)
);

create table if not exists hrms.role_permissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  role_key text not null,
  permission_key text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (org_id, role_key, permission_key)
);

create table if not exists hrms.announcement_categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists hrms.expense_types (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists hrms.policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  version text not null default 'v1.0',
  effective_from date not null default current_date,
  scope text not null default 'organization',
  scope_name text,
  requires_acknowledgement boolean not null default true,
  acknowledged integer not null default 0,
  applicable integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hrms.email_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  event_key text not null,
  subject text not null,
  body text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, event_key)
);

create table if not exists hrms.cron_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  schedule text not null,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_status text check (last_status in ('success','failed','running')),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists hrms.cron_job_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  cron_job_id uuid references hrms.cron_jobs(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('success','failed','running')),
  message text
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
  created_at timestamptz not null default now(),
  unique (org_id, code)
);

create table if not exists hrms.holidays (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  holiday_date date not null,
  holiday_type text not null default 'public' check (holiday_type in ('public','restricted','regional')),
  applies_to text not null default 'All branches',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists hrms.achievements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'performance',
  award_basis text not null default 'manual',
  criteria text,
  awarded_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists hrms.face_identities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references hrms.employees(id) on delete cascade,
  enrolled boolean not null default false,
  enrolled_on date,
  consent_given boolean not null default false,
  device_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, employee_id)
);

create table if not exists hrms.roster_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references hrms.employees(id) on delete cascade,
  shift_id uuid references hrms.shifts(id) on delete set null,
  roster_date date not null,
  is_week_off boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (org_id, employee_id, roster_date)
);

create table if not exists hrms.performance_cycles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  cycle_code text not null,
  cycle_name text not null,
  cycle_type text not null default 'annual',
  period_start date not null,
  period_end date not null,
  self_review_start date,
  self_review_end date,
  manager_review_start date,
  manager_review_end date,
  status text not null default 'draft' check (status in ('draft','active','closed')),
  participants integer not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, cycle_code)
);

create table if not exists hrms.kras (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kra_code text not null,
  kpi_name text not null,
  measurement text not null,
  weightage numeric(5,2) not null default 0,
  score numeric(3,1),
  assigned_date date default current_date,
  designation text,
  created_at timestamptz not null default now(),
  unique (org_id, kra_code)
);

create table if not exists hrms.goals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  goal_code text not null,
  title text not null,
  employee_id uuid references hrms.employees(id) on delete cascade,
  cycle_name text,
  weightage numeric(5,2) not null default 0,
  target text not null default '',
  achieved text,
  progress_percent integer not null default 0,
  due_date date,
  status text not null default 'pending',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (org_id, goal_code)
);

create table if not exists hrms.appraisal_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  template_name text not null,
  template_type text not null,
  sections integer not null default 1,
  questions integer not null default 0,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists hrms.appraisals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid references hrms.employees(id) on delete cascade,
  cycle_name text not null,
  template_name text,
  self_score numeric(3,1),
  manager_score numeric(3,1),
  final_rating numeric(3,1),
  status text not null default 'not_started',
  submitted_at date,
  created_at timestamptz not null default now()
);

create table if not exists hrms.ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references hrms.employees(id) on delete cascade,
  quarter text not null,
  rank integer not null,
  cohort_size integer not null,
  attendance_score numeric(5,2) not null default 0,
  goal_score numeric(5,2) not null default 0,
  total_score numeric(5,2) not null default 0,
  overall_score numeric(3,1),
  overall_percentage numeric(5,2),
  change integer,
  scores jsonb not null default '{}'::jsonb,
  employee_feedback text,
  appraiser_remarks text,
  areas_of_improvement text,
  next_level_scope text,
  created_at timestamptz not null default now(),
  unique (org_id, employee_id, quarter)
);

do $$
declare
  table_ref text;
  rel_name text;
begin
  foreach table_ref in array array[
    'hrms.org_settings','hrms.role_permissions','hrms.announcement_categories','hrms.expense_types',
    'hrms.policies','hrms.email_templates','hrms.cron_jobs','hrms.cron_job_runs','hrms.leave_types',
    'hrms.holidays','hrms.achievements','hrms.face_identities','hrms.roster_assignments',
    'hrms.performance_cycles','hrms.kras','hrms.goals','hrms.appraisal_templates','hrms.appraisals',
    'hrms.ranking_snapshots'
  ] loop
    rel_name := split_part(table_ref, '.', 2);
    execute format('alter table %s enable row level security', table_ref);
    execute format('drop policy if exists "%s_select_member" on %s', replace(table_ref, '.', '_'), table_ref);
    execute format('create policy "%s_select_member" on %s for select to authenticated using (exists (select 1 from public.org_members m where m.org_id = %I.org_id and m.profile_id = (select auth.uid()) and m.is_active))', replace(table_ref, '.', '_'), table_ref, rel_name);
    execute format('drop policy if exists "%s_write_hr" on %s', replace(table_ref, '.', '_'), table_ref);
    execute format('create policy "%s_write_hr" on %s for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in (''admin'',''hr_manager''))) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in (''admin'',''hr_manager'')))', replace(table_ref, '.', '_'), table_ref);
  end loop;
end $$;

grant select, insert, update, delete on
  hrms.org_settings, hrms.role_permissions, hrms.announcement_categories, hrms.expense_types,
  hrms.policies, hrms.email_templates, hrms.cron_jobs, hrms.cron_job_runs, hrms.leave_types,
  hrms.holidays, hrms.achievements, hrms.face_identities, hrms.roster_assignments,
  hrms.performance_cycles, hrms.kras, hrms.goals, hrms.appraisal_templates, hrms.appraisals,
  hrms.ranking_snapshots
to authenticated;

create or replace function public.hrms_has_permission(permission text)
returns boolean
language sql
stable
set search_path = public, hrms
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.org_members m on m.profile_id = p.id and m.is_active
    where p.id = (select auth.uid())
      and (
        p.role in ('admin','hr_manager')
        or exists (
          select 1
          from hrms.role_permissions rp
          where rp.org_id = m.org_id
            and rp.role_key = coalesce(m.role_key, p.role)
            and rp.permission_key in ('*', permission)
        )
      )
  );
$$;

create or replace function public.hrms_current_org()
returns uuid
language sql
stable
set search_path = public
as $$
  select m.org_id
  from public.org_members m
  where m.profile_id = (select auth.uid()) and m.is_active
  order by m.created_at
  limit 1;
$$;

create or replace function public.hrms_touch_event(v_org_id uuid, v_entity_type text, v_entity_id text, v_event_type text, v_summary text, v_metadata jsonb default '{}'::jsonb)
returns void
language sql
set search_path = public
as $$
  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  values (v_org_id, 'hrms', v_entity_type, v_entity_id, v_event_type, v_summary, coalesce(v_metadata, '{}'::jsonb), (select auth.uid()));
$$;

create or replace function public.hrms_settings_resource(resource_key text)
returns jsonb
language plpgsql
stable
set search_path = public, hrms
as $$
declare
  v_org uuid := public.hrms_current_org();
begin
  if v_org is null then raise exception 'No active organization' using errcode = '42501'; end if;

  case resource_key
    when 'company-profile', 'system-settings', 'general' then
      return coalesce((select value from hrms.org_settings where org_id = v_org and setting_key = resource_key), '{}'::jsonb);
    when 'permissions' then
      return coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from (
        select coalesce(m.role_key, p.role) as id, initcap(replace(coalesce(m.role_key, p.role), '_', ' ')) as name,
               null::text as description, coalesce(m.role_key, p.role) in ('admin','hr_manager','employee') as is_system,
               count(distinct p.id)::int as member_count,
               coalesce((select jsonb_agg(rp.permission_key order by rp.permission_key) from hrms.role_permissions rp where rp.org_id = v_org and rp.role_key = coalesce(m.role_key, p.role)), '[]'::jsonb) as permissions
        from public.profiles p
        left join public.org_members m on m.profile_id = p.id and m.org_id = v_org and m.is_active
        group by coalesce(m.role_key, p.role)
      ) x), '[]'::jsonb);
    when 'activity-logs' then
      return coalesce((select jsonb_agg(to_jsonb(x) order by x.occurred_at desc) from (
        select e.id, e.created_at as occurred_at, coalesce(p.name, p.email, 'System') as actor_name,
               e.event_type as action, e.entity_type, coalesce(e.summary, e.entity_id) as entity_label,
               e.metadata->>'ip_address' as ip_address
        from public.entity_events e
        left join public.profiles p on p.id = e.actor_profile_id
        where e.org_id = v_org and e.product_key = 'hrms'
        order by e.created_at desc
        limit 200
      ) x), '[]'::jsonb);
    when 'policies' then return coalesce((select jsonb_agg(to_jsonb(p) order by p.effective_from desc) from hrms.policies p where p.org_id = v_org), '[]'::jsonb);
    when 'announcement-category' then return coalesce((select jsonb_agg(to_jsonb(c) order by c.name) from hrms.announcement_categories c where c.org_id = v_org), '[]'::jsonb);
    when 'expense-type' then return coalesce((select jsonb_agg(to_jsonb(t) order by t.name) from hrms.expense_types t where t.org_id = v_org), '[]'::jsonb);
    when 'email-templates' then return coalesce((select jsonb_agg(to_jsonb(t) order by t.name) from hrms.email_templates t where t.org_id = v_org), '[]'::jsonb);
    when 'cron-jobs' then return coalesce((select jsonb_agg(to_jsonb(j) order by j.name) from hrms.cron_jobs j where j.org_id = v_org), '[]'::jsonb);
    when 'leave-types' then return coalesce((select jsonb_agg(to_jsonb(t) order by t.name) from hrms.leave_types t where t.org_id = v_org), '[]'::jsonb);
    when 'holidays' then return coalesce((select jsonb_agg(to_jsonb(h) order by h.holiday_date) from hrms.holidays h where h.org_id = v_org), '[]'::jsonb);
    when 'achievements' then return coalesce((select jsonb_agg(to_jsonb(a) order by a.name) from hrms.achievements a where a.org_id = v_org), '[]'::jsonb);
    when 'face-identities' then
      return coalesce((select jsonb_agg(to_jsonb(x) order by x.employee->>'name') from (
        select jsonb_build_object(
          'id', e.id, 'employee_code', e.employee_code, 'name', e.full_name, 'branch', d.branch,
          'work_location', d.work_location, 'status', e.status
        ) as employee,
        coalesce(f.enrolled, false) as enrolled, f.enrolled_on, coalesce(f.consent_given, false) as consent_given,
        coalesce(f.device_count, 0) as device_count
        from hrms.employees e
        left join public.hrms_employee_directory d on d.id = e.id
        left join hrms.face_identities f on f.employee_id = e.id and f.org_id = e.org_id
        where e.org_id = v_org and e.status <> 'separated'
      ) x), '[]'::jsonb);
    when 'shifts' then return coalesce((select jsonb_agg(to_jsonb(s) order by s.name) from hrms.shifts s where s.org_id = v_org), '[]'::jsonb);
    when 'roster' then
      return jsonb_build_object(
        'employees', coalesce((select jsonb_agg(to_jsonb(e) order by e.name) from public.hrms_employee_directory e where e.org_id = v_org and e.status <> 'separated'), '[]'::jsonb),
        'shifts', coalesce((select jsonb_agg(to_jsonb(s) order by s.name) from hrms.shifts s where s.org_id = v_org and s.is_active), '[]'::jsonb),
        'assignments', coalesce((select jsonb_agg(to_jsonb(r)) from hrms.roster_assignments r where r.org_id = v_org and r.roster_date between current_date - 30 and current_date + 60), '[]'::jsonb)
      );
    else raise exception 'Unsupported HRMS settings resource: %', resource_key using errcode = '22023';
  end case;
end;
$$;

create or replace function public.hrms_save_settings_resource(resource_key text, payload jsonb)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_org uuid := public.hrms_current_org();
  v_id uuid;
begin
  if v_org is null then raise exception 'No active organization' using errcode = '42501'; end if;
  if not public.hrms_has_permission(case when resource_key = 'permissions' then 'role.manage' else 'settings.manage' end) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  case resource_key
    when 'company-profile', 'system-settings', 'general' then
      insert into hrms.org_settings (org_id, setting_key, value, updated_by)
      values (v_org, resource_key, payload, (select auth.uid()))
      on conflict (org_id, setting_key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();
      perform public.hrms_touch_event(v_org, 'setting', resource_key, 'setting.saved', resource_key || ' saved', payload);
      return public.hrms_settings_resource(resource_key);
    when 'permissions' then
      delete from hrms.role_permissions where org_id = v_org and role_key = payload->>'role_key';
      insert into hrms.role_permissions (org_id, role_key, permission_key, created_by)
      select v_org, payload->>'role_key', value::text, (select auth.uid())
      from jsonb_array_elements_text(coalesce(payload->'permissions', '[]'::jsonb));
      perform public.hrms_touch_event(v_org, 'role_permission', payload->>'role_key', 'permissions.saved', 'Permissions saved', payload);
      return public.hrms_settings_resource(resource_key);
    when 'announcement-category' then
      v_id := nullif(payload->>'id', '')::uuid;
      if v_id is null then
        insert into hrms.announcement_categories (org_id, name, is_active)
        values (v_org, payload->>'name', coalesce((payload->>'is_active')::boolean, true))
        returning id into v_id;
      else
        update hrms.announcement_categories
        set name = coalesce(nullif(payload->>'name', ''), name),
            is_active = coalesce((payload->>'is_active')::boolean, is_active)
        where org_id = v_org and id = v_id;
      end if;
    when 'expense-type' then
      v_id := nullif(payload->>'id', '')::uuid;
      if v_id is null then
        insert into hrms.expense_types (org_id, name, is_active)
        values (v_org, payload->>'name', coalesce((payload->>'is_active')::boolean, true))
        returning id into v_id;
      else
        update hrms.expense_types
        set name = coalesce(nullif(payload->>'name', ''), name),
            is_active = coalesce((payload->>'is_active')::boolean, is_active)
        where org_id = v_org and id = v_id;
      end if;
    when 'policies' then
      insert into hrms.policies (org_id, name, version, effective_from, scope, scope_name, requires_acknowledgement, created_by)
      values (v_org, payload->>'name', coalesce(payload->>'version','v1.0'), coalesce(nullif(payload->>'effective_from','')::date, current_date), coalesce(payload->>'scope','organization'), nullif(payload->>'scope_name',''), coalesce((payload->>'requires_acknowledgement')::boolean, true), (select auth.uid()))
      returning id into v_id;
    when 'email-templates' then
      insert into hrms.email_templates (org_id, name, event_key, subject, body, is_active, created_by)
      values (v_org, payload->>'name', payload->>'event_key', payload->>'subject', payload->>'body', coalesce((payload->>'is_active')::boolean, true), (select auth.uid()))
      on conflict (org_id, event_key) do update set name = excluded.name, subject = excluded.subject, body = excluded.body, is_active = excluded.is_active, updated_at = now()
      returning id into v_id;
    when 'cron-jobs' then
      update hrms.cron_jobs set is_enabled = coalesce((payload->>'is_enabled')::boolean, is_enabled), updated_at = now()
      where org_id = v_org and id = (payload->>'id')::uuid returning id into v_id;
    when 'leave-types' then
      insert into hrms.leave_types (org_id, name, code, annual_quota_days, is_paid, allows_half_day, requires_document, carry_forward_cap_days)
      values (v_org, payload->>'name', payload->>'code', nullif(payload->>'annual_quota_days','')::numeric, coalesce((payload->>'is_paid')::boolean, true), coalesce((payload->>'allows_half_day')::boolean, true), coalesce((payload->>'requires_document')::boolean, false), nullif(payload->>'carry_forward_cap_days','')::numeric)
      returning id into v_id;
    when 'holidays' then
      insert into hrms.holidays (org_id, name, holiday_date, holiday_type, applies_to)
      values (v_org, payload->>'name', coalesce(nullif(payload->>'holiday_date','')::date, current_date), coalesce(payload->>'holiday_type','public'), coalesce(payload->>'applies_to','All branches'))
      returning id into v_id;
    when 'achievements' then
      insert into hrms.achievements (org_id, name, description, category, award_basis, criteria, is_active)
      values (v_org, payload->>'name', payload->>'description', coalesce(payload->>'category','performance'), coalesce(payload->>'award_basis','manual'), payload->>'criteria', coalesce((payload->>'is_active')::boolean, true))
      returning id into v_id;
    when 'face-identities' then
      insert into hrms.face_identities (org_id, employee_id, enrolled, enrolled_on, consent_given, device_count)
      values (v_org, (payload->>'employee_id')::uuid, coalesce((payload->>'enrolled')::boolean, false), nullif(payload->>'enrolled_on','')::date, coalesce((payload->>'consent_given')::boolean, true), coalesce((payload->>'device_count')::int, 1))
      on conflict (org_id, employee_id) do update set enrolled = excluded.enrolled, enrolled_on = excluded.enrolled_on, consent_given = excluded.consent_given, device_count = excluded.device_count
      returning id into v_id;
    when 'roster' then
      insert into hrms.roster_assignments (org_id, employee_id, shift_id, roster_date, is_week_off, created_by)
      values (v_org, (payload->>'employee_id')::uuid, nullif(payload->>'shift_id','')::uuid, coalesce(nullif(payload->>'roster_date','')::date, current_date), coalesce((payload->>'is_week_off')::boolean, false), (select auth.uid()))
      on conflict (org_id, employee_id, roster_date) do update set shift_id = excluded.shift_id, is_week_off = excluded.is_week_off
      returning id into v_id;
    else raise exception 'Unsupported HRMS settings resource: %', resource_key using errcode = '22023';
  end case;

  perform public.hrms_touch_event(v_org, resource_key, coalesce(v_id::text, resource_key), resource_key || '.saved', resource_key || ' saved', payload);
  return public.hrms_settings_resource(resource_key);
end;
$$;

create or replace function public.hrms_performance_resource(resource_key text)
returns jsonb
language plpgsql
stable
set search_path = public, hrms
as $$
declare
  v_org uuid := public.hrms_current_org();
  v_me uuid;
  v_manager boolean;
begin
  if v_org is null then raise exception 'No active organization' using errcode = '42501'; end if;
  select id into v_me from hrms.employees where org_id = v_org and profile_id = (select auth.uid()) limit 1;
  v_manager := public.hrms_has_permission('performance.manage');

  case resource_key
    when 'dashboard' then
      return jsonb_build_object(
        'cycles', public.hrms_performance_resource('cycles'),
        'goals', public.hrms_performance_resource('goals'),
        'appraisals', public.hrms_performance_resource('appraisals'),
        'ranking', public.hrms_performance_resource('ranking')
      );
    when 'cycles' then return coalesce((select jsonb_agg(to_jsonb(c) order by c.period_start desc) from hrms.performance_cycles c where c.org_id = v_org), '[]'::jsonb);
    when 'kra' then return coalesce((select jsonb_agg(to_jsonb(k) order by k.kra_code) from hrms.kras k where k.org_id = v_org), '[]'::jsonb);
    when 'goals' then
      return coalesce((select jsonb_agg(to_jsonb(x) order by x.goal_code) from (
        select g.*, e.full_name as employee_name
        from hrms.goals g left join hrms.employees e on e.id = g.employee_id
        where g.org_id = v_org and (v_manager or g.employee_id = v_me)
      ) x), '[]'::jsonb);
    when 'appraisals' then
      return coalesce((select jsonb_agg(to_jsonb(x) order by x.cycle_name desc) from (
        select a.*, e.employee_code, e.full_name as employee_name, d.designation
        from hrms.appraisals a
        left join hrms.employees e on e.id = a.employee_id
        left join public.hrms_employee_directory d on d.id = a.employee_id
        where a.org_id = v_org and (v_manager or a.employee_id = v_me)
      ) x), '[]'::jsonb);
    when 'templates' then return coalesce((select jsonb_agg(to_jsonb(t) order by t.template_name) from hrms.appraisal_templates t where t.org_id = v_org), '[]'::jsonb);
    when 'ranking' then
      return coalesce((select jsonb_agg(to_jsonb(x) order by x.quarter desc, x.rank) from (
        select r.*, e.employee_code, e.full_name as employee_name, d.department
        from hrms.ranking_snapshots r
        join hrms.employees e on e.id = r.employee_id
        left join public.hrms_employee_directory d on d.id = r.employee_id
        where r.org_id = v_org and (v_manager or r.employee_id = v_me)
      ) x), '[]'::jsonb);
    else raise exception 'Unsupported HRMS performance resource: %', resource_key using errcode = '22023';
  end case;
end;
$$;

create or replace function public.hrms_save_performance_resource(resource_key text, payload jsonb)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_org uuid := public.hrms_current_org();
  v_id uuid;
begin
  if v_org is null then raise exception 'No active organization' using errcode = '42501'; end if;
  if not public.hrms_has_permission('performance.manage') then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  case resource_key
    when 'cycles' then
      insert into hrms.performance_cycles (org_id, cycle_code, cycle_name, cycle_type, period_start, period_end, self_review_start, self_review_end, manager_review_start, manager_review_end)
      values (v_org, coalesce(payload->>'cycle_code', 'CYC-' || to_char(now(), 'YYYYMMDDHH24MISS')), payload->>'cycle_name', coalesce(payload->>'cycle_type','annual'), coalesce(nullif(payload->>'period_start','')::date, current_date), coalesce(nullif(payload->>'period_end','')::date, current_date), nullif(payload->>'self_review_start','')::date, nullif(payload->>'self_review_end','')::date, nullif(payload->>'manager_review_start','')::date, nullif(payload->>'manager_review_end','')::date)
      returning id into v_id;
    when 'kra' then
      insert into hrms.kras (org_id, kra_code, kpi_name, measurement, weightage, designation)
      values (v_org, coalesce(payload->>'kra_code', 'KRA-' || to_char(now(), 'YYYYMMDDHH24MISS')), payload->>'kpi_name', payload->>'measurement', coalesce((payload->>'weightage')::numeric, 0), payload->>'designation')
      returning id into v_id;
    when 'goals' then
      insert into hrms.goals (org_id, goal_code, title, employee_id, cycle_name, weightage, target, due_date, created_by)
      values (v_org, coalesce(payload->>'goal_code', 'GL-' || to_char(now(), 'YYYYMMDDHH24MISS')), payload->>'title', nullif(payload->>'employee_id','')::uuid, payload->>'cycle_name', coalesce((payload->>'weightage')::numeric, 0), coalesce(payload->>'target',''), nullif(payload->>'due_date','')::date, (select auth.uid()))
      returning id into v_id;
    when 'templates' then
      insert into hrms.appraisal_templates (org_id, template_name, template_type, sections, questions, config)
      values (v_org, payload->>'template_name', payload->>'template_type', coalesce((payload->>'sections')::int, 1), coalesce((payload->>'questions')::int, 0), payload)
      returning id into v_id;
    else raise exception 'Unsupported HRMS performance resource: %', resource_key using errcode = '22023';
  end case;

  perform public.hrms_touch_event(v_org, resource_key, v_id::text, resource_key || '.saved', resource_key || ' saved', payload);
  return public.hrms_performance_resource(resource_key);
end;
$$;

with org as (select id from public.organizations where slug = 'hirerabbits')
insert into hrms.role_permissions (org_id, role_key, permission_key)
select org.id, role_key, permission_key
from org
cross join (values
  ('admin','*'), ('hr_manager','settings.manage'), ('hr_manager','role.manage'), ('hr_manager','performance.manage'),
  ('hod','performance.manage'), ('manager','performance.manage')
) v(role_key, permission_key)
on conflict do nothing;

with org as (select id from public.organizations where slug = 'hirerabbits')
insert into hrms.announcement_categories (org_id, name)
select org.id, name from org cross join (values ('General'), ('HR Update'), ('Policy'), ('Celebration')) v(name)
on conflict do nothing;

with org as (select id from public.organizations where slug = 'hirerabbits')
insert into hrms.expense_types (org_id, name)
select org.id, name from org cross join (values ('Travel'), ('Meals'), ('Mobile'), ('Lodging')) v(name)
on conflict do nothing;

with org as (select id from public.organizations where slug = 'hirerabbits')
insert into hrms.leave_types (org_id, name, code, annual_quota_days, is_paid, allows_half_day, requires_document, carry_forward_cap_days)
select org.id, v.name, v.code, v.annual_quota_days, v.is_paid, v.allows_half_day, v.requires_document, v.carry_forward_cap_days
from org cross join (values
  ('Earned Leave','EL',18,true,true,false,9),
  ('Sick Leave','SL',6,true,true,true,null),
  ('Loss of Pay','LOP',null,false,false,false,null)
) v(name, code, annual_quota_days, is_paid, allows_half_day, requires_document, carry_forward_cap_days)
on conflict do nothing;

with org as (select id from public.organizations where slug = 'hirerabbits')
insert into hrms.cron_jobs (org_id, name, description, schedule, last_status, next_run_at)
select org.id, v.name, v.description, v.schedule, v.last_status, v.next_run_at
from org cross join (values
  ('Attendance Day Materializer','Creates daily attendance rows','0 1 * * *','success',now() + interval '1 day'),
  ('Leave Accrual','Posts monthly leave accrual ledger rows','0 2 1 * *','success',date_trunc('month', now()) + interval '1 month 2 hours'),
  ('Achievement Awards','Evaluates automatic achievements','0 3 * * *',null,now() + interval '1 day')
) v(name, description, schedule, last_status, next_run_at)
on conflict do nothing;

with org as (select id from public.organizations where slug = 'hirerabbits')
insert into hrms.performance_cycles (org_id, cycle_code, cycle_name, cycle_type, period_start, period_end, self_review_start, self_review_end, manager_review_start, manager_review_end, status)
select org.id, 'CYC-2026-Q2', 'Q2 FY 2026-27', 'quarterly', date '2026-07-01', date '2026-09-30', date '2026-10-01', date '2026-10-07', date '2026-10-08', date '2026-10-15', 'active'
from org
on conflict do nothing;

with org as (select id from public.organizations where slug = 'hirerabbits'),
emp as (select e.id, e.org_id, e.created_at from hrms.employees e join org on org.id = e.org_id order by e.created_at limit 5)
insert into hrms.goals (org_id, goal_code, title, employee_id, cycle_name, weightage, target, progress_percent, due_date, status)
select org_id, 'GL-' || row_number() over (), 'Complete quarterly HRMS goals', id, 'Q2 FY 2026-27', 25, 'Ship scoped goals', 40 + (row_number() over () * 10), current_date + 30, 'in_progress'
from emp
on conflict do nothing;

with org as (select id from public.organizations where slug = 'hirerabbits')
insert into hrms.appraisal_templates (org_id, template_name, template_type, sections, questions, is_active)
select org.id, 'Annual Review - Individual Contributor', 'Annual', 3, 12, true from org
on conflict do nothing;

with org as (select id from public.organizations where slug = 'hirerabbits'),
emp as (select e.id, e.org_id, e.created_at from hrms.employees e join org on org.id = e.org_id order by e.created_at limit 5)
insert into hrms.ranking_snapshots (org_id, employee_id, quarter, rank, cohort_size, attendance_score, goal_score, total_score, overall_score, overall_percentage, scores)
select org_id, id, 'Q2 FY 2026-27', row_number() over (), 5, 85, 80 + row_number() over (), 82 + row_number() over (), 4.1, 82 + row_number() over (), '{"delivery":4,"quality":4,"ownership":4}'::jsonb
from emp
on conflict do nothing;

revoke all on function public.hrms_has_permission(text) from public, anon;
revoke all on function public.hrms_settings_resource(text) from public, anon;
revoke all on function public.hrms_save_settings_resource(text, jsonb) from public, anon;
revoke all on function public.hrms_performance_resource(text) from public, anon;
revoke all on function public.hrms_save_performance_resource(text, jsonb) from public, anon;
grant execute on function public.hrms_has_permission(text) to authenticated;
grant execute on function public.hrms_settings_resource(text) to authenticated;
grant execute on function public.hrms_save_settings_resource(text, jsonb) to authenticated;
grant execute on function public.hrms_performance_resource(text) to authenticated;
grant execute on function public.hrms_save_performance_resource(text, jsonb) to authenticated;
