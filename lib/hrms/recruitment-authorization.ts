import type { Role } from "@/lib/types";

export type RecruitmentRecordScope =
  | "job"
  | "applicant"
  | "interview"
  | "offer"
  | "appointment"
  | "handoff";

export type RecruitmentProfile = {
  id?: string | null;
  employee_id?: string | null;
  role?: Role | string | null;
  is_active?: boolean | null;
  permissions?: readonly string[] | null;
};

export type RecruitmentAccessTarget = {
  id?: string | null;
  created_by?: string | null;
  hr_id?: string | null;
  recruiter_id?: string | null;
  interviewer_id?: string | null;
  assigned_recruiter_ids?: readonly string[] | null;
};

export type RecruitmentPermissionKey = (typeof RECRUITMENT_PERMISSION_KEYS)[keyof typeof RECRUITMENT_PERMISSION_KEYS];

export const RECRUITMENT_PERMISSION_KEYS = {
  view: "permission.recruitment.view",
  manage: "permission.recruitment.manage",
  jobsManage: "permission.recruitment.jobs.manage",
  applicantsManage: "permission.recruitment.applicants.manage",
  interviewsManage: "permission.recruitment.interviews.manage",
  interviewFeedback: "permission.recruitment.interviews.feedback",
  offersManage: "permission.recruitment.offers.manage",
  appointmentsManage: "permission.recruitment.appointments.manage",
  handoffsManage: "permission.recruitment.handoffs.manage",
  reportsView: "permission.recruitment.reports.view",
} as const;

const RECRUITMENT_VIEWERS = new Set(["admin", "hr_manager", "hr_user", "recruiter", "hod", "interviewer"]);
const RECRUITMENT_MANAGERS = new Set(["admin", "hr_manager"]);
const RECRUITMENT_OPERATORS = new Set(["admin", "hr_manager", "hr_user", "recruiter"]);

function activeRole(profile: RecruitmentProfile | null | undefined) {
  if (!profile || profile.is_active === false) return "";
  return profile.role ?? "";
}

function hasCapability(profile: RecruitmentProfile | null | undefined, permission: string) {
  if (!profile || profile.is_active === false) return false;
  return Boolean(profile.permissions?.includes(permission));
}

function isOwnedRecruitmentRecord(profile: RecruitmentProfile | null | undefined, target: RecruitmentAccessTarget | null | undefined) {
  if (!profile?.id || !target) return false;
  return target.created_by === profile.id
    || target.hr_id === profile.id
    || target.recruiter_id === profile.id
    || Boolean(target.assigned_recruiter_ids?.includes(profile.id));
}

function isAssignedInterview(profile: RecruitmentProfile | null | undefined, target: RecruitmentAccessTarget | null | undefined) {
  return Boolean(profile?.id && target?.interviewer_id === profile.id);
}

export function canViewRecruitment(profile: RecruitmentProfile | null | undefined) {
  return RECRUITMENT_VIEWERS.has(activeRole(profile))
    || hasCapability(profile, RECRUITMENT_PERMISSION_KEYS.view)
    || canManageRecruitment(profile);
}

export function canManageRecruitment(profile: RecruitmentProfile | null | undefined) {
  return RECRUITMENT_MANAGERS.has(activeRole(profile))
    || hasCapability(profile, RECRUITMENT_PERMISSION_KEYS.manage);
}

export function canReadAssignedRecruitment(profile: RecruitmentProfile | null | undefined, target: RecruitmentAccessTarget | null | undefined) {
  const role = activeRole(profile);
  if (!role || !target) return false;
  if (canManageRecruitment(profile) || hasCapability(profile, RECRUITMENT_PERMISSION_KEYS.view)) return true;
  if (role === "recruiter") return isOwnedRecruitmentRecord(profile, target);
  if (role === "interviewer") return isAssignedInterview(profile, target);
  return role === "hod" || role === "hr_user";
}

export function canViewRecruitmentRecord(
  profile: RecruitmentProfile | null | undefined,
  target: RecruitmentAccessTarget | null | undefined,
  scope: RecruitmentRecordScope,
) {
  if (!canViewRecruitment(profile)) return false;
  if (canManageRecruitment(profile)) return true;
  if (scope === "interview" && isAssignedInterview(profile, target)) return true;
  if (activeRole(profile) === "recruiter") return canReadAssignedRecruitment(profile, target);
  return activeRole(profile) === "hr_user" || activeRole(profile) === "hod" || hasCapability(profile, RECRUITMENT_PERMISSION_KEYS.view);
}

export function canManageRecruitmentRecord(
  profile: RecruitmentProfile | null | undefined,
  scope: RecruitmentRecordScope,
  target?: RecruitmentAccessTarget | null,
) {
  const role = activeRole(profile);
  if (!role) return false;
  if (canManageRecruitment(profile)) return true;
  if (scope === "job") return role === "recruiter" || hasCapability(profile, RECRUITMENT_PERMISSION_KEYS.jobsManage);
  if (scope === "applicant") {
    return hasCapability(profile, RECRUITMENT_PERMISSION_KEYS.applicantsManage)
      || (role === "recruiter" && isOwnedRecruitmentRecord(profile, target));
  }
  if (scope === "interview") {
    return hasCapability(profile, RECRUITMENT_PERMISSION_KEYS.interviewsManage)
      || (role === "recruiter" && isOwnedRecruitmentRecord(profile, target));
  }
  if (scope === "offer") return hasCapability(profile, RECRUITMENT_PERMISSION_KEYS.offersManage);
  if (scope === "appointment") return canManageAppointments(profile);
  if (scope === "handoff") return canCreateCandidateHandoff(profile, target);
  return false;
}

export function canReviewRecruitmentTeam(profile: RecruitmentProfile | null | undefined, target?: RecruitmentAccessTarget | null) {
  const role = activeRole(profile);
  return canManageRecruitment(profile)
    || role === "hod"
    || role === "hr_user"
    || (role === "recruiter" && isOwnedRecruitmentRecord(profile, target));
}

export function canSubmitInterviewFeedback(profile: RecruitmentProfile | null | undefined, target?: RecruitmentAccessTarget | null) {
  return canManageRecruitment(profile)
    || hasCapability(profile, RECRUITMENT_PERMISSION_KEYS.interviewFeedback)
    || isAssignedInterview(profile, target);
}

export function canManageAppointments(profile: RecruitmentProfile | null | undefined) {
  return canManageRecruitment(profile)
    || hasCapability(profile, RECRUITMENT_PERMISSION_KEYS.appointmentsManage);
}

export function canCreateCandidateHandoff(profile: RecruitmentProfile | null | undefined, _target?: RecruitmentAccessTarget | null) {
  return canManageRecruitment(profile)
    || hasCapability(profile, RECRUITMENT_PERMISSION_KEYS.handoffsManage);
}
