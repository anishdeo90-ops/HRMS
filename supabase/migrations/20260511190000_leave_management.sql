-- Leave Management
-- Creates the Phase 5 HRMS leave foundation with helper-backed, fail-closed RLS.

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
            and $1 in (
              'permission.employee.view',
              'permission.employee.manage',
              'permission.employee.update_basic',
              'permission.organization.manage',
              'permission.department_approvers.manage',
              'permission.documents.view',
              'permission.documents.manage',
              'permission.attendance.check_in',
              'permission.attendance.view_self',
              'permission.attendance.view_team',
              'permission.attendance.manage',
              'permission.attendance.corrections.request',
              'permission.attendance.corrections.approve',
              'permission.shifts.view',
              'permission.shifts.manage',
              'permission.shifts.request',
              'permission.shifts.approve',
              'permission.overtime.view',
              'permission.overtime.manage',
              'permission.overtime.approve',
              'permission.leave.types.manage',
              'permission.leave.policies.manage',
              'permission.leave.allocations.manage',
              'permission.leave.view_self',
              'permission.leave.view_team',
              'permission.leave.apply',
              'permission.leave.approve',
              'permission.leave.cancel',
              'permission.leave.ledger.view',
              'permission.leave.reports.view'
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
              'permission.leave.reports.view'
            )
          )
          or (
            p.role = 'employee'
            and $1 in (
              'permission.employee.view',
              'permission.documents.view',
              'permission.attendance.check_in',
              'permission.attendance.view_self',
              'permission.attendance.corrections.request',
              'permission.shifts.view',
              'permission.shifts.request',
              'permission.overtime.view',
              'permission.leave.view_self',
              'permission.leave.apply',
              'permission.leave.cancel',
              'permission.leave.ledger.view'
            )
          )
          or (
            p.role = 'hod'
            and $1 in (
              'permission.employee.view',
              'permission.documents.view',
              'permission.attendance.check_in',
              'permission.attendance.view_self',
              'permission.attendance.view_team',
              'permission.attendance.corrections.request',
              'permission.attendance.corrections.approve',
              'permission.shifts.view',
              'permission.shifts.request',
              'permission.shifts.approve',
              'permission.overtime.view',
              'permission.overtime.approve',
              'permission.leave.view_self',
              'permission.leave.view_team',
              'permission.leave.apply',
              'permission.leave.approve',
              'permission.leave.cancel',
              'permission.leave.ledger.view',
              'permission.leave.reports.view'
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
        )
    )
  ), false);
$$;

alter table public.department_approvers drop constraint if exists department_approvers_approval_scope_check;
alter table public.department_approvers add constraint department_approvers_approval_scope_check
  check (approval_scope in ('employee_core', 'attendance_correction', 'shift_request', 'overtime', 'leave_application', 'compensatory_leave', 'leave_encashment'));

create or replace function public.can_manage_leave()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('permission.leave.types.manage')
      or public.has_permission('permission.leave.policies.manage')
      or public.has_permission('permission.leave.allocations.manage')
      or public.has_role('role.admin')
      or public.has_role('role.hr_manager');
$$;

create or replace function public.can_view_leave(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_leave()
      or coalesce((
        select (
            e.profile_id = auth.uid()
            and public.has_permission('permission.leave.view_self')
          )
          or exists (
            select 1
            from public.employees manager
            where manager.profile_id = auth.uid()
              and public.is_reporting_manager(manager.id, e.id)
              and public.has_permission('permission.leave.view_team')
          )
        from public.employees e
        where e.id = target_employee_id
      ), false);
$$;

create or replace function public.can_apply_leave(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_leave()
      or coalesce((
        select e.profile_id = auth.uid()
        from public.employees e
        where e.id = target_employee_id
          and public.has_permission('permission.leave.apply')
      ), false);
$$;

create or replace function public.can_approve_leave(target_employee_id uuid, approval_scope text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_leave()
      or coalesce((
        select exists (
          select 1
          from public.employees manager
          join public.employees target on public.is_reporting_manager(manager.id, target.id)
          where target.id = target_employee_id
            and manager.profile_id = auth.uid()
            and public.has_permission('permission.leave.approve')
            and approval_scope in ('leave_application', 'compensatory_leave', 'leave_encashment')
        )
      ), false)
      or coalesce((
        select exists (
          select 1
          from public.department_approvers da
          join public.employees target on target.department_id = da.department_id
          join public.employees approver on approver.id = da.approver_employee_id
          where target.id = target_employee_id
            and approver.profile_id = auth.uid()
            and da.is_active = true
            and da.approval_scope = approval_scope
            and public.has_permission('permission.leave.approve')
            and current_date >= da.effective_from
            and (da.effective_to is null or current_date <= da.effective_to)
        )
      ), false);
$$;

create table if not exists public.leave_types (
  key text primary key,
  label text not null,
  accrual text not null default 'none',
  carry_forward boolean not null default false,
  encashment boolean not null default false,
  negative_balance boolean not null default false,
  holiday_weekend_behavior text not null default 'exclude',
  approval_behavior text not null default 'approver_required',
  is_paid boolean not null default true,
  max_continuous_days numeric(8,2),
  requires_attachment_after_days numeric(8,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  check (accrual in ('none', 'monthly', 'quarterly', 'annual', 'manual')),
  check (holiday_weekend_behavior in ('include', 'exclude')),
  check (approval_behavior in ('none', 'approver_required')),
  check (max_continuous_days is null or max_continuous_days > 0),
  check (requires_attachment_after_days is null or requires_attachment_after_days > 0)
);

alter table public.leave_types add column if not exists label text;
alter table public.leave_types add column if not exists accrual text not null default 'none';
alter table public.leave_types add column if not exists carry_forward boolean not null default false;
alter table public.leave_types add column if not exists encashment boolean not null default false;
alter table public.leave_types add column if not exists negative_balance boolean not null default false;
alter table public.leave_types add column if not exists holiday_weekend_behavior text not null default 'exclude';
alter table public.leave_types add column if not exists approval_behavior text not null default 'approver_required';
alter table public.leave_types add column if not exists is_paid boolean not null default true;
alter table public.leave_types add column if not exists max_continuous_days numeric(8,2);
alter table public.leave_types add column if not exists requires_attachment_after_days numeric(8,2);
alter table public.leave_types add column if not exists is_active boolean not null default true;
alter table public.leave_types add column if not exists created_at timestamptz not null default now();
alter table public.leave_types add column if not exists updated_at timestamptz not null default now();
alter table public.leave_types add column if not exists created_by uuid references public.profiles(id) on delete set null;

create table if not exists public.leave_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.hr_companies(id) on delete cascade,
  name text not null,
  from_date date not null,
  to_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (company_id, from_date, to_date),
  check (to_date >= from_date)
);

create table if not exists public.leave_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.hr_companies(id) on delete cascade,
  name text not null,
  code text not null,
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (company_id, code),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.leave_policy_details (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.leave_policies(id) on delete cascade,
  leave_type_key text not null references public.leave_types(key) on delete restrict,
  annual_allocation numeric(8,2) not null default 0 check (annual_allocation >= 0),
  accrual_cadence text not null default 'annual' check (accrual_cadence in ('none', 'monthly', 'quarterly', 'annual', 'manual')),
  carry_forward_cap numeric(8,2) not null default 0 check (carry_forward_cap >= 0),
  encashment_cap numeric(8,2) not null default 0 check (encashment_cap >= 0),
  max_negative_balance numeric(8,2) not null default 0 check (max_negative_balance >= 0),
  min_application_days numeric(8,2) not null default 0.5 check (min_application_days > 0),
  max_application_days numeric(8,2) check (max_application_days is null or max_application_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (policy_id, leave_type_key)
);

create table if not exists public.leave_policy_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  policy_id uuid not null references public.leave_policies(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.leave_allocations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_period_id uuid not null references public.leave_periods(id) on delete restrict,
  leave_type_key text not null references public.leave_types(key) on delete restrict,
  allocated_days numeric(8,2) not null default 0 check (allocated_days >= 0),
  carried_forward_days numeric(8,2) not null default 0 check (carried_forward_days >= 0),
  expired_days numeric(8,2) not null default 0 check (expired_days >= 0),
  source text not null default 'manual' check (source in ('manual', 'policy', 'import', 'adjustment')),
  status text not null default 'approved' check (status in ('draft', 'submitted', 'approved', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (employee_id, leave_period_id, leave_type_key)
);

create table if not exists public.leave_applications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_key text not null references public.leave_types(key) on delete restrict,
  leave_period_id uuid references public.leave_periods(id) on delete set null,
  from_date date not null,
  to_date date not null,
  half_day boolean not null default false,
  half_day_date date,
  total_days numeric(8,2) not null check (total_days > 0),
  reason text,
  attachment_path text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  approver_employee_id uuid references public.employees(id) on delete set null,
  approver_comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (to_date >= from_date),
  check (half_day = false or half_day_date between from_date and to_date),
  check (status not in ('approved', 'rejected') or (approver_employee_id is not null and decided_at is not null))
);

create table if not exists public.leave_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_key text not null references public.leave_types(key) on delete restrict,
  leave_period_id uuid references public.leave_periods(id) on delete set null,
  application_id uuid references public.leave_applications(id) on delete set null,
  allocation_id uuid references public.leave_allocations(id) on delete set null,
  entry_type text not null check (entry_type in ('allocation', 'carry_forward', 'application', 'cancellation', 'encashment', 'expiry', 'adjustment', 'compensatory_credit')),
  days_delta numeric(8,2) not null check (days_delta <> 0),
  balance_after numeric(8,2),
  posting_date date not null default current_date,
  source_type text not null,
  source_id uuid not null,
  source_action text not null,
  is_reversal boolean not null default false,
  reversal_of_id uuid references public.leave_ledger_entries(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (source_type, source_id, source_action)
);

create table if not exists public.holiday_lists (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.hr_companies(id) on delete cascade,
  branch_id uuid references public.hr_branches(id) on delete set null,
  name text not null,
  code text not null,
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (company_id, code),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.holiday_list_dates (
  id uuid primary key default gen_random_uuid(),
  holiday_list_id uuid not null references public.holiday_lists(id) on delete cascade,
  holiday_date date not null,
  description text,
  is_optional boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (holiday_list_id, holiday_date)
);

create table if not exists public.leave_block_lists (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.hr_companies(id) on delete cascade,
  branch_id uuid references public.hr_branches(id) on delete set null,
  department_id uuid references public.hr_departments(id) on delete set null,
  name text not null,
  code text not null,
  reason text,
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (company_id, code),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.leave_block_list_dates (
  id uuid primary key default gen_random_uuid(),
  block_list_id uuid not null references public.leave_block_lists(id) on delete cascade,
  block_date date not null,
  leave_type_key text references public.leave_types(key) on delete restrict,
  reason text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (block_list_id, block_date, leave_type_key)
);

create table if not exists public.compensatory_leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_key text not null references public.leave_types(key) on delete restrict,
  attendance_day_id uuid references public.attendance_days(id) on delete set null,
  work_date date not null,
  requested_days numeric(8,2) not null check (requested_days > 0),
  approved_days numeric(8,2) check (approved_days is null or approved_days > 0),
  reason text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  approver_employee_id uuid references public.employees(id) on delete set null,
  approver_comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (status not in ('approved', 'rejected') or (approver_employee_id is not null and decided_at is not null))
);

create table if not exists public.leave_encashments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_key text not null references public.leave_types(key) on delete restrict,
  leave_period_id uuid references public.leave_periods(id) on delete set null,
  requested_days numeric(8,2) not null check (requested_days > 0),
  approved_days numeric(8,2) check (approved_days is null or approved_days > 0),
  amount numeric(12,2),
  reason text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  approver_employee_id uuid references public.employees(id) on delete set null,
  approver_comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (amount is null or amount >= 0),
  check (status not in ('approved', 'rejected') or (approver_employee_id is not null and decided_at is not null))
);

create index if not exists idx_leave_periods_company on public.leave_periods(company_id);
create index if not exists idx_leave_policies_company on public.leave_policies(company_id);
create index if not exists idx_leave_policy_details_policy on public.leave_policy_details(policy_id);
create index if not exists idx_leave_policy_assignments_employee on public.leave_policy_assignments(employee_id, effective_from, effective_to);
create index if not exists idx_leave_allocations_employee on public.leave_allocations(employee_id, leave_period_id, leave_type_key);
create index if not exists idx_leave_applications_employee_dates on public.leave_applications(employee_id, from_date, to_date);
create index if not exists idx_leave_applications_status on public.leave_applications(status);
create index if not exists idx_leave_applications_approver_status on public.leave_applications(approver_employee_id, status);
create index if not exists idx_leave_ledger_employee_type_period on public.leave_ledger_entries(employee_id, leave_type_key, leave_period_id, posting_date);
create index if not exists idx_holiday_list_dates_date on public.holiday_list_dates(holiday_date);
create index if not exists idx_leave_block_list_dates_date on public.leave_block_list_dates(block_date);
create index if not exists idx_compensatory_employee_status on public.compensatory_leave_requests(employee_id, status);
create index if not exists idx_leave_encashments_employee_status on public.leave_encashments(employee_id, status);

drop trigger if exists leave_types_updated_at on public.leave_types;
create trigger leave_types_updated_at before update on public.leave_types for each row execute function public.touch_updated_at();
drop trigger if exists leave_periods_updated_at on public.leave_periods;
create trigger leave_periods_updated_at before update on public.leave_periods for each row execute function public.touch_updated_at();
drop trigger if exists leave_policies_updated_at on public.leave_policies;
create trigger leave_policies_updated_at before update on public.leave_policies for each row execute function public.touch_updated_at();
drop trigger if exists leave_policy_details_updated_at on public.leave_policy_details;
create trigger leave_policy_details_updated_at before update on public.leave_policy_details for each row execute function public.touch_updated_at();
drop trigger if exists leave_policy_assignments_updated_at on public.leave_policy_assignments;
create trigger leave_policy_assignments_updated_at before update on public.leave_policy_assignments for each row execute function public.touch_updated_at();
drop trigger if exists leave_allocations_updated_at on public.leave_allocations;
create trigger leave_allocations_updated_at before update on public.leave_allocations for each row execute function public.touch_updated_at();
drop trigger if exists leave_applications_updated_at on public.leave_applications;
create trigger leave_applications_updated_at before update on public.leave_applications for each row execute function public.touch_updated_at();
drop trigger if exists holiday_lists_updated_at on public.holiday_lists;
create trigger holiday_lists_updated_at before update on public.holiday_lists for each row execute function public.touch_updated_at();
drop trigger if exists leave_block_lists_updated_at on public.leave_block_lists;
create trigger leave_block_lists_updated_at before update on public.leave_block_lists for each row execute function public.touch_updated_at();
drop trigger if exists compensatory_leave_requests_updated_at on public.compensatory_leave_requests;
create trigger compensatory_leave_requests_updated_at before update on public.compensatory_leave_requests for each row execute function public.touch_updated_at();
drop trigger if exists leave_encashments_updated_at on public.leave_encashments;
create trigger leave_encashments_updated_at before update on public.leave_encashments for each row execute function public.touch_updated_at();

alter table public.leave_types enable row level security;
alter table public.leave_periods enable row level security;
alter table public.leave_policies enable row level security;
alter table public.leave_policy_details enable row level security;
alter table public.leave_policy_assignments enable row level security;
alter table public.leave_allocations enable row level security;
alter table public.leave_applications enable row level security;
alter table public.leave_ledger_entries enable row level security;
alter table public.holiday_lists enable row level security;
alter table public.holiday_list_dates enable row level security;
alter table public.leave_block_lists enable row level security;
alter table public.leave_block_list_dates enable row level security;
alter table public.compensatory_leave_requests enable row level security;
alter table public.leave_encashments enable row level security;

drop policy if exists "leave_types_select" on public.leave_types;
create policy "leave_types_select" on public.leave_types for select to authenticated
  using (public.has_permission('permission.leave.view_self') or public.can_manage_leave());
drop policy if exists "leave_types_insert" on public.leave_types;
create policy "leave_types_insert" on public.leave_types for insert to authenticated
  with check (public.has_permission('permission.leave.types.manage'));
drop policy if exists "leave_types_update" on public.leave_types;
create policy "leave_types_update" on public.leave_types for update to authenticated
  using (public.has_permission('permission.leave.types.manage'))
  with check (public.has_permission('permission.leave.types.manage'));
drop policy if exists "leave_types_delete" on public.leave_types;
create policy "leave_types_delete" on public.leave_types for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "leave_periods_select" on public.leave_periods;
create policy "leave_periods_select" on public.leave_periods for select to authenticated
  using (public.has_permission('permission.leave.view_self') or public.can_manage_leave());
drop policy if exists "leave_periods_insert" on public.leave_periods;
create policy "leave_periods_insert" on public.leave_periods for insert to authenticated
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "leave_periods_update" on public.leave_periods;
create policy "leave_periods_update" on public.leave_periods for update to authenticated
  using (public.has_permission('permission.leave.policies.manage'))
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "leave_periods_delete" on public.leave_periods;
create policy "leave_periods_delete" on public.leave_periods for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "leave_policies_select" on public.leave_policies;
create policy "leave_policies_select" on public.leave_policies for select to authenticated
  using (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "leave_policies_insert" on public.leave_policies;
create policy "leave_policies_insert" on public.leave_policies for insert to authenticated
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "leave_policies_update" on public.leave_policies;
create policy "leave_policies_update" on public.leave_policies for update to authenticated
  using (public.has_permission('permission.leave.policies.manage'))
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "leave_policies_delete" on public.leave_policies;
create policy "leave_policies_delete" on public.leave_policies for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "leave_policy_details_select" on public.leave_policy_details;
create policy "leave_policy_details_select" on public.leave_policy_details for select to authenticated
  using (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "leave_policy_details_insert" on public.leave_policy_details;
create policy "leave_policy_details_insert" on public.leave_policy_details for insert to authenticated
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "leave_policy_details_update" on public.leave_policy_details;
create policy "leave_policy_details_update" on public.leave_policy_details for update to authenticated
  using (public.has_permission('permission.leave.policies.manage'))
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "leave_policy_details_delete" on public.leave_policy_details;
create policy "leave_policy_details_delete" on public.leave_policy_details for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "leave_policy_assignments_select" on public.leave_policy_assignments;
create policy "leave_policy_assignments_select" on public.leave_policy_assignments for select to authenticated
  using (public.can_view_leave(employee_id));
drop policy if exists "leave_policy_assignments_insert" on public.leave_policy_assignments;
create policy "leave_policy_assignments_insert" on public.leave_policy_assignments for insert to authenticated
  with check (public.has_permission('permission.leave.allocations.manage'));
drop policy if exists "leave_policy_assignments_update" on public.leave_policy_assignments;
create policy "leave_policy_assignments_update" on public.leave_policy_assignments for update to authenticated
  using (public.has_permission('permission.leave.allocations.manage'))
  with check (public.has_permission('permission.leave.allocations.manage'));
drop policy if exists "leave_policy_assignments_delete" on public.leave_policy_assignments;
create policy "leave_policy_assignments_delete" on public.leave_policy_assignments for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "leave_allocations_select" on public.leave_allocations;
create policy "leave_allocations_select" on public.leave_allocations for select to authenticated
  using (public.can_view_leave(employee_id));
drop policy if exists "leave_allocations_insert" on public.leave_allocations;
create policy "leave_allocations_insert" on public.leave_allocations for insert to authenticated
  with check (public.has_permission('permission.leave.allocations.manage'));
drop policy if exists "leave_allocations_update" on public.leave_allocations;
create policy "leave_allocations_update" on public.leave_allocations for update to authenticated
  using (public.has_permission('permission.leave.allocations.manage'))
  with check (public.has_permission('permission.leave.allocations.manage'));
drop policy if exists "leave_allocations_delete" on public.leave_allocations;
create policy "leave_allocations_delete" on public.leave_allocations for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "leave_applications_select" on public.leave_applications;
create policy "leave_applications_select" on public.leave_applications for select to authenticated
  using (public.can_view_leave(employee_id) or public.can_approve_leave(employee_id, 'leave_application'));
drop policy if exists "leave_applications_insert" on public.leave_applications;
create policy "leave_applications_insert" on public.leave_applications for insert to authenticated
  with check (public.can_apply_leave(employee_id) and status in ('draft', 'submitted'));
drop policy if exists "leave_applications_update" on public.leave_applications;
create policy "leave_applications_update" on public.leave_applications for update to authenticated
  using (public.can_apply_leave(employee_id) or public.can_approve_leave(employee_id, 'leave_application') or public.can_manage_leave())
  with check (public.can_apply_leave(employee_id) or public.can_approve_leave(employee_id, 'leave_application') or public.can_manage_leave());
drop policy if exists "leave_applications_delete" on public.leave_applications;
create policy "leave_applications_delete" on public.leave_applications for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "leave_ledger_entries_select" on public.leave_ledger_entries;
create policy "leave_ledger_entries_select" on public.leave_ledger_entries for select to authenticated
  using (public.can_view_leave(employee_id) or public.has_permission('permission.leave.ledger.view'));
drop policy if exists "leave_ledger_entries_insert" on public.leave_ledger_entries;
create policy "leave_ledger_entries_insert" on public.leave_ledger_entries for insert to authenticated
  with check (public.can_manage_leave());

drop policy if exists "holiday_lists_select" on public.holiday_lists;
create policy "holiday_lists_select" on public.holiday_lists for select to authenticated
  using (public.has_permission('permission.leave.view_self') or public.can_manage_leave());
drop policy if exists "holiday_lists_insert" on public.holiday_lists;
create policy "holiday_lists_insert" on public.holiday_lists for insert to authenticated
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "holiday_lists_update" on public.holiday_lists;
create policy "holiday_lists_update" on public.holiday_lists for update to authenticated
  using (public.has_permission('permission.leave.policies.manage'))
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "holiday_lists_delete" on public.holiday_lists;
create policy "holiday_lists_delete" on public.holiday_lists for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "holiday_list_dates_select" on public.holiday_list_dates;
create policy "holiday_list_dates_select" on public.holiday_list_dates for select to authenticated
  using (public.has_permission('permission.leave.view_self') or public.can_manage_leave());
drop policy if exists "holiday_list_dates_insert" on public.holiday_list_dates;
create policy "holiday_list_dates_insert" on public.holiday_list_dates for insert to authenticated
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "holiday_list_dates_update" on public.holiday_list_dates;
create policy "holiday_list_dates_update" on public.holiday_list_dates for update to authenticated
  using (public.has_permission('permission.leave.policies.manage'))
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "holiday_list_dates_delete" on public.holiday_list_dates;
create policy "holiday_list_dates_delete" on public.holiday_list_dates for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "leave_block_lists_select" on public.leave_block_lists;
create policy "leave_block_lists_select" on public.leave_block_lists for select to authenticated
  using (public.has_permission('permission.leave.view_self') or public.can_manage_leave());
drop policy if exists "leave_block_lists_insert" on public.leave_block_lists;
create policy "leave_block_lists_insert" on public.leave_block_lists for insert to authenticated
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "leave_block_lists_update" on public.leave_block_lists;
create policy "leave_block_lists_update" on public.leave_block_lists for update to authenticated
  using (public.has_permission('permission.leave.policies.manage'))
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "leave_block_lists_delete" on public.leave_block_lists;
create policy "leave_block_lists_delete" on public.leave_block_lists for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "leave_block_list_dates_select" on public.leave_block_list_dates;
create policy "leave_block_list_dates_select" on public.leave_block_list_dates for select to authenticated
  using (public.has_permission('permission.leave.view_self') or public.can_manage_leave());
drop policy if exists "leave_block_list_dates_insert" on public.leave_block_list_dates;
create policy "leave_block_list_dates_insert" on public.leave_block_list_dates for insert to authenticated
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "leave_block_list_dates_update" on public.leave_block_list_dates;
create policy "leave_block_list_dates_update" on public.leave_block_list_dates for update to authenticated
  using (public.has_permission('permission.leave.policies.manage'))
  with check (public.has_permission('permission.leave.policies.manage'));
drop policy if exists "leave_block_list_dates_delete" on public.leave_block_list_dates;
create policy "leave_block_list_dates_delete" on public.leave_block_list_dates for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "compensatory_leave_requests_select" on public.compensatory_leave_requests;
create policy "compensatory_leave_requests_select" on public.compensatory_leave_requests for select to authenticated
  using (public.can_view_leave(employee_id) or public.can_approve_leave(employee_id, 'compensatory_leave'));
drop policy if exists "compensatory_leave_requests_insert" on public.compensatory_leave_requests;
create policy "compensatory_leave_requests_insert" on public.compensatory_leave_requests for insert to authenticated
  with check (public.can_apply_leave(employee_id));
drop policy if exists "compensatory_leave_requests_update" on public.compensatory_leave_requests;
create policy "compensatory_leave_requests_update" on public.compensatory_leave_requests for update to authenticated
  using (public.can_apply_leave(employee_id) or public.can_approve_leave(employee_id, 'compensatory_leave') or public.can_manage_leave())
  with check (public.can_apply_leave(employee_id) or public.can_approve_leave(employee_id, 'compensatory_leave') or public.can_manage_leave());
drop policy if exists "compensatory_leave_requests_delete" on public.compensatory_leave_requests;
create policy "compensatory_leave_requests_delete" on public.compensatory_leave_requests for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "leave_encashments_select" on public.leave_encashments;
create policy "leave_encashments_select" on public.leave_encashments for select to authenticated
  using (public.can_view_leave(employee_id) or public.can_approve_leave(employee_id, 'leave_encashment'));
drop policy if exists "leave_encashments_insert" on public.leave_encashments;
create policy "leave_encashments_insert" on public.leave_encashments for insert to authenticated
  with check (public.can_apply_leave(employee_id));
drop policy if exists "leave_encashments_update" on public.leave_encashments;
create policy "leave_encashments_update" on public.leave_encashments for update to authenticated
  using (public.can_apply_leave(employee_id) or public.can_approve_leave(employee_id, 'leave_encashment') or public.can_manage_leave())
  with check (public.can_apply_leave(employee_id) or public.can_approve_leave(employee_id, 'leave_encashment') or public.can_manage_leave());
drop policy if exists "leave_encashments_delete" on public.leave_encashments;
create policy "leave_encashments_delete" on public.leave_encashments for delete to authenticated
  using (public.has_role('role.admin'));

commit;
