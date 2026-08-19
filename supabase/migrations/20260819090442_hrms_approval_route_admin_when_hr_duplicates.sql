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
  v_department_id uuid;
  v_business_unit_id uuid;
  v_approver_id uuid;
  v_hr_manager_id uuid;
  v_admin_id uuid;
  v_second_approver_id uuid;
  v_approver_source text := 'manager';
begin
  select a.reporting_manager_id, a.department_id, a.business_unit_id
    into v_manager_id, v_department_id, v_business_unit_id
  from hrms.employee_assignments a
  where a.employee_id = v_employee_id and a.is_primary and a.effective_to is null
  order by a.effective_from desc
  limit 1;

  v_approver_id := v_manager_id;

  if v_approver_id is null and v_business_unit_id is not null then
    select bu.head_employee_id into v_approver_id
    from hrms.business_units bu
    where bu.id = v_business_unit_id and bu.org_id = v_org_id;
    if v_approver_id is not null then
      v_approver_source := 'business_head';
    end if;
  end if;

  if v_approver_id is null and v_department_id is not null then
    select e.id into v_approver_id
    from hrms.employees e
    join public.profiles p on p.id = e.profile_id
    join hrms.employee_assignments a on a.employee_id = e.id and a.is_primary and a.effective_to is null
    where e.org_id = v_org_id
      and e.id <> v_employee_id
      and a.department_id = v_department_id
      and p.role = 'hod'
    order by a.effective_from desc
    limit 1;
    if v_approver_id is not null then
      v_approver_source := 'role';
    end if;
  end if;

  select e.id into v_hr_manager_id
  from hrms.employees e
  join public.profiles p on p.id = e.profile_id
  where e.org_id = v_org_id
    and e.id <> v_employee_id
    and p.role = 'hr_manager'
  order by e.created_at
  limit 1;

  select e.id into v_admin_id
  from hrms.employees e
  join public.profiles p on p.id = e.profile_id
  where e.org_id = v_org_id
    and e.id <> v_employee_id
    and p.role = 'admin'
  order by e.created_at
  limit 1;

  if v_approver_id is null then
    v_approver_id := coalesce(v_hr_manager_id, v_admin_id);
    v_approver_source := 'admin';
  end if;

  v_second_approver_id := case
    when v_hr_manager_id is not null and v_hr_manager_id <> v_approver_id then v_hr_manager_id
    else v_admin_id
  end;

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
  select v_org_id, v_request_id, 1, approver_source, approver_id, (select auth.uid()), (select auth.uid())
  from (
    select distinct on (approver_id) approver_source, approver_id
    from (
      select v_approver_source as approver_source, v_approver_id as approver_id, 1 as priority
      union all
      select 'admin', v_second_approver_id, 2
    ) approvers
    where approver_id is not null
    order by approver_id, priority
  ) deduped;

  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  values (v_org_id, 'hrms', 'approval_request', v_request_id::text, 'approval.created', 'Approval request created', payload, (select auth.uid()));

  return (select elem from jsonb_array_elements(public.hrms_approval_rows('team')) elem where elem->>'id' = v_request_id::text limit 1);
end;
$$;
