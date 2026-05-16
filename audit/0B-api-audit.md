# Agent 0B API Contract Audit

Wave 0 discovery only. Source files were read but not edited.

## Summary

- Scope: every `route.ts` under `app/api/hrms/**`.
- Primary risks: broad DB reads followed by in-memory filtering, incomplete status transition enforcement, missing cross-domain side effects, and a few silent error paths.
- Notable pass: `app/api/hrms/leave/applications/[id]/route.ts` does write `leave_ledger_entries` on approve and reversal entries on approved cancellation, though it is not transactional.

## Findings

| File path | Method | Check | Severity | Description |
|---|---:|---:|---|---|
| `app/api/hrms/employees/[id]/route.ts` | GET | 1 | CRITICAL | Authenticated users can fetch any employee by id; no domain authorization helper is called before returning the record. |
| `app/api/hrms/employees/[id]/documents/route.ts` | GET | 1 | CRITICAL | Authenticated users can list documents for any employee id and receive signed URLs; no view/document authorization helper is called. |
| `app/api/hrms/leave/applications/route.ts` | GET | 2 | CRITICAL | Without `employee_id`, non-admin users resolve their employee but the DB query is not scoped; all rows are fetched then filtered in memory. |
| `app/api/hrms/leave/approvals/route.ts` | GET | 2 | CRITICAL | Fetches all submitted leave/compensatory/encashment rows before approver filtering; no DB-side employee/department scope. |
| `app/api/hrms/expenses/claims/route.ts` | GET | 2 | CRITICAL | Without `employee_id`, scoped users fetch up to 200 claims globally, then filter in memory. |
| `app/api/hrms/expenses/advances/route.ts` | GET | 2 | CRITICAL | Without `employee_id`, scoped users fetch up to 200 advances globally, then filter in memory. |
| `app/api/hrms/travel/requests/route.ts` | GET | 2 | CRITICAL | Without `employee_id`, scoped users fetch up to 200 travel requests globally, then filter in memory. |
| `app/api/hrms/vehicles/logs/route.ts` | GET | 2 | CRITICAL | Without `employee_id`, scoped users fetch vehicle logs globally, then filter in memory. |
| `app/api/hrms/vehicles/services/route.ts` | GET | 2 | CRITICAL | Without `employee_id`, scoped users fetch vehicle services globally, then filter in memory. |
| `app/api/hrms/performance/goals/route.ts` | GET | 2 | CRITICAL | Without `employee_id`, scoped users can cause broad goal reads before in-memory filtering. |
| `app/api/hrms/performance/appraisals/route.ts` | GET | 2 | CRITICAL | Without `employee_id`, scoped/team users can cause broad appraisal reads before in-memory filtering. |
| `app/api/hrms/performance/feedback/route.ts` | GET | 2 | CRITICAL | Without `employee_id`, scoped users can cause broad feedback reads before in-memory filtering. |
| `app/api/hrms/payroll/salary-slips/route.ts` | GET | 2 | CRITICAL | Non-payroll users resolve their own employee but the query is not constrained to it unless `employee_id` is supplied. |
| `app/api/hrms/payroll/_tax-resources.ts` via tax declarations/benefits/claims routes | GET | 2 | CRITICAL | Self-scoped tax/benefit resources resolve the employee but do not apply `employee_id` unless supplied, then filter in memory. |
| `app/api/hrms/lifecycle/promotions/route.ts`, `transfers/route.ts`, `separations/route.ts`, `onboarding/route.ts`, `grievances/route.ts`, `training/feedback/route.ts` | GET | 2 | CRITICAL | Shared pattern fetches lifecycle rows broadly when no `employee_id` is supplied, then filters in memory. |
| `app/api/hrms/leave/applications/[id]/route.ts` | PATCH | 3 | HIGH | `action=update` can normalize/write caller-writable statuses without validating a metadata transition; approve/reject check current `submitted`, but cancel/update are partial. |
| `app/api/hrms/expenses/claims/[id]/route.ts` | PATCH | 3 | HIGH | Approve/reject/paid/cancel actions do not validate current status, so invalid transitions like paid from draft are possible. |
| `app/api/hrms/expenses/advances/[id]/route.ts` | PATCH | 3 | HIGH | Approve/reject/settled/cancel actions do not validate current status before transition. |
| `app/api/hrms/payroll/runs/[id]/route.ts` | PATCH | 3 | HIGH | Payroll run actions update status without reading/checking current status. |
| `app/api/hrms/payroll/runs/route.ts` | PATCH | 3 | HIGH | Generic update can change payroll entry caller-writable statuses without transition validation. |
| `app/api/hrms/payroll/salary-slips/route.ts` | PATCH | 3 | HIGH | Issue/publish/cancel actions do not validate current salary slip status. |
| `app/api/hrms/payroll/_tax-resources.ts` via `[id]` routes | PATCH | 3 | HIGH | Tax declarations, benefit applications, and benefit claims approve/reject/cancel without current-status validation. |
| `app/api/hrms/performance/appraisals/[id]/route.ts` | PATCH | 3 | HIGH | Appraisal status actions do not read/check current appraisal status before transition. |
| `app/api/hrms/performance/goals/[id]/route.ts` | PATCH | 3 | HIGH | Goal complete/cancel/archive does not read/check current goal status before transition. |
| `app/api/hrms/expenses/claims/[id]/route.ts` | PATCH | 4 | CRITICAL | Expense approval/payment does not settle or update linked employee advance balance; no advance linkage side effect exists in the route. |
| `app/api/hrms/payroll/runs/[id]/route.ts` | PATCH | 4 | CRITICAL | Payroll submission only updates `payroll_entries`; it does not create `salary_slips` or `salary_slip_lines`. |
| `app/api/hrms/payroll/runs/route.ts` | PATCH | 4 | CRITICAL | Same payroll submission gap for the body-id PATCH variant. |
| `app/api/hrms/employees/from-candidate/[candidateId]/route.ts` | POST | 4 | CRITICAL | Candidate-to-employee conversion creates only `employees`; it does not create onboarding/handoff lifecycle records. |
| `app/api/hrms/performance/appraisals/[id]/route.ts` | PATCH | 5 | MEDIUM | Inserts new `appraisal_goals` in a loop and ignores insert errors, then still returns success if the appraisal update succeeds. |
| `app/api/hrms/self-service/summary/route.ts` | GET | 5 | MEDIUM | `exactCount` converts DB count errors to `0`, causing silent partial success. |
| `app/api/hrms/reports/_shared.ts` | GET/POST report execution | 5 | MEDIUM | Shared `exactCount` converts report count errors to `0`, masking DB/report failures. |

## Immediate Repair Priorities

1. Add DB-side scope filters before reads for self/team-scoped GET handlers.
2. Add current-status reads and metadata-aligned transition validation for every workflow PATCH.
3. Wire required side effects: payroll run to salary slips, expense settlement to advances, candidate conversion to onboarding/handoff.
4. Replace ignored/zeroed DB errors with typed non-2xx responses.
