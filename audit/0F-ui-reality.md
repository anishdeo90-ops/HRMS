# Agent 0F - UI Data Reality Checker

Wave: 0 discovery only
Owner: Tannu
Scope: `app/(app)/**/page.tsx`

## Summary

- Pages read: 44 route `page.tsx` files under `app/(app)`.
- Empty page findings: none. Every route page has at least one API or Supabase-backed data path.
- Biggest reality gap: no employee detail page exists under `app/(app)/people/employees/[id]/page.tsx`, so there is no UI that starts from one employee and shows attendance, leave, salary slips, appraisals, lifecycle, or source candidate data.
- Dashboard gap: `app/(app)/dashboard/page.tsx` is still an ATS pipeline dashboard. It fetches `/api/dashboard`, masters, and users, but does not fetch HRMS employee, leave, expense, payroll, attendance, or self-service summaries for role-aware HRMS cards.
- Self-service is the strongest own-employee UI: `app/(app)/self-service/page.tsx` fetches `/api/hrms/self-service/summary`, and the API resolves the current employee. It is still summary-card level, not the full multi-domain detail view requested by the Wave 2 fixer.
- Cross-domain UI is partial. Most pages are single-domain workspaces. Self-service aggregates counts; lifecycle and performance overviews combine subdomain records. No page currently gives a real golden-thread employee view across all HRMS domains.
- Confirmed UI-only hard data leaks: none proven from page code alone. Several employee-visible pages do not pass `employee_id` or `scope=mine` explicitly and rely on API authorization/post-filtering. Those are marked as filter risks in the notes.

## Focus Findings

### Employee Detail Page

Status: PLACEHOLDER / missing route

- `app/(app)/people/employees/page.tsx` exists and fetches employees, organization lookups, employee documents, and candidate conversion.
- No `app/(app)/people/employees/[id]/page.tsx` route exists.
- The employee list does not show attendance summary, leave balance, salary slips, appraisals, lifecycle stage, or source candidate details.
- This blocks the main UI golden-thread requirement: employee as the pivot for all HRMS domains.

### Dashboard

Status: REAL_DATA / PLACEHOLDER

- `app/(app)/dashboard/page.tsx` fetches real ATS data from `/api/dashboard`, `/api/masters`, and `/api/users`.
- The cards are ATS pipeline cards: open jobs, active candidates, interviews, joinings, offered, telephonic interview done.
- It does not implement the HRMS role-aware cards described in Testing.md:
  - admin/hr manager: total employees, open leaves today, pending expense approvals, next payroll run, open positions.
  - payroll manager: employees without salary structure, next payroll run, salary slips pending.
  - employee: my attendance, my leave balance, my pending approvals, latest salary slip.
- Recruiter data is scoped in `/api/dashboard` by role, but the UI itself does not pass employee or department scope for non-recruiting roles.

### Self-Service

Status: REAL_DATA / FILTERED_CORRECTLY / PLACEHOLDER

- `app/(app)/self-service/page.tsx` fetches `/api/hrms/self-service/summary`.
- `app/api/hrms/self-service/summary/route.ts` resolves the signed-in employee and filters attendance, leave, expenses, salary slips, and notifications by `employee.id`.
- The UI renders employee profile data, summary cards, and quick links.
- Missing from the page-level UI: attendance week detail, leave balance detail, pending expense claim list, latest salary slip download link, active goals, and current appraisal status.

### Cross-Domain Data

Status: PLACEHOLDER / partial

- Self-service aggregates counts across employee profile, attendance, leave, expenses, payroll, and notifications.
- Performance overview combines goals, cycles, appraisals, and feedback.
- Lifecycle overview combines onboarding, separation, promotions, transfers, and daily summaries.
- Payroll overview combines periods, runs, slips, and structures.
- No page renders employee-centered cross-domain data such as "this employee's attendance plus leave plus salary slips plus appraisal".

## Page Inventory

| Page | Status | Evidence and notes |
| --- | --- | --- |
| `app/(app)/sync/page.tsx` | REAL_DATA | Fetches `/api/sync`, `/api/users/me`, `/api/backup-logs`, `/api/import`, `/api/sync/trigger`, and `/api/backup`. Operational sync/import data, not employee scoped. |
| `app/(app)/dashboard/page.tsx` | REAL_DATA / PLACEHOLDER | Fetches `/api/dashboard`, `/api/masters`, and `/api/users`. Renders ATS funnel data, not HRMS role-aware cards. |
| `app/(app)/settings/page.tsx` | REAL_DATA | Fetches users, masters, email templates, AI settings, Google Drive settings, and backup action APIs. Broad admin/settings data by design. |
| `app/(app)/candidates/page.tsx` | REAL_DATA | Server-fetches current profile and ATS master data via Supabase. Candidate row fetching is delegated outside this `page.tsx`. |
| `app/(app)/people/organization/page.tsx` | REAL_DATA | Fetches `/api/hrms/organization` and renders companies, branches, departments, grades, employment types, and approvers. |
| `app/(app)/self-service/page.tsx` | REAL_DATA / FILTERED_CORRECTLY / PLACEHOLDER | Fetches `/api/hrms/self-service/summary`; API resolves current employee. Summary cards render, but detailed own-domain sections are missing. |
| `app/(app)/people/employees/page.tsx` | REAL_DATA / PLACEHOLDER | Fetches `/api/hrms/employees`, `/api/hrms/organization`, employee documents, and candidate conversion. No employee detail page or cross-domain employee view. |
| `app/(app)/jobs/page.tsx` | REAL_DATA | Fetches jobs by status plus masters, users, forms, and form-job links. ATS job workspace, not employee scoped. |
| `app/(app)/travel/page.tsx` | REAL_DATA | Fetches `/api/hrms/travel/requests` with status filter. Employee-visible route, but UI does not pass `employee_id`; relies on API scope/filtering. |
| `app/(app)/hod-portal/page.tsx` | REAL_DATA | Fetches profile, masters, `/api/jobs?hod_id=` for HOD job scope, and `/api/hiring-requests` without a UI requester filter. |
| `app/(app)/self-service/notifications/page.tsx` | REAL_DATA / FILTERED_CORRECTLY | Fetches `/api/hrms/self-service/notifications`. Self-service endpoint is current-user oriented. |
| `app/(app)/jobs/import/page.tsx` | REAL_DATA | Posts imports to `/api/import/jobs`. Import tool, not employee scoped. |
| `app/(app)/users/page.tsx` | REAL_DATA | Fetches and mutates `/api/users`. Admin user management, broad by design. |
| `app/(app)/grievances/page.tsx` | REAL_DATA / FILTERED_CORRECTLY | Fetches types and grievances; uses `?scope=mine` for employee role. |
| `app/(app)/reports/page.tsx` | REAL_DATA | Fetches `/api/hrms/reports` and `/api/hrms/automation`, runs selected reports, renders result rows. Role gated through nav. |
| `app/(app)/jds/page.tsx` | REAL_DATA | Fetches JD library, assessments, and forms. ATS content library, not employee scoped. |
| `app/(app)/payroll/page.tsx` | REAL_DATA | Fetches payroll periods, runs, salary slips, and structures. Payroll overview, not employee accessible in nav. |
| `app/(app)/payroll/tax-benefits/page.tsx` | REAL_DATA | Fetches tax slabs, declarations, applications, and claims. Employee-visible route but UI does not pass `employee_id`; backend post-filtering is required to avoid broad data exposure. |
| `app/(app)/import/page.tsx` | REAL_DATA | Posts to `/api/import` and links `/api/import/sample`. Import utility. |
| `app/(app)/reports/dashboards/page.tsx` | REAL_DATA | Fetches `/api/hrms/dashboards` and `/api/hrms/automation`; renders KPI tiles, alerts, and automation rules. |
| `app/(app)/expenses/page.tsx` | REAL_DATA | Fetches submitted claims, advances, and travel requests for finance overview. Employee-visible route but UI relies on API authorization for own/team scope. |
| `app/(app)/my-activity/page.tsx` | REAL_DATA / FILTERED_CORRECTLY | Fetches `/api/my-activity` and `/api/communications?my=1`; renders current recruiter activity, communications, interviews, candidates, and joinings. |
| `app/(app)/payroll/salary-structures/page.tsx` | REAL_DATA | Fetches salary components, structures, and assignments. Payroll manager/admin workspace. |
| `app/(app)/expenses/advances/page.tsx` | REAL_DATA | Fetches `/api/hrms/expenses/advances` with status filter. Employee-visible route but UI does not pass `employee_id`; relies on API scope/filtering. |
| `app/(app)/expenses/claims/page.tsx` | REAL_DATA | Fetches `/api/hrms/expenses/claims` with status filter. Employee-visible route but UI does not pass `employee_id`; relies on API scope/filtering. |
| `app/(app)/masters/page.tsx` | REAL_DATA | Fetches masters, screening questions, recruitment forms, designations, and sites. Admin/ATS metadata management. |
| `app/(app)/recruitment/page.tsx` | REAL_DATA | Fetches `/api/hrms/recruitment` and `/api/hrms/recruitment/handoffs`; renders recruitment overview and candidate-to-employee handoffs. |
| `app/(app)/payroll/salary-slips/page.tsx` | REAL_DATA | Fetches `/api/hrms/payroll/salary-slips`; UI has a `scope=mine` option, but initial load is all. Backend post-filtering is required for employee role. |
| `app/(app)/payroll/runs/page.tsx` | REAL_DATA / PLACEHOLDER | Fetches periods and payroll runs. Does not fetch or render included employee list, salary structure name per employee, slip status per employee, or selected-run detail. |
| `app/(app)/performance/page.tsx` | REAL_DATA / FILTERED_CORRECTLY | Fetches goals, cycles, appraisals, and feedback; uses `?scope=mine` for employee role. |
| `app/(app)/recruitment/appointments/page.tsx` | REAL_DATA | Fetches `/api/hrms/recruitment/appointments`; renders templates and issued appointment letters with ATS candidate links. |
| `app/(app)/lifecycle/promotions/page.tsx` | REAL_DATA | Fetches `/api/hrms/lifecycle/promotions`; route is not employee-visible in nav. Requires employee id in create form. |
| `app/(app)/lifecycle/page.tsx` | REAL_DATA / FILTERED_CORRECTLY | Uses `?scope=mine` for onboarding, separation, and daily summaries when role is employee. Promotions/transfers fetch without explicit scope and rely on backend filtering. |
| `app/(app)/lifecycle/separation/page.tsx` | REAL_DATA / FILTERED_CORRECTLY | Fetches templates, separation records, and exit interviews; uses `?scope=mine` for employee role. |
| `app/(app)/performance/goals/page.tsx` | REAL_DATA / FILTERED_CORRECTLY | Fetches goals and KRAs; uses `?scope=mine` for employee role. |
| `app/(app)/lifecycle/onboarding/page.tsx` | REAL_DATA / FILTERED_CORRECTLY | Fetches templates, onboarding records, and activities; uses `?scope=mine` for employee role. |
| `app/(app)/performance/appraisals/page.tsx` | REAL_DATA / FILTERED_CORRECTLY / PLACEHOLDER | Fetches appraisals with `?scope=mine` for employee role. It fetches `/api/hrms/performance/templates` twice, so the goal-weight table is likely not backed by a distinct goal-weight endpoint. |
| `app/(app)/time/shifts/page.tsx` | REAL_DATA | Fetches shift types, locations, assignments, roster, shift requests, and overtime. Uses employee ids in forms; no explicit own-scope query param from UI. |
| `app/(app)/performance/feedback/page.tsx` | REAL_DATA / FILTERED_CORRECTLY | Fetches feedback criteria and ratings; uses `?scope=mine` for employee role. |
| `app/(app)/time/approvals/page.tsx` | REAL_DATA | Fetches submitted attendance corrections, shift requests, and overtime queues. Approval workspace, not employee self-view. |
| `app/(app)/training/page.tsx` | REAL_DATA / FILTERED_CORRECTLY | Fetches training programs, events, and feedback; uses `?scope=mine` for employee role. |
| `app/(app)/time/attendance/page.tsx` | REAL_DATA / FILTERED_CORRECTLY | Fetches check-ins, days, corrections, and approval queue. HR filters can pass `employee_id`/`department_id`; non-HR view relies on API resolving current employee. |
| `app/(app)/vehicles/page.tsx` | REAL_DATA | Fetches vehicle logs and services with optional employee/status filters. Employee-visible route but UI does not default to own `employee_id`; relies on API scope/filtering. |
| `app/(app)/lifecycle/transfers/page.tsx` | REAL_DATA | Fetches `/api/hrms/lifecycle/transfers`; route is not employee-visible in nav. Requires employee id in create form. |

## Placeholder and Repair Candidates for Wave 2E

1. Create an employee detail route and view.
   - Priority: high.
   - Candidate file: `app/(app)/people/employees/[id]/page.tsx`.
   - It should fetch existing APIs by employee id for employee core, attendance, leave, latest salary slip, appraisal status, lifecycle stage, and source candidate details.

2. Replace ATS-only dashboard cards with role-aware HRMS cards.
   - Priority: high.
   - Candidate file: `app/(app)/dashboard/page.tsx`.
   - Keep ATS recruiting cards for recruiter/admin contexts, but add HRMS cards from HRMS APIs for employee, payroll manager, HR, and HOD contexts.

3. Expand self-service from summary cards to real employee sections.
   - Priority: medium.
   - Candidate file: `app/(app)/self-service/page.tsx`.
   - Keep `/api/hrms/self-service/summary`, but add or expose detailed own data: attendance week, leave balance, pending expense claims, latest salary slip link, active goals, appraisal status.

4. Expand payroll runs selected-run detail.
   - Priority: medium.
   - Candidate file: `app/(app)/payroll/runs/page.tsx`.
   - It currently renders run totals only. It needs included employees, salary structure names, gross amounts, slip status, and total run amount for a selected run.

5. Tighten employee-visible UI queries to explicit own scope where possible.
   - Priority: medium.
   - Candidate files: finance pages, payroll employee pages, lifecycle overview, vehicle/travel pages.
   - Many APIs appear to post-filter records server-side, but the UI often loads broad endpoints first. Prefer explicit `employee_id` or `scope=mine` when the current role is `employee`.

## Tests

- Not run. This was Wave 0 discovery only.

## Blockers

- None for the audit file.
- Some page-level data reality depends on API authorization behavior; I read selected APIs to verify self-service and identify post-filtering, but this audit did not exhaustively audit every API route because that belongs to Agent 0B.

## Next Action

- Bob can feed this file into Wave 1 triage with the other Wave 0 audit outputs.
