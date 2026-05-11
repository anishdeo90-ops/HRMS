-- Attendance, Check-ins, and Shifts
-- Creates the Phase 4 HRMS attendance foundation with helper-backed, fail-closed RLS.

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
              'permission.overtime.approve'
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
              'permission.overtime.manage'
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
              'permission.overtime.view'
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
              'permission.overtime.approve'
            )
          )
        )
    )
  ), false);
$$;

alter table public.department_approvers drop constraint if exists department_approvers_approval_scope_check;
alter table public.department_approvers add constraint department_approvers_approval_scope_check
  check (approval_scope in ('employee_core', 'attendance_correction', 'shift_request', 'overtime'));

create or replace function public.can_manage_attendance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('permission.attendance.manage')
      or public.has_role('role.admin')
      or public.has_role('role.hr_manager');
$$;

create or replace function public.can_manage_shifts()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('permission.shifts.manage')
      or public.has_role('role.admin')
      or public.has_role('role.hr_manager');
$$;

create or replace function public.can_view_attendance(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_attendance()
      or coalesce((
        select (
            e.profile_id = auth.uid()
            and public.has_permission('permission.attendance.view_self')
          )
          or exists (
            select 1
            from public.employees manager
            where manager.profile_id = auth.uid()
              and public.is_reporting_manager(manager.id, e.id)
              and public.has_permission('permission.attendance.view_team')
          )
        from public.employees e
        where e.id = target_employee_id
      ), false);
$$;

create or replace function public.can_check_in(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_attendance()
      or (
        public.has_permission('permission.attendance.check_in')
        and coalesce((
          select e.profile_id = auth.uid()
          from public.employees e
          where e.id = target_employee_id
        ), false)
      );
$$;

create or replace function public.can_approve_attendance(target_employee_id uuid, approval_scope text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_attendance()
      or coalesce((
        select exists (
          select 1
          from public.employees manager
          join public.employees target on public.is_reporting_manager(manager.id, target.id)
          where target.id = target_employee_id
            and manager.profile_id = auth.uid()
            and (
              (approval_scope = 'attendance_correction' and public.has_permission('permission.attendance.corrections.approve'))
              or (approval_scope = 'shift_request' and public.has_permission('permission.shifts.approve'))
              or (approval_scope = 'overtime' and public.has_permission('permission.overtime.approve'))
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

create table if not exists public.attendance_shift_types (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  start_time time not null,
  end_time time not null,
  grace_minutes integer not null default 0 check (grace_minutes >= 0),
  break_minutes integer not null default 0 check (break_minutes >= 0),
  is_night_shift boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (code),
  unique (name)
);

create table if not exists public.attendance_shift_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  company_id uuid references public.hr_companies(id) on delete cascade,
  branch_id uuid references public.hr_branches(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (code)
);

create table if not exists public.employee_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  shift_type_id uuid not null references public.attendance_shift_types(id) on delete restrict,
  location_id uuid references public.attendance_shift_locations(id) on delete set null,
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.shift_roster_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  shift_type_id uuid not null references public.attendance_shift_types(id) on delete restrict,
  location_id uuid references public.attendance_shift_locations(id) on delete set null,
  roster_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (employee_id, roster_date)
);

create table if not exists public.employee_check_ins (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  event_type text not null check (event_type in ('in', 'out')),
  check_time timestamptz not null default now(),
  source text not null default 'web' check (source in ('web', 'import', 'admin')),
  shift_type_id uuid references public.attendance_shift_types(id) on delete set null,
  location_id uuid references public.attendance_shift_locations(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.attendance_days (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_date date not null,
  status text not null default 'absent' check (status in ('present', 'absent', 'half_day', 'late', 'on_duty', 'holiday', 'weekly_off')),
  first_check_in timestamptz,
  last_check_out timestamptz,
  total_work_minutes integer not null default 0 check (total_work_minutes >= 0),
  shift_type_id uuid references public.attendance_shift_types(id) on delete set null,
  source text not null default 'system' check (source in ('system', 'manual', 'correction')),
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (employee_id, attendance_date),
  unique (id, employee_id, attendance_date)
);

create table if not exists public.attendance_correction_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_day_id uuid,
  attendance_date date not null,
  requested_status text not null check (requested_status in ('present', 'absent', 'half_day', 'late', 'on_duty', 'holiday', 'weekly_off')),
  requested_check_in timestamptz,
  requested_check_out timestamptz,
  reason text not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  approver_employee_id uuid references public.employees(id) on delete set null,
  approver_comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  foreign key (attendance_day_id, employee_id, attendance_date)
    references public.attendance_days(id, employee_id, attendance_date)
    on delete restrict,
  check (requested_check_out is null or requested_check_in is null or requested_check_out >= requested_check_in)
);

create table if not exists public.shift_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  requested_shift_type_id uuid not null references public.attendance_shift_types(id) on delete restrict,
  current_shift_type_id uuid references public.attendance_shift_types(id) on delete set null,
  requested_date date not null,
  reason text not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  approver_employee_id uuid references public.employees(id) on delete set null,
  approver_comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.overtime_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_day_id uuid,
  overtime_date date not null,
  start_time timestamptz,
  end_time timestamptz,
  overtime_minutes integer not null check (overtime_minutes > 0),
  reason text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  approver_employee_id uuid references public.employees(id) on delete set null,
  approver_comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  foreign key (attendance_day_id, employee_id, overtime_date)
    references public.attendance_days(id, employee_id, attendance_date)
    on delete restrict,
  check (end_time is null or start_time is null or end_time >= start_time)
);

create index if not exists idx_attendance_shift_locations_company on public.attendance_shift_locations(company_id);
create index if not exists idx_attendance_shift_locations_branch on public.attendance_shift_locations(branch_id);
create index if not exists idx_employee_shift_assignments_employee on public.employee_shift_assignments(employee_id);
create index if not exists idx_employee_shift_assignments_shift on public.employee_shift_assignments(shift_type_id);
create index if not exists idx_shift_roster_entries_employee_date on public.shift_roster_entries(employee_id, roster_date);
create index if not exists idx_employee_check_ins_employee_time on public.employee_check_ins(employee_id, check_time);
create index if not exists idx_attendance_days_employee_date on public.attendance_days(employee_id, attendance_date);
create index if not exists idx_attendance_corrections_employee on public.attendance_correction_requests(employee_id);
create index if not exists idx_attendance_corrections_status on public.attendance_correction_requests(status);
create index if not exists idx_shift_requests_employee on public.shift_requests(employee_id);
create index if not exists idx_shift_requests_status on public.shift_requests(status);
create index if not exists idx_overtime_records_employee on public.overtime_records(employee_id);
create index if not exists idx_overtime_records_status on public.overtime_records(status);

drop trigger if exists attendance_shift_types_updated_at on public.attendance_shift_types;
create trigger attendance_shift_types_updated_at before update on public.attendance_shift_types for each row execute function public.touch_updated_at();
drop trigger if exists attendance_shift_locations_updated_at on public.attendance_shift_locations;
create trigger attendance_shift_locations_updated_at before update on public.attendance_shift_locations for each row execute function public.touch_updated_at();
drop trigger if exists employee_shift_assignments_updated_at on public.employee_shift_assignments;
create trigger employee_shift_assignments_updated_at before update on public.employee_shift_assignments for each row execute function public.touch_updated_at();
drop trigger if exists shift_roster_entries_updated_at on public.shift_roster_entries;
create trigger shift_roster_entries_updated_at before update on public.shift_roster_entries for each row execute function public.touch_updated_at();
drop trigger if exists attendance_days_updated_at on public.attendance_days;
create trigger attendance_days_updated_at before update on public.attendance_days for each row execute function public.touch_updated_at();
drop trigger if exists attendance_correction_requests_updated_at on public.attendance_correction_requests;
create trigger attendance_correction_requests_updated_at before update on public.attendance_correction_requests for each row execute function public.touch_updated_at();
drop trigger if exists shift_requests_updated_at on public.shift_requests;
create trigger shift_requests_updated_at before update on public.shift_requests for each row execute function public.touch_updated_at();
drop trigger if exists overtime_records_updated_at on public.overtime_records;
create trigger overtime_records_updated_at before update on public.overtime_records for each row execute function public.touch_updated_at();

alter table public.attendance_shift_types enable row level security;
alter table public.attendance_shift_locations enable row level security;
alter table public.employee_shift_assignments enable row level security;
alter table public.shift_roster_entries enable row level security;
alter table public.employee_check_ins enable row level security;
alter table public.attendance_days enable row level security;
alter table public.attendance_correction_requests enable row level security;
alter table public.shift_requests enable row level security;
alter table public.overtime_records enable row level security;

drop policy if exists "attendance_shift_types_select" on public.attendance_shift_types;
create policy "attendance_shift_types_select" on public.attendance_shift_types for select to authenticated
  using (public.has_permission('permission.shifts.view') or public.can_manage_shifts() or public.has_permission('permission.attendance.view_self'));
drop policy if exists "attendance_shift_types_insert" on public.attendance_shift_types;
create policy "attendance_shift_types_insert" on public.attendance_shift_types for insert to authenticated
  with check (public.can_manage_shifts());
drop policy if exists "attendance_shift_types_update" on public.attendance_shift_types;
create policy "attendance_shift_types_update" on public.attendance_shift_types for update to authenticated
  using (public.can_manage_shifts()) with check (public.can_manage_shifts());
drop policy if exists "attendance_shift_types_delete" on public.attendance_shift_types;
create policy "attendance_shift_types_delete" on public.attendance_shift_types for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "attendance_shift_locations_select" on public.attendance_shift_locations;
create policy "attendance_shift_locations_select" on public.attendance_shift_locations for select to authenticated
  using (public.has_permission('permission.shifts.view') or public.can_manage_shifts() or public.has_permission('permission.attendance.view_self'));
drop policy if exists "attendance_shift_locations_insert" on public.attendance_shift_locations;
create policy "attendance_shift_locations_insert" on public.attendance_shift_locations for insert to authenticated
  with check (public.can_manage_shifts());
drop policy if exists "attendance_shift_locations_update" on public.attendance_shift_locations;
create policy "attendance_shift_locations_update" on public.attendance_shift_locations for update to authenticated
  using (public.can_manage_shifts()) with check (public.can_manage_shifts());
drop policy if exists "attendance_shift_locations_delete" on public.attendance_shift_locations;
create policy "attendance_shift_locations_delete" on public.attendance_shift_locations for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "employee_shift_assignments_select" on public.employee_shift_assignments;
create policy "employee_shift_assignments_select" on public.employee_shift_assignments for select to authenticated
  using (public.can_view_attendance(employee_id));
drop policy if exists "employee_shift_assignments_insert" on public.employee_shift_assignments;
create policy "employee_shift_assignments_insert" on public.employee_shift_assignments for insert to authenticated
  with check (public.can_manage_shifts());
drop policy if exists "employee_shift_assignments_update" on public.employee_shift_assignments;
create policy "employee_shift_assignments_update" on public.employee_shift_assignments for update to authenticated
  using (public.can_manage_shifts()) with check (public.can_manage_shifts());
drop policy if exists "employee_shift_assignments_delete" on public.employee_shift_assignments;
create policy "employee_shift_assignments_delete" on public.employee_shift_assignments for delete to authenticated
  using (public.can_manage_shifts());

drop policy if exists "shift_roster_entries_select" on public.shift_roster_entries;
create policy "shift_roster_entries_select" on public.shift_roster_entries for select to authenticated
  using (public.can_view_attendance(employee_id));
drop policy if exists "shift_roster_entries_insert" on public.shift_roster_entries;
create policy "shift_roster_entries_insert" on public.shift_roster_entries for insert to authenticated
  with check (public.can_manage_shifts());
drop policy if exists "shift_roster_entries_update" on public.shift_roster_entries;
create policy "shift_roster_entries_update" on public.shift_roster_entries for update to authenticated
  using (public.can_manage_shifts()) with check (public.can_manage_shifts());
drop policy if exists "shift_roster_entries_delete" on public.shift_roster_entries;
create policy "shift_roster_entries_delete" on public.shift_roster_entries for delete to authenticated
  using (public.can_manage_shifts());

drop policy if exists "employee_check_ins_select" on public.employee_check_ins;
create policy "employee_check_ins_select" on public.employee_check_ins for select to authenticated
  using (public.can_view_attendance(employee_id));
drop policy if exists "employee_check_ins_insert" on public.employee_check_ins;
create policy "employee_check_ins_insert" on public.employee_check_ins for insert to authenticated
  with check (public.can_check_in(employee_id));
drop policy if exists "employee_check_ins_update" on public.employee_check_ins;
create policy "employee_check_ins_update" on public.employee_check_ins for update to authenticated
  using (public.can_manage_attendance()) with check (public.can_manage_attendance());
drop policy if exists "employee_check_ins_delete" on public.employee_check_ins;
create policy "employee_check_ins_delete" on public.employee_check_ins for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "attendance_days_select" on public.attendance_days;
create policy "attendance_days_select" on public.attendance_days for select to authenticated
  using (public.can_view_attendance(employee_id));
drop policy if exists "attendance_days_insert" on public.attendance_days;
create policy "attendance_days_insert" on public.attendance_days for insert to authenticated
  with check (public.can_manage_attendance());
drop policy if exists "attendance_days_update" on public.attendance_days;
create policy "attendance_days_update" on public.attendance_days for update to authenticated
  using (public.can_manage_attendance()) with check (public.can_manage_attendance());
drop policy if exists "attendance_days_delete" on public.attendance_days;
create policy "attendance_days_delete" on public.attendance_days for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "attendance_correction_requests_select" on public.attendance_correction_requests;
create policy "attendance_correction_requests_select" on public.attendance_correction_requests for select to authenticated
  using (public.can_view_attendance(employee_id) or public.can_approve_attendance(employee_id, 'attendance_correction'));
drop policy if exists "attendance_correction_requests_insert" on public.attendance_correction_requests;
create policy "attendance_correction_requests_insert" on public.attendance_correction_requests for insert to authenticated
  with check (
    public.can_manage_attendance()
    or (
      public.has_permission('permission.attendance.corrections.request')
      and public.can_view_attendance(employee_id)
      and status in ('draft', 'submitted')
    )
  );
drop policy if exists "attendance_correction_requests_update" on public.attendance_correction_requests;
create policy "attendance_correction_requests_update" on public.attendance_correction_requests for update to authenticated
  using (public.can_approve_attendance(employee_id, 'attendance_correction') or (public.can_view_attendance(employee_id) and status in ('draft', 'submitted')))
  with check (public.can_approve_attendance(employee_id, 'attendance_correction') or (public.can_view_attendance(employee_id) and status in ('draft', 'submitted', 'cancelled')));
drop policy if exists "attendance_correction_requests_delete" on public.attendance_correction_requests;
create policy "attendance_correction_requests_delete" on public.attendance_correction_requests for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "shift_requests_select" on public.shift_requests;
create policy "shift_requests_select" on public.shift_requests for select to authenticated
  using (public.can_view_attendance(employee_id) or public.can_approve_attendance(employee_id, 'shift_request'));
drop policy if exists "shift_requests_insert" on public.shift_requests;
create policy "shift_requests_insert" on public.shift_requests for insert to authenticated
  with check (
    public.can_manage_shifts()
    or (
      public.has_permission('permission.shifts.request')
      and public.can_view_attendance(employee_id)
      and status in ('draft', 'submitted')
    )
  );
drop policy if exists "shift_requests_update" on public.shift_requests;
create policy "shift_requests_update" on public.shift_requests for update to authenticated
  using (public.can_approve_attendance(employee_id, 'shift_request') or public.can_manage_shifts() or (public.can_view_attendance(employee_id) and status in ('draft', 'submitted')))
  with check (public.can_approve_attendance(employee_id, 'shift_request') or public.can_manage_shifts() or (public.can_view_attendance(employee_id) and status in ('draft', 'submitted', 'cancelled')));
drop policy if exists "shift_requests_delete" on public.shift_requests;
create policy "shift_requests_delete" on public.shift_requests for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "overtime_records_select" on public.overtime_records;
create policy "overtime_records_select" on public.overtime_records for select to authenticated
  using (public.can_view_attendance(employee_id) or public.can_approve_attendance(employee_id, 'overtime'));
drop policy if exists "overtime_records_insert" on public.overtime_records;
create policy "overtime_records_insert" on public.overtime_records for insert to authenticated
  with check (
    public.has_permission('permission.overtime.manage')
    and public.can_view_attendance(employee_id)
    and status in ('draft', 'submitted')
  );
drop policy if exists "overtime_records_update" on public.overtime_records;
create policy "overtime_records_update" on public.overtime_records for update to authenticated
  using (public.can_approve_attendance(employee_id, 'overtime') or (public.has_permission('permission.overtime.manage') and public.can_view_attendance(employee_id)) or (public.can_view_attendance(employee_id) and status in ('draft', 'submitted')))
  with check (public.can_approve_attendance(employee_id, 'overtime') or (public.has_permission('permission.overtime.manage') and public.can_view_attendance(employee_id)) or (public.can_view_attendance(employee_id) and status in ('draft', 'submitted', 'cancelled')));
drop policy if exists "overtime_records_delete" on public.overtime_records;
create policy "overtime_records_delete" on public.overtime_records for delete to authenticated
  using (public.has_role('role.admin'));

commit;
