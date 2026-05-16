import type { Role } from "@/lib/types";

export type LifecycleRecordScope =
  | "onboarding_template"
  | "onboarding"
  | "onboarding_activity"
  | "boarding_activity"
  | "separation_template"
  | "separation"
  | "promotion"
  | "transfer"
  | "grievance_type"
  | "grievance"
  | "exit_interview"
  | "training_program"
  | "training_event"
  | "training_feedback"
  | "daily_summary"
  | "daily_work_summary";
export type LifecyclePermissionKey = (typeof LIFECYCLE_PERMISSION_KEYS)[keyof typeof LIFECYCLE_PERMISSION_KEYS];

export type LifecycleProfile = {
  id?: string | null;
  employee_id?: string | null;
  role?: Role | string | null;
  is_active?: boolean | null;
  permissions?: readonly string[] | null;
};

export type LifecycleAccessTarget = {
  id?: string | null;
  employee_id?: string | null;
  profile_id?: string | null;
  department_id?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_profile_id?: string | null;
  owner_employee_id?: string | null;
  owner_profile_id?: string | null;
  assigned_to_employee_id?: string | null;
  assigned_to_profile_id?: string | null;
  assigned_employee_id?: string | null;
  assigned_profile_id?: string | null;
  reviewer_id?: string | null;
  reviewer_profile_id?: string | null;
  trainer_employee_id?: string | null;
  trainer_profile_id?: string | null;
  interviewer_employee_id?: string | null;
  interviewer_profile_id?: string | null;
};

export const LIFECYCLE_PERMISSION_KEYS = {
  view: "permission.lifecycle.view",
  manage: "permission.lifecycle.manage",
  reviewTeam: "permission.lifecycle.review_team",
  viewSelf: "permission.lifecycle.view_self",
  onboardingManage: "permission.employee_onboarding.manage",
  onboardingViewSelf: "permission.employee_onboarding.view_self",
  separationsManage: "permission.employee_separations.manage",
  separationsViewSelf: "permission.employee_separations.view_self",
  employmentChangesManage: "permission.employee_changes.manage",
  grievancesManage: "permission.grievances.manage",
  grievancesSubmit: "permission.grievances.submit",
  grievancesViewSelf: "permission.grievances.view_self",
  trainingManage: "permission.training.manage",
  trainingView: "permission.training.view",
  trainingFeedbackSubmit: "permission.training_feedback.submit",
  dailySummariesManage: "permission.daily_work_summaries.manage",
  dailySummariesViewSelf: "permission.daily_work_summaries.view_self",
} as const;

const LIFECYCLE_MANAGERS = new Set(["admin", "hr_manager"]);
const LIFECYCLE_VIEWERS = new Set(["admin", "hr_manager", "hr_user"]);
const TEAM_REVIEW_ROLES = new Set(["admin", "hr_manager", "hr_user", "hod"]);

function activeRole(profile: LifecycleProfile | null | undefined) {
  if (!profile || profile.is_active === false) return "";
  return profile.role ?? "";
}

function hasCapability(profile: LifecycleProfile | null | undefined, permission: LifecyclePermissionKey) {
  if (!profile || profile.is_active === false) return false;
  return Boolean(profile.permissions?.includes(permission));
}

function isSelf(profile: LifecycleProfile | null | undefined, target: LifecycleAccessTarget | null | undefined) {
  return Boolean(
    (profile?.id && target?.profile_id && profile.id === target.profile_id)
    || (profile?.employee_id && target?.id && profile.employee_id === target.id)
    || (profile?.employee_id && target?.employee_id && profile.employee_id === target.employee_id),
  );
}

function isAssigned(profile: LifecycleProfile | null | undefined, target: LifecycleAccessTarget | null | undefined) {
  return Boolean(
    (profile?.id && target?.owner_profile_id && profile.id === target.owner_profile_id)
    || (profile?.employee_id && target?.owner_employee_id && profile.employee_id === target.owner_employee_id)
    || (profile?.id && target?.assigned_to_profile_id && profile.id === target.assigned_to_profile_id)
    || (profile?.employee_id && target?.assigned_to_employee_id && profile.employee_id === target.assigned_to_employee_id)
    || (profile?.id && target?.assigned_profile_id && profile.id === target.assigned_profile_id)
    || (profile?.employee_id && target?.assigned_employee_id && profile.employee_id === target.assigned_employee_id)
    || (profile?.id && target?.reviewer_profile_id && profile.id === target.reviewer_profile_id)
    || (profile?.employee_id && target?.reviewer_id && profile.employee_id === target.reviewer_id)
    || (profile?.id && target?.trainer_profile_id && profile.id === target.trainer_profile_id)
    || (profile?.employee_id && target?.trainer_employee_id && profile.employee_id === target.trainer_employee_id)
    || (profile?.id && target?.interviewer_profile_id && profile.id === target.interviewer_profile_id)
    || (profile?.employee_id && target?.interviewer_employee_id && profile.employee_id === target.interviewer_employee_id),
  );
}

function isTeamReviewer(profile: LifecycleProfile | null | undefined, target: LifecycleAccessTarget | null | undefined) {
  return Boolean(
    (profile?.id && target?.reporting_manager_profile_id && profile.id === target.reporting_manager_profile_id)
    || (profile?.employee_id && target?.reporting_manager_id && profile.employee_id === target.reporting_manager_id)
    || isAssigned(profile, target),
  );
}

function selfPermissionFor(recordScope: LifecycleRecordScope) {
  if (recordScope === "onboarding" || recordScope === "onboarding_activity" || recordScope === "boarding_activity") return LIFECYCLE_PERMISSION_KEYS.onboardingViewSelf;
  if (recordScope === "separation" || recordScope === "exit_interview") return LIFECYCLE_PERMISSION_KEYS.separationsViewSelf;
  if (recordScope === "grievance") return LIFECYCLE_PERMISSION_KEYS.grievancesViewSelf;
  if (recordScope === "training_feedback") return LIFECYCLE_PERMISSION_KEYS.trainingFeedbackSubmit;
  if (recordScope === "daily_summary" || recordScope === "daily_work_summary") return LIFECYCLE_PERMISSION_KEYS.dailySummariesViewSelf;
  return undefined;
}

export function canManageLifecycle(profile: LifecycleProfile | null | undefined) {
  return LIFECYCLE_MANAGERS.has(activeRole(profile))
    || hasCapability(profile, LIFECYCLE_PERMISSION_KEYS.manage);
}

export function canViewLifecycle(profile: LifecycleProfile | null | undefined) {
  return LIFECYCLE_VIEWERS.has(activeRole(profile))
    || hasCapability(profile, LIFECYCLE_PERMISSION_KEYS.view)
    || canManageLifecycle(profile);
}

export function canReviewTeamLifecycle(profile: LifecycleProfile | null | undefined, target?: LifecycleAccessTarget | null) {
  if (!profile || profile.is_active === false) return false;
  const canReview = TEAM_REVIEW_ROLES.has(activeRole(profile)) || hasCapability(profile, LIFECYCLE_PERMISSION_KEYS.reviewTeam);
  if (!target) return canReview;
  return canReview && isTeamReviewer(profile, target);
}

export function canUseLifecycleSelfService(
  profile: LifecycleProfile | null | undefined,
  target: LifecycleAccessTarget | null | undefined,
  recordScope: LifecycleRecordScope,
) {
  if (!profile || profile.is_active === false || !target || !isSelf(profile, target)) return false;
  const permission = selfPermissionFor(recordScope);
  if (!permission) return false;
  return activeRole(profile) === "employee" || hasCapability(profile, permission);
}

export function canManageGrievances(profile: LifecycleProfile | null | undefined) {
  return canManageLifecycle(profile)
    || hasCapability(profile, LIFECYCLE_PERMISSION_KEYS.grievancesManage);
}

export function canManageTraining(profile: LifecycleProfile | null | undefined) {
  return canManageLifecycle(profile)
    || hasCapability(profile, LIFECYCLE_PERMISSION_KEYS.trainingManage);
}

export function canViewTraining(profile: LifecycleProfile | null | undefined, target?: LifecycleAccessTarget | null) {
  if (!profile || profile.is_active === false) return false;
  if (canViewLifecycle(profile) || canManageTraining(profile) || hasCapability(profile, LIFECYCLE_PERMISSION_KEYS.trainingView)) return true;
  if (!target) return activeRole(profile) === "employee";
  return activeRole(profile) === "employee" || canReviewTeamLifecycle(profile, target) || canUseLifecycleSelfService(profile, target, "training_feedback");
}

export function canViewLifecycleRecord(
  profile: LifecycleProfile | null | undefined,
  target: LifecycleAccessTarget | null | undefined,
  recordScope: LifecycleRecordScope,
) {
  if (!profile || profile.is_active === false) return false;
  if (recordScope === "onboarding_template" || recordScope === "separation_template" || recordScope === "grievance_type") return canViewLifecycle(profile);
  if (recordScope === "training_program" || recordScope === "training_event") return canViewTraining(profile, target);
  if (!target) return false;
  if (canViewLifecycle(profile) || canManageLifecycle(profile)) return true;
  if (recordScope === "grievance" && canManageGrievances(profile)) return true;
  if (canReviewTeamLifecycle(profile, target)) return true;
  return canUseLifecycleSelfService(profile, target, recordScope);
}

export function canManageLifecycleRecord(
  profile: LifecycleProfile | null | undefined,
  recordScope: LifecycleRecordScope,
  target?: LifecycleAccessTarget | null,
) {
  if (recordScope === "onboarding_template" || recordScope === "separation_template") return canManageLifecycle(profile);
  if (recordScope === "grievance_type" || recordScope === "grievance") {
    return canManageGrievances(profile)
      || (hasCapability(profile, LIFECYCLE_PERMISSION_KEYS.grievancesSubmit) && canUseLifecycleSelfService(profile, target ?? null, "grievance"))
      || canUseLifecycleSelfService(profile, target ?? null, "grievance");
  }
  if (recordScope === "training_program" || recordScope === "training_event") return canManageTraining(profile);
  if (recordScope === "training_feedback") {
    return canManageTraining(profile)
      || canReviewTeamLifecycle(profile, target)
      || canUseLifecycleSelfService(profile, target ?? null, "training_feedback");
  }
  if (recordScope === "promotion" || recordScope === "transfer") {
    return canManageLifecycle(profile)
      || hasCapability(profile, LIFECYCLE_PERMISSION_KEYS.employmentChangesManage);
  }
  if (recordScope === "onboarding" || recordScope === "onboarding_activity" || recordScope === "boarding_activity") {
    return canManageLifecycle(profile)
      || hasCapability(profile, LIFECYCLE_PERMISSION_KEYS.onboardingManage)
      || canReviewTeamLifecycle(profile, target);
  }
  if (recordScope === "separation" || recordScope === "exit_interview") {
    return canManageLifecycle(profile)
      || hasCapability(profile, LIFECYCLE_PERMISSION_KEYS.separationsManage)
      || canUseLifecycleSelfService(profile, target ?? null, recordScope);
  }
  if (recordScope === "daily_summary" || recordScope === "daily_work_summary") {
    return canManageLifecycle(profile)
      || hasCapability(profile, LIFECYCLE_PERMISSION_KEYS.dailySummariesManage)
      || canReviewTeamLifecycle(profile, target)
      || canUseLifecycleSelfService(profile, target ?? null, recordScope);
  }
  return canManageLifecycle(profile);
}
