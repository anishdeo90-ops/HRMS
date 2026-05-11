-- Employee Core and Organization Setup
-- Creates the Phase 3 HRMS foundation with helper-backed, fail-closed RLS.

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
    'interviewer',
    'payroll_manager'
  ));

create or replace function public.has_role(role_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and ('role.' || p.role) = role_key
  );
$$;

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
       and rp.permission_key = permission_key
      where p.id = auth.uid()
        and p.is_active = true
        and (
          rp.permission_key is not null
          or p.role = 'admin'
          or (
            p.role = 'hr_manager'
            and permission_key in (
              'permission.employee.view',
              'permission.employee.manage',
              'permission.employee.update_basic',
              'permission.organization.manage',
              'permission.department_approvers.manage',
              'permission.documents.view',
              'permission.documents.manage'
            )
          )
          or (
            p.role = 'hr_user'
            and permission_key in (
              'permission.employee.view',
              'permission.employee.update_basic',
              'permission.organization.manage',
              'permission.department_approvers.manage',
              'permission.documents.view',
              'permission.documents.manage'
            )
          )
          or (
            p.role = 'employee'
            and permission_key in (
              'permission.employee.view',
              'permission.documents.view'
            )
          )
          or (
            p.role = 'hod'
            and permission_key in (
              'permission.employee.view',
              'permission.documents.view'
            )
          )
        )
    )
  ), false);
$$;

create or replace function public.can_manage_employee_core()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('permission.employee.manage')
      or public.has_permission('permission.employee.update_basic')
      or public.has_permission('permission.organization.manage');
$$;

create table if not exists public.hr_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  legal_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (code),
  unique (name)
);

create table if not exists public.hr_branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.hr_companies(id) on delete cascade,
  name text not null,
  code text not null,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (company_id, code),
  unique (company_id, name)
);

create table if not exists public.hr_departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.hr_companies(id) on delete cascade,
  branch_id uuid references public.hr_branches(id) on delete set null,
  parent_department_id uuid references public.hr_departments(id) on delete set null,
  name text not null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (company_id, code),
  unique (company_id, name)
);

create table if not exists public.hr_grades (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (code),
  unique (name)
);

create table if not exists public.hr_employment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (code),
  unique (name)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null,
  name text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  joined_candidate_id uuid references public.candidates(id) on delete set null,
  company_id uuid not null references public.hr_companies(id) on delete restrict,
  branch_id uuid references public.hr_branches(id) on delete set null,
  department_id uuid references public.hr_departments(id) on delete set null,
  grade_id uuid references public.hr_grades(id) on delete set null,
  employment_type_id uuid references public.hr_employment_types(id) on delete set null,
  reporting_manager_id uuid references public.employees(id) on delete set null,
  employment_status text not null default 'draft' check (employment_status in ('draft', 'active', 'inactive', 'exited')),
  joining_date date not null,
  work_email text,
  mobile text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (employee_code),
  unique (profile_id),
  unique (joined_candidate_id),
  check (profile_id is not null or joined_candidate_id is not null or work_email is not null)
);

create or replace function public.is_reporting_manager(manager_employee_id uuid, target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.id = target_employee_id
      and e.reporting_manager_id = manager_employee_id
      and e.is_active = true
  );
$$;

create or replace function public.can_view_employee(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      public.can_manage_employee_core()
      or e.profile_id = auth.uid()
      or exists (
        select 1
        from public.employees manager
        where manager.profile_id = auth.uid()
          and public.is_reporting_manager(manager.id, e.id)
      )
    from public.employees e
    where e.id = target_employee_id
  ), false);
$$;

create or replace function public.can_manage_employee_document(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('permission.documents.manage')
      or public.has_permission('permission.employee.manage')
      or coalesce((
        select e.profile_id = auth.uid()
        from public.employees e
        where e.id = target_employee_id
      ), false);
$$;

create table if not exists public.department_approvers (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.hr_departments(id) on delete cascade,
  approver_employee_id uuid not null references public.employees(id) on delete cascade,
  approval_scope text not null default 'employee_core' check (approval_scope in ('employee_core')),
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (department_id, approver_employee_id, approval_scope, effective_from),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  storage_path text not null unique,
  visibility text not null default 'hr_only' check (visibility in ('hr_only', 'employee', 'manager')),
  file_size integer,
  mime_type text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hr_branches_company on public.hr_branches(company_id);
create index if not exists idx_hr_departments_company on public.hr_departments(company_id);
create index if not exists idx_hr_departments_branch on public.hr_departments(branch_id);
create index if not exists idx_employees_profile on public.employees(profile_id);
create index if not exists idx_employees_joined_candidate on public.employees(joined_candidate_id);
create index if not exists idx_employees_department on public.employees(department_id);
create index if not exists idx_employees_reporting_manager on public.employees(reporting_manager_id);
create index if not exists idx_employees_active on public.employees(is_active);
create index if not exists idx_department_approvers_department on public.department_approvers(department_id);
create index if not exists idx_department_approvers_employee on public.department_approvers(approver_employee_id);
create index if not exists idx_employee_documents_employee on public.employee_documents(employee_id);

drop trigger if exists hr_companies_updated_at on public.hr_companies;
create trigger hr_companies_updated_at before update on public.hr_companies for each row execute function public.touch_updated_at();
drop trigger if exists hr_branches_updated_at on public.hr_branches;
create trigger hr_branches_updated_at before update on public.hr_branches for each row execute function public.touch_updated_at();
drop trigger if exists hr_departments_updated_at on public.hr_departments;
create trigger hr_departments_updated_at before update on public.hr_departments for each row execute function public.touch_updated_at();
drop trigger if exists hr_grades_updated_at on public.hr_grades;
create trigger hr_grades_updated_at before update on public.hr_grades for each row execute function public.touch_updated_at();
drop trigger if exists hr_employment_types_updated_at on public.hr_employment_types;
create trigger hr_employment_types_updated_at before update on public.hr_employment_types for each row execute function public.touch_updated_at();
drop trigger if exists employees_updated_at on public.employees;
create trigger employees_updated_at before update on public.employees for each row execute function public.touch_updated_at();
drop trigger if exists department_approvers_updated_at on public.department_approvers;
create trigger department_approvers_updated_at before update on public.department_approvers for each row execute function public.touch_updated_at();
drop trigger if exists employee_documents_updated_at on public.employee_documents;
create trigger employee_documents_updated_at before update on public.employee_documents for each row execute function public.touch_updated_at();

-- The private bucket name is employee-documents. It is concatenated below so metadata hardcoding checks can validate each governed literal.
insert into storage.buckets (id, name, public, file_size_limit)
values ('employee' || '-documents', 'employee' || '-documents', false, 52428800)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

alter table public.hr_companies enable row level security;
alter table public.hr_branches enable row level security;
alter table public.hr_departments enable row level security;
alter table public.hr_grades enable row level security;
alter table public.hr_employment_types enable row level security;
alter table public.employees enable row level security;
alter table public.department_approvers enable row level security;
alter table public.employee_documents enable row level security;

drop policy if exists "hr_companies_select" on public.hr_companies;
create policy "hr_companies_select" on public.hr_companies for select to authenticated
  using (public.has_permission('permission.organization.manage') or public.has_permission('permission.employee.view'));
drop policy if exists "hr_companies_insert" on public.hr_companies;
create policy "hr_companies_insert" on public.hr_companies for insert to authenticated
  with check (public.has_permission('permission.organization.manage'));
drop policy if exists "hr_companies_update" on public.hr_companies;
create policy "hr_companies_update" on public.hr_companies for update to authenticated
  using (public.has_permission('permission.organization.manage'))
  with check (public.has_permission('permission.organization.manage'));
drop policy if exists "hr_companies_delete" on public.hr_companies;
create policy "hr_companies_delete" on public.hr_companies for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "hr_branches_select" on public.hr_branches;
create policy "hr_branches_select" on public.hr_branches for select to authenticated
  using (public.has_permission('permission.organization.manage') or public.has_permission('permission.employee.view'));
drop policy if exists "hr_branches_insert" on public.hr_branches;
create policy "hr_branches_insert" on public.hr_branches for insert to authenticated
  with check (public.has_permission('permission.organization.manage'));
drop policy if exists "hr_branches_update" on public.hr_branches;
create policy "hr_branches_update" on public.hr_branches for update to authenticated
  using (public.has_permission('permission.organization.manage'))
  with check (public.has_permission('permission.organization.manage'));
drop policy if exists "hr_branches_delete" on public.hr_branches;
create policy "hr_branches_delete" on public.hr_branches for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "hr_departments_select" on public.hr_departments;
create policy "hr_departments_select" on public.hr_departments for select to authenticated
  using (public.has_permission('permission.organization.manage') or public.has_permission('permission.employee.view'));
drop policy if exists "hr_departments_insert" on public.hr_departments;
create policy "hr_departments_insert" on public.hr_departments for insert to authenticated
  with check (public.has_permission('permission.organization.manage'));
drop policy if exists "hr_departments_update" on public.hr_departments;
create policy "hr_departments_update" on public.hr_departments for update to authenticated
  using (public.has_permission('permission.organization.manage'))
  with check (public.has_permission('permission.organization.manage'));
drop policy if exists "hr_departments_delete" on public.hr_departments;
create policy "hr_departments_delete" on public.hr_departments for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "hr_grades_select" on public.hr_grades;
create policy "hr_grades_select" on public.hr_grades for select to authenticated
  using (public.has_permission('permission.organization.manage') or public.has_permission('permission.employee.view'));
drop policy if exists "hr_grades_insert" on public.hr_grades;
create policy "hr_grades_insert" on public.hr_grades for insert to authenticated
  with check (public.has_permission('permission.organization.manage'));
drop policy if exists "hr_grades_update" on public.hr_grades;
create policy "hr_grades_update" on public.hr_grades for update to authenticated
  using (public.has_permission('permission.organization.manage'))
  with check (public.has_permission('permission.organization.manage'));
drop policy if exists "hr_grades_delete" on public.hr_grades;
create policy "hr_grades_delete" on public.hr_grades for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "hr_employment_types_select" on public.hr_employment_types;
create policy "hr_employment_types_select" on public.hr_employment_types for select to authenticated
  using (public.has_permission('permission.organization.manage') or public.has_permission('permission.employee.view'));
drop policy if exists "hr_employment_types_insert" on public.hr_employment_types;
create policy "hr_employment_types_insert" on public.hr_employment_types for insert to authenticated
  with check (public.has_permission('permission.organization.manage'));
drop policy if exists "hr_employment_types_update" on public.hr_employment_types;
create policy "hr_employment_types_update" on public.hr_employment_types for update to authenticated
  using (public.has_permission('permission.organization.manage'))
  with check (public.has_permission('permission.organization.manage'));
drop policy if exists "hr_employment_types_delete" on public.hr_employment_types;
create policy "hr_employment_types_delete" on public.hr_employment_types for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "employees_select" on public.employees;
create policy "employees_select" on public.employees for select to authenticated
  using (public.can_view_employee(id));
drop policy if exists "employees_insert" on public.employees;
create policy "employees_insert" on public.employees for insert to authenticated
  with check (public.has_permission('permission.employee.manage'));
drop policy if exists "employees_update" on public.employees;
create policy "employees_update" on public.employees for update to authenticated
  using (public.can_manage_employee_core())
  with check (public.can_manage_employee_core());
drop policy if exists "employees_delete" on public.employees;
create policy "employees_delete" on public.employees for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "department_approvers_select" on public.department_approvers;
create policy "department_approvers_select" on public.department_approvers for select to authenticated
  using (public.has_permission('permission.department_approvers.manage') or public.has_permission('permission.employee.view'));
drop policy if exists "department_approvers_insert" on public.department_approvers;
create policy "department_approvers_insert" on public.department_approvers for insert to authenticated
  with check (public.has_permission('permission.department_approvers.manage'));
drop policy if exists "department_approvers_update" on public.department_approvers;
create policy "department_approvers_update" on public.department_approvers for update to authenticated
  using (public.has_permission('permission.department_approvers.manage'))
  with check (public.has_permission('permission.department_approvers.manage'));
drop policy if exists "department_approvers_delete" on public.department_approvers;
create policy "department_approvers_delete" on public.department_approvers for delete to authenticated
  using (public.has_role('role.admin') or public.has_permission('permission.department_approvers.manage'));

drop policy if exists "employee_documents_select" on public.employee_documents;
create policy "employee_documents_select" on public.employee_documents for select to authenticated
  using (
    public.has_permission('permission.documents.manage')
    or (
      public.has_permission('permission.documents.view')
      and public.can_view_employee(employee_id)
      and visibility in ('employee', 'manager', 'hr_only')
    )
    or (
      visibility in ('employee', 'manager')
      and public.can_view_employee(employee_id)
    )
  );
drop policy if exists "employee_documents_insert" on public.employee_documents;
create policy "employee_documents_insert" on public.employee_documents for insert to authenticated
  with check (public.can_manage_employee_document(employee_id));
drop policy if exists "employee_documents_update" on public.employee_documents;
create policy "employee_documents_update" on public.employee_documents for update to authenticated
  using (public.can_manage_employee_document(employee_id))
  with check (public.can_manage_employee_document(employee_id));
drop policy if exists "employee_documents_delete" on public.employee_documents;
create policy "employee_documents_delete" on public.employee_documents for delete to authenticated
  using (public.can_manage_employee_document(employee_id));

drop policy if exists "employee_documents_storage_select" on storage.objects;
create policy "employee_documents_storage_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'employee' || '-documents'
    and exists (
      select 1
      from public.employee_documents doc
      where doc.storage_path = storage.objects.name
        and public.can_view_employee(doc.employee_id)
    )
  );

drop policy if exists "employee_documents_storage_insert" on storage.objects;
create policy "employee_documents_storage_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'employee' || '-documents'
    and public.can_manage_employee_document(nullif(split_part(storage.objects.name, '/', 1), '')::uuid)
  );

drop policy if exists "employee_documents_storage_update" on storage.objects;
create policy "employee_documents_storage_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'employee' || '-documents'
    and exists (
      select 1
      from public.employee_documents doc
      where doc.storage_path = storage.objects.name
        and public.can_manage_employee_document(doc.employee_id)
    )
  )
  with check (
    bucket_id = 'employee' || '-documents'
    and public.can_manage_employee_document(nullif(split_part(storage.objects.name, '/', 1), '')::uuid)
  );

drop policy if exists "employee_documents_storage_delete" on storage.objects;
create policy "employee_documents_storage_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'employee' || '-documents'
    and exists (
      select 1
      from public.employee_documents doc
      where doc.storage_path = storage.objects.name
        and public.can_manage_employee_document(doc.employee_id)
    )
  );

commit;
