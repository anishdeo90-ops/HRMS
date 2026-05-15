# Roadmap: HireRabbits ATS to HRMS Upgrade

**Source:** `HRMS_SUPERCHARGED_BUILD_PLAN.md`
**Recovered:** 2026-05-13
**Current position:** Phase 4 is next.

## Phase Status

| Phase | Name | Status | Evidence |
|-------|------|--------|----------|
| 0 | Foundation and Planning | Complete | Metadata scripts, generated metadata, migration `20260510000000_metadata_governance.sql`, tests passing |
| 1 | Employee Core and Organization Setup | Complete | Employee/organization APIs, People UI, migration `20260510220000_employee_core_organization.sql`, tests passing |
| 2 | Attendance, Check-ins, and Shifts | Complete | Time UI, attendance/shift/overtime APIs, migration `20260511160000_attendance_checkins_shifts.sql`, tests passing |
| 3 | Leave Management | Complete | Leave APIs and helpers, migration `20260511190000_leave_management.sql`, tests passing |
| 4 | Expenses, Advances, and Travel | Ready to execute planning | Metadata seed references exist, implementation absent |
| 5 | Payroll, Salary, Tax, and Benefits | Pending | Salary metadata exists, payroll-grade app implementation absent |
| 6 | Performance Management | Pending | Not implemented |
| 7 | Employee Lifecycle | Pending | Not implemented |
| 8 | Employee Self-Service Portal | Pending | Not implemented as a full portal |
| 9 | Reports, Dashboards, Notifications, Automation | Pending | ATS automation exists; HRMS reporting/automation remains pending |
| 10 | Recruitment Unification | Pending | Existing ATS remains; HRMS terminology unification pending |

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

**Status:** Next.

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

## Phase 5: Payroll, Salary, Tax, and Benefits

**Goal:** Upgrade existing CTC/offers into payroll-grade salary operations.

**Status:** Pending.

## Phase 6: Performance Management

**Goal:** Add goals, KRAs, appraisals, and feedback.

**Status:** Pending.

## Phase 7: Employee Lifecycle

**Goal:** Add lifecycle events after hiring.

**Status:** Pending.

## Phase 8: Employee Self-Service Portal

**Goal:** Give employees a simplified HRMS experience.

**Status:** Pending.

## Phase 9: Reports, Dashboards, Notifications, Automation

**Goal:** Add HRMS reporting and scheduled operations.

**Status:** Pending.

## Phase 10: Recruitment Unification

**Goal:** Align the existing ATS with HRMS recruitment terminology without losing current HireRabbits workflows.

**Status:** Pending.

## Next Command

`$gsd-execute-phase 4`
