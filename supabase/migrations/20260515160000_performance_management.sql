-- Performance Management
-- Creates the Phase 6 HRMS performance foundation with helper-backed, fail-closed RLS.

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
              'permission.performance.feedback.submit'
            )
          )
          or (
            p.role = 'hod'
            and $1 in (
              'permission.performance.view_team',
              'permission.performance.goals.manage',
              'permission.performance.appraisals.review',
              'permission.performance.feedback.submit',
              'permission.performance.reports.view'
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
              'permission.performance.reports.view'
            )
          )
        )
    )
  ), false);
$$;

create or replace function public.can_manage_performance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('role.admin')
      or public.has_role('role.hr_manager')
      or public.has_permission('permission.performance.manage');
$$;

create or replace function public.can_manage_performance_setup()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_performance()
      or public.has_permission('permission.performance.goals.manage')
      or public.has_permission('permission.performance.kras.manage')
      or public.has_permission('permission.performance.cycles.manage')
      or public.has_permission('permission.performance.feedback.manage');
$$;

create or replace function public.can_view_performance_record(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_performance()
      or coalesce((
        select e.profile_id = auth.uid()
          and public.has_permission('permission.performance.view_self')
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
            and public.has_permission('permission.performance.view_team')
        )
      ), false);
$$;

create or replace function public.can_review_performance_record(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_performance()
      or coalesce((
        select exists (
          select 1
          from public.employees manager
          join public.employees e on e.id = target_employee_id
          where manager.profile_id = auth.uid()
            and public.is_reporting_manager(manager.id, e.id)
            and public.has_permission('permission.performance.appraisals.review')
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
            and da.approval_scope in ('performance_goal', 'performance_appraisal')
            and public.has_permission('permission.performance.appraisals.review')
        )
      ), false);
$$;

create or replace function public.can_submit_performance_feedback(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_performance()
      or public.can_review_performance_record(target_employee_id)
      or coalesce((
        select e.profile_id = auth.uid()
          and public.has_permission('permission.performance.feedback.submit')
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
    'performance_appraisal'
  ));

create table if not exists public.performance_goals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  title text not null,
  description text,
  goal_type text not null default 'individual' check (goal_type in ('individual', 'team', 'company')),
  status text not null default 'draft' check (status in ('draft', 'active', 'submitted', 'approved', 'closed', 'cancelled')),
  start_date date not null,
  end_date date not null,
  weight numeric(5,2) not null default 0 check (weight >= 0 and weight <= 100),
  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  manager_employee_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (end_date >= start_date)
);

create table if not exists public.performance_kras (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  goal_id uuid references public.performance_goals(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'submitted', 'approved', 'closed', 'cancelled')),
  weight numeric(5,2) not null default 0 check (weight >= 0 and weight <= 100),
  target_value numeric(12,2),
  achieved_value numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.appraisal_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  scoring_scale integer not null default 5 check (scoring_scale between 1 and 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (name)
);

create table if not exists public.appraisal_template_goals (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.appraisal_templates(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'goal' check (category in ('goal', 'kra', 'competency', 'feedback')),
  weight numeric(5,2) not null default 0 check (weight >= 0 and weight <= 100),
  max_score numeric(5,2) not null default 5 check (max_score > 0 and max_score <= 5),
  sequence integer not null default 0 check (sequence >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (template_id, title)
);

create table if not exists public.appraisal_cycles (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.appraisal_templates(id) on delete set null,
  name text not null,
  start_date date not null,
  end_date date not null,
  self_review_start date,
  self_review_end date,
  manager_review_start date,
  manager_review_end date,
  status text not null default 'draft' check (status in ('draft', 'active', 'review_open', 'closed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (end_date >= start_date),
  check (self_review_end is null or self_review_start is null or self_review_end >= self_review_start),
  check (manager_review_end is null or manager_review_start is null or manager_review_end >= manager_review_start),
  unique (name)
);

create table if not exists public.appraisals (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.appraisal_cycles(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  reviewer_employee_id uuid references public.employees(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'self_submitted', 'manager_reviewed', 'approved', 'rejected', 'closed', 'cancelled')),
  self_summary text,
  manager_summary text,
  final_score numeric(5,2) check (final_score is null or (final_score >= 0 and final_score <= 5)),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (cycle_id, employee_id)
);

create table if not exists public.appraisal_goals (
  id uuid primary key default gen_random_uuid(),
  appraisal_id uuid not null references public.appraisals(id) on delete cascade,
  performance_goal_id uuid references public.performance_goals(id) on delete set null,
  template_goal_id uuid references public.appraisal_template_goals(id) on delete set null,
  title text not null,
  weight numeric(5,2) not null default 0 check (weight >= 0 and weight <= 100),
  self_score numeric(5,2) check (self_score is null or (self_score >= 0 and self_score <= 5)),
  manager_score numeric(5,2) check (manager_score is null or (manager_score >= 0 and manager_score <= 5)),
  final_score numeric(5,2) check (final_score is null or (final_score >= 0 and final_score <= 5)),
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.employee_performance_feedback (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  provider_employee_id uuid references public.employees(id) on delete set null,
  cycle_id uuid references public.appraisal_cycles(id) on delete set null,
  feedback_type text not null default 'manager' check (feedback_type in ('self', 'manager', 'peer', 'hr')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed', 'archived', 'cancelled')),
  summary text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.employee_feedback_criteria (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null default 'performance' check (category in ('performance', 'competency', 'values', 'leadership')),
  weight numeric(5,2) not null default 0 check (weight >= 0 and weight <= 100),
  max_rating integer not null default 5 check (max_rating between 1 and 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (name)
);

create table if not exists public.employee_feedback_ratings (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.employee_performance_feedback(id) on delete cascade,
  criteria_id uuid not null references public.employee_feedback_criteria(id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (feedback_id, criteria_id)
);

create index if not exists idx_performance_goals_employee on public.performance_goals(employee_id);
create index if not exists idx_performance_kras_employee on public.performance_kras(employee_id);
create index if not exists idx_appraisals_employee on public.appraisals(employee_id);
create index if not exists idx_appraisals_cycle on public.appraisals(cycle_id);
create index if not exists idx_employee_performance_feedback_employee on public.employee_performance_feedback(employee_id);
create index if not exists idx_employee_feedback_ratings_feedback on public.employee_feedback_ratings(feedback_id);

drop trigger if exists performance_goals_updated_at on public.performance_goals;
create trigger performance_goals_updated_at before update on public.performance_goals for each row execute function public.touch_updated_at();
drop trigger if exists performance_kras_updated_at on public.performance_kras;
create trigger performance_kras_updated_at before update on public.performance_kras for each row execute function public.touch_updated_at();
drop trigger if exists appraisal_templates_updated_at on public.appraisal_templates;
create trigger appraisal_templates_updated_at before update on public.appraisal_templates for each row execute function public.touch_updated_at();
drop trigger if exists appraisal_template_goals_updated_at on public.appraisal_template_goals;
create trigger appraisal_template_goals_updated_at before update on public.appraisal_template_goals for each row execute function public.touch_updated_at();
drop trigger if exists appraisal_cycles_updated_at on public.appraisal_cycles;
create trigger appraisal_cycles_updated_at before update on public.appraisal_cycles for each row execute function public.touch_updated_at();
drop trigger if exists appraisals_updated_at on public.appraisals;
create trigger appraisals_updated_at before update on public.appraisals for each row execute function public.touch_updated_at();
drop trigger if exists appraisal_goals_updated_at on public.appraisal_goals;
create trigger appraisal_goals_updated_at before update on public.appraisal_goals for each row execute function public.touch_updated_at();
drop trigger if exists employee_performance_feedback_updated_at on public.employee_performance_feedback;
create trigger employee_performance_feedback_updated_at before update on public.employee_performance_feedback for each row execute function public.touch_updated_at();
drop trigger if exists employee_feedback_criteria_updated_at on public.employee_feedback_criteria;
create trigger employee_feedback_criteria_updated_at before update on public.employee_feedback_criteria for each row execute function public.touch_updated_at();
drop trigger if exists employee_feedback_ratings_updated_at on public.employee_feedback_ratings;
create trigger employee_feedback_ratings_updated_at before update on public.employee_feedback_ratings for each row execute function public.touch_updated_at();

alter table public.performance_goals enable row level security;
alter table public.performance_kras enable row level security;
alter table public.appraisal_templates enable row level security;
alter table public.appraisal_template_goals enable row level security;
alter table public.appraisal_cycles enable row level security;
alter table public.appraisals enable row level security;
alter table public.appraisal_goals enable row level security;
alter table public.employee_performance_feedback enable row level security;
alter table public.employee_feedback_criteria enable row level security;
alter table public.employee_feedback_ratings enable row level security;

drop policy if exists "performance_goals_select" on public.performance_goals;
create policy "performance_goals_select" on public.performance_goals for select to authenticated using (public.can_view_performance_record(employee_id) or public.can_review_performance_record(employee_id));
drop policy if exists "performance_goals_insert" on public.performance_goals;
create policy "performance_goals_insert" on public.performance_goals for insert to authenticated with check (public.can_manage_performance_setup() or public.can_review_performance_record(employee_id));
drop policy if exists "performance_goals_update" on public.performance_goals;
create policy "performance_goals_update" on public.performance_goals for update to authenticated using (public.can_manage_performance_setup() or public.can_review_performance_record(employee_id) or coalesce((select e.profile_id = auth.uid() and public.has_permission('permission.performance.goals.update') from public.employees e where e.id = employee_id and e.is_active = true), false)) with check (public.can_manage_performance_setup() or public.can_review_performance_record(employee_id) or coalesce((select e.profile_id = auth.uid() and public.has_permission('permission.performance.goals.update') from public.employees e where e.id = employee_id and e.is_active = true), false));
drop policy if exists "performance_goals_delete" on public.performance_goals;
create policy "performance_goals_delete" on public.performance_goals for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "performance_kras_select" on public.performance_kras;
create policy "performance_kras_select" on public.performance_kras for select to authenticated using (public.can_view_performance_record(employee_id) or public.can_review_performance_record(employee_id));
drop policy if exists "performance_kras_insert" on public.performance_kras;
create policy "performance_kras_insert" on public.performance_kras for insert to authenticated with check (public.can_manage_performance_setup() or public.can_review_performance_record(employee_id));
drop policy if exists "performance_kras_update" on public.performance_kras;
create policy "performance_kras_update" on public.performance_kras for update to authenticated using (public.can_manage_performance_setup() or public.can_review_performance_record(employee_id)) with check (public.can_manage_performance_setup() or public.can_review_performance_record(employee_id));
drop policy if exists "performance_kras_delete" on public.performance_kras;
create policy "performance_kras_delete" on public.performance_kras for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "appraisal_templates_select" on public.appraisal_templates;
create policy "appraisal_templates_select" on public.appraisal_templates for select to authenticated using (public.can_manage_performance_setup() or public.has_permission('permission.performance.view_team') or public.has_permission('permission.performance.view_self'));
drop policy if exists "appraisal_templates_insert" on public.appraisal_templates;
create policy "appraisal_templates_insert" on public.appraisal_templates for insert to authenticated with check (public.has_permission('permission.performance.cycles.manage') or public.can_manage_performance());
drop policy if exists "appraisal_templates_update" on public.appraisal_templates;
create policy "appraisal_templates_update" on public.appraisal_templates for update to authenticated using (public.has_permission('permission.performance.cycles.manage') or public.can_manage_performance()) with check (public.has_permission('permission.performance.cycles.manage') or public.can_manage_performance());
drop policy if exists "appraisal_templates_delete" on public.appraisal_templates;
create policy "appraisal_templates_delete" on public.appraisal_templates for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "appraisal_template_goals_select" on public.appraisal_template_goals;
create policy "appraisal_template_goals_select" on public.appraisal_template_goals for select to authenticated using (public.can_manage_performance_setup() or public.has_permission('permission.performance.view_team') or public.has_permission('permission.performance.view_self'));
drop policy if exists "appraisal_template_goals_insert" on public.appraisal_template_goals;
create policy "appraisal_template_goals_insert" on public.appraisal_template_goals for insert to authenticated with check (public.has_permission('permission.performance.cycles.manage') or public.can_manage_performance());
drop policy if exists "appraisal_template_goals_update" on public.appraisal_template_goals;
create policy "appraisal_template_goals_update" on public.appraisal_template_goals for update to authenticated using (public.has_permission('permission.performance.cycles.manage') or public.can_manage_performance()) with check (public.has_permission('permission.performance.cycles.manage') or public.can_manage_performance());
drop policy if exists "appraisal_template_goals_delete" on public.appraisal_template_goals;
create policy "appraisal_template_goals_delete" on public.appraisal_template_goals for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "appraisal_cycles_select" on public.appraisal_cycles;
create policy "appraisal_cycles_select" on public.appraisal_cycles for select to authenticated using (public.can_manage_performance_setup() or public.has_permission('permission.performance.view_team') or public.has_permission('permission.performance.view_self'));
drop policy if exists "appraisal_cycles_insert" on public.appraisal_cycles;
create policy "appraisal_cycles_insert" on public.appraisal_cycles for insert to authenticated with check (public.has_permission('permission.performance.cycles.manage') or public.can_manage_performance());
drop policy if exists "appraisal_cycles_update" on public.appraisal_cycles;
create policy "appraisal_cycles_update" on public.appraisal_cycles for update to authenticated using (public.has_permission('permission.performance.cycles.manage') or public.can_manage_performance()) with check (public.has_permission('permission.performance.cycles.manage') or public.can_manage_performance());
drop policy if exists "appraisal_cycles_delete" on public.appraisal_cycles;
create policy "appraisal_cycles_delete" on public.appraisal_cycles for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "appraisals_select" on public.appraisals;
create policy "appraisals_select" on public.appraisals for select to authenticated using (public.can_view_performance_record(employee_id) or public.can_review_performance_record(employee_id));
drop policy if exists "appraisals_insert" on public.appraisals;
create policy "appraisals_insert" on public.appraisals for insert to authenticated with check (public.can_manage_performance_setup() or public.can_review_performance_record(employee_id));
drop policy if exists "appraisals_update" on public.appraisals;
create policy "appraisals_update" on public.appraisals for update to authenticated using (public.can_manage_performance() or public.can_review_performance_record(employee_id) or (public.can_view_performance_record(employee_id) and public.has_permission('permission.performance.appraisals.submit'))) with check (public.can_manage_performance() or public.can_review_performance_record(employee_id) or (public.can_view_performance_record(employee_id) and public.has_permission('permission.performance.appraisals.submit')));
drop policy if exists "appraisals_delete" on public.appraisals;
create policy "appraisals_delete" on public.appraisals for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "appraisal_goals_select" on public.appraisal_goals;
create policy "appraisal_goals_select" on public.appraisal_goals for select to authenticated using (exists (select 1 from public.appraisals a where a.id = appraisal_id and (public.can_view_performance_record(a.employee_id) or public.can_review_performance_record(a.employee_id))));
drop policy if exists "appraisal_goals_insert" on public.appraisal_goals;
create policy "appraisal_goals_insert" on public.appraisal_goals for insert to authenticated with check (exists (select 1 from public.appraisals a where a.id = appraisal_id and (public.can_manage_performance_setup() or public.can_review_performance_record(a.employee_id))));
drop policy if exists "appraisal_goals_update" on public.appraisal_goals;
create policy "appraisal_goals_update" on public.appraisal_goals for update to authenticated using (exists (select 1 from public.appraisals a where a.id = appraisal_id and (public.can_review_performance_record(a.employee_id) or public.can_manage_performance()))) with check (exists (select 1 from public.appraisals a where a.id = appraisal_id and (public.can_review_performance_record(a.employee_id) or public.can_manage_performance())));
drop policy if exists "appraisal_goals_delete" on public.appraisal_goals;
create policy "appraisal_goals_delete" on public.appraisal_goals for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_performance_feedback_select" on public.employee_performance_feedback;
create policy "employee_performance_feedback_select" on public.employee_performance_feedback for select to authenticated using (public.can_view_performance_record(employee_id) or public.can_review_performance_record(employee_id));
drop policy if exists "employee_performance_feedback_insert" on public.employee_performance_feedback;
create policy "employee_performance_feedback_insert" on public.employee_performance_feedback for insert to authenticated with check (public.can_submit_performance_feedback(employee_id));
drop policy if exists "employee_performance_feedback_update" on public.employee_performance_feedback;
create policy "employee_performance_feedback_update" on public.employee_performance_feedback for update to authenticated using (public.can_manage_performance() or public.has_permission('permission.performance.feedback.manage') or public.can_submit_performance_feedback(employee_id)) with check (public.can_manage_performance() or public.has_permission('permission.performance.feedback.manage') or public.can_submit_performance_feedback(employee_id));
drop policy if exists "employee_performance_feedback_delete" on public.employee_performance_feedback;
create policy "employee_performance_feedback_delete" on public.employee_performance_feedback for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_feedback_criteria_select" on public.employee_feedback_criteria;
create policy "employee_feedback_criteria_select" on public.employee_feedback_criteria for select to authenticated using (public.has_permission('permission.performance.view_self') or public.has_permission('permission.performance.view_team') or public.has_permission('permission.performance.feedback.manage'));
drop policy if exists "employee_feedback_criteria_insert" on public.employee_feedback_criteria;
create policy "employee_feedback_criteria_insert" on public.employee_feedback_criteria for insert to authenticated with check (public.has_permission('permission.performance.feedback.manage') or public.can_manage_performance());
drop policy if exists "employee_feedback_criteria_update" on public.employee_feedback_criteria;
create policy "employee_feedback_criteria_update" on public.employee_feedback_criteria for update to authenticated using (public.has_permission('permission.performance.feedback.manage') or public.can_manage_performance()) with check (public.has_permission('permission.performance.feedback.manage') or public.can_manage_performance());
drop policy if exists "employee_feedback_criteria_delete" on public.employee_feedback_criteria;
create policy "employee_feedback_criteria_delete" on public.employee_feedback_criteria for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_feedback_ratings_select" on public.employee_feedback_ratings;
create policy "employee_feedback_ratings_select" on public.employee_feedback_ratings for select to authenticated using (exists (select 1 from public.employee_performance_feedback f where f.id = feedback_id and (public.can_view_performance_record(f.employee_id) or public.can_review_performance_record(f.employee_id))));
drop policy if exists "employee_feedback_ratings_insert" on public.employee_feedback_ratings;
create policy "employee_feedback_ratings_insert" on public.employee_feedback_ratings for insert to authenticated with check (exists (select 1 from public.employee_performance_feedback f where f.id = feedback_id and public.can_submit_performance_feedback(f.employee_id)));
drop policy if exists "employee_feedback_ratings_update" on public.employee_feedback_ratings;
create policy "employee_feedback_ratings_update" on public.employee_feedback_ratings for update to authenticated using (exists (select 1 from public.employee_performance_feedback f where f.id = feedback_id and (public.has_permission('permission.performance.feedback.manage') or public.can_submit_performance_feedback(f.employee_id)))) with check (exists (select 1 from public.employee_performance_feedback f where f.id = feedback_id and (public.has_permission('permission.performance.feedback.manage') or public.can_submit_performance_feedback(f.employee_id))));
drop policy if exists "employee_feedback_ratings_delete" on public.employee_feedback_ratings;
create policy "employee_feedback_ratings_delete" on public.employee_feedback_ratings for delete to authenticated using (public.has_role('role.admin'));

commit;
