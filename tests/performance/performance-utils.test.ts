import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeAppraisalCyclePayload,
  normalizeAppraisalGoalPayload,
  normalizeAppraisalPayload,
  normalizeAppraisalTemplateGoals,
  normalizeAppraisalTemplatePayload,
  normalizeFeedbackCriteriaPayload,
  normalizeFeedbackRatings,
  normalizePerformanceFeedbackPayload,
  normalizePerformanceGoalPayload,
  normalizePerformanceKraPayload,
  stripPerformanceReadOnlyFields,
  sumPerformanceWeights,
  validatePerformanceDateRange,
  validatePerformanceWeights,
} from "@/lib/hrms/performance";

describe("performance helper utilities", () => {
  it("normalizes goals and KRAs while blocking caller-controlled decision states", () => {
    assert.deepEqual(normalizePerformanceGoalPayload({
      id: "goal-1",
      employee_id: "employee-1",
      title: "  Improve   onboarding  ",
      target_value: "95",
      actual_value: "12.5",
      weight: "40",
      status: "completed",
      completed_by: "profile-1",
    }), {
      employee_id: "employee-1",
      title: "Improve onboarding",
      target_value: 95,
      weight: 40,
      status: "draft",
    });

    assert.deepEqual(normalizePerformanceKraPayload({
      employee_id: "employee-1",
      goal_id: "goal-1",
      title: "  Quality  ",
      metric: "score",
      target_value: "90",
      weight: "60",
      status: "archived",
    }), {
      employee_id: "employee-1",
      goal_id: "goal-1",
      title: "Quality",
      target_value: 90,
      weight: 60,
      status: "draft",
    });
  });

  it("normalizes templates, template goals, and validates weights", () => {
    const template = normalizeAppraisalTemplatePayload({
      name: "  Annual   Review ",
      scoring_scale: "5",
      max_score: "5",
      status: "archived",
      created_at: "2026-05-15",
    });
    const goals = normalizeAppraisalTemplateGoals([
      { title: "Delivery", weight: "70", max_score: "5", sort_order: "1", template_id: "template-1" },
      { title: "Culture", weight: 30, max_score: 5, sort_order: 2 },
      { title: "Ignored", weight: 130 },
    ]);

    assert.deepEqual(template, { name: "Annual Review", scoring_scale: 5, status: "draft" });
    assert.deepEqual(goals, [
      { template_id: "template-1", title: "Delivery", weight: 70, max_score: 5, sequence: 1 },
      { title: "Culture", weight: 30, max_score: 5, sequence: 2 },
    ]);
    assert.deepEqual(validatePerformanceWeights(goals), { valid: true, total: 100 });
    assert.equal(sumPerformanceWeights([{ weight: 33.335 }, { weight: 66.665 }]), 100);
  });

  it("normalizes appraisal cycles and validates date ranges", () => {
    assert.deepEqual(validatePerformanceDateRange("2026-06-30", "2026-06-01", "Cycle period"), {
      valid: false,
      reason: "Cycle period end date cannot be before start date.",
    });

    assert.deepEqual(normalizeAppraisalCyclePayload({
      template_id: "template-1",
      name: "  Q1   Review ",
      period_start: "2026-04-01",
      period_end: "2026-06-30",
      status: "closed",
      closed_at: "2026-07-10",
    }), {
      template_id: "template-1",
      name: "Q1 Review",
      start_date: "2026-04-01",
      end_date: "2026-06-30",
      status: "draft",
    });
  });

  it("normalizes appraisals, appraisal goals, feedback, criteria, and ratings", () => {
    assert.deepEqual(normalizeAppraisalPayload({
      appraisal_cycle_id: "cycle-1",
      employee_id: "employee-1",
      reviewer_id: "manager-1",
      overall_score: "4.25",
      status: "completed",
      completed_at: "2026-07-15",
    }), {
      cycle_id: "cycle-1",
      employee_id: "employee-1",
      reviewer_employee_id: "manager-1",
      final_score: 4.25,
      status: "draft",
    });

    assert.deepEqual(normalizeAppraisalGoalPayload({
      appraisal_id: "appraisal-1",
      performance_goal_id: "goal-1",
      weight: "50",
      self_score: "4",
      manager_score: "4.5",
      final_score: "4.25",
    }), {
      appraisal_id: "appraisal-1",
      performance_goal_id: "goal-1",
      weight: 50,
      self_score: 4,
      manager_score: 4.5,
      final_score: 4.25,
    });

    assert.deepEqual(normalizePerformanceFeedbackPayload({
      employee_id: "employee-1",
      reviewer_id: "manager-1",
      feedback_type: "manager",
      status: "acknowledged",
      acknowledged_by: "profile-1",
    }), {
      employee_id: "employee-1",
      provider_employee_id: "manager-1",
      feedback_type: "manager",
      status: "draft",
    });

    assert.deepEqual(normalizeFeedbackCriteriaPayload({ name: "Collaboration", max_score: "5", weight: "25", sort_order: "2" }), {
      name: "Collaboration",
      max_rating: 5,
      weight: 25,
    });
    assert.deepEqual(normalizeFeedbackRatings([{ criteria_id: "criteria-1", rating: "4", comments: "good" }, { criteria_id: "criteria-2", score: "-1" }]), [
      { criteria_id: "criteria-1", rating: 4, comments: "good" },
    ]);
  });

  it("strips read-only fields without mutating the input", () => {
    const input = { id: "x", title: "Goal", completed_at: "2026-05-15" };
    assert.deepEqual(stripPerformanceReadOnlyFields(input), { title: "Goal" });
    assert.equal(input.id, "x");
  });
});
