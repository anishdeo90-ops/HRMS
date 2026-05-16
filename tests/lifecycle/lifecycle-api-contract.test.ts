import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const lifecycleRoutes = [
  "app/api/hrms/lifecycle/overview/route.ts",
  "app/api/hrms/lifecycle/onboarding/route.ts",
  "app/api/hrms/lifecycle/separations/route.ts",
  "app/api/hrms/lifecycle/promotions/route.ts",
  "app/api/hrms/lifecycle/transfers/route.ts",
  "app/api/hrms/lifecycle/daily-summaries/route.ts",
  "app/api/hrms/grievances/types/route.ts",
  "app/api/hrms/grievances/route.ts",
  "app/api/hrms/training/programs/route.ts",
  "app/api/hrms/training/events/route.ts",
  "app/api/hrms/training/feedback/route.ts",
] as const;

function readSource(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("lifecycle API route source contract", () => {
  it("adds the Phase 7 lifecycle, grievance, and training route groups", () => {
    for (const route of lifecycleRoutes) readSource(route);
    readSource("app/api/hrms/lifecycle/_shared.ts");
  });

  it("authenticates every route and avoids broad admin reads", () => {
    const shared = readSource("app/api/hrms/lifecycle/_shared.ts");
    for (const route of lifecycleRoutes) {
      const source = readSource(route);
      const authSource = `${source}\n${shared}`;
      assert.match(authSource, /currentHrmsProfile/, `${route} should resolve authenticated HRMS profile`);
      assert.match(source, /if \(!user\)/, `${route} should reject unauthenticated access`);
      assert.match(authSource, /can(Manage|Review|View).*Lifecycle/, `${route} should use lifecycle authorization gates`);
      assert.doesNotMatch(source, /createAdminClient/, `${route} should not broad-read lifecycle through an admin client`);
    }
  });

  it("covers the governed Phase 7 tables represented by API contracts", () => {
    const combined = lifecycleRoutes.map(readSource).join("\n");
    for (const table of [
      "employee_onboardings",
      "employee_boarding_activities",
      "employee_separations",
      "employee_promotions",
      "employee_transfers",
      "daily_work_summaries",
      "grievance_types",
      "employee_grievances",
      "training_programs",
      "training_events",
      "training_feedback",
    ]) {
      assert.match(combined, new RegExp(table), `${table} should be represented in lifecycle APIs`);
    }
  });

  it("uses explicit employee foreign keys for lifecycle embeds", () => {
    const expectedEmbeds = new Map([
      ["app/api/hrms/lifecycle/onboarding/route.ts", /employee:employees!employee_onboardings_employee_id_fkey/],
      ["app/api/hrms/lifecycle/separations/route.ts", /employee:employees!employee_separations_employee_id_fkey/],
      ["app/api/hrms/lifecycle/promotions/route.ts", /employee:employees!employee_promotions_employee_id_fkey/],
      ["app/api/hrms/lifecycle/transfers/route.ts", /employee:employees!employee_transfers_employee_id_fkey/],
      ["app/api/hrms/lifecycle/daily-summaries/route.ts", /employee:employees!daily_work_summaries_employee_id_fkey/],
      ["app/api/hrms/grievances/route.ts", /employee:employees!employee_grievances_employee_id_fkey/],
      ["app/api/hrms/training/feedback/route.ts", /employee:employees!training_feedback_employee_id_fkey/],
    ]);

    for (const [route, pattern] of expectedEmbeds) {
      const source = readSource(route);
      assert.match(source, pattern, `${route} should qualify employees embeds by FK name`);
      assert.doesNotMatch(source, /employee:employees\(/, `${route} should not rely on ambiguous employees embeds`);
    }
  });

  it("normalizes create payloads through lifecycle API helpers", () => {
    const expected = new Map([
      ["app/api/hrms/lifecycle/onboarding/route.ts", /normalizeOnboardingPayload/],
      ["app/api/hrms/lifecycle/separations/route.ts", /normalizeSeparationPayload/],
      ["app/api/hrms/lifecycle/promotions/route.ts", /normalizePromotionPayload/],
      ["app/api/hrms/lifecycle/transfers/route.ts", /normalizeTransferPayload/],
      ["app/api/hrms/lifecycle/daily-summaries/route.ts", /normalizeDailySummaryPayload/],
      ["app/api/hrms/grievances/types/route.ts", /normalizeGrievanceTypePayload/],
      ["app/api/hrms/grievances/route.ts", /normalizeGrievancePayload/],
      ["app/api/hrms/training/programs/route.ts", /normalizeTrainingProgramPayload/],
      ["app/api/hrms/training/events/route.ts", /normalizeTrainingEventPayload/],
      ["app/api/hrms/training/feedback/route.ts", /normalizeTrainingFeedbackPayload/],
    ]);

    for (const [route, pattern] of expected) assert.match(readSource(route), pattern, `${route} should normalize lifecycle payloads`);
  });

  it("keeps employee-scoped lifecycle records filtered before returning data", () => {
    for (const route of [
      "app/api/hrms/lifecycle/onboarding/route.ts",
      "app/api/hrms/lifecycle/separations/route.ts",
      "app/api/hrms/lifecycle/promotions/route.ts",
      "app/api/hrms/lifecycle/transfers/route.ts",
      "app/api/hrms/lifecycle/daily-summaries/route.ts",
      "app/api/hrms/grievances/route.ts",
      "app/api/hrms/training/feedback/route.ts",
    ]) {
      const source = readSource(route);
      assert.match(source, /resolveLeaveTargetEmployee/, `${route} should resolve employee scope locally`);
      assert.match(source, /canViewLifecycleRecord/, `${route} should check record visibility`);
      assert.match(source, /targetFromLifecycleRecord/, `${route} should filter returned records by lifecycle target`);
    }
  });
});
