import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeBoardingActivityPayload,
  normalizeDailyWorkSummaryPayload,
  normalizeGrievancePayload,
  normalizeGrievanceTypePayload,
  normalizeOnboardingPayload,
  normalizeOnboardingTemplatePayload,
  normalizePromotionPayload,
  normalizeSeparationPayload,
  normalizeTrainingEventPayload,
  normalizeTrainingFeedbackPayload,
  normalizeTrainingProgramPayload,
  normalizeTransferPayload,
  stripLifecycleReadOnlyFields,
  validateLifecycleDateRange,
} from "@/lib/hrms/lifecycle";

describe("lifecycle helper utilities", () => {
  it("normalizes onboarding templates, onboardings, and activities while blocking decision states", () => {
    assert.deepEqual(normalizeOnboardingTemplatePayload({
      id: "template-1",
      name: "  New   Hire ",
      status: "archived",
      created_by: "profile-1",
    }), {
      name: "New Hire",
      status: "inactive",
    });

    assert.deepEqual(normalizeOnboardingPayload({
      owner_id: "employee-1",
      onboarding_template_id: "template-1",
      date_of_joining: "2026-06-01",
      status: "completed",
      completed_by: "profile-1",
    }), {
      employee_id: "employee-1",
      template_id: "template-1",
      joining_date: "2026-06-01",
      status: "draft",
    });

    assert.deepEqual(normalizeBoardingActivityPayload({
      onboarding_id: "onboarding-1",
      name: " Laptop   setup ",
      sort_order: "2",
      status: "skipped",
    }), {
      onboarding_id: "onboarding-1",
      activity_name: "Laptop setup",
      title: "Laptop setup",
      sequence: 2,
      status: "pending",
    });
  });

  it("normalizes separation, promotion, and transfer payloads", () => {
    assert.deepEqual(normalizeSeparationPayload({
      employee_id: "employee-1",
      separation_template_id: "template-1",
      exit_date: "2026-07-31",
      status: "approved",
      approved_by: "profile-1",
    }), {
      employee_id: "employee-1",
      template_id: "template-1",
      last_working_date: "2026-07-31",
      status: "draft",
    });

    assert.deepEqual(normalizePromotionPayload({
      employee_id: "employee-1",
      grade_id: "grade-2",
      salary_change_percent: "12.5",
      status: "effective",
    }), {
      employee_id: "employee-1",
      new_grade_id: "grade-2",
      to_grade_id: "grade-2",
      salary_change_percent: 12.5,
      status: "draft",
    });

    assert.deepEqual(normalizeTransferPayload({
      employee_id: "employee-1",
      department_id: "department-2",
      branch_id: "branch-2",
      status: "rejected",
    }), {
      employee_id: "employee-1",
      to_department_id: "department-2",
      to_branch_id: "branch-2",
      status: "draft",
    });
  });

  it("normalizes grievance and training payloads", () => {
    assert.deepEqual(normalizeGrievanceTypePayload({ name: "  Policy  ", code: "POL", sla_days: "3" }), {
      name: "Policy",
      code: "POL",
      sla_days: 3,
    });

    assert.deepEqual(normalizeGrievancePayload({
      employee_id: "employee-1",
      type_id: "type-1",
      title: "  Payroll   issue ",
      status: "resolved",
      resolved_by: "profile-1",
    }), {
      employee_id: "employee-1",
      grievance_type_id: "type-1",
      title: "Payroll issue",
      subject: "Payroll issue",
      status: "draft",
    });

    assert.deepEqual(normalizeTrainingProgramPayload({ name: "Safety", duration_hours: "4", status: "archived" }), {
      name: "Safety",
      duration_hours: 4,
      status: "draft",
    });

    assert.deepEqual(normalizeTrainingEventPayload({ program_id: "program-1", title: "Workshop", capacity: "25", status: "completed" }), {
      program_id: "program-1",
      title: "Workshop",
      capacity: 25,
      status: "draft",
    });

    assert.deepEqual(normalizeTrainingFeedbackPayload({ event_id: "event-1", employee_id: "employee-1", rating: "5", status: "acknowledged" }), {
      event_id: "event-1",
      employee_id: "employee-1",
      rating: 5,
      status: "draft",
    });
  });

  it("normalizes daily summaries and validates lifecycle date ranges", () => {
    assert.deepEqual(normalizeDailyWorkSummaryPayload({
      employee_id: "employee-1",
      date: "2026-05-15",
      hours_worked: "8.5",
      status: "reviewed",
      reviewed_by: "profile-1",
    }), {
      employee_id: "employee-1",
      summary_date: "2026-05-15",
      work_date: "2026-05-15",
      hours_worked: 8.5,
      status: "draft",
    });

    assert.deepEqual(validateLifecycleDateRange("2026-06-30", "2026-06-01", "Training event"), {
      valid: false,
      reason: "Training event end date cannot be before start date.",
    });
  });

  it("strips read-only lifecycle fields without mutating the input", () => {
    const input = { id: "record-1", subject: "Grievance", resolved_at: "2026-05-15" };
    assert.deepEqual(stripLifecycleReadOnlyFields(input), { subject: "Grievance" });
    assert.equal(input.id, "record-1");
  });
});
