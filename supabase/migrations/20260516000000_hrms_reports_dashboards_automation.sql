-- HRMS Reports, Dashboards, Notifications, and Automation
-- Adds Phase 9 reporting and automation foundations with helper-backed, fail-closed RLS.

begin;

create or replace function public.has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select exists (
      select 1
      from public.profiles p
      left join public.role_permissions rp
        on rp.role_key = 'role.' || p.role
       and rp.permission_key = $1
      where p.id = auth.uid()
        and p.is_active = true
        and (
          rp.permission_key is not null
          or p.role = 'admin'
          or (
            p.role = 'hr_manager'
            and $1 like 'permission.%'
          )
          or (
            p.role = 'payroll_manager'
            and $1 in (
              'permission.payroll.view',
              'permission.payroll.manage',
              'permission.salary_components.manage',
              'permission.salary_structures.manage',
              'permission.salary_structures.assign',
              'permission.payroll_periods.manage',
              'permission.payroll_entries.manage',
              'permission.salary_slips.manage',
              'permission.salary_slips.submit',
              'permission.salary_slips.cancel',
              'permission.tax_declarations.manage',
              'permission.benefits.manage',
              'permission.payroll_reports.view',
              'permission.dashboards.view'
            )
          )
          or (
            p.role = 'finance_manager'
            and $1 in (
              'permission.employee.view',
              'permission.expenses.view_self',
              'permission.expenses.view_team',
              'permission.expenses.manage',
              'permission.expenses.approve',
              'permission.expense_claim_types.manage',
              'permission.employee_advances.view_self',
              'permission.employee_advances.manage',
              'permission.employee_advances.approve',
              'permission.travel_requests.view_self',
              'permission.travel_requests.manage',
              'permission.travel_requests.approve',
              'permission.vehicles.view_self',
              'permission.vehicles.manage',
              'permission.dashboards.view'
            )
          )
          or (
            p.role = 'expense_approver'
            and $1 in (
              'permission.employee.view',
              'permission.expenses.view_team',
              'permission.expenses.approve',
              'permission.employee_advances.approve',
              'permission.travel_requests.approve'
            )
          )
          or (
            p.role = 'leave_approver'
            and $1 in (
              'permission.employee.view',
              'permission.leave.view_team',
              'permission.leave.approve',
              'permission.leave.cancel',
              'permission.leave.ledger.view',
              'permission.leave.reports.view'
            )
          )
          or (
            p.role = 'employee'
            and $1 in (
              'permission.salary_slips.view_self',
              'permission.tax_declarations.view_self',
              'permission.benefits.view_self',
              'permission.performance.view_self',
              'permission.performance.goals.update',
              'permission.performance.appraisals.submit',
              'permission.performance.feedback.submit',
              'permission.lifecycle.view_self',
              'permission.separation.request',
              'permission.grievances.view_self',
              'permission.training.feedback.submit',
              'permission.daily_work_summaries.submit',
              'permission.self_service.view',
              'permission.self_service.profile.view',
              'permission.self_service.notifications.view',
              'permission.self_service.notifications.acknowledge'
            )
          )
          or (
            p.role = 'hod'
            and $1 in (
              'permission.performance.view_team',
              'permission.performance.goals.manage',
              'permission.performance.appraisals.review',
              'permission.performance.feedback.submit',
              'permission.performance.reports.view',
              'permission.lifecycle.view_team',
              'permission.separation.approve',
              'permission.promotions.approve',
              'permission.transfers.approve',
              'permission.daily_work_summaries.view_team',
              'permission.lifecycle.reports.view',
              'permission.dashboards.view'
            )
          )
          or (
            p.role = 'hr_user'
            and $1 in (
              'permission.employee.view',
              'permission.employee.update_basic',
              'permission.organization.manage',
              'permission.department_approvers.manage',
              'permission.documents.view',
              'permission.documents.manage',
              'permission.attendance.check_in',
              'permission.attendance.view_self',
              'permission.attendance.view_team',
              'permission.attendance.corrections.request',
              'permission.shifts.view',
              'permission.shifts.request',
              'permission.overtime.view',
              'permission.overtime.manage',
              'permission.leave.types.manage',
              'permission.leave.policies.manage',
              'permission.leave.allocations.manage',
              'permission.leave.view_self',
              'permission.leave.view_team',
              'permission.leave.apply',
              'permission.leave.cancel',
              'permission.leave.ledger.view',
              'permission.leave.reports.view',
              'permission.expenses.view_self',
              'permission.expenses.view_team',
              'permission.employee_advances.view_self',
              'permission.travel_requests.view_self',
              'permission.vehicles.view_self',
              'permission.vehicles.manage',
              'permission.performance.view_team',
              'permission.performance.goals.manage',
              'permission.performance.kras.manage',
              'permission.performance.cycles.manage',
              'permission.performance.appraisals.review',
              'permission.performance.feedback.manage',
              'permission.performance.reports.view',
              'permission.lifecycle.view_team',
              'permission.lifecycle.manage',
              'permission.onboarding.templates.manage',
              'permission.onboarding.manage',
              'permission.onboarding.activities.update',
              'permission.separation.templates.manage',
              'permission.separation.approve',
              'permission.promotions.manage',
              'permission.promotions.approve',
              'permission.transfers.manage',
              'permission.transfers.approve',
              'permission.grievances.manage',
              'permission.grievances.resolve',
              'permission.training.manage',
              'permission.daily_work_summaries.view_team',
              'permission.lifecycle.reports.view',
              'permission.self_service.notifications.manage',
              'permission.reports.view',
              'permission.reports.export',
              'permission.dashboards.view',
              'permission.notification_rules.view',
              'permission.automation_rules.view',
              'permission.automation_executions.view'
            )
          )
        )
    )
  ), false);
$$;

create or replace function public.can_manage_reports()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('role.admin')
      or public.has_role('role.hr_manager');
$$;

create or replace function public.can_view_report_key(report_key text, target_employee_id uuid default null, target_department_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_reports()
      or (
        report_key in (
          'report.people.employee_information',
          'report.people.employee_analytics',
          'report.attendance.monthly_sheet',
          'report.attendance.shift_attendance',
          'report.recruitment.analytics',
          'report.events.birthdays_anniversaries'
        )
        and public.has_permission('permission.reports.view')
        and (
          target_employee_id is null
          or public.can_view_employee(target_employee_id)
        )
      )
      or (
        report_key in ('report.leave.balance', 'report.leave.ledger')
        and (public.has_permission('permission.leave.reports.view') or public.has_permission('permission.leave.ledger.view'))
      )
      or (
        report_key in ('report.expenses.advance_summary', 'report.expenses.unpaid_claims')
        and (
          public.has_permission('permission.expenses.manage')
          or public.has_permission('permission.employee_advances.manage')
          or public.has_role('role.finance_manager')
        )
      )
      or (
        report_key in ('report.payroll.salary_register', 'report.payroll.bank_remittance')
        and public.has_permission('permission.payroll_reports.view')
      )
      or (
        report_key = 'report.lifecycle.separation_pipeline'
        and public.has_permission('permission.lifecycle.reports.view')
      )
      or coalesce((
        select exists (
          select 1
          from public.employees manager
          join public.employees target on target.id = target_employee_id
          where manager.profile_id = auth.uid()
            and public.is_reporting_manager(manager.id, target.id)
            and target_department_id is not null
            and target.department_id = target_department_id
            and public.has_permission('permission.reports.view')
        )
      ), false);
$$;

create table if not exists public.hrms_report_runs (
  id uuid primary key default gen_random_uuid(),
  report_key text not null references public.report_definitions(key) on delete restrict,
  requested_by uuid references public.profiles(id) on delete set null,
  scope_type text not null default 'company' check (scope_type in ('company', 'department', 'team', 'self')),
  company_id uuid references public.hr_companies(id) on delete set null,
  department_id uuid references public.hr_departments(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  period_start date,
  period_end date,
  filters jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  row_count integer not null default 0 check (row_count >= 0),
  error_message text,
  result_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end >= period_start),
  check (completed_at is null or started_at is null or completed_at >= started_at),
  check (report_key in (
    'report.people.employee_information',
    'report.people.employee_analytics',
    'report.attendance.monthly_sheet',
    'report.attendance.shift_attendance',
    'report.leave.balance',
    'report.leave.ledger',
    'report.expenses.advance_summary',
    'report.expenses.unpaid_claims',
    'report.payroll.salary_register',
    'report.payroll.bank_remittance',
    'report.recruitment.analytics',
    'report.lifecycle.separation_pipeline',
    'report.events.birthdays_anniversaries'
  ))
);

create table if not exists public.hrms_report_exports (
  id uuid primary key default gen_random_uuid(),
  report_run_id uuid not null references public.hrms_report_runs(id) on delete cascade,
  format text not null default 'csv' check (format in ('csv', 'xlsx', 'pdf')),
  storage_path text,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  requested_by uuid references public.profiles(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (report_run_id, format, storage_path)
);

create table if not exists public.hrms_dashboard_layouts (
  id uuid primary key default gen_random_uuid(),
  dashboard_key text not null,
  title text not null,
  description text,
  visibility text not null default 'system' check (visibility in ('system', 'role', 'department', 'user')),
  role_key text references public.roles(key) on delete set null,
  department_id uuid references public.hr_departments(id) on delete set null,
  owner_profile_id uuid references public.profiles(id) on delete cascade,
  layout jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dashboard_key),
  check (
    (visibility = 'system' and role_key is null and department_id is null and owner_profile_id is null)
    or (visibility = 'role' and role_key is not null and department_id is null and owner_profile_id is null)
    or (visibility = 'department' and department_id is not null and owner_profile_id is null)
    or (visibility = 'user' and owner_profile_id is not null)
  )
);

create table if not exists public.hrms_dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_layout_id uuid not null references public.hrms_dashboard_layouts(id) on delete cascade,
  widget_key text not null,
  title text not null,
  report_key text not null references public.report_definitions(key) on delete restrict,
  widget_type text not null check (widget_type in ('metric', 'chart', 'table', 'list')),
  sort_order integer not null default 0 check (sort_order >= 0),
  position_config jsonb not null default '{}'::jsonb,
  filter_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dashboard_layout_id, widget_key)
);

create table if not exists public.hrms_notification_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null,
  name text not null,
  category text not null check (category in ('attendance', 'leave', 'expenses', 'payroll', 'performance', 'lifecycle', 'recruiting', 'system')),
  trigger_event text not null,
  target_scope text not null default 'employee' check (target_scope in ('employee', 'manager', 'department', 'role')),
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'sms', 'whatsapp')),
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'critical')),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  template jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_key)
);

create table if not exists public.hrms_automation_schedules (
  id uuid primary key default gen_random_uuid(),
  automation_key text not null,
  name text not null,
  automation_type text not null check (automation_type in ('leave_accrual', 'leave_expiry', 'attendance_reminder', 'interview_reminder', 'birthday_anniversary', 'payroll_readiness', 'pending_approval')),
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'sms', 'whatsapp')),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  cron_expression text not null,
  schedule_config jsonb not null default '{}'::jsonb,
  timezone text not null default 'Asia/Kolkata',
  is_active boolean not null default false,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (automation_key),
  check (status <> 'active' or is_active = true)
);

create table if not exists public.hrms_automation_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.hrms_automation_schedules(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'skipped', 'cancelled')),
  idempotency_key text not null,
  triggered_by uuid references public.profiles(id) on delete set null,
  target_count integer not null default 0 check (target_count >= 0),
  success_count integer not null default 0 check (success_count >= 0),
  failure_count integer not null default 0 check (failure_count >= 0),
  result jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, idempotency_key),
  check (completed_at is null or started_at is null or completed_at >= started_at),
  check (success_count + failure_count <= target_count)
);

create table if not exists public.hrms_automation_notifications (
  id uuid primary key default gen_random_uuid(),
  automation_run_id uuid not null references public.hrms_automation_runs(id) on delete cascade,
  notification_id uuid not null references public.employee_notifications(id) on delete cascade,
  recipient_employee_id uuid not null references public.employees(id) on delete cascade,
  source_table text not null,
  source_id uuid not null,
  created_at timestamptz not null default now(),
  unique (automation_run_id, recipient_employee_id, source_table, source_id)
);

create index if not exists hrms_report_runs_report_status_idx
  on public.hrms_report_runs(report_key, status, requested_at desc);
create index if not exists hrms_report_runs_requested_by_idx
  on public.hrms_report_runs(requested_by, requested_at desc);
create index if not exists hrms_report_runs_department_period_idx
  on public.hrms_report_runs(department_id, period_start, period_end);
create index if not exists hrms_report_exports_run_idx
  on public.hrms_report_exports(report_run_id);
create index if not exists hrms_dashboard_layouts_visibility_idx
  on public.hrms_dashboard_layouts(visibility, role_key, department_id, owner_profile_id);
create index if not exists hrms_dashboard_widgets_layout_sort_idx
  on public.hrms_dashboard_widgets(dashboard_layout_id, sort_order);
create index if not exists hrms_notification_rules_status_idx
  on public.hrms_notification_rules(category, status, is_active);
create index if not exists hrms_automation_schedules_active_next_idx
  on public.hrms_automation_schedules(is_active, next_run_at);
create index if not exists hrms_automation_runs_schedule_status_idx
  on public.hrms_automation_runs(schedule_id, status, started_at desc);
create index if not exists hrms_automation_notifications_recipient_source_idx
  on public.hrms_automation_notifications(recipient_employee_id, source_table, source_id);

drop trigger if exists hrms_report_runs_updated_at on public.hrms_report_runs;
create trigger hrms_report_runs_updated_at before update on public.hrms_report_runs for each row execute function public.touch_updated_at();
drop trigger if exists hrms_report_exports_updated_at on public.hrms_report_exports;
create trigger hrms_report_exports_updated_at before update on public.hrms_report_exports for each row execute function public.touch_updated_at();
drop trigger if exists hrms_dashboard_layouts_updated_at on public.hrms_dashboard_layouts;
create trigger hrms_dashboard_layouts_updated_at before update on public.hrms_dashboard_layouts for each row execute function public.touch_updated_at();
drop trigger if exists hrms_dashboard_widgets_updated_at on public.hrms_dashboard_widgets;
create trigger hrms_dashboard_widgets_updated_at before update on public.hrms_dashboard_widgets for each row execute function public.touch_updated_at();
drop trigger if exists hrms_notification_rules_updated_at on public.hrms_notification_rules;
create trigger hrms_notification_rules_updated_at before update on public.hrms_notification_rules for each row execute function public.touch_updated_at();
drop trigger if exists hrms_automation_schedules_updated_at on public.hrms_automation_schedules;
create trigger hrms_automation_schedules_updated_at before update on public.hrms_automation_schedules for each row execute function public.touch_updated_at();
drop trigger if exists hrms_automation_runs_updated_at on public.hrms_automation_runs;
create trigger hrms_automation_runs_updated_at before update on public.hrms_automation_runs for each row execute function public.touch_updated_at();

alter table public.hrms_report_runs enable row level security;
alter table public.hrms_report_exports enable row level security;
alter table public.hrms_dashboard_layouts enable row level security;
alter table public.hrms_dashboard_widgets enable row level security;
alter table public.hrms_notification_rules enable row level security;
alter table public.hrms_automation_schedules enable row level security;
alter table public.hrms_automation_runs enable row level security;
alter table public.hrms_automation_notifications enable row level security;

create or replace function public.can_view_dashboard_layout(layout_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_reports()
      or public.has_permission('permission.dashboards.view')
      or coalesce((
        select l.owner_profile_id = auth.uid()
            or l.visibility = 'system'
            or (
              l.visibility = 'role'
              and exists (
                select 1
                from public.profiles p
                where p.id = auth.uid()
                  and l.role_key = 'role.' || p.role
              )
            )
            or (
              l.visibility = 'department'
              and exists (
                select 1
                from public.employees e
                where e.profile_id = auth.uid()
                  and e.department_id = l.department_id
                  and e.is_active = true
              )
            )
        from public.hrms_dashboard_layouts l
        where l.id = layout_id
          and l.is_active = true
      ), false);
$$;

create or replace function public.can_manage_dashboard_layout(layout_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_reports()
      or coalesce((
        select l.owner_profile_id = auth.uid()
        from public.hrms_dashboard_layouts l
        where l.id = layout_id
          and l.visibility = 'user'
      ), false);
$$;

create or replace function public.can_manage_hrms_automation()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('role.admin')
      or public.has_role('role.hr_manager')
      or public.has_permission('permission.notification_rules.manage')
      or public.has_permission('permission.automation_rules.manage')
      or public.has_permission('permission.automation_executions.run');
$$;

create or replace function public.can_view_hrms_automation_run(run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_hrms_automation()
      or public.has_permission('permission.automation_executions.view')
      or coalesce((
        select r.triggered_by = auth.uid()
        from public.hrms_automation_runs r
        where r.id = run_id
      ), false);
$$;

drop policy if exists "hrms_report_runs_select" on public.hrms_report_runs;
create policy "hrms_report_runs_select" on public.hrms_report_runs for select to authenticated
  using (public.can_view_report_key(report_key, employee_id, department_id));
drop policy if exists "hrms_report_runs_insert" on public.hrms_report_runs;
create policy "hrms_report_runs_insert" on public.hrms_report_runs for insert to authenticated
  with check (public.can_view_report_key(report_key, employee_id, department_id));
drop policy if exists "hrms_report_runs_update" on public.hrms_report_runs;
create policy "hrms_report_runs_update" on public.hrms_report_runs for update to authenticated
  using (public.can_manage_reports())
  with check (public.can_manage_reports());
drop policy if exists "hrms_report_runs_delete" on public.hrms_report_runs;
create policy "hrms_report_runs_delete" on public.hrms_report_runs for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "hrms_report_exports_select" on public.hrms_report_exports;
create policy "hrms_report_exports_select" on public.hrms_report_exports for select to authenticated
  using (exists (select 1 from public.hrms_report_runs r where r.id = report_run_id and public.can_view_report_key(r.report_key, r.employee_id, r.department_id)));
drop policy if exists "hrms_report_exports_insert" on public.hrms_report_exports;
create policy "hrms_report_exports_insert" on public.hrms_report_exports for insert to authenticated
  with check (public.has_permission('permission.reports.export') and exists (select 1 from public.hrms_report_runs r where r.id = report_run_id and public.can_view_report_key(r.report_key, r.employee_id, r.department_id)));
drop policy if exists "hrms_report_exports_update" on public.hrms_report_exports;
create policy "hrms_report_exports_update" on public.hrms_report_exports for update to authenticated
  using (public.can_manage_reports())
  with check (public.can_manage_reports());
drop policy if exists "hrms_report_exports_delete" on public.hrms_report_exports;
create policy "hrms_report_exports_delete" on public.hrms_report_exports for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "hrms_dashboard_layouts_select" on public.hrms_dashboard_layouts;
create policy "hrms_dashboard_layouts_select" on public.hrms_dashboard_layouts for select to authenticated
  using (public.can_view_dashboard_layout(id));
drop policy if exists "hrms_dashboard_layouts_insert" on public.hrms_dashboard_layouts;
create policy "hrms_dashboard_layouts_insert" on public.hrms_dashboard_layouts for insert to authenticated
  with check (public.can_manage_reports() or (visibility = 'user' and owner_profile_id = auth.uid()));
drop policy if exists "hrms_dashboard_layouts_update" on public.hrms_dashboard_layouts;
create policy "hrms_dashboard_layouts_update" on public.hrms_dashboard_layouts for update to authenticated
  using (public.can_manage_dashboard_layout(id))
  with check (public.can_manage_dashboard_layout(id));
drop policy if exists "hrms_dashboard_layouts_delete" on public.hrms_dashboard_layouts;
create policy "hrms_dashboard_layouts_delete" on public.hrms_dashboard_layouts for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "hrms_dashboard_widgets_select" on public.hrms_dashboard_widgets;
create policy "hrms_dashboard_widgets_select" on public.hrms_dashboard_widgets for select to authenticated
  using (public.can_view_dashboard_layout(dashboard_layout_id));
drop policy if exists "hrms_dashboard_widgets_insert" on public.hrms_dashboard_widgets;
create policy "hrms_dashboard_widgets_insert" on public.hrms_dashboard_widgets for insert to authenticated
  with check (public.can_manage_dashboard_layout(dashboard_layout_id) and public.can_view_report_key(report_key));
drop policy if exists "hrms_dashboard_widgets_update" on public.hrms_dashboard_widgets;
create policy "hrms_dashboard_widgets_update" on public.hrms_dashboard_widgets for update to authenticated
  using (public.can_manage_dashboard_layout(dashboard_layout_id))
  with check (public.can_manage_dashboard_layout(dashboard_layout_id) and public.can_view_report_key(report_key));
drop policy if exists "hrms_dashboard_widgets_delete" on public.hrms_dashboard_widgets;
create policy "hrms_dashboard_widgets_delete" on public.hrms_dashboard_widgets for delete to authenticated
  using (public.has_role('role.admin') or public.can_manage_dashboard_layout(dashboard_layout_id));

drop policy if exists "hrms_notification_rules_select" on public.hrms_notification_rules;
create policy "hrms_notification_rules_select" on public.hrms_notification_rules for select to authenticated
  using (public.has_permission('permission.notification_rules.view') or public.has_permission('permission.notification_rules.manage'));
drop policy if exists "hrms_notification_rules_insert" on public.hrms_notification_rules;
create policy "hrms_notification_rules_insert" on public.hrms_notification_rules for insert to authenticated
  with check (public.has_permission('permission.notification_rules.manage'));
drop policy if exists "hrms_notification_rules_update" on public.hrms_notification_rules;
create policy "hrms_notification_rules_update" on public.hrms_notification_rules for update to authenticated
  using (public.has_permission('permission.notification_rules.manage'))
  with check (public.has_permission('permission.notification_rules.manage'));
drop policy if exists "hrms_notification_rules_delete" on public.hrms_notification_rules;
create policy "hrms_notification_rules_delete" on public.hrms_notification_rules for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "hrms_automation_schedules_select" on public.hrms_automation_schedules;
create policy "hrms_automation_schedules_select" on public.hrms_automation_schedules for select to authenticated
  using (public.has_permission('permission.automation_rules.view') or public.has_permission('permission.automation_rules.manage'));
drop policy if exists "hrms_automation_schedules_insert" on public.hrms_automation_schedules;
create policy "hrms_automation_schedules_insert" on public.hrms_automation_schedules for insert to authenticated
  with check (public.has_permission('permission.automation_rules.manage'));
drop policy if exists "hrms_automation_schedules_update" on public.hrms_automation_schedules;
create policy "hrms_automation_schedules_update" on public.hrms_automation_schedules for update to authenticated
  using (public.has_permission('permission.automation_rules.manage'))
  with check (public.has_permission('permission.automation_rules.manage'));
drop policy if exists "hrms_automation_schedules_delete" on public.hrms_automation_schedules;
create policy "hrms_automation_schedules_delete" on public.hrms_automation_schedules for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "hrms_automation_runs_select" on public.hrms_automation_runs;
create policy "hrms_automation_runs_select" on public.hrms_automation_runs for select to authenticated
  using (public.can_view_hrms_automation_run(id));
drop policy if exists "hrms_automation_runs_insert" on public.hrms_automation_runs;
create policy "hrms_automation_runs_insert" on public.hrms_automation_runs for insert to authenticated
  with check (public.can_manage_hrms_automation());
drop policy if exists "hrms_automation_runs_update" on public.hrms_automation_runs;
create policy "hrms_automation_runs_update" on public.hrms_automation_runs for update to authenticated
  using (public.can_manage_hrms_automation())
  with check (public.can_manage_hrms_automation());
drop policy if exists "hrms_automation_runs_delete" on public.hrms_automation_runs;
create policy "hrms_automation_runs_delete" on public.hrms_automation_runs for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "hrms_automation_notifications_select" on public.hrms_automation_notifications;
create policy "hrms_automation_notifications_select" on public.hrms_automation_notifications for select to authenticated
  using (public.can_view_hrms_automation_run(automation_run_id) or public.can_view_employee_notification(recipient_employee_id));
drop policy if exists "hrms_automation_notifications_insert" on public.hrms_automation_notifications;
create policy "hrms_automation_notifications_insert" on public.hrms_automation_notifications for insert to authenticated
  with check (public.can_manage_hrms_automation());
drop policy if exists "hrms_automation_notifications_update" on public.hrms_automation_notifications;
create policy "hrms_automation_notifications_update" on public.hrms_automation_notifications for update to authenticated
  using (public.can_manage_hrms_automation())
  with check (public.can_manage_hrms_automation());
drop policy if exists "hrms_automation_notifications_delete" on public.hrms_automation_notifications;
create policy "hrms_automation_notifications_delete" on public.hrms_automation_notifications for delete to authenticated
  using (public.has_role('role.admin'));

commit;
