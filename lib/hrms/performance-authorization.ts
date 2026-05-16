import type { Role } from "@/lib/types";

export type PerformanceRecordScope =
  | "goal"
  | "kra"
  | "template"
  | "cycle"
  | "appraisal"
  | "appraisal_goal"
  | "feedback"
  | "feedback_criteria"
  | "feedback_rating";
export type PerformancePermissionKey = (typeof PERFORMANCE_PERMISSION_KEYS)[keyof typeof PERFORMANCE_PERMISSION_KEYS];

export type PerformanceProfile = {
  id?: string | null;
  employee_id?: string | null;
  role?: Role | string | null;
  is_active?: boolean | null;
  permissions?: readonly string[] | null;
};

export type PerformanceAccessTarget = {
  employee_id?: string | null;
  profile_id?: string | null;
  department_id?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_profile_id?: string | null;
  reviewer_id?: string | null;
  reviewer_profile_id?: string | null;
};

export const PERFORMANCE_PERMISSION_KEYS = {
  view: "permission.performance.view",
  manage: "permission.performance.manage",
  reviewTeam: "permission.performance.review_team",
  viewSelf: "permission.performance.view_self",
  goalsManage: "permission.performance_goals.manage",
  goalsViewSelf: "permission.performance_goals.view_self",
  appraisalsManage: "permission.appraisals.manage",
  appraisalsReviewTeam: "permission.appraisals.review_team",
  appraisalsViewSelf: "permission.appraisals.view_self",
  feedbackManage: "permission.performance_feedback.manage",
  feedbackSubmit: "permission.performance_feedback.submit",
  reportsView: "permission.performance_reports.view",
} as const;

const PERFORMANCE_MANAGERS = new Set(["admin", "hr_manager"]);
const PERFORMANCE_VIEWERS = new Set(["admin", "hr_manager", "hr_user"]);
const TEAM_REVIEW_ROLES = new Set(["admin", "hr_manager", "hr_user", "hod"]);

function activeRole(profile: PerformanceProfile | null | undefined) {
  if (!profile || profile.is_active === false) return "";
  return profile.role ?? "";
}

function hasCapability(profile: PerformanceProfile | null | undefined, permission: PerformancePermissionKey) {
  if (!profile || profile.is_active === false) return false;
  return Boolean(profile.permissions?.includes(permission));
}

function isSelf(profile: PerformanceProfile | null | undefined, target: PerformanceAccessTarget | null | undefined) {
  return Boolean(
    (profile?.id && target?.profile_id && profile.id === target.profile_id)
    || (profile?.employee_id && target?.employee_id && profile.employee_id === target.employee_id),
  );
}

function isTeamReviewer(profile: PerformanceProfile | null | undefined, target: PerformanceAccessTarget | null | undefined) {
  return Boolean(
    (profile?.id && target?.reporting_manager_profile_id && profile.id === target.reporting_manager_profile_id)
    || (profile?.employee_id && target?.reporting_manager_id && profile.employee_id === target.reporting_manager_id)
    || (profile?.id && target?.reviewer_profile_id && profile.id === target.reviewer_profile_id)
    || (profile?.employee_id && target?.reviewer_id && profile.employee_id === target.reviewer_id),
  );
}

function selfPermissionFor(recordScope: PerformanceRecordScope) {
  if (recordScope === "goal" || recordScope === "kra") return PERFORMANCE_PERMISSION_KEYS.goalsViewSelf;
  if (recordScope === "appraisal" || recordScope === "appraisal_goal") return PERFORMANCE_PERMISSION_KEYS.appraisalsViewSelf;
  if (recordScope === "feedback" || recordScope === "feedback_rating") return PERFORMANCE_PERMISSION_KEYS.viewSelf;
  return undefined;
}

export function canManagePerformance(profile: PerformanceProfile | null | undefined) {
  return PERFORMANCE_MANAGERS.has(activeRole(profile))
    || hasCapability(profile, PERFORMANCE_PERMISSION_KEYS.manage);
}

export function canViewPerformance(profile: PerformanceProfile | null | undefined) {
  return PERFORMANCE_VIEWERS.has(activeRole(profile))
    || hasCapability(profile, PERFORMANCE_PERMISSION_KEYS.view)
    || hasCapability(profile, PERFORMANCE_PERMISSION_KEYS.reportsView)
    || canManagePerformance(profile);
}

export function canReviewTeamPerformance(profile: PerformanceProfile | null | undefined, target?: PerformanceAccessTarget | null) {
  if (!profile || profile.is_active === false) return false;
  const hasReviewRole = TEAM_REVIEW_ROLES.has(activeRole(profile)) || hasCapability(profile, PERFORMANCE_PERMISSION_KEYS.reviewTeam);
  if (!target) return hasReviewRole;
  return hasReviewRole && isTeamReviewer(profile, target);
}

export function canUsePerformanceSelfService(
  profile: PerformanceProfile | null | undefined,
  target: PerformanceAccessTarget | null | undefined,
  recordScope: PerformanceRecordScope,
) {
  if (!profile || profile.is_active === false || !target || !isSelf(profile, target)) return false;
  const permission = selfPermissionFor(recordScope);
  if (!permission) return false;
  return activeRole(profile) === "employee" || hasCapability(profile, permission);
}

export function canViewPerformanceRecord(
  profile: PerformanceProfile | null | undefined,
  target: PerformanceAccessTarget | null | undefined,
  recordScope: PerformanceRecordScope,
) {
  if (!profile || profile.is_active === false) return false;
  if (recordScope === "template" || recordScope === "cycle" || recordScope === "feedback_criteria") return canViewPerformance(profile) || canReviewTeamPerformance(profile);
  if (!target) return false;
  if (canViewPerformance(profile) || canManagePerformance(profile)) return true;
  if (canReviewTeamPerformance(profile, target)) return true;
  return canUsePerformanceSelfService(profile, target, recordScope);
}

export function canManagePerformanceRecord(
  profile: PerformanceProfile | null | undefined,
  recordScope: PerformanceRecordScope,
  target?: PerformanceAccessTarget | null,
) {
  if (recordScope === "template" || recordScope === "cycle" || recordScope === "feedback_criteria") return canManagePerformance(profile);
  if (recordScope === "goal" || recordScope === "kra") {
    return canManagePerformance(profile)
      || hasCapability(profile, PERFORMANCE_PERMISSION_KEYS.goalsManage)
      || canReviewTeamPerformance(profile, target);
  }
  if (recordScope === "appraisal" || recordScope === "appraisal_goal") {
    return canManagePerformance(profile)
      || hasCapability(profile, PERFORMANCE_PERMISSION_KEYS.appraisalsManage)
      || canReviewTeamPerformance(profile, target);
  }
  if (recordScope === "feedback" || recordScope === "feedback_rating") {
    return canManagePerformance(profile)
      || hasCapability(profile, PERFORMANCE_PERMISSION_KEYS.feedbackManage)
      || canReviewTeamPerformance(profile, target)
      || canUsePerformanceSelfService(profile, target ?? null, recordScope)
      || hasCapability(profile, PERFORMANCE_PERMISSION_KEYS.feedbackSubmit);
  }
  return canManagePerformance(profile);
}
