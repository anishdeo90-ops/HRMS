// AUTO-GENERATED FILE. DO NOT EDIT.

export const METADATA_KEYS = [
  "approval_rule.expense.department_head",
  "form.employee.profile",
  "form.expense_claim.request",
  "form.leave_application.request",
  "import_alias.candidate.mobile",
  "import_alias.job.title",
  "leave_policy.example.standard",
  "leave_type.earned_leave",
  "permission.metadata.manage",
  "permission.metadata.view",
  "report.leave.balance",
  "report.payroll.salary_register",
  "role.admin",
  "role.employee",
  "role.expense_approver",
  "role.hod",
  "role.hr_manager",
  "role.hr_user",
  "role.interviewer",
  "role.leave_approver",
  "role.payroll_manager",
  "role.recruiter",
  "route.metadata.governance",
  "salary_component.basic",
  "salary_structure.example.standard",
  "workflow.leave_application.approved",
  "workflow.leave_application.submitted"
] as const;

export type MetadataKey = typeof METADATA_KEYS[number];

export function isMetadataKey(value: string): value is MetadataKey {
  return (METADATA_KEYS as readonly string[]).includes(value);
}
