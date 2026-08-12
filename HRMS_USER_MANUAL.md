# HireRabbits HRMS User Manual

This manual covers the HRMS backend and UI wiring completed so far. The HRMS is being added beside the existing ATS, using the same Next.js app and Supabase Auth.

## Current Status

- HRMS foundation migration: `supabase/migrations/20260812114859_hrms_foundation.sql`
- Applied to linked Supabase project: yes
- Migration history marked applied: `20260812114859`
- Main live backend slice: employee directory and organization structure masters
- Runtime API prefix: `/api/hrms`
- Local app route: `/hrms`

Verified after apply:

- `hrms.employees` exists
- `hrms.employee_assignments` exists
- `public.hrms_employee_directory` exists
- HRMS RPCs exist:
  - `hrms_options`
  - `hrms_create_employee`
  - `hrms_master_rows`
  - `hrms_save_master`
  - `hrms_set_master_active`
- Seed created `1` org, `3` org members, and `3` HRMS employees from existing profiles.
- `supabase db lint --linked --schema public,hrms --fail-on error` returned no schema errors.

## Login And Access

The HRMS uses the existing Supabase login:

```text
/login
```

After login, users can open:

```text
/hrms
/hrms/team/directory
/hrms/team/directory/add
/hrms/settings
/hrms/settings/masters/branch
/hrms/settings/masters/business-unit
/hrms/settings/masters/department
/hrms/settings/masters/sub-department
/hrms/settings/masters/designation
/hrms/settings/masters/employment-type
/hrms/settings/masters/function-role
```

Unauthenticated API calls return `401`.

## Role Behavior

Role checks currently use `public.profiles.role`.

| Login type | HRMS access |
| --- | --- |
| Admin | Can view all org employees, create employees, manage HRMS org masters |
| HR Manager | Can view all org employees, create employees, manage HRMS org masters |
| Recruiter | Keeps existing ATS access. In HRMS, can view own employee record and direct reports only if set as reporting manager |
| Employee | Can view own employee record only |
| Reporting Manager | Can view own record plus employees assigned to them through `employee_assignments.reporting_manager_id` |

RLS is enabled on HRMS tables. Public API access goes through explicit grants, `security_invoker` view access, and invoker RPC functions. The migration does not use `auth.role()` or `SECURITY DEFINER`.

## Employee Directory

Route:

```text
/hrms/team/directory
```

Backend:

```text
GET /api/hrms/employees
```

Data source:

```text
public.hrms_employee_directory
```

The directory is now connected to Supabase instead of demo data. It supports:

- Current employees
- Separated employees tab
- Search
- Department filter
- Designation filter
- Employment type filter
- Employee count from live API data

## Add Employee

Route:

```text
/hrms/team/directory/add
```

Backend:

```text
POST /api/hrms/employees
```

Database function:

```text
public.hrms_create_employee(payload jsonb)
```

Required fields:

- First name
- Last name
- Work email

Supported fields wired to backend:

- Employee code, auto-generated if blank
- Personal fields: gender, date of birth, blood group, marital status, personal email, mobile, address
- Assignment fields: branch, department, sub-department, designation, function role, employment type, shift, reporting manager, assistant manager, buddy
- Payroll enabled flag
- Country, state, city, and qualifications stored in `custom_fields`

Creating an employee writes:

- `hrms.employees`
- `hrms.employee_assignments`
- `public.entity_events` with `employee.created`

## Employee Detail

Route:

```text
/hrms/team/directory/[id]
```

Backend:

```text
GET /api/hrms/employees/[id]
```

The employee spine is live from Supabase. Some child tabs still use demo data until their tables are built:

- Documents
- Education
- Family
- Goals
- Assets
- Separation
- Tickets

## HRMS Options

Backend:

```text
GET /api/hrms/options
```

Database function:

```text
public.hrms_options()
```

Used by employee add and settings screens for:

- Branches
- Business units
- Departments and sub-departments
- Designations
- Function roles
- Employment types
- Shifts
- Active employees

## Organization Structure Masters

Route pattern:

```text
/hrms/settings/masters/[type]
```

Backend:

```text
GET /api/hrms/masters/[type]
POST /api/hrms/masters/[type]
PATCH /api/hrms/masters/[type]
```

Database functions:

```text
public.hrms_master_rows(master_slug text)
public.hrms_save_master(master_slug text, payload jsonb)
public.hrms_set_master_active(master_slug text, row_id uuid, active boolean)
```

Backend-connected master types:

- `branch`
- `business-unit`
- `department`
- `sub-department`
- `designation`
- `employment-type`
- `function-role`

Still demo-only:

- `announcement-category`
- `expense-type`

Masters are soft-deactivated with `is_active = false`; they are not hard-deleted because historical employee assignments can still point to them.

## Database Shape Added

Public shared tables:

- `public.organizations`
- `public.org_members`
- `public.organization_products`
- `public.sequences`
- `public.entity_links`
- `public.entity_events`

HRMS tables:

- `hrms.branches`
- `hrms.business_units`
- `hrms.departments`
- `hrms.function_roles`
- `hrms.designations`
- `hrms.employment_types`
- `hrms.shifts`
- `hrms.employees`
- `hrms.employee_assignments`

Important model rules:

- Employee identity lives in `hrms.employees`.
- Current department, designation, manager, branch, type, and shift live in `hrms.employee_assignments`.
- Employee directory reads the current effective assignment.
- Sub-department is represented by `hrms.departments.parent_id`, not a separate table.
- Employee code uses `public.sequences` with the `HR-` prefix.
- ATS to HRMS lineage uses `public.entity_links` and `public.entity_events`.

## Verification Commands

Run after HRMS backend edits:

```powershell
node scripts/check-hrms-foundation.mjs
npm.cmd run build
supabase db lint --linked --schema public,hrms --fail-on error
```

The local Supabase database is not currently running on `127.0.0.1:54322`, so local migration list/lint commands may fail unless Supabase local services are started.

## Known Gaps

The first backend slice deliberately stops at the employee spine and org masters. These pages still need real backend tables/routes:

- Work Hours and Shifts full CRUD
- Attendance and in-out
- Leave settings and leave requests
- Approvals
- Documents and onboarding
- Performance
- Reimbursements
- Tickets
- Assets
- Holidays
- Permissions UI

Remote migration history still contains older remote versions that are missing locally. This HRMS migration is applied and marked applied, but future normal `supabase db push` may still warn until the older migration history is repaired or pulled into the repo.
