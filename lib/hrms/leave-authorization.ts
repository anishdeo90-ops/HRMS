import type { Role } from "@/lib/types";

export type LeavePermissionKey = (typeof LEAVE_PERMISSION_KEYS)[keyof typeof LEAVE_PERMISSION_KEYS];

export type LeaveProfile = {
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

export type LeaveAccessTarget = {
  id?: string | null;
  profile_id?: string | null;
  department_id?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_profile_id?: string | null;
};

export const LEAVE_PERMISSION_KEYS = {
  typesManage: "permission.leave.types.manage",
  policiesManage: "permission.leave.policies.manage",
  allocationsManage: "permission.leave.allocations.manage",
  viewSelf: "permission.leave.view_self",
  viewTeam: "permission.leave.view_team",
  apply: "permission.leave.apply",
  approve: "permission.leave.approve",
  cancel: "permission.leave.cancel",
  ledgerView: "permission.leave.ledger.view",
  reportsView: "permission.leave.reports.view",
} as const;

const LEAVE_MANAGERS = new Set(["admin", "hr_manager"]);
const TEAM_LEAVE_ROLES = new Set(["admin", "hr_manager", "hr_user", "hod"]);
const APPROVER_ROLES = new Set(["admin", "hr_manager", "hod", "leave_approver"]);

function activeRole(profile: LeaveProfile | null | undefined) {
  if (!profile || profile.is_active === false) return "";
  return profile.role ?? "";
}

function isSelf(profile: LeaveProfile | null | undefined, target: LeaveAccessTarget | null | undefined) {
  return Boolean(profile?.id && target?.profile_id && profile.id === target.profile_id);
}

function isReportingManager(profile: LeaveProfile | null | undefined, target: LeaveAccessTarget | null | undefined) {
  return Boolean(
    (profile?.employee_id && target?.reporting_manager_id && profile.employee_id === target.reporting_manager_id)
      || (profile?.id && target?.reporting_manager_profile_id && profile.id === target.reporting_manager_profile_id),
  );
}

function hasLeaveCapability(profile: LeaveProfile | null | undefined, permission: LeavePermissionKey) {
  if (!profile || profile.is_active === false) return false;
  return Boolean(profile.permissions?.includes(permission));
}

function isDepartmentLeaveApprover(
  profile: LeaveProfile | null | undefined,
  target: LeaveAccessTarget | null | undefined,
  approvalScope: "leave_application" | "compensatory_leave" | "leave_encashment",
) {
  if (!profile || profile.is_active === false) return false;
  if (!target) return Boolean(profile.department_approvals?.some((approval) => approval.approval_scope === approvalScope));
  return Boolean(
    target.department_id
      && profile.department_approvals?.some((approval) => (
        approval.approval_scope === approvalScope
        && approval.department_id === target.department_id
      )),
  );
}

export function canManageLeaveSetup(profile: LeaveProfile | null | undefined) {
  return LEAVE_MANAGERS.has(activeRole(profile))
    || hasLeaveCapability(profile, LEAVE_PERMISSION_KEYS.typesManage)
    || hasLeaveCapability(profile, LEAVE_PERMISSION_KEYS.policiesManage);
}

export function canManageLeaveBalances(profile: LeaveProfile | null | undefined) {
  return LEAVE_MANAGERS.has(activeRole(profile)) || hasLeaveCapability(profile, LEAVE_PERMISSION_KEYS.allocationsManage);
}

export function canViewLeave(profile: LeaveProfile | null | undefined, target: LeaveAccessTarget | null | undefined) {
  const role = activeRole(profile);
  if (!profile || profile.is_active === false || !target) return false;
  if (LEAVE_MANAGERS.has(role)) return true;
  if ((TEAM_LEAVE_ROLES.has(role) || hasLeaveCapability(profile, LEAVE_PERMISSION_KEYS.viewTeam)) && isReportingManager(profile, target)) return true;
  if (isSelf(profile, target)) return role === "employee" || hasLeaveCapability(profile, LEAVE_PERMISSION_KEYS.viewSelf);
  return false;
}

export function canRequestLeave(profile: LeaveProfile | null | undefined, target: LeaveAccessTarget | null | undefined) {
  if (LEAVE_MANAGERS.has(activeRole(profile))) return true;
  return isSelf(profile, target) && hasLeaveCapability(profile, LEAVE_PERMISSION_KEYS.apply);
}

export function canApproveLeave(
  profile: LeaveProfile | null | undefined,
  target?: LeaveAccessTarget | null,
  approvalScope: "leave_application" | "compensatory_leave" | "leave_encashment" = "leave_application",
) {
  if (LEAVE_MANAGERS.has(activeRole(profile))) return true;
  const canApprove = APPROVER_ROLES.has(activeRole(profile)) || hasLeaveCapability(profile, LEAVE_PERMISSION_KEYS.approve);
  if (!target) return canApprove || isDepartmentLeaveApprover(profile, target, approvalScope);
  return (canApprove && isReportingManager(profile, target)) || isDepartmentLeaveApprover(profile, target, approvalScope);
}

export function canViewLeaveLedger(profile: LeaveProfile | null | undefined, target: LeaveAccessTarget | null | undefined) {
  return canViewLeave(profile, target) && hasLeaveCapability(profile, LEAVE_PERMISSION_KEYS.ledgerView);
}

export const canRequestCompensatoryLeave = canRequestLeave;
export const canRequestLeaveEncashment = canRequestLeave;

export function canApproveCompensatoryLeave(profile: LeaveProfile | null | undefined, target?: LeaveAccessTarget | null) {
  return canApproveLeave(profile, target, "compensatory_leave");
}

export function canApproveLeaveEncashment(profile: LeaveProfile | null | undefined, target?: LeaveAccessTarget | null) {
  return canApproveLeave(profile, target, "leave_encashment");
}
