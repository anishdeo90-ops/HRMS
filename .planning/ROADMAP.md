# Roadmap: HireRabbits ATS to HRMS Upgrade

**Source:** `HRMS_SUPERCHARGED_BUILD_PLAN.md`
**Recovered:** 2026-05-13
**Current position:** Phase 10 recruitment unification is in progress.

## Phase Status

| Phase | Name | Status | Evidence |
|-------|------|--------|----------|
| 0 | Foundation and Planning | Complete | Metadata scripts, generated metadata, migration `20260510000000_metadata_governance.sql`, tests passing |
| 1 | Employee Core and Organization Setup | Complete | Employee/organization APIs, People UI, migration `20260510220000_employee_core_organization.sql`, tests passing |
| 2 | Attendance, Check-ins, and Shifts | Complete | Time UI, attendance/shift/overtime APIs, migration `20260511160000_attendance_checkins_shifts.sql`, tests passing |
| 3 | Leave Management | Complete | Leave APIs and helpers, migration `20260511190000_leave_management.sql`, tests passing |
| 4 | Expenses, Advances, and Travel | Complete | Metadata, migration `20260512120000_expenses_advances_travel.sql`, APIs, UI, tests, live Supabase push, and browser checks passed |
| 4.5 | Role-Based Navigation Architecture | Complete | `lib/nav/config.ts`, config-driven sidebar, role-aware dashboard context, disabled future routes, tests/build/browser checks passed |
| 5 | Payroll, Salary, Tax, and Benefits | Complete | Payroll metadata, migration `20260515130000_payroll_salary_tax_benefits.sql`, APIs, UI, nav enablement, tests, build, live Supabase push, and browser checks passed |
| 6 | Performance Management | Complete | Performance metadata, migration `20260515160000_performance_management.sql`, APIs, UI, nav enablement, tests, build, live Supabase push, and browser/API checks passed |
| 7 | Employee Lifecycle | Complete | Lifecycle metadata, migration, APIs, UI, nav enablement, tests, build, and live migration completed |
| 8 | Employee Self-Service Portal | Complete | Self-service metadata, notifications migration, APIs, UI, nav enablement, tests, build, and live migration completed |
| 9 | Reports, Dashboards, Notifications, Automation | Complete | Metadata, migration, APIs, UI, tests, build, live migration, and route guard/CSS checks passed; signed-in browser pass awaits auth profile |
| 10 | Recruitment Unification | In Progress | Phase 10 planning artifacts created and team lanes dispatched |

## Phase 0: Foundation and Planning

**Goal:** Prepare the codebase for HRMS without breaking ATS.

**Status:** Complete.

**Delivered:**
- Metadata registry and YAML source structure.
- Generated metadata TypeScript constants and Supabase seed SQL.
- Metadata validation, hardcoding, lineage, and SQL governance tests.
- Brownfield-safe constraints documented in project instructions and build plan.

## Phase 1: Employee Core and Organization Setup

**Goal:** Add employee master data and organization structure.

**Status:** Complete.

**Delivered:**
- Employee, company, branch, department, grade, employment type, department approver, and employee document database structures.
- Employee and organization API routes under `/api/hrms`.
- People UI routes: `/people/employees` and `/people/organization`.
- Candidate-to-employee conversion endpoint that avoids unexpected ATS mutation.

## Phase 2: Attendance, Check-ins, and Shifts

**Goal:** Replicate the HRMS attendance foundation.

**Status:** Complete.

**Delivered:**
- Attendance days, employee check-ins, correction requests, shift setup, shift assignments, rosters, shift requests, and overtime slips.
- Time UI routes: `/time/attendance`, `/time/shifts`, `/time/approvals`.
- Scoped authorization helpers and route visibility.

## Phase 3: Leave Management

**Goal:** Add complete leave policy and self-service leave.

**Status:** Complete.

**Delivered:**
- Leave types, periods, policies, assignments, allocations, applications, ledger, holiday lists, block lists, compensatory requests, and encashments.
- Leave API routes for setup, applications, approvals, balances, ledger, compensatory requests, and encashments.
- Scoped leave authorization helpers and tests.

## Phase 4: Expenses, Advances, and Travel

**Goal:** Add employee expense workflows.

**Status:** Complete.

**Tables:**
- `expense_claims`
- `expense_claim_items`
- `expense_claim_types`
- `employee_advances`
- `travel_requests`
- `travel_itineraries`
- `vehicle_logs`
- `vehicle_services`

**Routes:**
- `/expenses`
- `/expenses/claims`
- `/expenses/advances`
- `/travel`
- `/vehicles`

**Key workflows:**
- Expense claim with attachments.
- Advance request and settlement state.
- Travel request approval.
- Vehicle expense tracking.
- Approval queue and reports.

**Delivered:**
- Governed metadata, RLS migration, API routes, finance helpers, and UI routes.
- Finance sidebar visibility through typed role-aware navigation config.
- Live Supabase migration applied to project `gzjoansgnjsnhcezyxbg`.

## Pre-Phase 5: Role-Based Navigation Architecture

**Goal:** Prevent sidebar sprawl and role leakage before payroll/performance/lifecycle/report routes are added.

**Status:** Complete.

**Delivered:**
- `lib/nav/config.ts` defines typed `NAV_CONFIG`, `NavSection`, `NavItem`, `getNavForRole`, and `getSectionsForRole`.
- `components/sidebar.tsx` renders enabled config items per role and hides empty section headers.
- Future Phase 5-10 routes are present with `enabled: false`.
- Dashboard shows a minimal role-aware context line.

## Phase 5: Payroll, Salary, Tax, and Benefits

**Goal:** Upgrade existing CTC/offers into payroll-grade salary operations.

**Status:** Complete.

**Tables:**
- `salary_components`
- `salary_structures`
- `salary_structure_details`
- `salary_structure_assignments`
- `payroll_periods`
- `payroll_entries`
- `salary_slips`
- `salary_slip_lines`
- `additional_salaries`
- `employee_incentives`
- `salary_withholdings`
- `income_tax_slabs`
- `employee_tax_exemption_declarations`
- `employee_benefit_applications`
- `employee_benefit_claims`
- `gratuity_rules`

**Routes:**
- `/payroll`
- `/payroll/salary-structures`
- `/payroll/runs`
- `/payroll/salary-slips`
- `/payroll/tax-benefits`

**Delivered:**
- Governed payroll metadata, RLS migration, helpers, authorization, API routes, UI routes, and payroll navigation enablement.
- Employee self-service-safe salary slip and tax/benefit surfaces.
- Live Supabase migration applied after adapting the existing governed `salary_components` table.

## Phase 6: Performance Management

**Goal:** Add goals, KRAs, appraisals, and feedback.

**Status:** Complete.

**Delivered:**
- Governed performance metadata, RLS migration, helpers, authorization, API routes, UI routes, and performance navigation enablement.
- Goal/KRA, appraisal cycle, appraisal, feedback, and criteria APIs aligned to the live Phase 6 schema.
- Live Supabase migration applied to the linked project and browser-verified signed in on `localhost:3001`.

## Phase 7: Employee Lifecycle

**Goal:** Add lifecycle events after hiring.

**Status:** Complete.

## Phase 8: Employee Self-Service Portal

**Goal:** Give employees a simplified HRMS experience.

**Status:** Complete.

## Phase 9: Reports, Dashboards, Notifications, Automation

**Goal:** Add HRMS reporting and scheduled operations.

**Status:** Complete; signed-in browser verification pending on an available auth session.

**Plan:** `.planning/phases/09-reports-dashboards-notifications-automation/09-PLAN.md`

**Delivered:**
- Governed report, dashboard, notification-rule, and automation metadata with generated artifacts.
- Helper-backed RLS migration for report runs/exports, dashboard layouts/widgets, notification rules, automation schedules/runs, and automation notifications.
- Reports, dashboard, notification-rule, and automation APIs plus `/reports` and `/reports/dashboards` UI routes.
- Reports navigation enabled for authorized HR, finance, and payroll roles.
- Live Supabase migration applied through `20260516000000`.

## Phase 10: Recruitment Unification

**Goal:** Align the existing ATS with HRMS recruitment terminology without losing current HireRabbits workflows.

**Status:** Pending.

**Plan:** `.planning/phases/10-recruitment-unification/10-PLAN.md`

## Next Command

Continue Phase 10 recruitment unification integration after Anish, Trisha, and Tannu report lane status.
