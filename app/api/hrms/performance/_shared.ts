import type { PerformanceAccessTarget, PerformanceProfile, PerformanceRecordScope } from "@/lib/hrms/performance-authorization";
import {
  normalizeAppraisalCyclePayload,
  normalizeAppraisalGoalPayload,
  normalizeAppraisalGoals,
  normalizeAppraisalPayload,
  normalizeAppraisalTemplateGoals,
  normalizeAppraisalTemplatePayload,
  normalizeFeedbackCriteriaPayload,
  normalizeFeedbackRatingPayload,
  normalizeFeedbackRatings,
  normalizePerformanceFeedbackPayload,
  normalizePerformanceGoalPayload,
  normalizePerformanceKraPayload,
} from "@/lib/hrms/performance";
import {
  canManagePerformance,
  canManagePerformanceRecord,
  canReviewTeamPerformance,
  canViewPerformance,
  canViewPerformanceRecord,
} from "@/lib/hrms/performance-authorization";

export {
  canManagePerformance,
  canManagePerformanceRecord,
  canReviewTeamPerformance,
  canViewPerformance,
  canViewPerformanceRecord,
  normalizeAppraisalCyclePayload,
  normalizeAppraisalGoalPayload,
  normalizeAppraisalGoals,
  normalizeAppraisalPayload,
  normalizeAppraisalTemplateGoals,
  normalizeAppraisalTemplatePayload,
  normalizeFeedbackCriteriaPayload,
  normalizeFeedbackRatingPayload,
  normalizeFeedbackRatings,
  normalizePerformanceFeedbackPayload,
  normalizePerformanceGoalPayload,
  normalizePerformanceKraPayload,
};

export type { PerformanceAccessTarget, PerformanceProfile, PerformanceRecordScope };

export function targetFromPerformanceRecord(record: any): PerformanceAccessTarget {
  return {
    employee_id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_id: record.employee?.reporting_manager_id,
    reporting_manager_profile_id: record.employee?.reporting_manager_profile_id,
    reviewer_id: record.reviewer_id ?? record.reviewer_employee_id ?? record.provider_employee_id,
    reviewer_profile_id: record.reviewer?.profile_id,
  };
}
