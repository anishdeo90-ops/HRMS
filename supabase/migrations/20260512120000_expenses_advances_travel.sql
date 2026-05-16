-- Expenses, Advances, Travel, and Vehicles
-- Creates the Phase 4 HRMS finance foundation with helper-backed, fail-closed RLS.

begin;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'profiles'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%role%'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'admin',
    'hr_manager',
    'hr_user',
    'recruiter',
    'hod',
    'candidate',
    'employee',
    'leave_approver',
    'expense_approver',
    'finance_manager',
    'interviewer',
    'payroll_manager'
  ));

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
              'permission.leave.reports.view',
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
              'permission.vehicles.manage'
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
              'permission.vehicles.manage'
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
              'permission.leave.ledger.view',
              'permission.expenses.view_self',
              'permission.employee_advances.view_self',
              'permission.travel_requests.view_self',
              'permission.vehicles.view_self'
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
              'permission.leave.reports.view',
              'permission.expenses.view_self',
              'permission.expenses.view_team',
              'permission.expenses.approve',
              'permission.employee_advances.view_self',
              'permission.employee_advances.approve',
              'permission.travel_requests.view_self',
              'permission.travel_requests.approve'
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
              'permission.vehicles.manage'
            )
          )
        )
    )
  ), false);
$$;

alter table public.department_approvers drop constraint if exists department_approvers_approval_scope_check;
alter table public.department_approvers add constraint department_approvers_approval_scope_check
  check (approval_scope in ('employee_core', 'attendance_correction', 'shift_request', 'overtime', 'leave_application', 'compensatory_leave', 'leave_encashment', 'expense_claim', 'employee_advance', 'travel_request'));

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  where e.profile_id = auth.uid()
    and e.is_active = true
  limit 1;
$$;

create or replace function public.can_manage_expenses()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('permission.expenses.manage')
      or public.has_permission('permission.employee_advances.manage')
      or public.has_permission('permission.travel_requests.manage')
      or public.has_role('role.finance_manager')
      or public.has_role('role.admin')
      or public.has_role('role.hr_manager');
$$;

create or replace function public.can_view_expense_record(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_expenses()
      or coalesce((
        select (
            e.profile_id = auth.uid()
            and (
              public.has_permission('permission.expenses.view_self')
              or public.has_permission('permission.employee_advances.view_self')
              or public.has_permission('permission.travel_requests.view_self')
              or public.has_permission('permission.vehicles.view_self')
            )
          )
          or exists (
            select 1
            from public.employees manager
            where manager.profile_id = auth.uid()
              and public.is_reporting_manager(manager.id, e.id)
              and public.has_permission('permission.expenses.view_team')
          )
        from public.employees e
        where e.id = target_employee_id
      ), false);
$$;

create or replace function public.can_approve_expense_record(target_employee_id uuid, approval_scope text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_expenses()
      or coalesce((
        select exists (
          select 1
          from public.employees manager
          join public.employees target on public.is_reporting_manager(manager.id, target.id)
          where target.id = target_employee_id
            and manager.profile_id = auth.uid()
            and (
              (approval_scope = 'expense_claim' and public.has_permission('permission.expenses.approve'))
              or (approval_scope = 'employee_advance' and public.has_permission('permission.employee_advances.approve'))
              or (approval_scope = 'travel_request' and public.has_permission('permission.travel_requests.approve'))
            )
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
            and current_date >= da.effective_from
            and (da.effective_to is null or current_date <= da.effective_to)
        )
      ), false);
$$;

create or replace function public.can_create_expense_record(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_expenses()
      or coalesce((
        select e.profile_id = auth.uid()
        from public.employees e
        where e.id = target_employee_id
          and e.is_active = true
      ), false);
$$;

create or replace function public.can_manage_expense_attachment(target_employee_id uuid, approval_scope text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_create_expense_record(target_employee_id)
      or public.can_approve_expense_record(target_employee_id, approval_scope);
$$;

create table if not exists public.expense_claim_types (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  requires_receipt boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (code),
  unique (name)
);

create table if not exists public.expense_claims (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  claim_type_id uuid references public.expense_claim_types(id) on delete set null,
  title text not null,
  expense_date date not null,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  currency text not null default 'INR',
  description text,
  attachment_path text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled', 'paid')),
  approver_employee_id uuid references public.employees(id) on delete set null,
  approver_comment text,
  decided_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (status not in ('approved', 'rejected') or (approver_employee_id is not null and decided_at is not null))
);

create table if not exists public.expense_claim_items (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.expense_claims(id) on delete cascade,
  claim_type_id uuid references public.expense_claim_types(id) on delete set null,
  expense_date date not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'INR',
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.employee_advances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  requested_amount numeric(12,2) not null check (requested_amount > 0),
  approved_amount numeric(12,2) check (approved_amount is null or approved_amount >= 0),
  required_date date,
  purpose text not null,
  settlement_note text,
  attachment_path text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled', 'settled')),
  approver_employee_id uuid references public.employees(id) on delete set null,
  approver_comment text,
  decided_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (status not in ('approved', 'rejected') or (approver_employee_id is not null and decided_at is not null))
);

create table if not exists public.travel_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  destination text not null,
  purpose text not null,
  start_date date not null,
  end_date date not null,
  estimated_amount numeric(12,2) not null default 0 check (estimated_amount >= 0),
  currency text not null default 'INR',
  notes text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled', 'completed')),
  approver_employee_id uuid references public.employees(id) on delete set null,
  approver_comment text,
  decided_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (end_date >= start_date),
  check (status not in ('approved', 'rejected') or (approver_employee_id is not null and decided_at is not null))
);

create table if not exists public.travel_itineraries (
  id uuid primary key default gen_random_uuid(),
  travel_request_id uuid not null references public.travel_requests(id) on delete cascade,
  travel_date date not null,
  from_location text not null,
  to_location text not null,
  mode text not null default 'flight' check (mode in ('flight', 'train', 'bus', 'car', 'other')),
  estimated_amount numeric(12,2) not null default 0 check (estimated_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.vehicle_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  vehicle_number text not null,
  travel_date date not null,
  odometer_start integer not null check (odometer_start >= 0),
  odometer_end integer check (odometer_end is null or odometer_end >= odometer_start),
  route text,
  purpose text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.vehicle_services (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  vehicle_number text not null,
  service_date date not null,
  vendor text,
  amount numeric(12,2) not null check (amount > 0),
  notes text,
  attachment_path text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_expense_claims_employee on public.expense_claims(employee_id);
create index if not exists idx_expense_claims_status on public.expense_claims(status);
create index if not exists idx_expense_claim_items_claim on public.expense_claim_items(claim_id);
create index if not exists idx_employee_advances_employee on public.employee_advances(employee_id);
create index if not exists idx_employee_advances_status on public.employee_advances(status);
create index if not exists idx_travel_requests_employee on public.travel_requests(employee_id);
create index if not exists idx_travel_requests_status on public.travel_requests(status);
create index if not exists idx_travel_itineraries_request on public.travel_itineraries(travel_request_id);
create index if not exists idx_vehicle_logs_employee on public.vehicle_logs(employee_id);
create index if not exists idx_vehicle_services_employee on public.vehicle_services(employee_id);

drop trigger if exists expense_claim_types_updated_at on public.expense_claim_types;
create trigger expense_claim_types_updated_at before update on public.expense_claim_types for each row execute function public.touch_updated_at();
drop trigger if exists expense_claims_updated_at on public.expense_claims;
create trigger expense_claims_updated_at before update on public.expense_claims for each row execute function public.touch_updated_at();
drop trigger if exists expense_claim_items_updated_at on public.expense_claim_items;
create trigger expense_claim_items_updated_at before update on public.expense_claim_items for each row execute function public.touch_updated_at();
drop trigger if exists employee_advances_updated_at on public.employee_advances;
create trigger employee_advances_updated_at before update on public.employee_advances for each row execute function public.touch_updated_at();
drop trigger if exists travel_requests_updated_at on public.travel_requests;
create trigger travel_requests_updated_at before update on public.travel_requests for each row execute function public.touch_updated_at();
drop trigger if exists travel_itineraries_updated_at on public.travel_itineraries;
create trigger travel_itineraries_updated_at before update on public.travel_itineraries for each row execute function public.touch_updated_at();
drop trigger if exists vehicle_logs_updated_at on public.vehicle_logs;
create trigger vehicle_logs_updated_at before update on public.vehicle_logs for each row execute function public.touch_updated_at();
drop trigger if exists vehicle_services_updated_at on public.vehicle_services;
create trigger vehicle_services_updated_at before update on public.vehicle_services for each row execute function public.touch_updated_at();

insert into storage.buckets (id, name, public, file_size_limit)
values ('expense-attachments', 'expense-attachments', false, 52428800)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

alter table public.expense_claim_types enable row level security;
alter table public.expense_claims enable row level security;
alter table public.expense_claim_items enable row level security;
alter table public.employee_advances enable row level security;
alter table public.travel_requests enable row level security;
alter table public.travel_itineraries enable row level security;
alter table public.vehicle_logs enable row level security;
alter table public.vehicle_services enable row level security;

drop policy if exists "expense_claim_types_select" on public.expense_claim_types;
create policy "expense_claim_types_select" on public.expense_claim_types for select to authenticated
  using (public.has_permission('permission.expenses.view_self') or public.has_permission('permission.expense_claim_types.manage') or public.can_manage_expenses());
drop policy if exists "expense_claim_types_insert" on public.expense_claim_types;
create policy "expense_claim_types_insert" on public.expense_claim_types for insert to authenticated
  with check (public.has_permission('permission.expense_claim_types.manage') or public.can_manage_expenses());
drop policy if exists "expense_claim_types_update" on public.expense_claim_types;
create policy "expense_claim_types_update" on public.expense_claim_types for update to authenticated
  using (public.has_permission('permission.expense_claim_types.manage') or public.can_manage_expenses())
  with check (public.has_permission('permission.expense_claim_types.manage') or public.can_manage_expenses());
drop policy if exists "expense_claim_types_delete" on public.expense_claim_types;
create policy "expense_claim_types_delete" on public.expense_claim_types for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "expense_claims_select" on public.expense_claims;
create policy "expense_claims_select" on public.expense_claims for select to authenticated
  using (public.can_view_expense_record(employee_id) or public.can_approve_expense_record(employee_id, 'expense_claim'));
drop policy if exists "expense_claims_insert" on public.expense_claims;
create policy "expense_claims_insert" on public.expense_claims for insert to authenticated
  with check (public.can_create_expense_record(employee_id) and status in ('draft', 'submitted'));
drop policy if exists "expense_claims_update" on public.expense_claims;
create policy "expense_claims_update" on public.expense_claims for update to authenticated
  using (public.can_create_expense_record(employee_id) or public.can_approve_expense_record(employee_id, 'expense_claim') or public.can_manage_expenses())
  with check (public.can_create_expense_record(employee_id) or public.can_approve_expense_record(employee_id, 'expense_claim') or public.can_manage_expenses());
drop policy if exists "expense_claims_delete" on public.expense_claims;
create policy "expense_claims_delete" on public.expense_claims for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "expense_claim_items_select" on public.expense_claim_items;
create policy "expense_claim_items_select" on public.expense_claim_items for select to authenticated
  using (exists (select 1 from public.expense_claims c where c.id = claim_id and (public.can_view_expense_record(c.employee_id) or public.can_approve_expense_record(c.employee_id, 'expense_claim'))));
drop policy if exists "expense_claim_items_insert" on public.expense_claim_items;
create policy "expense_claim_items_insert" on public.expense_claim_items for insert to authenticated
  with check (exists (select 1 from public.expense_claims c where c.id = claim_id and public.can_create_expense_record(c.employee_id)));
drop policy if exists "expense_claim_items_update" on public.expense_claim_items;
create policy "expense_claim_items_update" on public.expense_claim_items for update to authenticated
  using (exists (select 1 from public.expense_claims c where c.id = claim_id and public.can_create_expense_record(c.employee_id)))
  with check (exists (select 1 from public.expense_claims c where c.id = claim_id and public.can_create_expense_record(c.employee_id)));
drop policy if exists "expense_claim_items_delete" on public.expense_claim_items;
create policy "expense_claim_items_delete" on public.expense_claim_items for delete to authenticated
  using (exists (select 1 from public.expense_claims c where c.id = claim_id and (public.can_create_expense_record(c.employee_id) or public.has_role('role.admin'))));

drop policy if exists "employee_advances_select" on public.employee_advances;
create policy "employee_advances_select" on public.employee_advances for select to authenticated
  using (public.can_view_expense_record(employee_id) or public.can_approve_expense_record(employee_id, 'employee_advance'));
drop policy if exists "employee_advances_insert" on public.employee_advances;
create policy "employee_advances_insert" on public.employee_advances for insert to authenticated
  with check (public.can_create_expense_record(employee_id) and status in ('draft', 'submitted'));
drop policy if exists "employee_advances_update" on public.employee_advances;
create policy "employee_advances_update" on public.employee_advances for update to authenticated
  using (public.can_create_expense_record(employee_id) or public.can_approve_expense_record(employee_id, 'employee_advance') or public.can_manage_expenses())
  with check (public.can_create_expense_record(employee_id) or public.can_approve_expense_record(employee_id, 'employee_advance') or public.can_manage_expenses());
drop policy if exists "employee_advances_delete" on public.employee_advances;
create policy "employee_advances_delete" on public.employee_advances for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "travel_requests_select" on public.travel_requests;
create policy "travel_requests_select" on public.travel_requests for select to authenticated
  using (public.can_view_expense_record(employee_id) or public.can_approve_expense_record(employee_id, 'travel_request'));
drop policy if exists "travel_requests_insert" on public.travel_requests;
create policy "travel_requests_insert" on public.travel_requests for insert to authenticated
  with check (public.can_create_expense_record(employee_id) and status in ('draft', 'submitted'));
drop policy if exists "travel_requests_update" on public.travel_requests;
create policy "travel_requests_update" on public.travel_requests for update to authenticated
  using (public.can_create_expense_record(employee_id) or public.can_approve_expense_record(employee_id, 'travel_request') or public.can_manage_expenses())
  with check (public.can_create_expense_record(employee_id) or public.can_approve_expense_record(employee_id, 'travel_request') or public.can_manage_expenses());
drop policy if exists "travel_requests_delete" on public.travel_requests;
create policy "travel_requests_delete" on public.travel_requests for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "travel_itineraries_select" on public.travel_itineraries;
create policy "travel_itineraries_select" on public.travel_itineraries for select to authenticated
  using (exists (select 1 from public.travel_requests tr where tr.id = travel_request_id and (public.can_view_expense_record(tr.employee_id) or public.can_approve_expense_record(tr.employee_id, 'travel_request'))));
drop policy if exists "travel_itineraries_insert" on public.travel_itineraries;
create policy "travel_itineraries_insert" on public.travel_itineraries for insert to authenticated
  with check (exists (select 1 from public.travel_requests tr where tr.id = travel_request_id and public.can_create_expense_record(tr.employee_id)));
drop policy if exists "travel_itineraries_update" on public.travel_itineraries;
create policy "travel_itineraries_update" on public.travel_itineraries for update to authenticated
  using (exists (select 1 from public.travel_requests tr where tr.id = travel_request_id and public.can_create_expense_record(tr.employee_id)))
  with check (exists (select 1 from public.travel_requests tr where tr.id = travel_request_id and public.can_create_expense_record(tr.employee_id)));
drop policy if exists "travel_itineraries_delete" on public.travel_itineraries;
create policy "travel_itineraries_delete" on public.travel_itineraries for delete to authenticated
  using (exists (select 1 from public.travel_requests tr where tr.id = travel_request_id and (public.can_create_expense_record(tr.employee_id) or public.has_role('role.admin'))));

drop policy if exists "vehicle_logs_select" on public.vehicle_logs;
create policy "vehicle_logs_select" on public.vehicle_logs for select to authenticated
  using (public.can_view_expense_record(employee_id) or public.can_manage_expenses());
drop policy if exists "vehicle_logs_insert" on public.vehicle_logs;
create policy "vehicle_logs_insert" on public.vehicle_logs for insert to authenticated
  with check (public.can_create_expense_record(employee_id) and public.has_permission('permission.vehicles.view_self') or public.has_permission('permission.vehicles.manage'));
drop policy if exists "vehicle_logs_update" on public.vehicle_logs;
create policy "vehicle_logs_update" on public.vehicle_logs for update to authenticated
  using (public.can_create_expense_record(employee_id) or public.has_permission('permission.vehicles.manage') or public.can_manage_expenses())
  with check (public.can_create_expense_record(employee_id) or public.has_permission('permission.vehicles.manage') or public.can_manage_expenses());
drop policy if exists "vehicle_logs_delete" on public.vehicle_logs;
create policy "vehicle_logs_delete" on public.vehicle_logs for delete to authenticated
  using (public.has_role('role.admin') or public.has_permission('permission.vehicles.manage'));

drop policy if exists "vehicle_services_select" on public.vehicle_services;
create policy "vehicle_services_select" on public.vehicle_services for select to authenticated
  using (public.can_view_expense_record(employee_id) or public.can_manage_expenses());
drop policy if exists "vehicle_services_insert" on public.vehicle_services;
create policy "vehicle_services_insert" on public.vehicle_services for insert to authenticated
  with check (public.can_create_expense_record(employee_id) and public.has_permission('permission.vehicles.view_self') or public.has_permission('permission.vehicles.manage'));
drop policy if exists "vehicle_services_update" on public.vehicle_services;
create policy "vehicle_services_update" on public.vehicle_services for update to authenticated
  using (public.can_create_expense_record(employee_id) or public.has_permission('permission.vehicles.manage') or public.can_manage_expenses())
  with check (public.can_create_expense_record(employee_id) or public.has_permission('permission.vehicles.manage') or public.can_manage_expenses());
drop policy if exists "vehicle_services_delete" on public.vehicle_services;
create policy "vehicle_services_delete" on public.vehicle_services for delete to authenticated
  using (public.has_role('role.admin') or public.has_permission('permission.vehicles.manage'));

drop policy if exists "expense_attachments_storage_select" on storage.objects;
create policy "expense_attachments_storage_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'expense-attachments'
    and (
      exists (select 1 from public.expense_claims c where c.attachment_path = storage.objects.name and (public.can_view_expense_record(c.employee_id) or public.can_approve_expense_record(c.employee_id, 'expense_claim')))
      or exists (select 1 from public.expense_claim_items ci join public.expense_claims c on c.id = ci.claim_id where ci.attachment_path = storage.objects.name and (public.can_view_expense_record(c.employee_id) or public.can_approve_expense_record(c.employee_id, 'expense_claim')))
      or exists (select 1 from public.employee_advances a where a.attachment_path = storage.objects.name and (public.can_view_expense_record(a.employee_id) or public.can_approve_expense_record(a.employee_id, 'employee_advance')))
      or exists (select 1 from public.vehicle_services vs where vs.attachment_path = storage.objects.name and public.can_view_expense_record(vs.employee_id))
    )
  );

drop policy if exists "expense_attachments_storage_insert" on storage.objects;
create policy "expense_attachments_storage_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'expense-attachments'
    and public.can_manage_expense_attachment(nullif(split_part(storage.objects.name, '/', 1), '')::uuid, coalesce(nullif(split_part(storage.objects.name, '/', 2), ''), 'expense_claim'))
  );

drop policy if exists "expense_attachments_storage_update" on storage.objects;
create policy "expense_attachments_storage_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'expense-attachments'
    and public.can_manage_expense_attachment(nullif(split_part(storage.objects.name, '/', 1), '')::uuid, coalesce(nullif(split_part(storage.objects.name, '/', 2), ''), 'expense_claim'))
  )
  with check (
    bucket_id = 'expense-attachments'
    and public.can_manage_expense_attachment(nullif(split_part(storage.objects.name, '/', 1), '')::uuid, coalesce(nullif(split_part(storage.objects.name, '/', 2), ''), 'expense_claim'))
  );

drop policy if exists "expense_attachments_storage_delete" on storage.objects;
create policy "expense_attachments_storage_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'expense-attachments'
    and public.can_manage_expense_attachment(nullif(split_part(storage.objects.name, '/', 1), '')::uuid, coalesce(nullif(split_part(storage.objects.name, '/', 2), ''), 'expense_claim'))
  );

commit;
