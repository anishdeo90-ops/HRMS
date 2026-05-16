# Agent 0E Workflow Enforcement Audit

Wave 0 discovery only. Source files were read but not edited.

## Summary

- Scope: `metadata/workflows.yaml`, workflow table migrations, workflow API routes, and existing workflow tests.
- DB pattern: status columns generally have CHECK constraints for valid labels, but no DB-level transition constraints.
- API pattern: several routes perform authorization but do not validate the current workflow state against metadata transitions before updating.
- Test pattern: most tests assert route presence, auth helper usage, embeds, and token presence; they do not prove invalid transitions are rejected or side effects occur.

## Workflow Findings

### Leave Application

- **HIGH**: Transition enforcement is partial. `approve`/`reject` require current `submitted`, but `cancel` does not validate against metadata transitions and `update` can write normalized caller-writable statuses over terminal states.
  - Metadata: `workflow.leave.application`
  - API: `app/api/hrms/leave/applications/[id]/route.ts`
- **HIGH**: Approval writes `leave_ledger_entries`, but the leave status update happens before the ledger insert with no transaction. A ledger failure can leave an approved leave without a ledger row.
  - API: `app/api/hrms/leave/applications/[id]/route.ts`
- **DB**: `leave_applications.status` is `text` with valid-state CHECK only.
  - Migration: `supabase/migrations/20260511190000_leave_management.sql`

### Expense Claim

- **CRITICAL**: No allowed-transition validation. The route reads current record for auth target, then allows `approve`, `reject`, `cancel`, or `paid` from any current status.
  - Metadata: `workflow.expense_claim.status`
  - API: `app/api/hrms/expenses/claims/[id]/route.ts`
- **CRITICAL**: Expense advance settlement side effect is absent. `expense_claims` has no advance settlement link in the route, and PATCH does not update `employee_advances`.
  - API: `app/api/hrms/expenses/claims/[id]/route.ts`
  - Migration: `supabase/migrations/20260512120000_expenses_advances_travel.sql`
- **DB**: `expense_claims.status` has valid-label CHECK only.

### Employee Advance

- **CRITICAL**: No allowed-transition validation. `approve`, `reject`, `cancel`, and `settled` can be applied from any current status.
  - Metadata: `workflow.employee_advance.status`
  - API: `app/api/hrms/expenses/advances/[id]/route.ts`
- **HIGH**: Settlement has no outstanding balance model. Migration has requested/approved/settled fields, but no `outstanding_amount` or linked claim settlement behavior.
  - Migration: `supabase/migrations/20260512120000_expenses_advances_travel.sql`
- **DB**: `employee_advances.status` has valid-label CHECK only.

### Payroll Entry / Run

- **CRITICAL**: API status actions are not metadata/DB aligned. Metadata/DB states for `payroll_entries` are `draft`, `calculated`, `approved`, `paid`, `cancelled`, but `[id]` route writes `submitted` and `locked`.
  - Metadata: `workflow.payroll.entry_status`
  - Migration: `supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql`
  - API: `app/api/hrms/payroll/runs/[id]/route.ts`
- **CRITICAL**: No current-status read or allowed-transition validation before updating payroll entries.
  - API: `app/api/hrms/payroll/runs/[id]/route.ts`, `app/api/hrms/payroll/runs/route.ts`
- **CRITICAL**: Payroll run submission does not generate `salary_slips` or `salary_slip_lines`.
  - API: `app/api/hrms/payroll/runs/[id]/route.ts`, `app/api/hrms/payroll/salary-slips/route.ts`

### Salary Slip

- **CRITICAL**: API action statuses are invalid for DB/metadata. Route writes `issued` and `published`; DB/metadata allow `draft`, `calculated`, `approved`, `paid`, `cancelled`.
  - Metadata: `workflow.payroll.salary_slip_status`
  - Migration: `supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql`
  - API: `app/api/hrms/payroll/salary-slips/route.ts`
- **HIGH**: No current-status read or transition validation in salary slip PATCH.
  - API: `app/api/hrms/payroll/salary-slips/route.ts`

### Tax Declarations and Benefit Claims

- **HIGH**: Shared tax/benefit update route approves/rejects/cancels without reading current status or validating the metadata transition.
  - Metadata: `workflow.payroll.tax_declaration_status`, `workflow.payroll.benefit_claim_status`
  - API: `app/api/hrms/payroll/_tax-resources.ts`

### Performance Goal

- **HIGH**: Goal `complete`, `cancel`, and `archive` actions do not read/check current goal status before transition.
  - Metadata: `workflow.performance.goal_status`
  - API: `app/api/hrms/performance/goals/[id]/route.ts`

### Performance Appraisal

- **HIGH**: No current-status read or allowed-transition validation. Route can directly set `self_submitted`, `manager_reviewed`, `approved`, `closed`, or `cancelled` by action.
  - Metadata: `workflow.performance.appraisal_status`
  - API: `app/api/hrms/performance/appraisals/[id]/route.ts`
- **MEDIUM**: Metadata includes a rejection path from review state, but route has no reject action.
  - API: `app/api/hrms/performance/appraisals/[id]/route.ts`

### Employee Status

- **CRITICAL**: Employee PATCH allows `employment_status` writes without current-status read or transition validation.
  - Metadata: `workflow.employee.status`
  - API: `app/api/hrms/employees/[id]/route.ts`
  - Helper: `lib/hrms/employee-core.ts`
- **DB**: `employees.employment_status` has valid-label CHECK only.
  - Migration: `supabase/migrations/20260510220000_employee_core_organization.sql`

### Onboarding / Separation

- **CRITICAL**: Primary onboarding and separation workflows have no PATCH route. Existing routes list/create records, so workflow transitions are not enforced.
  - API: `app/api/hrms/lifecycle/onboarding/route.ts`, `app/api/hrms/lifecycle/separations/route.ts`, `app/api/hrms/lifecycle/separation/route.ts`
- **CRITICAL**: Lifecycle side effects are missing. Completing onboarding activities does not set `employees.employment_status = active`; approved/exited separation does not set `employees.employment_status = exited`.
  - API: `app/api/hrms/lifecycle/onboarding/[id]/activities/route.ts`, `app/api/hrms/lifecycle/_resources.ts`
- **HIGH**: Lifecycle helper statuses are metadata/DB drifted. Onboarding helper allows non-metadata statuses, while DB/metadata use `draft`, `active`, `completed`, `cancelled`; separation helper includes drifted states compared with `approved`, `exit_pending`, `exited`.
  - Metadata: `workflow.lifecycle.onboarding_status`, `workflow.lifecycle.separation_status`
  - Migration: `supabase/migrations/20260515190000_employee_lifecycle.sql`
  - Helper: `lib/hrms/lifecycle.ts`

### Attendance / Shift / Overtime

- **MEDIUM**: Attendance day PATCH validates status labels but does not read current status or validate metadata transitions for day status changes.
  - Metadata: `workflow.attendance.day_status`
  - API: `app/api/hrms/attendance/days/route.ts`
- **PARTIAL**: Attendance corrections, shift requests, and overtime decisions read current status and enforce submitted-only decision actions, but do not use a central metadata transition helper.
  - API: `app/api/hrms/attendance/corrections/[id]/route.ts`, `app/api/hrms/shifts/requests/[id]/route.ts`, `app/api/hrms/overtime/[id]/route.ts`

## Test Gaps

- **HIGH**: Existing workflow tests do not assert invalid transition rejection, current-status reads, payroll salary-slip generation, advance settlement, or lifecycle employment-status side effects.
  - Examples: `tests/leave/leave-api-contract.test.ts`, `tests/expenses/expenses-api-contract.test.ts`, `tests/payroll/payroll-api-contract.test.ts`, `tests/lifecycle/lifecycle-api-contract.test.ts`
- **MEDIUM**: Payroll tests currently encode status drift by expecting `submit`/`lock` run actions and `issue`/`publish` slip actions despite DB/metadata using different states.
  - Example: `tests/payroll/payroll-api-contract.test.ts`

## Immediate Repair Priorities

1. Create a shared metadata-aligned transition validator and require every status-changing PATCH route to read current status before update.
2. Fix payroll status drift before wiring slip generation.
3. Add transactional or compensating behavior for leave ledger writes, salary slip generation, advance settlement, and lifecycle employment-status changes.
4. Add contract tests that explicitly reject invalid transitions and prove side effects.
