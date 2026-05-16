# Phase 9 Context: Reports, Dashboards, Notifications, Automation

## Goal

Add governed HRMS reporting, dashboard summaries, employee notifications, and scheduled automation foundations without weakening existing ATS automation or any completed HRMS domain.

## Scope

- Add governed Phase 9 metadata for HRMS report catalog entries, report routes, dashboard routes, notification and automation permissions, workflow states, and lineage.
- Add a reporting/automation migration with helper-backed RLS for report runs, dashboard widgets, notification rules, automation rules, and automation execution logs.
- Add HRMS report and dashboard APIs that aggregate existing Phase 1-8 tables without bypassing domain authorization.
- Extend the Phase 8 employee notification foundation for rule-driven HR notifications.
- Add reports and dashboard UI routes:
  - `/reports`
  - `/reports/dashboards`
- Keep existing ATS follow-up automation intact.

## Report Coverage

Phase 9 should cover the build-plan reporting list:

- Employee information
- Employee analytics
- Monthly attendance sheet
- Shift attendance
- Leave balance
- Leave ledger
- Employee advance summary
- Unpaid expense claims
- Salary register
- Bank remittance
- Recruitment analytics
- Employee exits
- Birthdays and anniversaries

## Automation Coverage

Phase 9 should add a governed foundation for:

- Leave accrual and expiry
- Attendance reminders
- Interview reminders
- Birthday and work anniversary reminders
- Payroll readiness checks
- Pending approval notifications

## Brownfield Constraints

- Preserve existing ATS dashboard, candidate, interview, offer, settings, sync, and follow-up automation behavior.
- Do not copy logic from the Frappe HRMS reference repo.
- Use existing Supabase/Postgres/RLS patterns and fail closed.
- Use governed metadata for new report, route, permission, notification, workflow, and automation concepts.
- Avoid broad service-role APIs unless the caller is authorized and the result is scoped before query or response.
- Leave Phase 10 recruitment terminology unification out of scope.

## Verification Expectations

- Metadata validation, generation, lineage, hardcoding checks, and metadata tests pass.
- Phase 9 SQL/RLS contract tests pass.
- Reports helper/auth/API/UI contract tests pass.
- Nav tests reflect enabled Phase 9 reports routes only after routes exist.
- Build passes.
- Bob applies the live migration, confirms Supabase local/remote parity, restarts the dev server after build, and browser-checks `/reports` and `/reports/dashboards` signed in.
