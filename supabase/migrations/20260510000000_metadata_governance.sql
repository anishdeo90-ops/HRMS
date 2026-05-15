-- Metadata Governance Foundation
-- Local contract migration only. Do not push or apply until remote/local migration drift is reconciled.

create or replace function public.has_metadata_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select false;
$$;

create table if not exists metadata_registry (
  key text primary key,
  label text not null,
  domain text not null,
  owner text not null,
  source_ref jsonb not null default '{}'::jsonb,
  introduced_in_phase integer not null,
  db_table text not null,
  ts_export text not null,
  api_routes jsonb not null default '[]'::jsonb,
  ui_surfaces jsonb not null default '[]'::jsonb,
  tests jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists metadata_versions (
  id uuid primary key default gen_random_uuid(),
  registry_key text not null references metadata_registry(key) on delete cascade,
  version integer not null,
  checksum text not null,
  created_at timestamptz not null default now()
);

create table if not exists metadata_lineage (
  id uuid primary key default gen_random_uuid(),
  registry_key text not null references metadata_registry(key) on delete cascade,
  requirement_key text not null,
  db_artifact text not null,
  typescript_artifact text not null,
  api_artifact text not null,
  ui_artifact text not null,
  test_artifact text not null,
  audit_artifact text not null,
  created_at timestamptz not null default now()
);

create table if not exists roles (
  key text primary key references metadata_registry(key) on delete restrict,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists permissions (
  key text primary key references metadata_registry(key) on delete restrict,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists role_permissions (
  role_key text not null references roles(key) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_key, permission_key)
);

create table if not exists app_routes (
  key text primary key references metadata_registry(key) on delete restrict,
  path text,
  sidebar jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists workflow_definitions (
  key text primary key references metadata_registry(key) on delete restrict,
  domain text not null,
  created_at timestamptz not null default now()
);

create table if not exists workflow_states (
  key text primary key references metadata_registry(key) on delete restrict,
  workflow_key text,
  state_key text not null,
  is_terminal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists workflow_transitions (
  id uuid primary key default gen_random_uuid(),
  workflow_key text,
  from_state text not null,
  to_state text not null,
  permission_key text,
  created_at timestamptz not null default now()
);

create table if not exists form_schemas (
  key text primary key references metadata_registry(key) on delete restrict,
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists field_definitions (
  key text primary key,
  form_key text references form_schemas(key) on delete cascade,
  field_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists report_definitions (
  key text primary key references metadata_registry(key) on delete restrict,
  definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists approval_rules (
  key text primary key references metadata_registry(key) on delete restrict,
  resolver text not null,
  rule_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists approval_steps (
  id uuid primary key default gen_random_uuid(),
  approval_rule_key text references approval_rules(key) on delete cascade,
  step_order integer not null,
  approver_resolver text not null,
  created_at timestamptz not null default now()
);

create table if not exists salary_components (
  key text primary key references metadata_registry(key) on delete restrict,
  category text not null,
  calculation text not null,
  taxable boolean not null default false,
  recurrence text not null,
  effective_dates jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists leave_types (
  key text primary key references metadata_registry(key) on delete restrict,
  accrual text not null,
  carry_forward boolean not null default false,
  encashment boolean not null default false,
  negative_balance boolean not null default false,
  holiday_weekend_behavior text not null,
  approval_behavior text not null,
  created_at timestamptz not null default now()
);

alter table metadata_registry enable row level security;
alter table metadata_versions enable row level security;
alter table metadata_lineage enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table app_routes enable row level security;
alter table workflow_definitions enable row level security;
alter table workflow_states enable row level security;
alter table workflow_transitions enable row level security;
alter table form_schemas enable row level security;
alter table field_definitions enable row level security;
alter table report_definitions enable row level security;
alter table approval_rules enable row level security;
alter table approval_steps enable row level security;
alter table salary_components enable row level security;
alter table leave_types enable row level security;

drop policy if exists metadata_registry_fail_closed on metadata_registry;
create policy metadata_registry_fail_closed on metadata_registry
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists metadata_versions_fail_closed on metadata_versions;
create policy metadata_versions_fail_closed on metadata_versions
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists metadata_lineage_fail_closed on metadata_lineage;
create policy metadata_lineage_fail_closed on metadata_lineage
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists roles_fail_closed on roles;
create policy roles_fail_closed on roles
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists permissions_fail_closed on permissions;
create policy permissions_fail_closed on permissions
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists role_permissions_fail_closed on role_permissions;
create policy role_permissions_fail_closed on role_permissions
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists app_routes_fail_closed on app_routes;
create policy app_routes_fail_closed on app_routes
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists workflow_definitions_fail_closed on workflow_definitions;
create policy workflow_definitions_fail_closed on workflow_definitions
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists workflow_states_fail_closed on workflow_states;
create policy workflow_states_fail_closed on workflow_states
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists workflow_transitions_fail_closed on workflow_transitions;
create policy workflow_transitions_fail_closed on workflow_transitions
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists form_schemas_fail_closed on form_schemas;
create policy form_schemas_fail_closed on form_schemas
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists field_definitions_fail_closed on field_definitions;
create policy field_definitions_fail_closed on field_definitions
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists report_definitions_fail_closed on report_definitions;
create policy report_definitions_fail_closed on report_definitions
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists approval_rules_fail_closed on approval_rules;
create policy approval_rules_fail_closed on approval_rules
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists approval_steps_fail_closed on approval_steps;
create policy approval_steps_fail_closed on approval_steps
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists salary_components_fail_closed on salary_components;
create policy salary_components_fail_closed on salary_components
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));

drop policy if exists leave_types_fail_closed on leave_types;
create policy leave_types_fail_closed on leave_types
  for all to authenticated
  using (public.has_metadata_permission('permission.metadata.manage'))
  with check (public.has_metadata_permission('permission.metadata.manage'));
