alter table hrms.approval_steps
  drop constraint if exists approval_steps_request_id_sequence_key;

create unique index if not exists approval_steps_request_sequence_approver_idx
  on hrms.approval_steps (request_id, sequence, approver_employee_id);

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
  v_first timestamptz;
  v_last timestamptz;
  v_minutes integer;
begin
  insert into hrms.attendance_days (org_id, employee_id, work_date, day_status, payable_fraction, source, created_by, updated_by)
  values (v_org_id, v_employee_id, (v_punched_at at time zone 'Asia/Kolkata')::date, 'present', 1, 'web', (select auth.uid()), (select auth.uid()))
  on conflict (org_id, employee_id, work_date) do update
    set updated_by = (select auth.uid()), updated_at = now()
  returning id into v_day_id;

  insert into hrms.attendance_punches (org_id, attendance_day_id, employee_id, punched_at, direction, source, location, created_by, updated_by)
  values (v_org_id, v_day_id, v_employee_id, v_punched_at, v_direction, coalesce(nullif(payload->>'source', ''), 'web'), nullif(payload->>'location', ''), (select auth.uid()), (select auth.uid()))
  returning id into v_punch_id;

  select least(coalesce(first_in, v_punched_at), v_punched_at),
         case when v_direction = 'out' then greatest(coalesce(last_out, v_punched_at), v_punched_at) else last_out end
  into v_first, v_last
  from hrms.attendance_days
  where id = v_day_id;

  v_minutes := case when v_first is not null and v_last is not null then greatest(0, extract(epoch from (v_last - v_first))::int / 60) end;

  update hrms.attendance_days
  set first_in = v_first,
      last_out = v_last,
      worked_minutes = coalesce(v_minutes, worked_minutes),
      day_status = case when v_minutes is not null and v_minutes < 480 then 'half_day' else 'present' end,
      payable_fraction = case when v_minutes is not null and v_minutes < 480 then 0.5 else 1 end,
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
  v_minutes integer := greatest(0, extract(epoch from (v_last - v_first))::int / 60);
  v_status text := nullif(payload->>'day_status', '');
begin
  if v_employee_id is null then
    raise exception 'employee_id is required' using errcode = '22023';
  end if;

  v_status := coalesce(v_status, case when v_minutes < 480 then 'half_day' else 'present' end);

  insert into hrms.attendance_days (org_id, employee_id, work_date, first_in, last_out, worked_minutes, day_status, payable_fraction, is_regularized, source, comments, created_by, updated_by)
  values (v_org_id, v_employee_id, v_work_date, v_first, v_last, v_minutes, v_status, case when v_status = 'half_day' then 0.5 when v_status in ('absent','weekly_off','holiday') then 0 else 1 end, true, 'manual_admin', nullif(payload->>'reason', ''), (select auth.uid()), (select auth.uid()))
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

create or replace function public.hrms_decide_approval(request_id uuid, decision text, comment text default null)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_org_id uuid := (public.hrms_current_context()->>'org_id')::uuid;
  v_request hrms.approval_requests%rowtype;
  v_payload jsonb;
begin
  if hrms_decide_approval.decision not in ('approved','rejected') then
    raise exception 'decision must be approved or rejected' using errcode = '22023';
  end if;

  update hrms.approval_steps s
  set
    status = hrms_decide_approval.decision,
    acted_at = now(),
    comment = nullif(hrms_decide_approval.comment, ''),
    updated_by = (select auth.uid()),
    updated_at = now()
  where s.request_id = hrms_decide_approval.request_id
    and s.org_id = v_org_id
    and s.sequence = 1;

  update hrms.approval_requests ar
  set
    status = hrms_decide_approval.decision,
    updated_by = (select auth.uid()),
    updated_at = now()
  where ar.id = hrms_decide_approval.request_id
    and ar.org_id = v_org_id
  returning * into v_request;

  if v_request.source_table = 'hrms.leave_requests' and v_request.source_id is not null then
    update hrms.leave_requests lr
    set
      status = hrms_decide_approval.decision,
      updated_by = (select auth.uid()),
      updated_at = now()
    where lr.id = v_request.source_id
      and lr.org_id = v_org_id;
  end if;

  if hrms_decide_approval.decision = 'approved' and v_request.request_type in ('regularization','on_duty','wfh','early_in_out') then
    v_payload := v_request.payload || jsonb_build_object(
      'employee_id', v_request.employee_id,
      'work_date', v_request.from_date,
      'day_status', case when v_request.request_type = 'wfh' then 'wfh' when v_request.request_type = 'on_duty' then 'on_duty' else null end,
      'first_in', coalesce(v_request.payload->>'requested_first_in', v_request.payload->>'first_in'),
      'last_out', coalesce(v_request.payload->>'requested_last_out', v_request.payload->>'last_out'),
      'reason', v_request.reason
    );

    perform public.hrms_record_manual_attendance(v_payload);
  end if;

  insert into public.entity_events (org_id, product_key, entity_type, entity_id, event_type, summary, metadata, actor_profile_id)
  values (
    v_org_id,
    'hrms',
    'approval_request',
    hrms_decide_approval.request_id::text,
    'approval.' || hrms_decide_approval.decision,
    'Approval request ' || hrms_decide_approval.decision,
    jsonb_build_object('comment', hrms_decide_approval.comment),
    (select auth.uid())
  );

  return (
    select elem
    from jsonb_array_elements(public.hrms_approval_rows('team')) elem
    where elem->>'id' = hrms_decide_approval.request_id::text
    limit 1
  );
end;
$$;
