import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const performanceRoutes = [
  "app/api/hrms/performance/goals/route.ts",
  "app/api/hrms/performance/goals/[id]/route.ts",
  "app/api/hrms/performance/kras/route.ts",
  "app/api/hrms/performance/templates/route.ts",
  "app/api/hrms/performance/cycles/route.ts",
  "app/api/hrms/performance/appraisals/route.ts",
  "app/api/hrms/performance/appraisals/[id]/route.ts",
  "app/api/hrms/performance/feedback/route.ts",
  "app/api/hrms/performance/feedback/criteria/route.ts",
  "app/api/hrms/performance/feedback/[id]/ratings/route.ts",
] as const;

function readSource(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("performance API route source contract", () => {
  it("adds the Phase 6 performance route groups", () => {
    for (const route of performanceRoutes) readSource(route);
    readSource("app/api/hrms/performance/_shared.ts");
  });

  it("authenticates every performance route and checks local performance authorization", () => {
    const shared = readSource("app/api/hrms/performance/_shared.ts");
    for (const route of performanceRoutes) {
      const source = readSource(route);
      const authSource = `${source}\n${shared}`;
      assert.match(authSource, /currentHrmsProfile/, `${route} should resolve authenticated HRMS profile`);
      assert.match(source, /if \(!user\)/, `${route} should reject unauthenticated access`);
      assert.match(authSource, /can(Manage|Review|View).*Performance/, `${route} should use performance authorization gates`);
      assert.doesNotMatch(source, /createAdminClient/, `${route} should not broad-read performance through an admin client`);
    }
  });

  it("covers the governed Phase 6 performance tables", () => {
    const combined = performanceRoutes.map(readSource).join("\n");
    for (const table of [
      "performance_goals",
      "performance_kras",
      "appraisal_templates",
      "appraisal_template_goals",
      "appraisal_cycles",
      "appraisals",
      "appraisal_goals",
      "employee_performance_feedback",
      "employee_feedback_criteria",
      "employee_feedback_ratings",
    ]) {
      assert.match(combined, new RegExp(table), `${table} should be represented in performance APIs`);
    }
  });

  it("uses explicit employee foreign keys for performance embeds", () => {
    const expectedEmbeds = new Map([
      ["app/api/hrms/performance/goals/route.ts", /employee:employees!performance_goals_employee_id_fkey/],
      ["app/api/hrms/performance/goals/[id]/route.ts", /employee:employees!performance_goals_employee_id_fkey/],
      ["app/api/hrms/performance/kras/route.ts", /employee:employees!performance_kras_employee_id_fkey/],
      ["app/api/hrms/performance/appraisals/route.ts", /employee:employees!appraisals_employee_id_fkey/],
      ["app/api/hrms/performance/appraisals/route.ts", /reviewer:employees!appraisals_reviewer_employee_id_fkey/],
      ["app/api/hrms/performance/appraisals/[id]/route.ts", /employee:employees!appraisals_employee_id_fkey/],
      ["app/api/hrms/performance/feedback/route.ts", /employee:employees!employee_performance_feedback_employee_id_fkey/],
      ["app/api/hrms/performance/feedback/route.ts", /reviewer:employees!employee_performance_feedback_provider_employee_id_fkey/],
    ]);

    for (const [route, pattern] of expectedEmbeds) {
      const source = readSource(route);
      assert.match(source, pattern, `${route} should qualify employees embeds by FK name`);
      assert.doesNotMatch(source, /employee:employees\(/, `${route} should not rely on ambiguous employees embeds`);
    }
  });

  it("normalizes create and update payloads through performance helpers", () => {
    const expected = new Map([
      ["app/api/hrms/performance/goals/route.ts", /normalizePerformanceGoalPayload/],
      ["app/api/hrms/performance/goals/[id]/route.ts", /normalizePerformanceGoalPayload/],
      ["app/api/hrms/performance/kras/route.ts", /normalizePerformanceKraPayload/],
      ["app/api/hrms/performance/templates/route.ts", /normalizeAppraisalTemplatePayload|normalizeAppraisalTemplateGoals/],
      ["app/api/hrms/performance/cycles/route.ts", /normalizeAppraisalCyclePayload/],
      ["app/api/hrms/performance/appraisals/route.ts", /normalizeAppraisalPayload|normalizeAppraisalGoals/],
      ["app/api/hrms/performance/appraisals/[id]/route.ts", /normalizeAppraisalPayload|normalizeAppraisalGoalPayload/],
      ["app/api/hrms/performance/feedback/route.ts", /normalizePerformanceFeedbackPayload|normalizeFeedbackRatings/],
      ["app/api/hrms/performance/feedback/criteria/route.ts", /normalizeFeedbackCriteriaPayload/],
      ["app/api/hrms/performance/feedback/[id]/ratings/route.ts", /normalizeFeedbackRatingPayload/],
    ]);

    for (const [route, pattern] of expected) assert.match(readSource(route), pattern, `${route} should normalize performance payloads`);
  });

  it("keeps employee self-service performance routes scoped before returning records", () => {
    for (const route of [
      "app/api/hrms/performance/goals/route.ts",
      "app/api/hrms/performance/kras/route.ts",
      "app/api/hrms/performance/appraisals/route.ts",
      "app/api/hrms/performance/feedback/route.ts",
    ]) {
      const source = readSource(route);
      assert.match(source, /resolveLeaveTargetEmployee/, `${route} should resolve employee scope locally`);
      assert.match(source, /canViewPerformanceRecord/, `${route} should check self-service performance visibility`);
      assert.match(source, /targetFromPerformanceRecord/, `${route} should filter returned employee performance records`);
    }
  });

  it("supports controlled performance decision actions", () => {
    const goals = readSource("app/api/hrms/performance/goals/[id]/route.ts");
    const appraisals = readSource("app/api/hrms/performance/appraisals/[id]/route.ts");

    for (const token of ["complete", "cancel", "archive", "closed", "cancelled"]) {
      assert.match(goals, new RegExp(token), `goals should support ${token}`);
    }
    for (const token of ["submit_self", "submit_manager", "calibrate", "complete", "cancel", "self_submitted", "manager_reviewed", "approved", "closed", "cancelled"]) {
      assert.match(appraisals, new RegExp(token), `appraisals should support ${token}`);
    }
  });
});
