import type { LifecycleAccessTarget, LifecycleProfile, LifecycleRecordScope } from "@/lib/hrms/lifecycle-authorization";
import {
  normalizeBoardingActivityPayload,
  normalizeDailyWorkSummaryPayload,
  normalizeExitInterviewPayload,
  normalizeGrievancePayload,
  normalizeGrievanceTypePayload,
  normalizeOnboardingPayload,
  normalizeOnboardingTemplatePayload,
  normalizePromotionPayload,
  normalizeSeparationPayload,
  normalizeSeparationTemplatePayload,
  normalizeTrainingEventPayload,
  normalizeTrainingFeedbackPayload,
  normalizeTrainingProgramPayload,
  normalizeTransferPayload,
} from "@/lib/hrms/lifecycle";
import {
  canManageLifecycle,
  canManageLifecycleRecord,
  canManageTraining,
  canReviewTeamLifecycle,
  canUseLifecycleSelfService,
  canViewLifecycle,
  canViewLifecycleRecord,
  canViewTraining,
} from "@/lib/hrms/lifecycle-authorization";

export {
  canManageLifecycle,
  canManageLifecycleRecord,
  canManageTraining,
  canReviewTeamLifecycle,
  canUseLifecycleSelfService,
  canViewLifecycle,
  canViewLifecycleRecord,
  canViewTraining,
  normalizeBoardingActivityPayload,
  normalizeDailyWorkSummaryPayload,
  normalizeDailyWorkSummaryPayload as normalizeDailySummaryPayload,
  normalizeExitInterviewPayload,
  normalizeGrievancePayload,
  normalizeGrievanceTypePayload,
  normalizeOnboardingPayload,
  normalizeOnboardingTemplatePayload,
  normalizePromotionPayload,
  normalizeSeparationPayload,
  normalizeSeparationTemplatePayload,
  normalizeTrainingEventPayload,
  normalizeTrainingFeedbackPayload,
  normalizeTrainingProgramPayload,
  normalizeTransferPayload,
};

export type LifecycleScope = LifecycleRecordScope;
export type { LifecycleAccessTarget, LifecycleProfile, LifecycleRecordScope };

export function targetFromLifecycleRecord(record: any): LifecycleAccessTarget {
  return {
    id: record.employee_id,
    employee_id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_id: record.employee?.reporting_manager_id,
    reporting_manager_profile_id: record.employee?.reporting_manager_profile_id,
    owner_employee_id: record.owner_employee_id,
    owner_profile_id: record.owner?.profile_id,
    assigned_to_employee_id: record.assigned_to_employee_id,
    assigned_to_profile_id: record.assignee?.profile_id,
    assigned_employee_id: record.assigned_employee_id,
    assigned_profile_id: record.assignee?.profile_id,
    reviewer_id: record.manager_employee_id ?? record.reviewed_by_employee_id,
    reviewer_profile_id: record.manager?.profile_id ?? record.reviewer?.profile_id,
    trainer_employee_id: record.trainer_employee_id,
    trainer_profile_id: record.trainer?.profile_id,
    interviewer_employee_id: record.interviewer_employee_id,
    interviewer_profile_id: record.interviewer?.profile_id,
  };
}
