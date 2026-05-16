import type { Role } from "@/lib/types";

export type ExpenseRecordScope = "expense_claim" | "employee_advance" | "travel_request" | "vehicle_log" | "vehicle_service";
export type ExpensePermissionKey = (typeof EXPENSE_PERMISSION_KEYS)[keyof typeof EXPENSE_PERMISSION_KEYS];

export type ExpenseProfile = {
  id?: string | null;
  employee_id?: string | null;
  role?: Role | string | null;
  is_active?: boolean | null;
  permissions?: readonly string[] | null;
  department_approvals?: readonly {
    department_id?: string | null;
    approval_scope?: string | null;
  }[] | null;
};

export type ExpenseAccessTarget = {
  employee_id?: string | null;
  profile_id?: string | null;
  department_id?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_profile_id?: string | null;
};

export const EXPENSE_PERMISSION_KEYS = {
  viewSelf: "permission.expenses.view_self",
  viewTeam: "permission.expenses.view_team",
  manage: "permission.expenses.manage",
  approve: "permission.expenses.approve",
  claimTypesManage: "permission.expense_claim_types.manage",
  advancesViewSelf: "permission.employee_advances.view_self",
  advancesManage: "permission.employee_advances.manage",
  advancesApprove: "permission.employee_advances.approve",
  travelViewSelf: "permission.travel_requests.view_self",
  travelManage: "permission.travel_requests.manage",
  travelApprove: "permission.travel_requests.approve",
  vehiclesViewSelf: "permission.vehicles.view_self",
  vehiclesManage: "permission.vehicles.manage",
} as const;

const EXPENSE_MANAGERS = new Set(["admin", "hr_manager", "finance_manager"]);
const TEAM_EXPENSE_ROLES = new Set(["admin", "hr_manager", "finance_manager", "hod"]);
const APPROVER_ROLES = new Set(["admin", "hr_manager", "finance_manager", "hod", "expense_approver"]);

function activeRole(profile: ExpenseProfile | null | undefined) {
  if (!profile || profile.is_active === false) return "";
  return profile.role ?? "";
}

function hasCapability(profile: ExpenseProfile | null | undefined, permission: ExpensePermissionKey) {
  if (!profile || profile.is_active === false) return false;
  return Boolean(profile.permissions?.includes(permission));
}

function isSelf(profile: ExpenseProfile | null | undefined, target: ExpenseAccessTarget | null | undefined) {
  return Boolean(profile?.id && target?.profile_id && profile.id === target.profile_id);
}

function isReportingManager(profile: ExpenseProfile | null | undefined, target: ExpenseAccessTarget | null | undefined) {
  return Boolean(
    (profile?.id && target?.reporting_manager_profile_id && profile.id === target.reporting_manager_profile_id)
    || (profile?.employee_id && target?.reporting_manager_id && profile.employee_id === target.reporting_manager_id),
  );
}

function scopedPermissionFor(recordScope: ExpenseRecordScope) {
  if (recordScope === "employee_advance") return EXPENSE_PERMISSION_KEYS.advancesApprove;
  if (recordScope === "travel_request") return EXPENSE_PERMISSION_KEYS.travelApprove;
  if (recordScope === "vehicle_log" || recordScope === "vehicle_service") return EXPENSE_PERMISSION_KEYS.vehiclesManage;
  return EXPENSE_PERMISSION_KEYS.approve;
}

function isDepartmentExpenseApprover(
  profile: ExpenseProfile | null | undefined,
  target: ExpenseAccessTarget | null | undefined,
  recordScope: ExpenseRecordScope,
) {
  if (!profile || profile.is_active === false) return false;
  if (!target?.department_id) return false;
  return Boolean(profile.department_approvals?.some((approval) => (
    approval.approval_scope === recordScope
    && approval.department_id === target.department_id
  )));
}

export function canManageExpenses(profile: ExpenseProfile | null | undefined) {
  return EXPENSE_MANAGERS.has(activeRole(profile))
    || hasCapability(profile, EXPENSE_PERMISSION_KEYS.manage)
    || hasCapability(profile, EXPENSE_PERMISSION_KEYS.advancesManage)
    || hasCapability(profile, EXPENSE_PERMISSION_KEYS.travelManage)
    || hasCapability(profile, EXPENSE_PERMISSION_KEYS.vehiclesManage);
}

export function canCreateExpenseRecord(profile: ExpenseProfile | null | undefined, target: ExpenseAccessTarget | null | undefined) {
  if (!profile || profile.is_active === false || !target) return false;
  return canManageExpenses(profile) || isSelf(profile, target);
}

export function canViewExpenseRecord(profile: ExpenseProfile | null | undefined, target: ExpenseAccessTarget | null | undefined) {
  const role = activeRole(profile);
  if (!profile || profile.is_active === false || !target) return false;
  if (canManageExpenses(profile)) return true;
  if ((TEAM_EXPENSE_ROLES.has(role) || hasCapability(profile, EXPENSE_PERMISSION_KEYS.viewTeam)) && isReportingManager(profile, target)) return true;
  if (isSelf(profile, target)) {
    return role === "employee"
      || hasCapability(profile, EXPENSE_PERMISSION_KEYS.viewSelf)
      || hasCapability(profile, EXPENSE_PERMISSION_KEYS.advancesViewSelf)
      || hasCapability(profile, EXPENSE_PERMISSION_KEYS.travelViewSelf)
      || hasCapability(profile, EXPENSE_PERMISSION_KEYS.vehiclesViewSelf);
  }
  return false;
}

export function canApproveExpenseRecord(
  profile: ExpenseProfile | null | undefined,
  target: ExpenseAccessTarget | null | undefined,
  recordScope: ExpenseRecordScope = "expense_claim",
) {
  if (!profile || profile.is_active === false || !target) return false;
  if (canManageExpenses(profile)) return true;
  const canApprove = APPROVER_ROLES.has(activeRole(profile))
    || hasCapability(profile, EXPENSE_PERMISSION_KEYS.approve)
    || hasCapability(profile, scopedPermissionFor(recordScope));
  return (canApprove && isReportingManager(profile, target)) || isDepartmentExpenseApprover(profile, target, recordScope);
}
