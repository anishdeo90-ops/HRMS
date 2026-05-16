import type { Role } from "@/lib/types";

export type PayrollRecordScope =
  | "salary_structure"
  | "payroll_period"
  | "payroll_entry"
  | "salary_slip"
  | "tax_declaration"
  | "benefit_application"
  | "benefit_claim";
export type PayrollPermissionKey = (typeof PAYROLL_PERMISSION_KEYS)[keyof typeof PAYROLL_PERMISSION_KEYS];

export type PayrollProfile = {
  id?: string | null;
  employee_id?: string | null;
  role?: Role | string | null;
  is_active?: boolean | null;
  permissions?: readonly string[] | null;
};

export type PayrollAccessTarget = {
  employee_id?: string | null;
  profile_id?: string | null;
  department_id?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_profile_id?: string | null;
};

export const PAYROLL_PERMISSION_KEYS = {
  view: "permission.payroll.view",
  manage: "permission.payroll.manage",
  run: "permission.payroll.run",
  reportsView: "permission.payroll.reports.view",
  salaryStructuresManage: "permission.salary_structures.manage",
  payrollPeriodsManage: "permission.payroll_periods.manage",
  payrollEntriesManage: "permission.payroll_entries.manage",
  salarySlipsManage: "permission.salary_slips.manage",
  salarySlipsViewSelf: "permission.salary_slips.view_self",
  taxBenefitsManage: "permission.tax_benefits.manage",
  taxDeclarationsViewSelf: "permission.employee_tax_declarations.view_self",
  benefitsViewSelf: "permission.employee_benefits.view_self",
} as const;

const PAYROLL_MANAGERS = new Set(["admin", "hr_manager", "payroll_manager"]);
const PAYROLL_VIEWERS = new Set(["admin", "hr_manager", "payroll_manager"]);

function activeRole(profile: PayrollProfile | null | undefined) {
  if (!profile || profile.is_active === false) return "";
  return profile.role ?? "";
}

function hasCapability(profile: PayrollProfile | null | undefined, permission: PayrollPermissionKey) {
  if (!profile || profile.is_active === false) return false;
  return Boolean(profile.permissions?.includes(permission));
}

function isSelf(profile: PayrollProfile | null | undefined, target: PayrollAccessTarget | null | undefined) {
  return Boolean(
    (profile?.id && target?.profile_id && profile.id === target.profile_id)
    || (profile?.employee_id && target?.employee_id && profile.employee_id === target.employee_id),
  );
}

function selfPermissionFor(recordScope: PayrollRecordScope) {
  if (recordScope === "salary_slip") return PAYROLL_PERMISSION_KEYS.salarySlipsViewSelf;
  if (recordScope === "tax_declaration") return PAYROLL_PERMISSION_KEYS.taxDeclarationsViewSelf;
  if (recordScope === "benefit_application" || recordScope === "benefit_claim") return PAYROLL_PERMISSION_KEYS.benefitsViewSelf;
  return undefined;
}

export function canManagePayroll(profile: PayrollProfile | null | undefined) {
  return PAYROLL_MANAGERS.has(activeRole(profile))
    || hasCapability(profile, PAYROLL_PERMISSION_KEYS.manage);
}

export function canViewPayroll(profile: PayrollProfile | null | undefined) {
  return PAYROLL_VIEWERS.has(activeRole(profile))
    || hasCapability(profile, PAYROLL_PERMISSION_KEYS.view)
    || hasCapability(profile, PAYROLL_PERMISSION_KEYS.reportsView)
    || canManagePayroll(profile);
}

export function canManageSalaryStructures(profile: PayrollProfile | null | undefined) {
  return canManagePayroll(profile)
    || hasCapability(profile, PAYROLL_PERMISSION_KEYS.salaryStructuresManage);
}

export function canRunPayroll(profile: PayrollProfile | null | undefined) {
  return canManagePayroll(profile)
    || hasCapability(profile, PAYROLL_PERMISSION_KEYS.run)
    || hasCapability(profile, PAYROLL_PERMISSION_KEYS.payrollPeriodsManage)
    || hasCapability(profile, PAYROLL_PERMISSION_KEYS.payrollEntriesManage);
}

export function canManageTaxBenefits(profile: PayrollProfile | null | undefined) {
  return canManagePayroll(profile)
    || hasCapability(profile, PAYROLL_PERMISSION_KEYS.taxBenefitsManage);
}

export function canUsePayrollSelfService(
  profile: PayrollProfile | null | undefined,
  target: PayrollAccessTarget | null | undefined,
  recordScope: PayrollRecordScope,
) {
  if (!profile || profile.is_active === false || !target) return false;
  if (!isSelf(profile, target)) return false;
  const permission = selfPermissionFor(recordScope);
  if (!permission) return false;
  return activeRole(profile) === "employee" || hasCapability(profile, permission);
}

export function canViewPayrollRecord(
  profile: PayrollProfile | null | undefined,
  target: PayrollAccessTarget | null | undefined,
  recordScope: PayrollRecordScope,
) {
  if (!profile || profile.is_active === false || !target) return false;
  if (canViewPayroll(profile) || canManagePayroll(profile)) return true;
  return canUsePayrollSelfService(profile, target, recordScope);
}

export function canManagePayrollRecord(
  profile: PayrollProfile | null | undefined,
  recordScope: PayrollRecordScope,
) {
  if (recordScope === "salary_structure") return canManageSalaryStructures(profile);
  if (recordScope === "tax_declaration" || recordScope === "benefit_claim") return canManageTaxBenefits(profile);
  if (recordScope === "payroll_period" || recordScope === "payroll_entry" || recordScope === "salary_slip") return canRunPayroll(profile);
  return canManagePayroll(profile);
}
