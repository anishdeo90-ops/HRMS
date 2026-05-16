# Agent 0C Golden Thread Trace

Workspace: `C:\Users\admin\Music\HRMS-main`

Scope: Wave 0 discovery only. This audit traces the candidate-to-employee-to-HRMS golden thread across migrations, API routes, and UI surfaces. No source files were changed.

## Summary

| Link | Thread | Rating | Primary gap |
| --- | --- | --- | --- |
| 1 | candidates -> employees | PARTIAL | DB FK and conversion API exist, but no employee detail source-candidate surface and no candidates-list "Employee created" badge. |
| 2 | employees -> attendance | PARTIAL | DB FK and employee-scoped attendance API exist, but employee detail does not show attendance summary. |
| 3 | employees -> leave | PARTIAL | DB FKs and per-employee balances/applications APIs exist, but employee detail does not show leave balance or recent leave. |
| 4 | employees -> salary structure -> payroll | BROKEN | Payroll run APIs do not derive employees from salary structure assignments and do not generate salary slips. |
| 5 | leave_applications -> leave_ledger_entries | PARTIAL | Approval writes ledger entries, but the FK column is `application_id` not `leave_application_id`, and there is no leave balance/ledger UI surface. |
| 6 | expense_claims -> employee_advances | BROKEN | No DB relationship between claims and advances, and claim approval/paid flow does not settle advances. |
| 7 | employees -> appraisals -> performance goals | PARTIAL | DB FKs and filtered appraisal API exist with appraisal goals, but UI does not render goals inline per appraisal or on employee detail. |
| 8 | employees -> onboarding -> separation | PARTIAL | DB/API/UI surfaces exist, but separation is not gated on onboarding completion and lifecycle status is not surfaced per employee. |

Overall: 0 CONNECTED, 6 PARTIAL, 2 BROKEN.

## Link 1: candidates -> employees

Rating: PARTIAL

DB:
- CONNECTED. `supabase/migrations/20260510220000_employee_core_organization.sql` defines `employees.joined_candidate_id uuid references public.candidates(id) on delete set null`, plus a unique constraint and index.
- `supabase/migrations/20260515190000_employee_lifecycle.sql` also defines `employee_onboardings.joined_candidate_id uuid references public.candidates(id)`, but candidate conversion does not create onboarding.

API:
- PARTIAL. `app/api/hrms/employees/from-candidate/[candidateId]/route.ts` reads `candidates`, requires a joined candidate via `isJoinedCandidate`, checks for an existing employee by `joined_candidate_id`, and inserts into `employees`.
- `app/api/hrms/employees/[id]/route.ts` exposes employee detail with company/branch/department/profile embeds but does not embed the source candidate.

UI:
- PARTIAL/BROKEN. `app/(app)/people/employees/page.tsx` has a "Joined candidate ID" conversion form and calls the conversion API.
- There is no employee detail page under `app/(app)/people/employees/[id]/page.tsx`, so the employee detail surface cannot show the source candidate.
- `app/(app)/candidates/candidates-client.tsx` and `components/candidate-detail-panel.tsx` show candidate status such as "Joined", but no query or badge proving an employee record was created for a joined candidate.

Gap:
- Add a candidate-to-employee join in employee detail and candidates list/detail, and create/display onboarding linkage if that remains part of the golden thread.

## Link 2: employees -> attendance

Rating: PARTIAL

DB:
- CONNECTED. `supabase/migrations/20260511160000_attendance_checkins_shifts.sql` defines employee FKs for `employee_shift_assignments.employee_id`, `shift_roster_entries.employee_id`, `employee_check_ins.employee_id`, and `attendance_days.employee_id`.
- The codebase uses `attendance_days`, not a table named `attendance`.

API:
- CONNECTED. `app/api/hrms/attendance/days/route.ts` accepts `employee_id`, resolves/verifies target employee access, filters with `.eq("employee_id", target.employee.id)`, and returns attendance rows with an employee embed.

UI:
- PARTIAL. `app/(app)/time/attendance/page.tsx` has an employee-id filter for the attendance register.
- No employee detail page exists, and `app/(app)/people/employees/page.tsx` does not render attendance summary for a selected employee.

Gap:
- Employee detail needs an attendance summary fed by `/api/hrms/attendance/days?employee_id=...`.

## Link 3: employees -> leave

Rating: PARTIAL

DB:
- CONNECTED. `supabase/migrations/20260511190000_leave_management.sql` defines `leave_policy_assignments.employee_id`, `leave_allocations.employee_id`, `leave_applications.employee_id`, and `leave_ledger_entries.employee_id` as FKs to `employees(id)`.

API:
- CONNECTED. `app/api/hrms/leave/balances/route.ts` resolves an employee, queries `leave_allocations` and `leave_ledger_entries` by `employee_id`, and returns per-employee balances.
- `app/api/hrms/leave/applications/route.ts` supports `employee_id` and filters applications by employee after access checks.

UI:
- BROKEN for the required surface. No employee detail page exists and the people page does not show leave balance or recent applications.
- There is no dedicated leave app page under `app/(app)/leave`; leave data appears available only through APIs and generic/self-service summaries.

Gap:
- Add employee-scoped leave balance and recent leave application display on employee detail, plus a visible leave balance/ledger surface if required.

## Link 4: employees -> salary structure -> payroll

Rating: BROKEN

DB:
- CONNECTED. `supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql` defines `salary_structure_assignments.employee_id`, `payroll_entries.employee_id`, and `salary_slips.employee_id` as FKs to `employees(id)`.
- `salary_slips.payroll_entry_id` references `payroll_entries(id)`.

API:
- PARTIAL/BROKEN. `app/api/hrms/payroll/salary-structure-assignments/route.ts` exposes salary structure assignments and supports `employee_id`.
- `app/api/hrms/payroll/runs/route.ts` reads/writes `payroll_entries`; it does not query `salary_structure_assignments` to find eligible employees for a run.
- `app/api/hrms/payroll/runs/[id]/route.ts` only updates payroll entry status for actions such as `submit`, `approve`, `lock`, and `cancel`; it does not create `salary_slips`.
- `app/api/hrms/payroll/salary-slips/route.ts` can manually create/list salary slips, but this is not connected to payroll run submission.

UI:
- PARTIAL/BROKEN. `app/(app)/payroll/runs/page.tsx` lists payroll entries with aggregate fields, but does not show the actual employees included in a run or their salary structure/slip status.
- `app/(app)/payroll/salary-slips/page.tsx` lists slips, but no employee detail page shows employee salary slips.

Gap:
- Payroll run creation/submission must derive employees from active salary structure assignments and generate salary slips/lines for each included employee.

## Link 5: leave_applications -> leave_ledger_entries

Rating: PARTIAL

DB:
- PARTIAL. `supabase/migrations/20260511190000_leave_management.sql` defines `leave_ledger_entries.application_id uuid references public.leave_applications(id)`.
- The phase brief expected `leave_ledger_entries.leave_application_id`; the implemented FK exists but uses a different column name.

API:
- CONNECTED. `app/api/hrms/leave/applications/[id]/route.ts` reads the current application, only allows approve/reject from `submitted`, updates status, and on `action === "approve"` inserts into `leave_ledger_entries`.
- The same route inserts a reversal ledger entry when cancelling an approved application.
- `app/api/hrms/leave/ledger/route.ts` exposes employee-scoped ledger history.

UI:
- PARTIAL/BROKEN. No visible leave balance page was found under `app/(app)/leave`, and employee detail does not exist. The ledger API is not surfaced as required.

Gap:
- Align naming expectations or document `application_id` as canonical, then surface ledger history in leave balance and employee detail UI.

## Link 6: expense_claims -> employee_advances settlement

Rating: BROKEN

DB:
- BROKEN. `supabase/migrations/20260512120000_expenses_advances_travel.sql` defines `expense_claims` and `employee_advances`, both linked to `employees`, but there is no `advance_id`, `employee_advance_id`, `settlement_claim_id`, or similar FK between them.
- `employee_advances` has `settlement_note`, `settled_at`, and settlement status fields, but not a claim linkage.

API:
- BROKEN. `app/api/hrms/expenses/claims/[id]/route.ts` updates claim status for approve/reject/cancel/paid but never reads or updates `employee_advances`.
- `app/api/hrms/expenses/advances/[id]/route.ts` can manually mark an advance `settled`, but it is independent of any expense claim.

UI:
- PARTIAL/BROKEN. `app/(app)/expenses/advances/page.tsx` shows advance status and has a "Mark settled" action, but does not show a linked settlement expense claim.

Gap:
- Add governed DB linkage and API settlement logic so paying/settling a claim can reduce/close an advance and show the linked claim on advances.

## Link 7: employees -> appraisals -> performance_goals

Rating: PARTIAL

DB:
- CONNECTED. `supabase/migrations/20260515160000_performance_management.sql` defines `performance_goals.employee_id`, `appraisals.employee_id`, and `appraisal_goals.appraisal_id references public.appraisals(id)`.
- `appraisal_goals.performance_goal_id` references `performance_goals(id)`.

API:
- CONNECTED/PARTIAL. `app/api/hrms/performance/appraisals/route.ts` accepts `employee_id`, filters appraisals by employee, embeds `goals:appraisal_goals(*)`, and can insert appraisal goals on create.
- The appraisal embed includes appraisal goals, but not nested `performance_goals` detail beyond IDs/fields stored on `appraisal_goals`.

UI:
- PARTIAL. `app/(app)/performance/appraisals/page.tsx` lists appraisals by employee/cycle/status/reviewer and has a separate template goal-weight table.
- It does not render each appraisal's goals inline. No employee detail page shows current appraisal/goals.

Gap:
- Render appraisal goals inline for each appraisal and add employee detail performance summary.

## Link 8: employees -> onboarding -> separation

Rating: PARTIAL

DB:
- CONNECTED. `supabase/migrations/20260515190000_employee_lifecycle.sql` defines `employee_onboardings.employee_id`, `employee_separations.employee_id`, and `employee_boarding_activities.onboarding_id/separation_id` FKs.
- `employee_onboardings.joined_candidate_id` also references `candidates(id)`.

API:
- PARTIAL. `app/api/hrms/lifecycle/onboarding/route.ts` supports employee-filtered onboarding with embedded activities.
- `app/api/hrms/lifecycle/separation/route.ts` delegates to generic lifecycle resource create/list handling and supports employee filtering through `_resources.ts`.
- No code path checks that onboarding is complete before allowing separation creation.
- `app/api/hrms/lifecycle/onboarding/[id]/activities/route.ts` only lists/creates activities; it does not update activity completion or propagate onboarding completion to employee status.
- `app/api/hrms/lifecycle/overview/route.ts` returns counts only, not a per-employee lifecycle stage.

UI:
- PARTIAL. `app/(app)/lifecycle/page.tsx` shows onboarding/separation queues and statuses, and `app/(app)/lifecycle/onboarding/page.tsx` / `app/(app)/lifecycle/separation/page.tsx` show domain lists.
- It does not show each employee's current lifecycle stage on employee detail, and the overview is not a per-employee golden-thread trace.

Gap:
- Enforce onboarding-complete checks before separation, propagate lifecycle decisions to `employees.employment_status`, and surface current lifecycle stage per employee.

## Highest Priority Repair Targets

1. Payroll generation is the largest broken thread: salary structure assignments are not used to build payroll entries/slips, and payroll run submission does not create `salary_slips`.
2. Expense advance settlement is structurally broken: there is no DB FK and no API side effect between `expense_claims` and `employee_advances`.
3. Employee detail is missing as the central golden-thread UI surface. This blocks candidate source, attendance, leave, salary slip, appraisal, and lifecycle visibility from being traced from one employee.
4. Candidate conversion should either create or explicitly link onboarding if onboarding is part of the candidate-to-employee thread.
5. Leave ledger is functionally connected in the API, but UI exposure and the `application_id` vs `leave_application_id` naming mismatch should be resolved before integration tests hardcode expectations.
