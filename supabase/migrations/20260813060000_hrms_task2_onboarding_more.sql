create table if not exists hrms.onboarding_cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  case_code text not null,
  ats_candidate_id uuid not null references public.candidates(id) on delete cascade,
  ats_job_id uuid references public.jobs(id) on delete set null,
  status text not null default 'pending_approval' check (status in ('pending_approval','approved','rejected','offer_sent','offer_declined','documents_pending','documents_submitted','joined')),
  proposed_doj date,
  actual_doj date,
  decline_reason text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, case_code),
  unique (org_id, ats_candidate_id)
);

create table if not exists hrms.document_types (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  is_mandatory boolean not null default true,
  requires_expiry boolean not null default false,
  applies_to text not null default 'all',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists hrms.onboarding_forms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  form_name text not null,
  applies_to text not null default 'all',
  sections integer not null default 1,
  documents_required integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, form_name)
);

create table if not exists hrms.employee_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid references hrms.employees(id) on delete cascade,
  onboarding_case_id uuid references hrms.onboarding_cases(id) on delete cascade,
  document_type_id uuid references hrms.document_types(id) on delete restrict,
  file_name text,
  file_url text,
  uploaded_at timestamptz,
  expires_at date,
  status text not null default 'pending' check (status in ('pending','uploaded','verified','rejected')),
  remarks text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists employee_documents_case_type_idx
  on hrms.employee_documents(org_id, onboarding_case_id, document_type_id)
  where onboarding_case_id is not null and document_type_id is not null;

create table if not exists hrms.assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  asset_code text not null,
  category text not null,
  make text,
  model text,
  serial_number text,
  purchase_date date,
  status text not null default 'in_stock' check (status in ('in_stock','allocated','in_repair','retired')),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, asset_code)
);

create table if not exists hrms.asset_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references hrms.assets(id) on delete cascade,
  employee_id uuid not null references hrms.employees(id) on delete cascade,
  allocated_on date not null default current_date,
  returned_on date,
  remarks text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists hrms.announcement_categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists hrms.announcements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  body text,
  category_id uuid references hrms.announcement_categories(id) on delete set null,
  audience_scope text not null default 'organization' check (audience_scope in ('organization','branch','department','business_unit')),
  audience_scope_id uuid,
  is_pinned boolean not null default false,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hrms.expense_types (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists hrms.expense_claims (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  claim_code text not null,
  employee_id uuid not null references hrms.employees(id) on delete cascade,
  claim_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reason text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, claim_code)
);

create table if not exists hrms.expense_claim_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  claim_id uuid not null references hrms.expense_claims(id) on delete cascade,
  expense_type_id uuid references hrms.expense_types(id) on delete set null,
  expense_date date not null,
  amount_paise integer not null check (amount_paise >= 0),
  description text,
  has_receipt boolean not null default false,
  created_at timestamptz not null default now()
);

do $$
declare
  table_ref text;
  rel_name text;
begin
  foreach table_ref in array array[
    'hrms.onboarding_cases',
    'hrms.document_types',
    'hrms.onboarding_forms',
    'hrms.employee_documents',
    'hrms.assets',
    'hrms.asset_assignments',
    'hrms.announcement_categories',
    'hrms.announcements',
    'hrms.expense_types',
    'hrms.expense_claims',
    'hrms.expense_claim_lines'
  ] loop
    rel_name := split_part(table_ref, '.', 2);
    execute format('alter table %s enable row level security', table_ref);
    execute format('drop policy if exists "%s_select_member" on %s', replace(table_ref, '.', '_'), table_ref);
    execute format('create policy "%s_select_member" on %s for select to authenticated using (exists (select 1 from public.org_members m where m.org_id = %I.org_id and m.profile_id = (select auth.uid()) and m.is_active))', replace(table_ref, '.', '_'), table_ref, rel_name);
    execute format('drop policy if exists "%s_write_hr" on %s', replace(table_ref, '.', '_'), table_ref);
    execute format('create policy "%s_write_hr" on %s for all to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in (''admin'',''hr_manager''))) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in (''admin'',''hr_manager'')))', replace(table_ref, '.', '_'), table_ref);
  end loop;
end $$;

create or replace view public.hrms_job_openings
with (security_invoker = true)
as
select
  j.id,
  j.title as job_title,
  case
    when j.min_salary is not null and j.max_salary is not null then concat(j.min_salary::text, ' - ', j.max_salary::text)
    else null
  end as experience_years,
  (j.max_salary * 100)::integer as budget_annual_paise,
  coalesce(j.headcount, 1) as openings,
  case j.priority when 'urgent' then 'critical' when 'normal' then 'medium' else j.priority end as priority,
  initcap(replace(j.status, '_', ' ')) as status,
  p.name as created_by,
  j.created_at,
  j.opened_at as in_progress_at,
  coalesce(j.closed_at, j.filled_at) as closed_at
from public.jobs j
left join public.profiles p on p.id = j.created_by
where coalesce(j.is_deleted, false) = false;

create or replace view public.hrms_onboarding_view
with (security_invoker = true)
as
select
  oc.id,
  oc.org_id,
  oc.case_code,
  c.name as candidate_name,
  c.email,
  c.mobile,
  coalesce(md.name, co.designation, j.title) as designation,
  j.department,
  ms.name as branch,
  (coalesce(co.annual_ctc, c.offered_salary) * 100)::integer as offered_annual_salary_paise,
  (j.max_salary * 100)::integer as budget_annual_paise,
  oc.proposed_doj,
  oc.actual_doj,
  oc.status,
  coalesce(doc_counts.received, 0)::integer as documents_received,
  coalesce(req_counts.required, 0)::integer as documents_required,
  oc.ats_candidate_id::text as source_candidate_id,
  oc.decline_reason,
  oc.created_at,
  oc.updated_at
from hrms.onboarding_cases oc
join public.candidates c on c.id = oc.ats_candidate_id
left join public.jobs j on j.id = oc.ats_job_id
left join public.candidate_offers co on co.candidate_id = c.id and co.is_deleted = false
left join public.masters md on md.id = c.designation_id
left join public.masters ms on ms.id = c.site_id
left join lateral (
  select count(*) as required
  from hrms.document_types dt
  where dt.org_id = oc.org_id and dt.is_active and dt.is_mandatory
) req_counts on true
left join lateral (
  select count(*) as received
  from hrms.employee_documents ed
  where ed.org_id = oc.org_id
    and ed.onboarding_case_id = oc.id
    and ed.status in ('uploaded','verified')
) doc_counts on true;

grant usage on schema hrms to authenticated, service_role;
grant select, insert, update, delete on all tables in schema hrms to authenticated;
grant all on all tables in schema hrms to service_role;
grant all on all routines in schema hrms to service_role;
grant select on public.hrms_job_openings, public.hrms_onboarding_view to authenticated;

with org as (select id from public.organizations where slug = 'hirerabbits')
insert into hrms.announcement_categories (org_id, name)
select org.id, v.name
from org
cross join (values ('Policy'), ('Payroll'), ('Holiday'), ('General')) as v(name)
on conflict (org_id, name) do nothing;

with org as (select id from public.organizations where slug = 'hirerabbits')
insert into hrms.expense_types (org_id, name, code)
select org.id, v.name, v.code
from org
cross join (values ('Travel','TRV'), ('Meals','MEAL'), ('Internet','NET'), ('Medical','MED')) as v(name, code)
on conflict (org_id, name) do nothing;

with org as (select id from public.organizations where slug = 'hirerabbits')
insert into hrms.document_types (org_id, name, category, is_mandatory, requires_expiry, applies_to)
select org.id, v.name, v.category, true, v.requires_expiry, 'all'
from org
cross join (values
  ('PAN Card','Identity',false),
  ('Aadhaar Card','Identity',false),
  ('Address Proof','Address',false),
  ('Education Certificate','Education',false),
  ('Experience Letter','Employment',false),
  ('Bank Proof','Payroll',false),
  ('Passport Photo','Identity',false),
  ('Relieving Letter','Employment',false)
) as v(name, category, requires_expiry)
on conflict (org_id, name) do nothing;
