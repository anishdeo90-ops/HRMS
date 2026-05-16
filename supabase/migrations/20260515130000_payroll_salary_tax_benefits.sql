-- Payroll, Salary, Tax, and Benefits
-- Creates the Phase 5 HRMS payroll foundation with helper-backed, fail-closed RLS.

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
              'permission.benefits.view_self'
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
        )
    )
  ), false);
$$;

create or replace function public.can_manage_payroll()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('role.admin')
      or public.has_role('role.hr_manager')
      or public.has_role('role.payroll_manager')
      or public.has_permission('permission.payroll.manage');
$$;

create or replace function public.can_manage_salary_structure()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_payroll()
      or public.has_permission('permission.salary_components.manage')
      or public.has_permission('permission.salary_structures.manage')
      or public.has_permission('permission.salary_structures.assign');
$$;

create or replace function public.can_view_payroll_record(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_payroll()
      or public.has_permission('permission.payroll.view')
      or coalesce((
        select e.profile_id = auth.uid()
          and (
            public.has_permission('permission.salary_slips.view_self')
            or public.has_permission('permission.tax_declarations.view_self')
            or public.has_permission('permission.benefits.view_self')
          )
        from public.employees e
        where e.id = target_employee_id
          and e.is_active = true
      ), false);
$$;

create or replace function public.can_view_salary_slip(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_payroll()
      or public.has_permission('permission.salary_slips.manage')
      or coalesce((
        select e.profile_id = auth.uid()
          and public.has_permission('permission.salary_slips.view_self')
        from public.employees e
        where e.id = target_employee_id
          and e.is_active = true
      ), false);
$$;

create or replace function public.can_manage_tax_benefits()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_payroll()
      or public.has_permission('permission.tax_declarations.manage')
      or public.has_permission('permission.benefits.manage');
$$;

alter table public.salary_components add column if not exists id uuid default gen_random_uuid();
alter table public.salary_components add column if not exists code text;
alter table public.salary_components add column if not exists name text;
alter table public.salary_components add column if not exists component_type text;
alter table public.salary_components add column if not exists calculation_type text default 'fixed';
alter table public.salary_components add column if not exists formula text;
alter table public.salary_components add column if not exists is_taxable boolean default true;
alter table public.salary_components add column if not exists is_active boolean default true;
alter table public.salary_components add column if not exists updated_at timestamptz default now();
alter table public.salary_components add column if not exists created_by uuid references public.profiles(id) on delete set null;

update public.salary_components
set
  id = coalesce(id, gen_random_uuid()),
  code = coalesce(code, key),
  name = coalesce(name, initcap(replace(replace(key, 'salary_component.', ''), '_', ' '))),
  component_type = coalesce(
    component_type,
    case
      when category in ('earning', 'deduction', 'employer_contribution') then category
      else 'earning'
    end
  ),
  calculation_type = coalesce(
    calculation_type,
    case
      when calculation in ('fixed', 'formula', 'percentage') then calculation
      else 'fixed'
    end
  ),
  is_taxable = coalesce(is_taxable, taxable, true),
  is_active = coalesce(is_active, true),
  updated_at = coalesce(updated_at, created_at, now());

alter table public.salary_components alter column id set not null;
alter table public.salary_components alter column code set not null;
alter table public.salary_components alter column name set not null;
alter table public.salary_components alter column component_type set not null;
alter table public.salary_components alter column calculation_type set not null;
alter table public.salary_components alter column is_taxable set not null;
alter table public.salary_components alter column is_active set not null;
alter table public.salary_components alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'salary_components_id_key'
      and conrelid = 'public.salary_components'::regclass
  ) then
    alter table public.salary_components add constraint salary_components_id_key unique (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'salary_components_code_key'
      and conrelid = 'public.salary_components'::regclass
  ) then
    alter table public.salary_components add constraint salary_components_code_key unique (code);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'salary_components_name_key'
      and conrelid = 'public.salary_components'::regclass
  ) then
    alter table public.salary_components add constraint salary_components_name_key unique (name);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'salary_components_component_type_check'
      and conrelid = 'public.salary_components'::regclass
  ) then
    alter table public.salary_components
      add constraint salary_components_component_type_check
      check (component_type in ('earning', 'deduction', 'employer_contribution'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'salary_components_calculation_type_check'
      and conrelid = 'public.salary_components'::regclass
  ) then
    alter table public.salary_components
      add constraint salary_components_calculation_type_check
      check (calculation_type in ('fixed', 'formula', 'percentage'));
  end if;
end $$;

create table if not exists public.salary_structures (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  currency text not null default 'INR',
  is_active boolean not null default true,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  check (effective_to is null or effective_to >= effective_from),
  unique (code),
  unique (name)
);

create table if not exists public.salary_structure_details (
  id uuid primary key default gen_random_uuid(),
  salary_structure_id uuid not null references public.salary_structures(id) on delete cascade,
  salary_component_id uuid not null references public.salary_components(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  formula text,
  sequence integer not null default 0 check (sequence >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (salary_structure_id, salary_component_id)
);

create table if not exists public.salary_structure_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  salary_structure_id uuid not null references public.salary_structures(id) on delete restrict,
  base_amount numeric(12,2) not null check (base_amount > 0),
  effective_from date not null,
  effective_to date,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  fiscal_year integer not null check (fiscal_year >= 2000),
  month integer not null check (month between 1 and 12),
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'processing', 'submitted', 'locked', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (end_date >= start_date),
  unique (fiscal_year, month)
);

create table if not exists public.payroll_entries (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references public.payroll_periods(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  gross_pay numeric(12,2) not null default 0 check (gross_pay >= 0),
  total_deductions numeric(12,2) not null default 0 check (total_deductions >= 0),
  net_pay numeric(12,2) not null default 0 check (net_pay >= 0),
  status text not null default 'draft' check (status in ('draft', 'calculated', 'approved', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (payroll_period_id, employee_id)
);

create table if not exists public.salary_slips (
  id uuid primary key default gen_random_uuid(),
  payroll_entry_id uuid references public.payroll_entries(id) on delete set null,
  payroll_period_id uuid not null references public.payroll_periods(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  gross_pay numeric(12,2) not null default 0 check (gross_pay >= 0),
  total_deductions numeric(12,2) not null default 0 check (total_deductions >= 0),
  net_pay numeric(12,2) not null default 0 check (net_pay >= 0),
  status text not null default 'draft' check (status in ('draft', 'calculated', 'approved', 'paid', 'cancelled')),
  submitted_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (payroll_period_id, employee_id)
);

create table if not exists public.salary_slip_lines (
  id uuid primary key default gen_random_uuid(),
  salary_slip_id uuid not null references public.salary_slips(id) on delete cascade,
  salary_component_id uuid not null references public.salary_components(id) on delete restrict,
  line_type text not null check (line_type in ('earning', 'deduction', 'employer_contribution')),
  amount numeric(12,2) not null check (amount >= 0),
  sequence integer not null default 0 check (sequence >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.additional_salaries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  payroll_period_id uuid references public.payroll_periods(id) on delete set null,
  salary_component_id uuid references public.salary_components(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  reason text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.employee_incentives (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  payroll_period_id uuid references public.payroll_periods(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  reason text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.salary_withholdings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  payroll_period_id uuid references public.payroll_periods(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  reason text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'released', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.income_tax_slabs (
  id uuid primary key default gen_random_uuid(),
  fiscal_year integer not null check (fiscal_year >= 2000),
  regime text not null default 'new' check (regime in ('old', 'new')),
  income_from numeric(12,2) not null check (income_from >= 0),
  income_to numeric(12,2) check (income_to is null or income_to >= income_from),
  tax_rate numeric(5,2) not null check (tax_rate >= 0),
  cess_rate numeric(5,2) not null default 0 check (cess_rate >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.employee_tax_exemption_declarations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  fiscal_year integer not null check (fiscal_year >= 2000),
  declaration_type text not null,
  declared_amount numeric(12,2) not null check (declared_amount >= 0),
  approved_amount numeric(12,2) not null default 0 check (approved_amount >= 0),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  attachment_path text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.employee_benefit_applications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  benefit_type text not null,
  requested_amount numeric(12,2) not null default 0 check (requested_amount >= 0),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.employee_benefit_claims (
  id uuid primary key default gen_random_uuid(),
  benefit_application_id uuid references public.employee_benefit_applications(id) on delete set null,
  employee_id uuid not null references public.employees(id) on delete cascade,
  claim_amount numeric(12,2) not null check (claim_amount >= 0),
  approved_amount numeric(12,2) not null default 0 check (approved_amount >= 0),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled')),
  attachment_path text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.gratuity_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  minimum_years numeric(5,2) not null check (minimum_years >= 0),
  multiplier numeric(8,4) not null check (multiplier >= 0),
  max_amount numeric(12,2) check (max_amount is null or max_amount >= 0),
  is_active boolean not null default true,
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  check (effective_to is null or effective_to >= effective_from),
  unique (name)
);

create index if not exists idx_salary_structure_assignments_employee on public.salary_structure_assignments(employee_id);
create index if not exists idx_payroll_entries_period on public.payroll_entries(payroll_period_id);
create index if not exists idx_payroll_entries_employee on public.payroll_entries(employee_id);
create index if not exists idx_salary_slips_period on public.salary_slips(payroll_period_id);
create index if not exists idx_salary_slips_employee on public.salary_slips(employee_id);
create index if not exists idx_salary_slip_lines_slip on public.salary_slip_lines(salary_slip_id);
create index if not exists idx_tax_declarations_employee on public.employee_tax_exemption_declarations(employee_id);
create index if not exists idx_benefit_applications_employee on public.employee_benefit_applications(employee_id);
create index if not exists idx_benefit_claims_employee on public.employee_benefit_claims(employee_id);

drop trigger if exists salary_components_updated_at on public.salary_components;
create trigger salary_components_updated_at before update on public.salary_components for each row execute function public.touch_updated_at();
drop trigger if exists salary_structures_updated_at on public.salary_structures;
create trigger salary_structures_updated_at before update on public.salary_structures for each row execute function public.touch_updated_at();
drop trigger if exists salary_structure_details_updated_at on public.salary_structure_details;
create trigger salary_structure_details_updated_at before update on public.salary_structure_details for each row execute function public.touch_updated_at();
drop trigger if exists salary_structure_assignments_updated_at on public.salary_structure_assignments;
create trigger salary_structure_assignments_updated_at before update on public.salary_structure_assignments for each row execute function public.touch_updated_at();
drop trigger if exists payroll_periods_updated_at on public.payroll_periods;
create trigger payroll_periods_updated_at before update on public.payroll_periods for each row execute function public.touch_updated_at();
drop trigger if exists payroll_entries_updated_at on public.payroll_entries;
create trigger payroll_entries_updated_at before update on public.payroll_entries for each row execute function public.touch_updated_at();
drop trigger if exists salary_slips_updated_at on public.salary_slips;
create trigger salary_slips_updated_at before update on public.salary_slips for each row execute function public.touch_updated_at();
drop trigger if exists salary_slip_lines_updated_at on public.salary_slip_lines;
create trigger salary_slip_lines_updated_at before update on public.salary_slip_lines for each row execute function public.touch_updated_at();
drop trigger if exists additional_salaries_updated_at on public.additional_salaries;
create trigger additional_salaries_updated_at before update on public.additional_salaries for each row execute function public.touch_updated_at();
drop trigger if exists employee_incentives_updated_at on public.employee_incentives;
create trigger employee_incentives_updated_at before update on public.employee_incentives for each row execute function public.touch_updated_at();
drop trigger if exists salary_withholdings_updated_at on public.salary_withholdings;
create trigger salary_withholdings_updated_at before update on public.salary_withholdings for each row execute function public.touch_updated_at();
drop trigger if exists income_tax_slabs_updated_at on public.income_tax_slabs;
create trigger income_tax_slabs_updated_at before update on public.income_tax_slabs for each row execute function public.touch_updated_at();
drop trigger if exists employee_tax_exemption_declarations_updated_at on public.employee_tax_exemption_declarations;
create trigger employee_tax_exemption_declarations_updated_at before update on public.employee_tax_exemption_declarations for each row execute function public.touch_updated_at();
drop trigger if exists employee_benefit_applications_updated_at on public.employee_benefit_applications;
create trigger employee_benefit_applications_updated_at before update on public.employee_benefit_applications for each row execute function public.touch_updated_at();
drop trigger if exists employee_benefit_claims_updated_at on public.employee_benefit_claims;
create trigger employee_benefit_claims_updated_at before update on public.employee_benefit_claims for each row execute function public.touch_updated_at();
drop trigger if exists gratuity_rules_updated_at on public.gratuity_rules;
create trigger gratuity_rules_updated_at before update on public.gratuity_rules for each row execute function public.touch_updated_at();

alter table public.salary_components enable row level security;
alter table public.salary_structures enable row level security;
alter table public.salary_structure_details enable row level security;
alter table public.salary_structure_assignments enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.payroll_entries enable row level security;
alter table public.salary_slips enable row level security;
alter table public.salary_slip_lines enable row level security;
alter table public.additional_salaries enable row level security;
alter table public.employee_incentives enable row level security;
alter table public.salary_withholdings enable row level security;
alter table public.income_tax_slabs enable row level security;
alter table public.employee_tax_exemption_declarations enable row level security;
alter table public.employee_benefit_applications enable row level security;
alter table public.employee_benefit_claims enable row level security;
alter table public.gratuity_rules enable row level security;

drop policy if exists "salary_components_select" on public.salary_components;
create policy "salary_components_select" on public.salary_components for select to authenticated using (public.can_manage_salary_structure() or public.has_permission('permission.payroll.view'));
drop policy if exists "salary_components_insert" on public.salary_components;
create policy "salary_components_insert" on public.salary_components for insert to authenticated with check (public.has_permission('permission.salary_components.manage') or public.can_manage_payroll());
drop policy if exists "salary_components_update" on public.salary_components;
create policy "salary_components_update" on public.salary_components for update to authenticated using (public.has_permission('permission.salary_components.manage') or public.can_manage_payroll()) with check (public.has_permission('permission.salary_components.manage') or public.can_manage_payroll());
drop policy if exists "salary_components_delete" on public.salary_components;
create policy "salary_components_delete" on public.salary_components for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "salary_structures_select" on public.salary_structures;
create policy "salary_structures_select" on public.salary_structures for select to authenticated using (public.can_manage_salary_structure() or public.has_permission('permission.payroll.view'));
drop policy if exists "salary_structures_insert" on public.salary_structures;
create policy "salary_structures_insert" on public.salary_structures for insert to authenticated with check (public.has_permission('permission.salary_structures.manage') or public.can_manage_payroll());
drop policy if exists "salary_structures_update" on public.salary_structures;
create policy "salary_structures_update" on public.salary_structures for update to authenticated using (public.has_permission('permission.salary_structures.manage') or public.can_manage_payroll()) with check (public.has_permission('permission.salary_structures.manage') or public.can_manage_payroll());
drop policy if exists "salary_structures_delete" on public.salary_structures;
create policy "salary_structures_delete" on public.salary_structures for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "salary_structure_details_select" on public.salary_structure_details;
create policy "salary_structure_details_select" on public.salary_structure_details for select to authenticated using (public.can_manage_salary_structure() or public.has_permission('permission.payroll.view'));
drop policy if exists "salary_structure_details_insert" on public.salary_structure_details;
create policy "salary_structure_details_insert" on public.salary_structure_details for insert to authenticated with check (public.has_permission('permission.salary_structures.manage') or public.can_manage_payroll());
drop policy if exists "salary_structure_details_update" on public.salary_structure_details;
create policy "salary_structure_details_update" on public.salary_structure_details for update to authenticated using (public.has_permission('permission.salary_structures.manage') or public.can_manage_payroll()) with check (public.has_permission('permission.salary_structures.manage') or public.can_manage_payroll());
drop policy if exists "salary_structure_details_delete" on public.salary_structure_details;
create policy "salary_structure_details_delete" on public.salary_structure_details for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "salary_structure_assignments_select" on public.salary_structure_assignments;
create policy "salary_structure_assignments_select" on public.salary_structure_assignments for select to authenticated using (public.can_view_payroll_record(employee_id));
drop policy if exists "salary_structure_assignments_insert" on public.salary_structure_assignments;
create policy "salary_structure_assignments_insert" on public.salary_structure_assignments for insert to authenticated with check (public.has_permission('permission.salary_structures.assign') or public.can_manage_payroll());
drop policy if exists "salary_structure_assignments_update" on public.salary_structure_assignments;
create policy "salary_structure_assignments_update" on public.salary_structure_assignments for update to authenticated using (public.has_permission('permission.salary_structures.assign') or public.can_manage_payroll()) with check (public.has_permission('permission.salary_structures.assign') or public.can_manage_payroll());
drop policy if exists "salary_structure_assignments_delete" on public.salary_structure_assignments;
create policy "salary_structure_assignments_delete" on public.salary_structure_assignments for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "payroll_periods_select" on public.payroll_periods;
create policy "payroll_periods_select" on public.payroll_periods for select to authenticated using (public.can_manage_payroll() or public.has_permission('permission.payroll.view'));
drop policy if exists "payroll_periods_insert" on public.payroll_periods;
create policy "payroll_periods_insert" on public.payroll_periods for insert to authenticated with check (public.has_permission('permission.payroll_periods.manage') or public.can_manage_payroll());
drop policy if exists "payroll_periods_update" on public.payroll_periods;
create policy "payroll_periods_update" on public.payroll_periods for update to authenticated using (public.has_permission('permission.payroll_periods.manage') or public.can_manage_payroll()) with check (public.has_permission('permission.payroll_periods.manage') or public.can_manage_payroll());
drop policy if exists "payroll_periods_delete" on public.payroll_periods;
create policy "payroll_periods_delete" on public.payroll_periods for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "payroll_entries_select" on public.payroll_entries;
create policy "payroll_entries_select" on public.payroll_entries for select to authenticated using (public.can_view_payroll_record(employee_id));
drop policy if exists "payroll_entries_insert" on public.payroll_entries;
create policy "payroll_entries_insert" on public.payroll_entries for insert to authenticated with check (public.has_permission('permission.payroll_entries.manage') or public.can_manage_payroll());
drop policy if exists "payroll_entries_update" on public.payroll_entries;
create policy "payroll_entries_update" on public.payroll_entries for update to authenticated using (public.has_permission('permission.payroll_entries.manage') or public.can_manage_payroll()) with check (public.has_permission('permission.payroll_entries.manage') or public.can_manage_payroll());
drop policy if exists "payroll_entries_delete" on public.payroll_entries;
create policy "payroll_entries_delete" on public.payroll_entries for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "salary_slips_select" on public.salary_slips;
create policy "salary_slips_select" on public.salary_slips for select to authenticated using (public.can_view_salary_slip(employee_id));
drop policy if exists "salary_slips_insert" on public.salary_slips;
create policy "salary_slips_insert" on public.salary_slips for insert to authenticated with check (public.has_permission('permission.salary_slips.manage') or public.can_manage_payroll());
drop policy if exists "salary_slips_update" on public.salary_slips;
create policy "salary_slips_update" on public.salary_slips for update to authenticated using (public.has_permission('permission.salary_slips.manage') or public.has_permission('permission.salary_slips.submit') or public.has_permission('permission.salary_slips.cancel') or public.can_manage_payroll()) with check (public.has_permission('permission.salary_slips.manage') or public.has_permission('permission.salary_slips.submit') or public.has_permission('permission.salary_slips.cancel') or public.can_manage_payroll());
drop policy if exists "salary_slips_delete" on public.salary_slips;
create policy "salary_slips_delete" on public.salary_slips for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "salary_slip_lines_select" on public.salary_slip_lines;
create policy "salary_slip_lines_select" on public.salary_slip_lines for select to authenticated using (exists (select 1 from public.salary_slips s where s.id = salary_slip_id and public.can_view_salary_slip(s.employee_id)));
drop policy if exists "salary_slip_lines_insert" on public.salary_slip_lines;
create policy "salary_slip_lines_insert" on public.salary_slip_lines for insert to authenticated with check (public.has_permission('permission.salary_slips.manage') or public.can_manage_payroll());
drop policy if exists "salary_slip_lines_update" on public.salary_slip_lines;
create policy "salary_slip_lines_update" on public.salary_slip_lines for update to authenticated using (public.has_permission('permission.salary_slips.manage') or public.can_manage_payroll()) with check (public.has_permission('permission.salary_slips.manage') or public.can_manage_payroll());
drop policy if exists "salary_slip_lines_delete" on public.salary_slip_lines;
create policy "salary_slip_lines_delete" on public.salary_slip_lines for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "additional_salaries_select" on public.additional_salaries;
create policy "additional_salaries_select" on public.additional_salaries for select to authenticated using (public.can_view_payroll_record(employee_id));
drop policy if exists "additional_salaries_insert" on public.additional_salaries;
create policy "additional_salaries_insert" on public.additional_salaries for insert to authenticated with check (public.can_manage_payroll());
drop policy if exists "additional_salaries_update" on public.additional_salaries;
create policy "additional_salaries_update" on public.additional_salaries for update to authenticated using (public.can_manage_payroll()) with check (public.can_manage_payroll());
drop policy if exists "additional_salaries_delete" on public.additional_salaries;
create policy "additional_salaries_delete" on public.additional_salaries for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_incentives_select" on public.employee_incentives;
create policy "employee_incentives_select" on public.employee_incentives for select to authenticated using (public.can_view_payroll_record(employee_id));
drop policy if exists "employee_incentives_insert" on public.employee_incentives;
create policy "employee_incentives_insert" on public.employee_incentives for insert to authenticated with check (public.can_manage_payroll());
drop policy if exists "employee_incentives_update" on public.employee_incentives;
create policy "employee_incentives_update" on public.employee_incentives for update to authenticated using (public.can_manage_payroll()) with check (public.can_manage_payroll());
drop policy if exists "employee_incentives_delete" on public.employee_incentives;
create policy "employee_incentives_delete" on public.employee_incentives for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "salary_withholdings_select" on public.salary_withholdings;
create policy "salary_withholdings_select" on public.salary_withholdings for select to authenticated using (public.can_view_payroll_record(employee_id));
drop policy if exists "salary_withholdings_insert" on public.salary_withholdings;
create policy "salary_withholdings_insert" on public.salary_withholdings for insert to authenticated with check (public.can_manage_payroll());
drop policy if exists "salary_withholdings_update" on public.salary_withholdings;
create policy "salary_withholdings_update" on public.salary_withholdings for update to authenticated using (public.can_manage_payroll()) with check (public.can_manage_payroll());
drop policy if exists "salary_withholdings_delete" on public.salary_withholdings;
create policy "salary_withholdings_delete" on public.salary_withholdings for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "income_tax_slabs_select" on public.income_tax_slabs;
create policy "income_tax_slabs_select" on public.income_tax_slabs for select to authenticated using (public.can_manage_tax_benefits() or public.has_permission('permission.tax_declarations.view_self'));
drop policy if exists "income_tax_slabs_insert" on public.income_tax_slabs;
create policy "income_tax_slabs_insert" on public.income_tax_slabs for insert to authenticated with check (public.can_manage_tax_benefits());
drop policy if exists "income_tax_slabs_update" on public.income_tax_slabs;
create policy "income_tax_slabs_update" on public.income_tax_slabs for update to authenticated using (public.can_manage_tax_benefits()) with check (public.can_manage_tax_benefits());
drop policy if exists "income_tax_slabs_delete" on public.income_tax_slabs;
create policy "income_tax_slabs_delete" on public.income_tax_slabs for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_tax_exemption_declarations_select" on public.employee_tax_exemption_declarations;
create policy "employee_tax_exemption_declarations_select" on public.employee_tax_exemption_declarations for select to authenticated using (public.can_view_payroll_record(employee_id));
drop policy if exists "employee_tax_exemption_declarations_insert" on public.employee_tax_exemption_declarations;
create policy "employee_tax_exemption_declarations_insert" on public.employee_tax_exemption_declarations for insert to authenticated with check (public.can_view_payroll_record(employee_id) or public.can_manage_tax_benefits());
drop policy if exists "employee_tax_exemption_declarations_update" on public.employee_tax_exemption_declarations;
create policy "employee_tax_exemption_declarations_update" on public.employee_tax_exemption_declarations for update to authenticated using (public.can_view_payroll_record(employee_id) or public.can_manage_tax_benefits()) with check (public.can_view_payroll_record(employee_id) or public.can_manage_tax_benefits());
drop policy if exists "employee_tax_exemption_declarations_delete" on public.employee_tax_exemption_declarations;
create policy "employee_tax_exemption_declarations_delete" on public.employee_tax_exemption_declarations for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_benefit_applications_select" on public.employee_benefit_applications;
create policy "employee_benefit_applications_select" on public.employee_benefit_applications for select to authenticated using (public.can_view_payroll_record(employee_id));
drop policy if exists "employee_benefit_applications_insert" on public.employee_benefit_applications;
create policy "employee_benefit_applications_insert" on public.employee_benefit_applications for insert to authenticated with check (public.can_view_payroll_record(employee_id) or public.can_manage_tax_benefits());
drop policy if exists "employee_benefit_applications_update" on public.employee_benefit_applications;
create policy "employee_benefit_applications_update" on public.employee_benefit_applications for update to authenticated using (public.can_view_payroll_record(employee_id) or public.can_manage_tax_benefits()) with check (public.can_view_payroll_record(employee_id) or public.can_manage_tax_benefits());
drop policy if exists "employee_benefit_applications_delete" on public.employee_benefit_applications;
create policy "employee_benefit_applications_delete" on public.employee_benefit_applications for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "employee_benefit_claims_select" on public.employee_benefit_claims;
create policy "employee_benefit_claims_select" on public.employee_benefit_claims for select to authenticated using (public.can_view_payroll_record(employee_id));
drop policy if exists "employee_benefit_claims_insert" on public.employee_benefit_claims;
create policy "employee_benefit_claims_insert" on public.employee_benefit_claims for insert to authenticated with check (public.can_view_payroll_record(employee_id) or public.can_manage_tax_benefits());
drop policy if exists "employee_benefit_claims_update" on public.employee_benefit_claims;
create policy "employee_benefit_claims_update" on public.employee_benefit_claims for update to authenticated using (public.can_view_payroll_record(employee_id) or public.can_manage_tax_benefits()) with check (public.can_view_payroll_record(employee_id) or public.can_manage_tax_benefits());
drop policy if exists "employee_benefit_claims_delete" on public.employee_benefit_claims;
create policy "employee_benefit_claims_delete" on public.employee_benefit_claims for delete to authenticated using (public.has_role('role.admin'));

drop policy if exists "gratuity_rules_select" on public.gratuity_rules;
create policy "gratuity_rules_select" on public.gratuity_rules for select to authenticated using (public.can_manage_tax_benefits() or public.has_permission('permission.benefits.view_self'));
drop policy if exists "gratuity_rules_insert" on public.gratuity_rules;
create policy "gratuity_rules_insert" on public.gratuity_rules for insert to authenticated with check (public.can_manage_tax_benefits());
drop policy if exists "gratuity_rules_update" on public.gratuity_rules;
create policy "gratuity_rules_update" on public.gratuity_rules for update to authenticated using (public.can_manage_tax_benefits()) with check (public.can_manage_tax_benefits());
drop policy if exists "gratuity_rules_delete" on public.gratuity_rules;
create policy "gratuity_rules_delete" on public.gratuity_rules for delete to authenticated using (public.has_role('role.admin'));

commit;
