alter table hrms.kras
  add column if not exists department_id uuid references hrms.departments(id) on delete set null,
  add column if not exists designation_id uuid references hrms.designations(id) on delete set null;

create index if not exists kras_department_id_idx on hrms.kras(department_id);
create index if not exists kras_designation_id_idx on hrms.kras(designation_id);

update hrms.kras k
set designation_id = d.id
from hrms.designations d
where k.designation_id is null
  and k.designation is not null
  and d.org_id = k.org_id
  and lower(d.name) = lower(k.designation);

create or replace function public.hrms_performance_scope_employee_ids()
returns table(employee_id uuid)
language sql
stable
set search_path = public, hrms
as $$
  with org as (
    select public.hrms_current_org() as id
  ),
  me as (
    select
      p.role,
      coalesce(m.role_key, p.role) as role_key,
      e.id as employee_id,
      a.department_id
    from public.profiles p
    join org on true
    left join public.org_members m on m.profile_id = p.id and m.org_id = org.id and m.is_active
    left join hrms.employees e on e.profile_id = p.id and e.org_id = org.id
    left join lateral (
      select department_id
      from hrms.employee_assignments
      where employee_id = e.id
        and is_primary
        and effective_from <= current_date
        and (effective_to is null or effective_to >= current_date)
      order by effective_from desc
      limit 1
    ) a on true
    where p.id = (select auth.uid())
    limit 1
  )
  select distinct e.id
  from org
  join me on true
  join hrms.employees e on e.org_id = org.id
  left join lateral (
    select department_id, reporting_manager_id
    from hrms.employee_assignments
    where employee_id = e.id
      and is_primary
      and effective_from <= current_date
      and (effective_to is null or effective_to >= current_date)
    order by effective_from desc
    limit 1
  ) a on true
  where me.role in ('admin')
     or me.role_key in ('admin')
     or e.id = me.employee_id
     or a.reporting_manager_id = me.employee_id
     or (
       me.department_id is not null
       and a.department_id = me.department_id
       and (me.role in ('hod','hr_manager') or me.role_key in ('hod','hr_manager'))
     );
$$;

create or replace function public.hrms_performance_employee_in_scope(target_employee_id uuid)
returns boolean
language sql
stable
set search_path = public, hrms
as $$
  select exists (
    select 1
    from public.hrms_performance_scope_employee_ids() s
    where s.employee_id = target_employee_id
  );
$$;

create or replace function public.hrms_performance_resource(resource_key text)
returns jsonb
language plpgsql
stable
set search_path = public, hrms
as $$
declare
  v_org uuid := public.hrms_current_org();
  v_admin boolean;
begin
  if v_org is null then raise exception 'No active organization' using errcode = '42501'; end if;

  select exists (
    select 1
    from public.profiles p
    left join public.org_members m on m.profile_id = p.id and m.org_id = v_org and m.is_active
    where p.id = (select auth.uid())
      and (p.role = 'admin' or coalesce(m.role_key, p.role) = 'admin')
  ) into v_admin;

  if resource_key = 'employees' then
    return coalesce((select jsonb_agg(to_jsonb(x) order by x.name) from (
      select
        e.id,
        e.employee_code,
        e.full_name as name,
        e.work_email as email,
        e.status,
        a.department_id,
        dep.name as department,
        a.designation_id,
        des.name as designation,
        a.reporting_manager_id,
        manager.full_name as reporting_manager
      from public.hrms_performance_scope_employee_ids() scope
      join hrms.employees e on e.id = scope.employee_id and e.org_id = v_org
      left join lateral (
        select department_id, designation_id, reporting_manager_id
        from hrms.employee_assignments
        where employee_id = e.id
          and is_primary
          and effective_from <= current_date
          and (effective_to is null or effective_to >= current_date)
        order by effective_from desc
        limit 1
      ) a on true
      left join hrms.departments dep on dep.id = a.department_id
      left join hrms.designations des on des.id = a.designation_id
      left join hrms.employees manager on manager.id = a.reporting_manager_id
      where e.status <> 'separated'
    ) x), '[]'::jsonb);
  end if;

  case resource_key
    when 'dashboard' then
      return jsonb_build_object(
        'cycles', public.hrms_performance_resource('cycles'),
        'goals', public.hrms_performance_resource('goals'),
        'appraisals', public.hrms_performance_resource('appraisals'),
        'ranking', public.hrms_performance_resource('ranking')
      );
    when 'cycles' then
      return coalesce((select jsonb_agg(to_jsonb(c) order by c.period_start desc) from hrms.performance_cycles c where c.org_id = v_org), '[]'::jsonb);
    when 'kra' then
      return coalesce((select jsonb_agg(to_jsonb(x) order by x.kra_code) from (
        select k.*, dep.name as department, coalesce(des.name, k.designation) as designation
        from hrms.kras k
        left join hrms.departments dep on dep.id = k.department_id
        left join hrms.designations des on des.id = k.designation_id
        where k.org_id = v_org
          and (
            v_admin
            or exists (
              select 1
              from public.hrms_performance_scope_employee_ids() scope
              join hrms.employee_assignments a on a.employee_id = scope.employee_id
                and a.is_primary
                and a.effective_from <= current_date
                and (a.effective_to is null or a.effective_to >= current_date)
              left join hrms.designations ad on ad.id = a.designation_id
              where (k.department_id is null or k.department_id = a.department_id)
                and (
                  k.designation_id = a.designation_id
                  or (k.designation_id is null and k.designation is not null and lower(k.designation) = lower(ad.name))
                  or (k.designation_id is null and k.designation is null)
                )
            )
          )
      ) x), '[]'::jsonb);
    when 'goals' then
      return coalesce((select jsonb_agg(to_jsonb(x) order by x.goal_code) from (
        select g.*, e.full_name as employee_name, dep.name as department, des.name as designation
        from hrms.goals g
        join public.hrms_performance_scope_employee_ids() scope on scope.employee_id = g.employee_id
        left join hrms.employees e on e.id = g.employee_id
        left join lateral (
          select department_id, designation_id
          from hrms.employee_assignments
          where employee_id = g.employee_id
            and is_primary
            and effective_from <= current_date
            and (effective_to is null or effective_to >= current_date)
          order by effective_from desc
          limit 1
        ) a on true
        left join hrms.departments dep on dep.id = a.department_id
        left join hrms.designations des on des.id = a.designation_id
        where g.org_id = v_org
      ) x), '[]'::jsonb);
    when 'appraisals' then
      return coalesce((select jsonb_agg(to_jsonb(x) order by x.cycle_name desc) from (
        select a.*, e.employee_code, e.full_name as employee_name, dep.name as department, des.name as designation
        from hrms.appraisals a
        join public.hrms_performance_scope_employee_ids() scope on scope.employee_id = a.employee_id
        left join hrms.employees e on e.id = a.employee_id
        left join lateral (
          select department_id, designation_id
          from hrms.employee_assignments
          where employee_id = a.employee_id
            and is_primary
            and effective_from <= current_date
            and (effective_to is null or effective_to >= current_date)
          order by effective_from desc
          limit 1
        ) ea on true
        left join hrms.departments dep on dep.id = ea.department_id
        left join hrms.designations des on des.id = ea.designation_id
        where a.org_id = v_org
      ) x), '[]'::jsonb);
    when 'templates' then
      return coalesce((select jsonb_agg(to_jsonb(t) order by t.template_name) from hrms.appraisal_templates t where t.org_id = v_org), '[]'::jsonb);
    when 'ranking' then
      return coalesce((select jsonb_agg(to_jsonb(x) order by x.quarter desc, x.rank) from (
        select r.*, e.employee_code, e.full_name as employee_name, dep.name as department, des.name as designation
        from hrms.ranking_snapshots r
        join public.hrms_performance_scope_employee_ids() scope on scope.employee_id = r.employee_id
        join hrms.employees e on e.id = r.employee_id
        left join lateral (
          select department_id, designation_id
          from hrms.employee_assignments
          where employee_id = r.employee_id
            and is_primary
            and effective_from <= current_date
            and (effective_to is null or effective_to >= current_date)
          order by effective_from desc
          limit 1
        ) a on true
        left join hrms.departments dep on dep.id = a.department_id
        left join hrms.designations des on des.id = a.designation_id
        where r.org_id = v_org
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
  v_employee_id uuid;
  v_department_id uuid;
  v_designation_id uuid;
  v_admin boolean;
begin
  if v_org is null then raise exception 'No active organization' using errcode = '42501'; end if;
  if not public.hrms_has_permission('performance.manage') then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.profiles p
    left join public.org_members m on m.profile_id = p.id and m.org_id = v_org and m.is_active
    where p.id = (select auth.uid())
      and (p.role = 'admin' or coalesce(m.role_key, p.role) = 'admin')
  ) into v_admin;

  case resource_key
    when 'cycles' then
      insert into hrms.performance_cycles (org_id, cycle_code, cycle_name, cycle_type, period_start, period_end, self_review_start, self_review_end, manager_review_start, manager_review_end)
      values (v_org, coalesce(payload->>'cycle_code', 'CYC-' || to_char(now(), 'YYYYMMDDHH24MISS')), payload->>'cycle_name', coalesce(payload->>'cycle_type','annual'), coalesce(nullif(payload->>'period_start','')::date, current_date), coalesce(nullif(payload->>'period_end','')::date, current_date), nullif(payload->>'self_review_start','')::date, nullif(payload->>'self_review_end','')::date, nullif(payload->>'manager_review_start','')::date, nullif(payload->>'manager_review_end','')::date)
      returning id into v_id;
    when 'kra' then
      v_department_id := nullif(payload->>'department_id', '')::uuid;
      v_designation_id := nullif(payload->>'designation_id', '')::uuid;
      if v_department_id is null or v_designation_id is null then
        raise exception 'Department and designation are required for KRA' using errcode = '22023';
      end if;
      if not v_admin and not exists (
        select 1
        from public.hrms_performance_scope_employee_ids() scope
        join hrms.employee_assignments a on a.employee_id = scope.employee_id
          and a.is_primary
          and a.effective_from <= current_date
          and (a.effective_to is null or a.effective_to >= current_date)
        where a.department_id = v_department_id
          and a.designation_id = v_designation_id
      ) then
        raise exception 'Employee scope does not include this department/designation' using errcode = '42501';
      end if;
      insert into hrms.kras (org_id, kra_code, kpi_name, measurement, weightage, department_id, designation_id, designation)
      values (
        v_org,
        coalesce(payload->>'kra_code', 'KRA-' || to_char(now(), 'YYYYMMDDHH24MISS')),
        payload->>'kpi_name',
        payload->>'measurement',
        coalesce((payload->>'weightage')::numeric, 0),
        v_department_id,
        v_designation_id,
        (select name from hrms.designations where id = v_designation_id)
      )
      returning id into v_id;
    when 'goals' then
      v_employee_id := nullif(payload->>'employee_id','')::uuid;
      if v_employee_id is null or not public.hrms_performance_employee_in_scope(v_employee_id) then
        raise exception 'Employee is outside your performance scope' using errcode = '42501';
      end if;
      insert into hrms.goals (org_id, goal_code, title, employee_id, cycle_name, weightage, target, due_date, created_by)
      values (v_org, coalesce(payload->>'goal_code', 'GL-' || to_char(now(), 'YYYYMMDDHH24MISS')), payload->>'title', v_employee_id, payload->>'cycle_name', coalesce((payload->>'weightage')::numeric, 0), coalesce(payload->>'target',''), nullif(payload->>'due_date','')::date, (select auth.uid()))
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

revoke all on function public.hrms_performance_scope_employee_ids() from public, anon;
revoke all on function public.hrms_performance_employee_in_scope(uuid) from public, anon;
revoke all on function public.hrms_performance_resource(text) from public, anon;
revoke all on function public.hrms_save_performance_resource(text, jsonb) from public, anon;
grant execute on function public.hrms_performance_scope_employee_ids() to authenticated;
grant execute on function public.hrms_performance_employee_in_scope(uuid) to authenticated;
grant execute on function public.hrms_performance_resource(text) to authenticated;
grant execute on function public.hrms_save_performance_resource(text, jsonb) to authenticated;
