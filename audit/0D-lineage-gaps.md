# Agent 0D Metadata Lineage Gaps

Discovery-only audit generated from `metadata/lineage.yaml`, core metadata registries, generated files, migrations, API/UI paths, and tests. No source files were edited.

## Keys Missing From `metadata/lineage.yaml`

Missing explicit lineage entries among workflows/permissions/routes/roles: 94.

| Source | Key |
|---|---|
| metadata/workflows.yaml | workflow.expense_claim.status |
| metadata/workflows.yaml | workflow.employee_advance.status |
| metadata/workflows.yaml | workflow.travel_request.status |
| metadata/workflows.yaml | workflow.vehicle_service.status |
| metadata/workflows.yaml | workflow.payroll.period_status |
| metadata/workflows.yaml | workflow.payroll.entry_status |
| metadata/workflows.yaml | workflow.payroll.salary_slip_status |
| metadata/workflows.yaml | workflow.payroll.tax_declaration_status |
| metadata/workflows.yaml | workflow.payroll.benefit_claim_status |
| metadata/workflows.yaml | workflow.recruitment.job_opening_status |
| metadata/workflows.yaml | workflow.recruitment.applicant_status |
| metadata/workflows.yaml | workflow.recruitment.interview_status |
| metadata/workflows.yaml | workflow.recruitment.offer_status |
| metadata/workflows.yaml | workflow.recruitment.appointment_letter_status |
| metadata/workflows.yaml | workflow.recruitment.handoff_status |
| metadata/permissions.yaml | permission.metadata.manage |
| metadata/permissions.yaml | permission.metadata.view |
| metadata/permissions.yaml | permission.employee.view |
| metadata/permissions.yaml | permission.employee.update_basic |
| metadata/permissions.yaml | permission.organization.manage |
| metadata/permissions.yaml | permission.department_approvers.manage |
| metadata/permissions.yaml | permission.documents.view |
| metadata/permissions.yaml | permission.documents.manage |
| metadata/permissions.yaml | permission.attendance.view_self |
| metadata/permissions.yaml | permission.attendance.manage |
| metadata/permissions.yaml | permission.attendance.corrections.request |
| metadata/permissions.yaml | permission.attendance.corrections.approve |
| metadata/permissions.yaml | permission.shifts.view |
| metadata/permissions.yaml | permission.shifts.manage |
| metadata/permissions.yaml | permission.shifts.request |
| metadata/permissions.yaml | permission.overtime.view |
| metadata/permissions.yaml | permission.overtime.manage |
| metadata/permissions.yaml | permission.leave.types.manage |
| metadata/permissions.yaml | permission.leave.policies.manage |
| metadata/permissions.yaml | permission.leave.allocations.manage |
| metadata/permissions.yaml | permission.leave.view_team |
| metadata/permissions.yaml | permission.leave.apply |
| metadata/permissions.yaml | permission.leave.cancel |
| metadata/permissions.yaml | permission.leave.ledger.view |
| metadata/permissions.yaml | permission.leave.reports.view |
| metadata/permissions.yaml | permission.expenses.view_self |
| metadata/permissions.yaml | permission.expenses.view_team |
| metadata/permissions.yaml | permission.expenses.manage |
| metadata/permissions.yaml | permission.expenses.approve |
| metadata/permissions.yaml | permission.expense_claim_types.manage |
| metadata/permissions.yaml | permission.employee_advances.view_self |
| metadata/permissions.yaml | permission.employee_advances.manage |
| metadata/permissions.yaml | permission.employee_advances.approve |
| metadata/permissions.yaml | permission.travel_requests.view_self |
| metadata/permissions.yaml | permission.travel_requests.manage |
| metadata/permissions.yaml | permission.travel_requests.approve |
| metadata/permissions.yaml | permission.vehicles.view_self |
| metadata/permissions.yaml | permission.vehicles.manage |
| metadata/permissions.yaml | permission.payroll.view |
| metadata/permissions.yaml | permission.payroll.manage |
| metadata/permissions.yaml | permission.salary_components.manage |
| metadata/permissions.yaml | permission.salary_structures.manage |
| metadata/permissions.yaml | permission.salary_structures.assign |
| metadata/permissions.yaml | permission.payroll_periods.manage |
| metadata/permissions.yaml | permission.payroll_entries.manage |
| metadata/permissions.yaml | permission.salary_slips.view_self |
| metadata/permissions.yaml | permission.salary_slips.manage |
| metadata/permissions.yaml | permission.salary_slips.submit |
| metadata/permissions.yaml | permission.salary_slips.cancel |
| metadata/permissions.yaml | permission.tax_declarations.view_self |
| metadata/permissions.yaml | permission.tax_declarations.manage |
| metadata/permissions.yaml | permission.benefits.view_self |
| metadata/permissions.yaml | permission.benefits.manage |
| metadata/permissions.yaml | permission.payroll_reports.view |
| metadata/routes.yaml | route.metadata.governance |
| metadata/routes.yaml | route.people.organization |
| metadata/routes.yaml | route.finance.expenses |
| metadata/routes.yaml | route.finance.expense_claims |
| metadata/routes.yaml | route.finance.advances |
| metadata/routes.yaml | route.finance.travel |
| metadata/routes.yaml | route.finance.vehicles |
| metadata/routes.yaml | route.finance.approvals |
| metadata/routes.yaml | route.payroll.overview |
| metadata/routes.yaml | route.payroll.salary_structures |
| metadata/routes.yaml | route.payroll.runs |
| metadata/routes.yaml | route.payroll.salary_slips |
| metadata/routes.yaml | route.payroll.tax_benefits |
| metadata/routes.yaml | route.recruitment.overview |
| metadata/routes.yaml | route.recruitment.appointments |
| metadata/roles.yaml | role.admin |
| metadata/roles.yaml | role.hr_user |
| metadata/roles.yaml | role.recruiter |
| metadata/roles.yaml | role.hod |
| metadata/roles.yaml | role.employee |
| metadata/roles.yaml | role.leave_approver |
| metadata/roles.yaml | role.expense_approver |
| metadata/roles.yaml | role.finance_manager |
| metadata/roles.yaml | role.interviewer |
| metadata/roles.yaml | role.payroll_manager |

## Lineage Entries With Broken DB/TS/API/UI/Test References

Broken reference count: 42.

| Key | Field | Reference | Issue |
|---|---|---|---|
| approval_rule.lifecycle.daily_work_summary_manager_review | api | app/api/hrms/lifecycle/daily-work-summaries | API route file/directory with route.ts not found |
| form.leave_application.request | ui | app/(app)/time/leave/page.tsx | UI page/component path not found as a file |
| form.lifecycle.daily_work_summary | api | app/api/hrms/lifecycle/daily-work-summaries | API route file/directory with route.ts not found |
| form.reports.automation_rule | api | app/api/hrms/automation/rules | API route file/directory with route.ts not found |
| form.reports.notification_rule | api | app/api/hrms/automation/notification-rules | API route file/directory with route.ts not found |
| import_alias.leave.allocation.employee_code | db | import_aliases via supabase/generated/metadata_seed.sql | No parsed migration CREATE TABLE for import_aliases |
| import_alias.leave.allocation.employee_code | ui | app/(app)/time/leave/page.tsx | UI page/component path not found as a file |
| leave_type.earned_leave | ui | app/(app)/time/leave/page.tsx | UI page/component path not found as a file |
| permission.automation_executions.run | api | app/api/hrms/automation/executions | API route file/directory with route.ts not found |
| permission.automation_executions.view | api | app/api/hrms/automation/executions | API route file/directory with route.ts not found |
| permission.automation_rules.manage | api | app/api/hrms/automation/rules | API route file/directory with route.ts not found |
| permission.automation_rules.view | api | app/api/hrms/automation/rules | API route file/directory with route.ts not found |
| permission.daily_work_summaries.submit | api | app/api/hrms/lifecycle/daily-work-summaries | API route file/directory with route.ts not found |
| permission.daily_work_summaries.view_team | api | app/api/hrms/lifecycle/daily-work-summaries | API route file/directory with route.ts not found |
| permission.employee.manage | ui | route.people.employees | UI page/component path not found as a file |
| permission.leave.view_self | ui | app/(app)/time/leave/page.tsx | UI page/component path not found as a file |
| permission.lifecycle.reports.view | api | app/api/hrms/lifecycle/reports | API route file/directory with route.ts not found |
| permission.notification_rules.manage | api | app/api/hrms/automation/notification-rules | API route file/directory with route.ts not found |
| permission.notification_rules.view | api | app/api/hrms/automation/notification-rules | API route file/directory with route.ts not found |
| permission.performance.reports.view | api | app/api/hrms/performance/reports | API route file/directory with route.ts not found |
| permission.recruitment.appointment_letters.manage | api | app/api/hrms/recruitment/appointment-letters | API route file/directory with route.ts not found |
| permission.recruitment.job_openings.manage | api | app/api/hrms/recruitment/job-openings | API route file/directory with route.ts not found |
| permission.recruitment.job_requisitions.approve | api | app/api/hrms/recruitment/job-requisitions | API route file/directory with route.ts not found |
| permission.recruitment.job_requisitions.request | api | app/api/hrms/recruitment/job-requisitions | API route file/directory with route.ts not found |
| permission.recruitment.reports.view | api | app/api/hrms/recruitment/reports | API route file/directory with route.ts not found |
| report.leave.balance | ui | app/(app)/time/leave/page.tsx | UI page/component path not found as a file |
| report.lifecycle.daily_work_summary | api | app/api/hrms/lifecycle/reports | API route file/directory with route.ts not found |
| report.lifecycle.grievance_summary | api | app/api/hrms/lifecycle/reports | API route file/directory with route.ts not found |
| report.lifecycle.onboarding_progress | api | app/api/hrms/lifecycle/reports | API route file/directory with route.ts not found |
| report.lifecycle.promotion_transfer_summary | api | app/api/hrms/lifecycle/reports | API route file/directory with route.ts not found |
| report.lifecycle.separation_pipeline | api | app/api/hrms/lifecycle/reports | API route file/directory with route.ts not found |
| report.lifecycle.training_participation | api | app/api/hrms/lifecycle/reports | API route file/directory with route.ts not found |
| report.performance.appraisal_summary | api | app/api/hrms/performance/reports | API route file/directory with route.ts not found |
| report.performance.feedback_summary | api | app/api/hrms/performance/reports | API route file/directory with route.ts not found |
| report.performance.goal_progress | api | app/api/hrms/performance/reports | API route file/directory with route.ts not found |
| role.hr_manager | api | app/api/metadata | API route file/directory with route.ts not found |
| route.time.leave | ui | app/(app)/time/leave/page.tsx | UI page/component path not found as a file |
| workflow.leave.application | ui | app/(app)/time/leave/page.tsx | UI page/component path not found as a file |
| workflow.lifecycle.daily_work_summary_status | api | app/api/hrms/lifecycle/daily-work-summaries | API route file/directory with route.ts not found |
| workflow.reports.automation_execution_status | api | app/api/hrms/automation/executions | API route file/directory with route.ts not found |
| workflow.reports.automation_rule_status | api | app/api/hrms/automation/rules | API route file/directory with route.ts not found |
| workflow.reports.notification_rule_status | api | app/api/hrms/automation/notification-rules | API route file/directory with route.ts not found |

## Output of `metadata:validate`

```text
> hirerabbits-ats@0.1.0 metadata:validate
> tsx scripts/metadata/validate.ts

Metadata validation passed
```

## Output of `metadata:lineage`

```text
> hirerabbits-ats@0.1.0 metadata:lineage
> tsx scripts/metadata/lineage-report.ts

Lineage report completed with "## Issues - None" and "Metadata lineage report complete". The command output table marked registry/generated TypeScript rows as OK. This audit still flags stricter path-existence gaps below because Agent 0D requires actual API/UI/test/db references, not only registry/generator coverage.
```

## Audit Notes

- `metadata:lineage` reports no built-in issues, but `metadata/lineage.yaml` does not explicitly list every key from workflows, permissions, routes, and roles.
- Several lineage entries point at future/planned route names such as `notification-rules`, `automation/rules`, `automation/executions`, and recruitment `job-openings`/`job-requisitions`; the current filesystem has different concrete route paths.
- Entries whose `ui` field contains a metadata route key such as `route.people.employees` are flagged because Wave 0 Agent 0D asked for actual page files.
