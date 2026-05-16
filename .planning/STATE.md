# State: HireRabbits ATS to HRMS Upgrade

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-13)

**Core value:** HireRabbits must become a governed HRMS without breaking ATS workflows that already run the business.
**Current focus:** Phase 10 planning, after Phase 9 reports/dashboards/notifications/automation implementation.

## Current Position

- Phase: 10 of 10
- Phase name: Recruitment Unification
- Plan: `.planning/phases/10-recruitment-unification/10-PLAN.md`
- Status: Phase 10 planning artifacts created and worker lanes dispatched
- Recovery note: `.planning/` was missing and was reconstructed from `HRMS_SUPERCHARGED_BUILD_PLAN.md`, code inspection, and verification commands.

## Progress

`[###########-] 11/12 roadmap milestones complete`

Completed:
- Phase 0: Foundation and Planning
- Phase 1: Employee Core and Organization Setup
- Phase 2: Attendance, Check-ins, and Shifts
- Phase 3: Leave Management
- Phase 4: Expenses, Advances, and Travel
- Pre-Phase-5: Role-Based Navigation Architecture
- Phase 5: Payroll, Salary, Tax, and Benefits
- Phase 6: Performance Management
- Phase 7: Employee Lifecycle
- Phase 8: Employee Self-Service Portal
- Phase 9: Reports, Dashboards, Notifications, Automation

Active:
- Phase 10: Recruitment Unification

## Verification Snapshot

Last verified on 2026-05-15:

- `npm.cmd run test:metadata` - passed, 20/20 tests.
- `npm.cmd run test:employee-core` - passed, 20/20 tests.
- `npm.cmd run test:attendance` - passed, 36/36 tests.
- `npm.cmd run test:leave` - passed, 17/17 tests.
- `npm.cmd run test:expenses` - passed, 34/34 tests.
- `npm.cmd run test:payroll` - passed, 32/32 tests after payroll period hotfix.
- `npm.cmd run test:performance` - passed, 32/32 tests.
- `npm.cmd run test:nav` - passed, 6/6 tests.
- `node --import tsx --test tests/nav/nav-config.test.ts tests/employee-core/employee-core-ui-contract.test.ts tests/attendance/attendance-ui-contract.test.ts tests/expenses/expenses-ui-contract.test.ts` - passed, 22/22 tests.
- `npm.cmd run build` - passed.
- `supabase migration list` - local and remote include `20260515160000`.
- `supabase db push` - applied Phase 6 migration `20260515160000_performance_management.sql` to linked remote project.
- `agent-browser.cmd --session hrms-phase4` verified signed-in `localhost:3001/dashboard`: admin sidebar links render from config, future disabled nav labels are absent, CSS has 1811 rules, and dashboard shows `HR Overview`.
- `agent-browser.cmd --session hrms-phase4` verified Settings > Team & Users > Invite User role dropdown includes HRMS roles: HR User, Employee, Leave Approver, Expense Approver, Finance Manager, Interviewer, and Payroll Manager.
- `agent-browser.cmd --session hrms-phase4` verified `/payroll`, `/payroll/salary-structures`, `/payroll/runs`, `/payroll/salary-slips`, and `/payroll/tax-benefits`: each rendered signed in with CSS loaded and no schema-cache or relationship errors.
- Payroll period hotfix verified after user reported `payroll_periods.period_start`: `/api/hrms/payroll/periods` and `/api/hrms/payroll/runs` return HTTP 200, `npm.cmd run test:payroll` passes 32/32, and `/payroll` renders without the visible error.
- `agent-browser.cmd --session hrms-phase4` verified `/performance`, `/performance/goals`, `/performance/appraisals`, and `/performance/feedback`: each rendered signed in with CSS loaded and no schema-cache, relationship, missing-column, or load errors.
- Browser-authenticated performance API checks returned HTTP 200 for goals, KRAs, templates, cycles, appraisals, feedback, and feedback criteria.
- Phase 8 verification: `metadata:validate`, `metadata:generate`, `metadata:lineage`, `metadata:check-hardcoding`, `test:metadata` 22/22, `test:self-service` 13/13, `test:nav` 6/6, and `npm.cmd run build` all passed.
- `supabase db push` applied `20260515210000_employee_self_service.sql`; `supabase migration list` confirmed local/remote parity through `20260515210000`.
- After build rewrote `.next`, `localhost:3000` was restarted with a clean `.next`; `/login` returned 200 and `/_next/static/css/app/layout.css` returned 200 with content.
- Phase 9 verification: `metadata:validate`, `metadata:generate`, `metadata:lineage`, `metadata:check-hardcoding`, `test:metadata` 23/23, `test:reports` 30/30, `test:nav` 6/6, and `npm.cmd run build` all passed.
- `supabase db push` applied `20260516000000_hrms_reports_dashboards_automation.sql`; `supabase migration list` confirmed local/remote parity through `20260516000000`.
- Remote smoke query confirmed all 8 Phase 9 report/dashboard/automation tables exist.
- Dev server was restarted cleanly on `localhost:3001`; CSS returned HTTP 200 with content, `/reports` and `/reports/dashboards` redirected unauthenticated users to `/login`, and unauthenticated Phase 9 APIs returned 401.

## Recent Decisions

- Resume from Phase 4 because application code and tests show metadata, employee core, attendance, and leave are already implemented and passing.
- Treat Git status as insufficient for phase tracking because this folder is untracked from the parent `C:\Users\Admin` repository.
- Keep Phase 4 finance workflows separate from payroll posting.
- Bob owns live migration application; Phase 4 migration was pushed to linked Supabase project `gzjoansgnjsnhcezyxbg`.
- Future HRMS sidebar entries must be added to `lib/nav/config.ts` with `enabled: false` until their route is built and verified.
- User role assignment must use central `ROLES`; Settings must not hardcode old role options, and user APIs must reject role strings outside the central list.
- Phase 5 payroll migration upgrades the existing governed `salary_components` metadata table instead of replacing it, preserving Phase 1 metadata shape while adding payroll operational columns.
- Payroll nav entries are now enabled in `lib/nav/config.ts` only because the Phase 5 routes, APIs, migration, tests, build, live DB push, and browser checks are complete.
- Performance nav entries are now enabled in `lib/nav/config.ts` only because the Phase 6 routes, APIs, migration, tests, build, live DB push, and browser/API checks are complete.

## Pending Todos

- Complete signed-in browser verification for `/reports` and `/reports/dashboards` once an authenticated `agent-browser.cmd` session or login credentials are available.
- Monitor Phase 10 worker lanes and integrate recruitment metadata/SQL, helper/API, and UI/nav changes.
- Complete signed-in browser verification for `/reports` and `/reports/dashboards` once an authenticated `agent-browser.cmd` session or login credentials are available.

## Blockers and Concerns

- Git repository boundary is unclear: `HRMS-main` has no local `.git` and appears untracked from parent repo.
- Signed-in Phase 9 browser verification is blocked because `agent-browser.cmd` has no saved auth profile and redirects to `/login`.
- Phase 10 must avoid weakening existing employee, performance, payroll, lifecycle, self-service, ATS, and reporting behavior.
- Running `npm.cmd run build` while the dev server is live can stale `.next`; restart the dev server on port `3001` after builds before browser checks.

## Session Continuity

Resume with:

`$gsd-execute-phase 10`

If more planning is desired before execution, review:

- `HRMS_SUPERCHARGED_BUILD_PLAN.md`
- `.planning/ROADMAP.md`
- `.planning/phases/10-recruitment-unification/10-PLAN.md`
- `lib/nav/config.ts`
