# Phase 9 UI Spec: Reports, Dashboards, Notifications, Automation

## Routes

- `/reports`
  - HRMS report catalog and operational report runner.
  - Group reports by People, Time, Leave, Finance, Payroll, Performance, Lifecycle, Recruitment, and Events.
  - Provide compact filters and export affordances where supported by the API.
- `/reports/dashboards`
  - HRMS dashboard summary for HR/admin/payroll roles.
  - Show dense operational tiles for headcount, attendance, leave, expenses, payroll readiness, performance, lifecycle, approvals, and alerts.

## Navigation

- Enable existing Reports section entries only after the route files and tests exist:
  - `Reports` -> `/reports`
  - `Dashboards` -> `/reports/dashboards`
- Keep Reports visible only to authorized HR/admin/finance/payroll style roles.
- Do not add one-off sidebar JSX links.

## Page Behavior

- Use `/api/hrms/reports` for report catalog and report execution.
- Use `/api/hrms/dashboards` for dashboard summary cards and alerts.
- Use `/api/hrms/automation` for automation rule visibility where exposed.
- Empty states must render cleanly without seed data.
- Avoid marketing copy; this is an operational HRMS surface.

## Access

- Admin and HR manager can view HRMS reports and dashboards.
- Payroll manager can view payroll and finance-safe reports only.
- Employee self-service notification visibility remains scoped to the employee unless a management permission applies.
- Automation rule management is admin/HR-manager only.
