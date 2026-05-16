-- HRMS Recruitment Unification
-- Adds governed recruitment terminology, appointment letters, and explicit onboarding handoffs without mutating ATS tables.

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
              'permission.dashboards.view',
              'permission.recruitment.view',
              'permission.recruitment.job_requisitions.request',
              'permission.recruitment.job_requisitions.approve',
              'permission.recruitment.reports.view'
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
              'permission.automation_executions.view',
              'permission.recruitment.view',
              'permission.recruitment.manage',
              'permission.recruitment.job_openings.manage',
              'permission.recruitment.job_requisitions.request',
              'permission.recruitment.job_requisitions.approve',
              'permission.recruitment.applicants.view',
              'permission.recruitment.applicants.manage',
              'permission.recruitment.interviews.manage',
              'permission.recruitment.interviews.feedback.submit',
              'permission.recruitment.offers.manage',
              'permission.recruitment.appointment_letters.manage',
              'permission.recruitment.handoffs.manage',
              'permission.recruitment.reports.view'
            )
          )
          or (
            p.role = 'recruiter'
            and $1 in (
              'permission.recruitment.view',
              'permission.recruitment.job_openings.manage',
              'permission.recruitment.applicants.view',
              'permission.recruitment.applicants.manage',
              'permission.recruitment.interviews.manage',
              'permission.recruitment.offers.manage',
              'permission.recruitment.appointment_letters.manage',
              'permission.recruitment.handoffs.manage',
              'permission.recruitment.reports.view'
            )
          )
          or (
            p.role = 'interviewer'
            and $1 in (
              'permission.recruitment.view',
              'permission.recruitment.applicants.view',
              'permission.recruitment.interviews.feedback.submit'
            )
          )
        )
    )
  ), false);
$$;

create or replace function public.can_manage_recruitment()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('role.admin')
      or public.has_role('role.hr_manager')
      or public.has_permission('permission.recruitment.manage');
$$;

create or replace function public.can_view_recruitment_candidate(candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_recruitment()
      or public.has_permission('permission.recruitment.applicants.view')
      or coalesce((
        select c.hr_id = auth.uid()
            or c.created_by = auth.uid()
            or exists (
              select 1
              from public.job_recruiters jr
              where jr.job_id = c.job_id
                and jr.recruiter_id = auth.uid()
            )
            or exists (
              select 1
              from public.interviews i
              where i.candidate_id = c.id
                and i.interviewer_id = auth.uid()
                and public.has_permission('permission.recruitment.interviews.feedback.submit')
            )
        from public.candidates c
        where c.id = candidate_id
          and coalesce(c.is_deleted, false) = false
      ), false);
$$;

create or replace function public.can_manage_recruitment_candidate(candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_recruitment()
      or (
        public.has_permission('permission.recruitment.applicants.manage')
        and public.can_view_recruitment_candidate(candidate_id)
      );
$$;

create or replace function public.can_manage_appointment_letters()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_recruitment()
      or public.has_permission('permission.recruitment.appointment_letters.manage');
$$;

create table if not exists public.recruitment_status_mappings (
  id uuid primary key default gen_random_uuid(),
  source_table text not null check (source_table in ('jobs', 'candidates', 'interviews', 'candidate_offers', 'hiring_requests')),
  source_field text not null,
  source_value text not null,
  hrms_concept_key text not null,
  hrms_status_key text not null,
  label text not null,
  sort_order integer not null default 0,
  is_terminal boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_table, source_field, source_value)
);

create table if not exists public.recruitment_appointment_letter_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  body_template text not null,
  variables jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_key),
  check (jsonb_typeof(variables) = 'array')
);

create table if not exists public.recruitment_appointment_letters (
  id uuid primary key default gen_random_uuid(),
  letter_no text not null,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  candidate_offer_id uuid references public.candidate_offers(id) on delete set null,
  template_id uuid references public.recruitment_appointment_letter_templates(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'generated', 'sent', 'accepted', 'declined', 'cancelled')),
  letter_html text not null,
  storage_path text,
  compensation_snapshot jsonb not null default '{}'::jsonb,
  effective_joining_date date,
  issued_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (letter_no),
  unique (candidate_offer_id, letter_no),
  check (accepted_at is null or declined_at is null)
);

create table if not exists public.recruitment_onboarding_handoffs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  candidate_offer_id uuid references public.candidate_offers(id) on delete set null,
  appointment_letter_id uuid references public.recruitment_appointment_letters(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'ready_for_onboarding', 'employee_created', 'onboarding_started', 'cancelled')),
  handoff_payload jsonb not null default '{}'::jsonb,
  requested_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (accepted_at is null or requested_at is null or accepted_at >= requested_at),
  check (cancelled_at is null or requested_at is null or cancelled_at >= requested_at)
);

create unique index if not exists recruitment_appointment_templates_default_uidx
  on public.recruitment_appointment_letter_templates (is_default)
  where is_default = true and is_active = true and status = 'active';
create unique index if not exists recruitment_onboarding_handoffs_active_candidate_uidx
  on public.recruitment_onboarding_handoffs (candidate_id)
  where status not in ('cancelled');
create index if not exists recruitment_status_mappings_lookup_idx
  on public.recruitment_status_mappings(source_table, source_field, source_value);
create index if not exists recruitment_appointment_templates_status_idx
  on public.recruitment_appointment_letter_templates(status, is_active);
create index if not exists recruitment_appointment_letters_candidate_status_idx
  on public.recruitment_appointment_letters(candidate_id, status);
create index if not exists recruitment_appointment_letters_offer_idx
  on public.recruitment_appointment_letters(candidate_offer_id);
create index if not exists recruitment_appointment_letters_job_idx
  on public.recruitment_appointment_letters(job_id);
create index if not exists recruitment_appointment_letters_issued_idx
  on public.recruitment_appointment_letters(issued_at desc);
create index if not exists recruitment_onboarding_handoffs_candidate_status_idx
  on public.recruitment_onboarding_handoffs(candidate_id, status);
create index if not exists recruitment_onboarding_handoffs_employee_idx
  on public.recruitment_onboarding_handoffs(employee_id);
create index if not exists recruitment_onboarding_handoffs_requested_idx
  on public.recruitment_onboarding_handoffs(requested_at desc);

drop trigger if exists recruitment_status_mappings_updated_at on public.recruitment_status_mappings;
create trigger recruitment_status_mappings_updated_at before update on public.recruitment_status_mappings for each row execute function public.touch_updated_at();
drop trigger if exists recruitment_appointment_letter_templates_updated_at on public.recruitment_appointment_letter_templates;
create trigger recruitment_appointment_letter_templates_updated_at before update on public.recruitment_appointment_letter_templates for each row execute function public.touch_updated_at();
drop trigger if exists recruitment_appointment_letters_updated_at on public.recruitment_appointment_letters;
create trigger recruitment_appointment_letters_updated_at before update on public.recruitment_appointment_letters for each row execute function public.touch_updated_at();
drop trigger if exists recruitment_onboarding_handoffs_updated_at on public.recruitment_onboarding_handoffs;
create trigger recruitment_onboarding_handoffs_updated_at before update on public.recruitment_onboarding_handoffs for each row execute function public.touch_updated_at();

alter table public.recruitment_status_mappings enable row level security;
alter table public.recruitment_appointment_letter_templates enable row level security;
alter table public.recruitment_appointment_letters enable row level security;
alter table public.recruitment_onboarding_handoffs enable row level security;

create or replace function public.can_view_appointment_letter(letter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_appointment_letters()
      or coalesce((
        select public.can_view_recruitment_candidate(l.candidate_id)
        from public.recruitment_appointment_letters l
        where l.id = letter_id
      ), false);
$$;

create or replace function public.can_manage_recruitment_handoffs()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_recruitment()
      or public.has_permission('permission.recruitment.handoffs.manage');
$$;

create or replace function public.can_view_recruitment_handoff(handoff_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_recruitment_handoffs()
      or coalesce((
        select public.can_view_recruitment_candidate(h.candidate_id)
            or (h.employee_id is not null and public.can_view_employee(h.employee_id))
        from public.recruitment_onboarding_handoffs h
        where h.id = handoff_id
      ), false);
$$;

drop policy if exists "recruitment_status_mappings_select" on public.recruitment_status_mappings;
create policy "recruitment_status_mappings_select" on public.recruitment_status_mappings for select to authenticated
  using (public.has_permission('permission.recruitment.view'));
drop policy if exists "recruitment_status_mappings_insert" on public.recruitment_status_mappings;
create policy "recruitment_status_mappings_insert" on public.recruitment_status_mappings for insert to authenticated
  with check (public.can_manage_recruitment());
drop policy if exists "recruitment_status_mappings_update" on public.recruitment_status_mappings;
create policy "recruitment_status_mappings_update" on public.recruitment_status_mappings for update to authenticated
  using (public.can_manage_recruitment())
  with check (public.can_manage_recruitment());
drop policy if exists "recruitment_status_mappings_delete" on public.recruitment_status_mappings;
create policy "recruitment_status_mappings_delete" on public.recruitment_status_mappings for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "recruitment_appointment_letter_templates_select" on public.recruitment_appointment_letter_templates;
create policy "recruitment_appointment_letter_templates_select" on public.recruitment_appointment_letter_templates for select to authenticated
  using (public.has_permission('permission.recruitment.view') or public.can_manage_appointment_letters());
drop policy if exists "recruitment_appointment_letter_templates_insert" on public.recruitment_appointment_letter_templates;
create policy "recruitment_appointment_letter_templates_insert" on public.recruitment_appointment_letter_templates for insert to authenticated
  with check (public.can_manage_appointment_letters());
drop policy if exists "recruitment_appointment_letter_templates_update" on public.recruitment_appointment_letter_templates;
create policy "recruitment_appointment_letter_templates_update" on public.recruitment_appointment_letter_templates for update to authenticated
  using (public.can_manage_appointment_letters())
  with check (public.can_manage_appointment_letters());
drop policy if exists "recruitment_appointment_letter_templates_delete" on public.recruitment_appointment_letter_templates;
create policy "recruitment_appointment_letter_templates_delete" on public.recruitment_appointment_letter_templates for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "recruitment_appointment_letters_select" on public.recruitment_appointment_letters;
create policy "recruitment_appointment_letters_select" on public.recruitment_appointment_letters for select to authenticated
  using (public.can_view_appointment_letter(id));
drop policy if exists "recruitment_appointment_letters_insert" on public.recruitment_appointment_letters;
create policy "recruitment_appointment_letters_insert" on public.recruitment_appointment_letters for insert to authenticated
  with check (public.can_manage_appointment_letters() and public.can_view_recruitment_candidate(candidate_id));
drop policy if exists "recruitment_appointment_letters_update" on public.recruitment_appointment_letters;
create policy "recruitment_appointment_letters_update" on public.recruitment_appointment_letters for update to authenticated
  using (public.can_manage_appointment_letters())
  with check (public.can_manage_appointment_letters() and public.can_view_recruitment_candidate(candidate_id));
drop policy if exists "recruitment_appointment_letters_delete" on public.recruitment_appointment_letters;
create policy "recruitment_appointment_letters_delete" on public.recruitment_appointment_letters for delete to authenticated
  using (public.has_role('role.admin'));

drop policy if exists "recruitment_onboarding_handoffs_select" on public.recruitment_onboarding_handoffs;
create policy "recruitment_onboarding_handoffs_select" on public.recruitment_onboarding_handoffs for select to authenticated
  using (public.can_view_recruitment_handoff(id));
drop policy if exists "recruitment_onboarding_handoffs_insert" on public.recruitment_onboarding_handoffs;
create policy "recruitment_onboarding_handoffs_insert" on public.recruitment_onboarding_handoffs for insert to authenticated
  with check (public.can_manage_recruitment_handoffs() and public.can_view_recruitment_candidate(candidate_id));
drop policy if exists "recruitment_onboarding_handoffs_update" on public.recruitment_onboarding_handoffs;
create policy "recruitment_onboarding_handoffs_update" on public.recruitment_onboarding_handoffs for update to authenticated
  using (public.can_manage_recruitment_handoffs())
  with check (public.can_manage_recruitment_handoffs() and public.can_view_recruitment_candidate(candidate_id));
drop policy if exists "recruitment_onboarding_handoffs_delete" on public.recruitment_onboarding_handoffs;
create policy "recruitment_onboarding_handoffs_delete" on public.recruitment_onboarding_handoffs for delete to authenticated
  using (public.has_role('role.admin'));

commit;
