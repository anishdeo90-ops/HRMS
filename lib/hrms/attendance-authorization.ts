import type { Role } from "@/lib/types";

export type AttendancePermissionKey = (typeof ATTENDANCE_PERMISSION_KEYS)[keyof typeof ATTENDANCE_PERMISSION_KEYS];

export type AttendanceProfile = {
  id?: string | null;
  role?: Role | string | null;
  is_active?: boolean | null;
  permissions?: readonly string[] | null;
  department_approvals?: readonly {
    department_id?: string | null;
    approval_scope?: string | null;
  }[] | null;
};

export type AttendanceAccessTarget = {
  id?: string | null;
  profile_id?: string | null;
  department_id?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_profile_id?: string | null;
};

export const ATTENDANCE_PERMISSION_KEYS = {
  checkIn: "permission.attendance.check_in",
  viewSelf: "permission.attendance.view_self",
  viewTeam: "permission.attendance.view_team",
  manage: "permission.attendance.manage",
  correctionsRequest: "permission.attendance.corrections.request",
  correctionsApprove: "permission.attendance.corrections.approve",
  shiftsView: "permission.shifts.view",
  shiftsManage: "permission.shifts.manage",
  shiftsRequest: "permission.shifts.request",
  shiftsApprove: "permission.shifts.approve",
  overtimeView: "permission.overtime.view",
  overtimeManage: "permission.overtime.manage",
  overtimeApprove: "permission.overtime.approve",
} as const;

const ATTENDANCE_MANAGERS = new Set(["admin", "hr_manager"]);
const TEAM_ATTENDANCE_ROLES = new Set(["admin", "hr_manager", "hr_user", "hod"]);
const SHIFT_MANAGERS = new Set(["admin", "hr_manager"]);
const APPROVER_ROLES = new Set(["admin", "hr_manager", "hod"]);

function activeRole(profile: AttendanceProfile | null | undefined) {
  if (!profile || profile.is_active === false) return "";
  return profile.role ?? "";
}

function isSelf(profile: AttendanceProfile | null | undefined, target: AttendanceAccessTarget | null | undefined) {
  return Boolean(profile?.id && target?.profile_id && profile.id === target.profile_id);
}

function isReportingManager(profile: AttendanceProfile | null | undefined, target: AttendanceAccessTarget | null | undefined) {
  return Boolean(profile?.id && target?.reporting_manager_profile_id && profile.id === target.reporting_manager_profile_id);
}

function isDepartmentApprover(
  profile: AttendanceProfile | null | undefined,
  target: AttendanceAccessTarget | null | undefined,
  approvalScope: "attendance_correction" | "shift_request" | "overtime",
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

export function hasAttendanceCapability(profile: AttendanceProfile | null | undefined, permission: AttendancePermissionKey) {
  if (!profile || profile.is_active === false) return false;
  return Boolean(profile.permissions?.includes(permission));
}

export function canManageAttendance(profile: AttendanceProfile | null | undefined) {
  return ATTENDANCE_MANAGERS.has(activeRole(profile)) || hasAttendanceCapability(profile, ATTENDANCE_PERMISSION_KEYS.manage);
}

export function canViewAttendance(profile: AttendanceProfile | null | undefined, target: AttendanceAccessTarget | null | undefined) {
  const role = activeRole(profile);
  if (!profile || profile.is_active === false || !target) return false;
  if (canManageAttendance(profile)) return true;
  if ((TEAM_ATTENDANCE_ROLES.has(role) || hasAttendanceCapability(profile, ATTENDANCE_PERMISSION_KEYS.viewTeam)) && isReportingManager(profile, target)) return true;
  if (isSelf(profile, target)) return role === "employee" || hasAttendanceCapability(profile, ATTENDANCE_PERMISSION_KEYS.viewSelf);
  return false;
}

export function canCheckInAttendance(profile: AttendanceProfile | null | undefined, target: AttendanceAccessTarget | null | undefined) {
  if (canManageAttendance(profile)) return true;
  return isSelf(profile, target) && hasAttendanceCapability(profile, ATTENDANCE_PERMISSION_KEYS.checkIn);
}

export const canCheckIn = canCheckInAttendance;

export function canRequestAttendanceCorrection(profile: AttendanceProfile | null | undefined, target: AttendanceAccessTarget | null | undefined) {
  if (canManageAttendance(profile)) return true;
  return canViewAttendance(profile, target) && hasAttendanceCapability(profile, ATTENDANCE_PERMISSION_KEYS.correctionsRequest);
}

export function canApproveAttendanceCorrection(profile: AttendanceProfile | null | undefined, target?: AttendanceAccessTarget | null) {
  if (canManageAttendance(profile)) return true;
  const canApprove = APPROVER_ROLES.has(activeRole(profile)) || hasAttendanceCapability(profile, ATTENDANCE_PERMISSION_KEYS.correctionsApprove);
  if (!target) return canApprove || isDepartmentApprover(profile, target, "attendance_correction");
  return (canApprove && isReportingManager(profile, target)) || isDepartmentApprover(profile, target, "attendance_correction");
}

export const canApproveAttendance = canApproveAttendanceCorrection;

export function canViewShifts(profile: AttendanceProfile | null | undefined) {
  return canManageShifts(profile) || hasAttendanceCapability(profile, ATTENDANCE_PERMISSION_KEYS.shiftsView) || hasAttendanceCapability(profile, ATTENDANCE_PERMISSION_KEYS.viewSelf);
}

export function canManageShifts(profile: AttendanceProfile | null | undefined) {
  return SHIFT_MANAGERS.has(activeRole(profile)) || hasAttendanceCapability(profile, ATTENDANCE_PERMISSION_KEYS.shiftsManage);
}

export function canApproveShiftRequest(profile: AttendanceProfile | null | undefined, target?: AttendanceAccessTarget | null) {
  if (canManageShifts(profile)) return true;
  const canApprove = APPROVER_ROLES.has(activeRole(profile)) || hasAttendanceCapability(profile, ATTENDANCE_PERMISSION_KEYS.shiftsApprove);
  if (!target) return canApprove || isDepartmentApprover(profile, target, "shift_request");
  return (canApprove && isReportingManager(profile, target)) || isDepartmentApprover(profile, target, "shift_request");
}

export function canManageOvertime(profile: AttendanceProfile | null | undefined) {
  return canManageAttendance(profile) || hasAttendanceCapability(profile, ATTENDANCE_PERMISSION_KEYS.overtimeManage);
}

export function canApproveOvertime(profile: AttendanceProfile | null | undefined, target?: AttendanceAccessTarget | null) {
  if (canManageAttendance(profile)) return true;
  const canApprove = APPROVER_ROLES.has(activeRole(profile)) || hasAttendanceCapability(profile, ATTENDANCE_PERMISSION_KEYS.overtimeApprove);
  if (!target) return canApprove || isDepartmentApprover(profile, target, "overtime");
  return (canApprove && isReportingManager(profile, target)) || isDepartmentApprover(profile, target, "overtime");
}
