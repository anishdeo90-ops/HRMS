create or replace function public.hrms_decide_approval(request_id uuid, decision text, comment text default null)
returns jsonb
language plpgsql
set search_path = public, hrms
as $$
declare
  v_org_id uuid := (public.hrms_current_context()->>'org_id')::uuid;
  v_request hrms.approval_requests%rowtype;
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

  if hrms_decide_approval.decision = 'approved' and v_request.request_type in ('regularization','on_duty','wfh') then
    perform public.hrms_record_manual_attendance(v_request.payload || jsonb_build_object(
      'employee_id', v_request.employee_id,
      'work_date', v_request.from_date,
      'day_status', case when v_request.request_type = 'wfh' then 'wfh' when v_request.request_type = 'on_duty' then 'on_duty' else 'present' end,
      'reason', v_request.reason
    ));
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
