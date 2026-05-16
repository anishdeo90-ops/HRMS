-- Employee Lifecycle
-- Creates the Phase 7 HRMS lifecycle foundation with helper-backed, fail-closed RLS.

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
              'permission.payroll_reports.view'
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
              'permission.daily_work_summaries.submit'
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
              'permission.lifecycle.reports.view'
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
              'permission.lifecycle.reports.view'
            )
          )
        )
    )
  ), false);
$$;

create or replace function public.can_manage_lifecycle()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('role.admin')
      or public.has_role('role.hr_manager')
      or public.has_permission('permission.lifecycle.manage');
$$;

create or replace function public.can_manage_lifecycle_setup()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_lifecycle()
      or public.has_permission('permission.onboarding.templates.manage')
      or public.has_permission('permission.separation.templates.manage')
      or public.has_permission('permission.grievances.manage')
      or public.has_permission('permission.training.manage');
$$;

create or replace function public.can_view_lifecycle_record(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_lifecycle()
      or coalesce((
        select e.profile_id = auth.uid()
          and public.has_permission('permission.lifecycle.view_self')
        from public.employees e
        where e.id = target_employee_id
          and e.is_active = true
      ), false)
      or coalesce((
        select exists (
          select 1
          from public.employees manager
          join public.employees e on e.id = target_employee_id
          where manager.profile_id = auth.uid()
            and public.is_reporting_manager(manager.id, e.id)
            and public.has_permission('permission.lifecycle.view_team')
        )
      ), false);
$$;

create or replace function public.can_review_lifecycle_record(target_employee_id uuid, approval_scope text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_lifecycle()
      or coalesce((
        select exists (
          select 1
          from public.employees manager
          join public.employees e on e.id = target_employee_id
          where manager.profile_id = auth.uid()
            and public.is_reporting_manager(manager.id, e.id)
            and (
              public.has_permission('permission.separation.approve')
              or public.has_permission('permission.promotions.approve')
              or public.has_permission('permission.transfers.approve')
              or public.has_permission('permission.daily_work_summaries.view_team')
            )
        )
      ), false)
      or coalesce((
        select exists (
          select 1
          from public.department_approvers da
          join public.employees approver on approver.id = da.approver_employee_id
          join public.employees target on target.department_id = da.department_id
          where target.id = target_employee_id
            and approver.profile_id = auth.uid()
            and da.is_active = true
            and da.approval_scope in ('lifecycle_onboarding', 'lifecycle_separation', 'lifecycle_promotion', 'lifecycle_transfer', 'grievance_resolution')
            and (approval_scope is null or da.approval_scope = approval_scope)
        )
      ), false);
$$;

create or replace function public.can_manage_grievance(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_lifecycle()
      or public.has_permission('permission.grievances.manage')
      or public.has_permission('permission.grievances.resolve')
      or public.can_review_lifecycle_record(target_employee_id, 'grievance_resolution');
$$;

create or replace function public.can_manage_training()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_lifecycle()
      or public.has_permission('permission.training.manage');
$$;

create or replace function public.can_view_training(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_training()
      or public.can_view_lifecycle_record(target_employee_id)
      or coalesce((
        select e.profile_id = auth.uid()
          and public.has_permission('permission.training.feedback.submit')
        from public.employees e
        where e.id = target_employee_id
          and e.is_active = true
      ), false);
$$;

create or replace function public.can_submit_daily_work_summary(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_lifecycle()
      or coalesce((
        select e.profile_id = auth.uid()
          and public.has_permission('permission.daily_work_summaries.submit')
        from public.employees e
        where e.id = target_employee_id
          and e.is_active = true
      ), false);
$$;

alter table public.department_approvers drop constraint if exists department_approvers_approval_scope_check;
alter table public.department_approvers add constraint department_approvers_approval_scope_check
  check (approval_scope in (
    'employee_core',
    'attendance_correction',
    'shift_request',
    'overtime',
    'leave_application',
    'compensatory_leave',
    'leave_encashment',
    'expense_claim',
    'employee_advance',
    'travel_request',
    'performance_goal',
    'performance_appraisal',
    'lifecycle_onboarding',
    'lifecycle_separation',
    'lifecycle_promotion',
    'lifecycle_transfer',
    'grievance_resolution'
  ));

create table if not exists public.employee_onboarding_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (name)
);

create table if not exists public.employee_separation_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (name)
);

create table if not exists public.grievance_types (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (code),
  unique (name)
);

create table if not exists public.training_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  owner_employee_id uuid references public.employees(id) on delete set null,
  capacity integer check (capacity is null or capacity > 0),
  is_mandatory boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (name)
);

create table if not exists public.employee_onboardings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  joined_candidate_id uuid references public.candidates(id) on delete set null,
  template_id uuid references public.employee_onboarding_templates(id) on delete set null,
  owner_employee_id uuid references public.employees(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'cancelled')),
  start_date date not null default current_date,
  due_date date not null,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (employee_id),
  unique (joined_candidate_id),
  check (due_date >= start_date)
);

create table if not exists public.employee_separations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  template_id uuid references public.employee_separation_templates(id) on delete set null,
  separation_type text not null default 'resignation' check (separation_type in ('resignation', 'termination', 'retirement', 'contract_end', 'other')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'exit_pending', 'exited', 'cancelled')),
  requested_date date not null default current_date,
  last_working_date date not null,
  relieving_date date,
  reason text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (last_working_date >= requested_date),
  check (relieving_date is null or relieving_date >= last_working_date)
);

create table if not exists public.employee_promotions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  old_designation text,
  new_designation text,
  old_department_id uuid references public.hr_departments(id) on delete set null,
  new_department_id uuid references public.hr_departments(id) on delete set null,
  old_grade_id uuid references public.hr_grades(id) on delete set null,
  new_grade_id uuid references public.hr_grades(id) on delete set null,
  old_compensation numeric(12,2) check (old_compensation is null or old_compensation >= 0),
  new_compensation numeric(12,2) check (new_compensation is null or new_compensation >= 0),
  effective_date date not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'applied', 'cancelled')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (
    coalesce(old_designation, '') <> coalesce(new_designation, '')
    or old_department_id is distinct from new_department_id
    or old_grade_id is distinct from new_grade_id
    or old_compensation is distinct from new_compensation
  )
);

create table if not exists public.employee_transfers (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  from_company_id uuid references public.hr_companies(id) on delete set null,
  to_company_id uuid references public.hr_companies(id) on delete set null,
  from_branch_id uuid references public.hr_branches(id) on delete set null,
  to_branch_id uuid references public.hr_branches(id) on delete set null,
  from_department_id uuid references public.hr_departments(id) on delete set null,
  to_department_id uuid references public.hr_departments(id) on delete set null,
  from_manager_employee_id uuid references public.employees(id) on delete set null,
  to_manager_employee_id uuid references public.employees(id) on delete set null,
  effective_date date not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'applied', 'cancelled')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (
    from_company_id is distinct from to_company_id
    or from_branch_id is distinct from to_branch_id
    or from_department_id is distinct from to_department_id
    or from_manager_employee_id is distinct from to_manager_employee_id
  )
);

create table if not exists public.employee_grievances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  grievance_type_id uuid references public.grievance_types(id) on delete set null,
  assigned_to_employee_id uuid references public.employees(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'assigned', 'under_review', 'resolved', 'rejected', 'cancelled')),
  submitted_at timestamptz,
  resolved_at timestamptz,
  resolution_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.exit_interviews (
  id uuid primary key default gen_random_uuid(),
  separation_id uuid not null references public.employee_separations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  interviewer_employee_id uuid references public.employees(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed', 'archived')),
  scheduled_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  overall_rating integer check (overall_rating is null or overall_rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (separation_id)
);

create table if not exists public.training_events (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  trainer_employee_id uuid references public.employees(id) on delete set null,
  title text not null,
  mode text not null default 'online' check (mode in ('online', 'classroom', 'hybrid')),
  location text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  start_date date not null,
  end_date date not null,
  capacity integer check (capacity is null or capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (end_date >= start_date)
);

create table if not exists public.training_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.training_events(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comments text,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (event_id, employee_id)
);

create table if not exists public.daily_work_summaries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  summary text not null,
  blockers text,
  next_plan text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed', 'archived', 'cancelled')),
  submitted_at timestamptz,
  reviewer_employee_id uuid references public.employees(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (employee_id, work_date)
);

create table if not exists public.employee_boarding_activities (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid references public.employee_onboardings(id) on delete cascade,
  separation_id uuid references public.employee_separations(id) on delete cascade,
  activity_type text not null check (activity_type in ('onboarding', 'separation')),
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'skipped', 'cancelled')),
  due_date date,
  completed_at timestamptz,
  assigned_to_employee_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (
    (activity_type = 'onboarding' and onboarding_id is not null and separation_id is null)
    or (activity_type = 'separation' and separation_id is not null and onboarding_id is null)
  )
);

create index if not exists idx_employee_onboardings_employee on public.employee_onboardings(employee_id);
create index if not exists idx_employee_separations_employee on public.employee_separations(employee_id);
create index if not exists idx_employee_promotions_employee on public.employee_promotions(employee_id);
create index if not exists idx_employee_transfers_employee on public.employee_transfers(employee_id);
create index if not exists idx_employee_grievances_employee on public.employee_grievances(employee_id);
create index if not exists idx_exit_interviews_employee on public.exit_interviews(employee_id);
create index if not exists idx_training_events_program on public.training_events(program_id);
create index if not exists idx_training_feedback_event on public.training_feedback(event_id);
create index if not exists idx_daily_work_summaries_employee on public.daily_work_summaries(employee_id);
create index if not exists idx_boarding_activities_onboarding on public.employee_boarding_activities(onboarding_id);
create index if not exists idx_boarding_activities_separation on public.employee_boarding_activities(separation_id);

drop trigger if exists employee_onboarding_templates_updated_at on public.employee_onboarding_templates;
create trigger employee_onboarding_templates_updated_at before update on public.employee_onboarding_templates for each row execute function public.touch_updated_at();
drop trigger if exists employee_onboardings_updated_at on public.employee_onboardings;
create trigger employee_onboardings_updated_at before update on public.employee_onboardings for each row execute function public.touch_updated_at();
drop trigger if exists employee_boarding_activities_updated_at on public.employee_boarding_activities;
create trigger employee_boarding_activities_updated_at before update on public.employee_boarding_activities for each row execute function public.touch_updated_at();
drop trigger if exists employee_separation_templates_updated_at on public.employee_separation_templates;
create trigger employee_separation_templates_updated_at before update on public.employee_separation_templates for each row execute function public.touch_updated_at();
drop trigger if exists employee_separations_updated_at on public.employee_separations;
create trigger employee_separations_updated_at before update on public.employee_separations for each row execute function public.touch_updated_at();
drop trigger if exists employee_promotions_updated_at on public.employee_promotions;
create trigger employee_promotions_updated_at before update on public.employee_promotions for each row execute function public.touch_updated_at();
drop trigger if exists employee_transfers_updated_at on public.employee_transfers;
create trigger employee_transfers_updated_at before update on public.employee_transfers for each row execute function public.touch_updated_at();
drop trigger if exists grievance_types_updated_at on public.grievance_types;
create trigger grievance_types_updated_at before update on public.grievance_types for each row execute function public.touch_updated_at();
drop trigger if exists employee_grievances_updated_at on public.employee_grievances;
create trigger employee_grievances_updated_at before update on public.employee_grievances for each row execute function public.touch_updated_at();
drop trigger if exists exit_interviews_updated_at on public.exit_interviews;
create trigger exit_interviews_updated_at before update on public.exit_interviews for each row execute function public.touch_updated_at();
drop trigger if exists training_programs_updated_at on public.training_programs;
create trigger training_programs_updated_at before update on public.training_programs for each row execute function public.touch_updated_at();
drop trigger if exists training_events_updated_at on public.training_events;
create trigger training_events_updated_at before update on public.training_events for each row execute function public.touch_updated_at();
drop trigger if exists training_feedback_updated_at on public.training_feedback;
create trigger training_feedback_updated_at before update on public.training_feedback for each row execute function public.touch_updated_at();
drop trigger if exists daily_work_summaries_updated_at on public.daily_work_summaries;
create trigger daily_work_summaries_updated_at before update on public.daily_work_summaries for each row execute function public.touch_updated_at();

alter table public.employee_onboarding_templates enable row level security;
alter table public.employee_onboardings enable row level security;
alter table public.employee_boarding_activities enable row level security;
alter table public.employee_separation_templates enable row level security;
alter table public.employee_separations enable row level security;
alter table public.employee_promotions enable row level security;
alter table public.employee_transfers enable row level security;
alter table public.grievance_types enable row level security;
alter table public.employee_grievances enable row level security;
alter table public.exit_interviews enable row level security;
alter table public.training_programs enable row level security;
alter table public.training_events enable row level security;
alter table public.training_feedback enable row level security;
alter table public.daily_work_summaries enable row level security;

create or replace function public.can_view_grievance(target_grievance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_lifecycle()
      or public.has_permission('permission.grievances.manage')
      or public.has_permission('permission.grievances.resolve')
      or coalesce((
        select e.profile_id = auth.uid()
          and public.has_permission('permission.grievances.view_self')
        from public.employee_grievances g
        join public.employees e on e.id = g.employee_id
        where g.id = target_grievance_id
      ), false)
      or coalesce((
        select assigned.profile_id = auth.uid()
        from public.employee_grievances g
        join public.employees assigned on assigned.id = g.assigned_to_employee_id
        where g.id = target_grievance_id
      ), false);
$$;

drop policy if exists "employee_onboarding_templates_select" on public.employee_onboarding_templates;
create policy "employee_onboarding_templates_select" on public.employee_onboarding_templates for select to authenticated using (public.can_manage_lifecycle_setup() or public.has_permission('permission.lifecycle.view_self') or public.has_permission('permission.lifecycle.view_team'));
drop policy if exists "employee_onboarding_templates_insert" on public.employee_onboarding_templates;
create policy "employee_onboarding_templates_insert" on public.employee_onboarding_templates for insert to authenticated with check (public.has_permission('permission.onboarding.templates.manage') or public.can_manage_lifecycle());
drop policy if exists "employee_onboarding_templates_update" on public.employee_onboarding_templates;
create policy "employee_onboarding_templates_update" on public.employee_onboarding_templates for update to authenticated using (public.has_permission('permission.onboarding.templates.manage') or public.can_manage_lifecycle()) with check (public.has_permission('permission.onboarding.templates.manage') or public.can_manage_lifecycle());
drop policy if exists "employee_onboarding_templates_delete" on public.employee_onboarding_templates;
create policy "employee_onboarding_templates_delete" on public.employee_onboarding_templates for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_onboardings_select" on public.employee_onboardings;
create policy "employee_onboardings_select" on public.employee_onboardings for select to authenticated using (public.can_view_lifecycle_record(employee_id) or public.can_review_lifecycle_record(employee_id, 'lifecycle_onboarding'));
drop policy if exists "employee_onboardings_insert" on public.employee_onboardings;
create policy "employee_onboardings_insert" on public.employee_onboardings for insert to authenticated with check (public.has_permission('permission.onboarding.manage') or public.can_manage_lifecycle());
drop policy if exists "employee_onboardings_update" on public.employee_onboardings;
create policy "employee_onboardings_update" on public.employee_onboardings for update to authenticated using (public.has_permission('permission.onboarding.manage') or public.can_review_lifecycle_record(employee_id, 'lifecycle_onboarding')) with check (public.has_permission('permission.onboarding.manage') or public.can_review_lifecycle_record(employee_id, 'lifecycle_onboarding'));
drop policy if exists "employee_onboardings_delete" on public.employee_onboardings;
create policy "employee_onboardings_delete" on public.employee_onboardings for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_boarding_activities_select" on public.employee_boarding_activities;
create policy "employee_boarding_activities_select" on public.employee_boarding_activities for select to authenticated using ((onboarding_id is not null and exists (select 1 from public.employee_onboardings o where o.id = onboarding_id and (public.can_view_lifecycle_record(o.employee_id) or public.can_review_lifecycle_record(o.employee_id, 'lifecycle_onboarding')))) or (separation_id is not null and exists (select 1 from public.employee_separations s where s.id = separation_id and (public.can_view_lifecycle_record(s.employee_id) or public.can_review_lifecycle_record(s.employee_id, 'lifecycle_separation')))));
drop policy if exists "employee_boarding_activities_insert" on public.employee_boarding_activities;
create policy "employee_boarding_activities_insert" on public.employee_boarding_activities for insert to authenticated with check (public.has_permission('permission.onboarding.manage') or public.has_permission('permission.separation.approve') or public.can_manage_lifecycle());
drop policy if exists "employee_boarding_activities_update" on public.employee_boarding_activities;
create policy "employee_boarding_activities_update" on public.employee_boarding_activities for update to authenticated using (public.has_permission('permission.onboarding.activities.update') or public.can_manage_lifecycle()) with check (public.has_permission('permission.onboarding.activities.update') or public.can_manage_lifecycle());
drop policy if exists "employee_boarding_activities_delete" on public.employee_boarding_activities;
create policy "employee_boarding_activities_delete" on public.employee_boarding_activities for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_separation_templates_select" on public.employee_separation_templates;
create policy "employee_separation_templates_select" on public.employee_separation_templates for select to authenticated using (public.can_manage_lifecycle_setup() or public.has_permission('permission.separation.request') or public.has_permission('permission.separation.approve'));
drop policy if exists "employee_separation_templates_insert" on public.employee_separation_templates;
create policy "employee_separation_templates_insert" on public.employee_separation_templates for insert to authenticated with check (public.has_permission('permission.separation.templates.manage') or public.can_manage_lifecycle());
drop policy if exists "employee_separation_templates_update" on public.employee_separation_templates;
create policy "employee_separation_templates_update" on public.employee_separation_templates for update to authenticated using (public.has_permission('permission.separation.templates.manage') or public.can_manage_lifecycle()) with check (public.has_permission('permission.separation.templates.manage') or public.can_manage_lifecycle());
drop policy if exists "employee_separation_templates_delete" on public.employee_separation_templates;
create policy "employee_separation_templates_delete" on public.employee_separation_templates for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_separations_select" on public.employee_separations;
create policy "employee_separations_select" on public.employee_separations for select to authenticated using (public.can_view_lifecycle_record(employee_id) or public.can_review_lifecycle_record(employee_id, 'lifecycle_separation'));
drop policy if exists "employee_separations_insert" on public.employee_separations;
create policy "employee_separations_insert" on public.employee_separations for insert to authenticated with check (public.can_submit_daily_work_summary(employee_id) or public.has_permission('permission.separation.request') or public.can_manage_lifecycle());
drop policy if exists "employee_separations_update" on public.employee_separations;
create policy "employee_separations_update" on public.employee_separations for update to authenticated using (public.can_review_lifecycle_record(employee_id, 'lifecycle_separation') or public.has_permission('permission.separation.approve')) with check (public.can_review_lifecycle_record(employee_id, 'lifecycle_separation') or public.has_permission('permission.separation.approve'));
drop policy if exists "employee_separations_delete" on public.employee_separations;
create policy "employee_separations_delete" on public.employee_separations for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_promotions_select" on public.employee_promotions;
create policy "employee_promotions_select" on public.employee_promotions for select to authenticated using (public.can_view_lifecycle_record(employee_id) or public.can_review_lifecycle_record(employee_id, 'lifecycle_promotion'));
drop policy if exists "employee_promotions_insert" on public.employee_promotions;
create policy "employee_promotions_insert" on public.employee_promotions for insert to authenticated with check (public.has_permission('permission.promotions.manage') or public.can_manage_lifecycle());
drop policy if exists "employee_promotions_update" on public.employee_promotions;
create policy "employee_promotions_update" on public.employee_promotions for update to authenticated using (public.has_permission('permission.promotions.manage') or public.has_permission('permission.promotions.approve') or public.can_review_lifecycle_record(employee_id, 'lifecycle_promotion')) with check (public.has_permission('permission.promotions.manage') or public.has_permission('permission.promotions.approve') or public.can_review_lifecycle_record(employee_id, 'lifecycle_promotion'));
drop policy if exists "employee_promotions_delete" on public.employee_promotions;
create policy "employee_promotions_delete" on public.employee_promotions for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_transfers_select" on public.employee_transfers;
create policy "employee_transfers_select" on public.employee_transfers for select to authenticated using (public.can_view_lifecycle_record(employee_id) or public.can_review_lifecycle_record(employee_id, 'lifecycle_transfer'));
drop policy if exists "employee_transfers_insert" on public.employee_transfers;
create policy "employee_transfers_insert" on public.employee_transfers for insert to authenticated with check (public.has_permission('permission.transfers.manage') or public.can_manage_lifecycle());
drop policy if exists "employee_transfers_update" on public.employee_transfers;
create policy "employee_transfers_update" on public.employee_transfers for update to authenticated using (public.has_permission('permission.transfers.manage') or public.has_permission('permission.transfers.approve') or public.can_review_lifecycle_record(employee_id, 'lifecycle_transfer')) with check (public.has_permission('permission.transfers.manage') or public.has_permission('permission.transfers.approve') or public.can_review_lifecycle_record(employee_id, 'lifecycle_transfer'));
drop policy if exists "employee_transfers_delete" on public.employee_transfers;
create policy "employee_transfers_delete" on public.employee_transfers for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "grievance_types_select" on public.grievance_types;
create policy "grievance_types_select" on public.grievance_types for select to authenticated using (public.has_permission('permission.grievances.view_self') or public.has_permission('permission.grievances.manage') or public.has_permission('permission.grievances.resolve'));
drop policy if exists "grievance_types_insert" on public.grievance_types;
create policy "grievance_types_insert" on public.grievance_types for insert to authenticated with check (public.has_permission('permission.grievances.manage') or public.can_manage_lifecycle());
drop policy if exists "grievance_types_update" on public.grievance_types;
create policy "grievance_types_update" on public.grievance_types for update to authenticated using (public.has_permission('permission.grievances.manage') or public.can_manage_lifecycle()) with check (public.has_permission('permission.grievances.manage') or public.can_manage_lifecycle());
drop policy if exists "grievance_types_delete" on public.grievance_types;
create policy "grievance_types_delete" on public.grievance_types for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_grievances_select" on public.employee_grievances;
create policy "employee_grievances_select" on public.employee_grievances for select to authenticated using (public.can_view_grievance(id));
drop policy if exists "employee_grievances_insert" on public.employee_grievances;
create policy "employee_grievances_insert" on public.employee_grievances for insert to authenticated with check (public.can_view_lifecycle_record(employee_id) and public.has_permission('permission.grievances.view_self') or public.can_manage_grievance(employee_id));
drop policy if exists "employee_grievances_update" on public.employee_grievances;
create policy "employee_grievances_update" on public.employee_grievances for update to authenticated using (public.can_manage_grievance(employee_id)) with check (public.can_manage_grievance(employee_id));
drop policy if exists "employee_grievances_delete" on public.employee_grievances;
create policy "employee_grievances_delete" on public.employee_grievances for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "exit_interviews_select" on public.exit_interviews;
create policy "exit_interviews_select" on public.exit_interviews for select to authenticated using (public.can_view_lifecycle_record(employee_id) or public.can_review_lifecycle_record(employee_id, 'lifecycle_separation'));
drop policy if exists "exit_interviews_insert" on public.exit_interviews;
create policy "exit_interviews_insert" on public.exit_interviews for insert to authenticated with check (public.can_review_lifecycle_record(employee_id, 'lifecycle_separation') or public.can_manage_lifecycle());
drop policy if exists "exit_interviews_update" on public.exit_interviews;
create policy "exit_interviews_update" on public.exit_interviews for update to authenticated using (public.can_review_lifecycle_record(employee_id, 'lifecycle_separation') or public.can_manage_lifecycle()) with check (public.can_review_lifecycle_record(employee_id, 'lifecycle_separation') or public.can_manage_lifecycle());
drop policy if exists "exit_interviews_delete" on public.exit_interviews;
create policy "exit_interviews_delete" on public.exit_interviews for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "training_programs_select" on public.training_programs;
create policy "training_programs_select" on public.training_programs for select to authenticated using (public.can_manage_training() or public.has_permission('permission.training.feedback.submit') or public.has_permission('permission.lifecycle.view_team'));
drop policy if exists "training_programs_insert" on public.training_programs;
create policy "training_programs_insert" on public.training_programs for insert to authenticated with check (public.can_manage_training());
drop policy if exists "training_programs_update" on public.training_programs;
create policy "training_programs_update" on public.training_programs for update to authenticated using (public.can_manage_training()) with check (public.can_manage_training());
drop policy if exists "training_programs_delete" on public.training_programs;
create policy "training_programs_delete" on public.training_programs for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "training_events_select" on public.training_events;
create policy "training_events_select" on public.training_events for select to authenticated using (public.can_manage_training() or public.has_permission('permission.training.feedback.submit') or public.has_permission('permission.lifecycle.view_team'));
drop policy if exists "training_events_insert" on public.training_events;
create policy "training_events_insert" on public.training_events for insert to authenticated with check (public.can_manage_training());
drop policy if exists "training_events_update" on public.training_events;
create policy "training_events_update" on public.training_events for update to authenticated using (public.can_manage_training()) with check (public.can_manage_training());
drop policy if exists "training_events_delete" on public.training_events;
create policy "training_events_delete" on public.training_events for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "training_feedback_select" on public.training_feedback;
create policy "training_feedback_select" on public.training_feedback for select to authenticated using (public.can_view_training(employee_id));
drop policy if exists "training_feedback_insert" on public.training_feedback;
create policy "training_feedback_insert" on public.training_feedback for insert to authenticated with check (public.can_view_training(employee_id) and public.has_permission('permission.training.feedback.submit'));
drop policy if exists "training_feedback_update" on public.training_feedback;
create policy "training_feedback_update" on public.training_feedback for update to authenticated using (public.can_manage_training()) with check (public.can_manage_training());
drop policy if exists "training_feedback_delete" on public.training_feedback;
create policy "training_feedback_delete" on public.training_feedback for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "daily_work_summaries_select" on public.daily_work_summaries;
create policy "daily_work_summaries_select" on public.daily_work_summaries for select to authenticated using (public.can_view_lifecycle_record(employee_id) or public.can_review_lifecycle_record(employee_id) or public.has_permission('permission.daily_work_summaries.view_team'));
drop policy if exists "daily_work_summaries_insert" on public.daily_work_summaries;
create policy "daily_work_summaries_insert" on public.daily_work_summaries for insert to authenticated with check (public.can_submit_daily_work_summary(employee_id));
drop policy if exists "daily_work_summaries_update" on public.daily_work_summaries;
create policy "daily_work_summaries_update" on public.daily_work_summaries for update to authenticated using (public.can_submit_daily_work_summary(employee_id) or public.can_review_lifecycle_record(employee_id)) with check (public.can_submit_daily_work_summary(employee_id) or public.can_review_lifecycle_record(employee_id));
drop policy if exists "daily_work_summaries_delete" on public.daily_work_summaries;
create policy "daily_work_summaries_delete" on public.daily_work_summaries for delete to authenticated using (public.has_role('role.admin'));

commit;
