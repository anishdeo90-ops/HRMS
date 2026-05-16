import type { Role } from "@/lib/types";

export type SelfServiceProfile = {
  id?: string | null;
  employee_id?: string | null;
  role?: Role | string | null;
  is_active?: boolean | null;
  permissions?: readonly string[] | null;
};

export type SelfServiceTarget = {
  employee_id?: string | null;
  profile_id?: string | null;
};

export const SELF_SERVICE_PERMISSION_KEYS = {
  view: "permission.self_service.view",
  profileView: "permission.self_service.profile.view",
  notificationsView: "permission.self_service.notifications.view",
  notificationsAcknowledge: "permission.self_service.notifications.acknowledge",
  notificationsManage: "permission.self_service.notifications.manage",
} as const;

type SelfServicePermissionKey = (typeof SELF_SERVICE_PERMISSION_KEYS)[keyof typeof SELF_SERVICE_PERMISSION_KEYS];

function activeRole(profile: SelfServiceProfile | null | undefined) {
  if (!profile || profile.is_active === false) return "";
  return profile.role ?? "";
}

function hasCapability(profile: SelfServiceProfile | null | undefined, permission: SelfServicePermissionKey) {
  if (!profile || profile.is_active === false) return false;
  return Boolean(profile.permissions?.includes(permission));
}

function isSelf(profile: SelfServiceProfile | null | undefined, target: SelfServiceTarget | null | undefined) {
  return Boolean(
    (profile?.id && target?.profile_id && profile.id === target.profile_id)
    || (profile?.employee_id && target?.employee_id && profile.employee_id === target.employee_id),
  );
}

export function canUseSelfService(profile: SelfServiceProfile | null | undefined, target: SelfServiceTarget | null | undefined) {
  if (!profile || profile.is_active === false || !target) return false;
  if (activeRole(profile) === "admin" || activeRole(profile) === "hr_manager") return true;
  return isSelf(profile, target)
    && (activeRole(profile) === "employee" || hasCapability(profile, SELF_SERVICE_PERMISSION_KEYS.view));
}

export function canViewSelfServiceProfile(profile: SelfServiceProfile | null | undefined, target: SelfServiceTarget | null | undefined) {
  if (!profile || profile.is_active === false || !target) return false;
  if (activeRole(profile) === "admin" || activeRole(profile) === "hr_manager") return true;
  return isSelf(profile, target)
    && (activeRole(profile) === "employee" || hasCapability(profile, SELF_SERVICE_PERMISSION_KEYS.profileView));
}

export function canManageEmployeeNotifications(profile: SelfServiceProfile | null | undefined) {
  return activeRole(profile) === "admin"
    || activeRole(profile) === "hr_manager"
    || hasCapability(profile, SELF_SERVICE_PERMISSION_KEYS.notificationsManage);
}

export function canViewEmployeeNotifications(profile: SelfServiceProfile | null | undefined, target: SelfServiceTarget | null | undefined) {
  if (!profile || profile.is_active === false || !target) return false;
  if (canManageEmployeeNotifications(profile)) return true;
  return isSelf(profile, target)
    && (activeRole(profile) === "employee" || hasCapability(profile, SELF_SERVICE_PERMISSION_KEYS.notificationsView));
}

export function canAcknowledgeEmployeeNotification(profile: SelfServiceProfile | null | undefined, target: SelfServiceTarget | null | undefined) {
  if (!profile || profile.is_active === false || !target) return false;
  if (canManageEmployeeNotifications(profile)) return true;
  return isSelf(profile, target)
    && (activeRole(profile) === "employee" || hasCapability(profile, SELF_SERVICE_PERMISSION_KEYS.notificationsAcknowledge));
}
