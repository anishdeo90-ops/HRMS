import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { getNavForRole, NAV_CONFIG, NavSection } from "../../lib/nav/config";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

const performanceRoutes = [
  "/performance",
  "/performance/goals",
  "/performance/appraisals",
  "/performance/feedback",
] as const;

const performancePages = [
  "app/(app)/performance/page.tsx",
  "app/(app)/performance/goals/page.tsx",
  "app/(app)/performance/appraisals/page.tsx",
  "app/(app)/performance/feedback/page.tsx",
] as const;

describe("Performance UI contract", () => {
  it("enables only the Phase 6 performance routes in nav config", () => {
    const items = NAV_CONFIG.filter((item) => item.section === NavSection.PERFORMANCE);

    assert.deepEqual(items.map((item) => item.href), [...performanceRoutes]);
    assert.equal(items.every((item) => item.enabled), true);
  });

  it("scopes performance navigation to HR, HOD, and employee self-service roles", () => {
    for (const role of ["admin", "hr_manager", "hr_user", "hod", "employee"] as const) {
      assert.deepEqual(getNavForRole(role).filter((item) => item.section === NavSection.PERFORMANCE).map((item) => item.href), [...performanceRoutes]);
    }

    for (const role of ["recruiter", "payroll_manager", "leave_approver", "expense_approver", "interviewer"] as const) {
      assert.deepEqual(getNavForRole(role).filter((item) => item.section === NavSection.PERFORMANCE), [], `${role} should not see performance nav`);
    }
  });

  it("creates all performance route pages with route-aware guards", () => {
    for (const path of performancePages) {
      const page = source(path);
      assert.match(page, /fetch\("\/api\/me"\)/, `${path} should check the current profile`);
      assert.match(page, /getNavForRole/, `${path} should use centralized nav visibility`);
      assert.match(page, /router\.replace\("\/dashboard"\)/, `${path} should fail closed to dashboard`);
    }
  });

  it("renders the required Phase 6 page contract sections", () => {
    const overview = source("app/(app)/performance/page.tsx");
    assert.match(overview, /Active goals/);
    assert.match(overview, /Open cycles/);
    assert.match(overview, /Pending appraisals/);
    assert.match(overview, /Feedback due/);
    assert.match(overview, /Current appraisal cycles/);
    assert.match(overview, /Pending performance actions/);

    const goals = source("app/(app)/performance/goals/page.tsx");
    assert.match(goals, /Goal list/);
    assert.match(goals, /Goal form/);
    assert.match(goals, /Measurable target/i);
    assert.match(goals, /KRA table/);
    assert.match(goals, /Employee-safe own-goal view/);

    const appraisals = source("app/(app)/performance/appraisals/page.tsx");
    assert.match(appraisals, /Appraisal template list/);
    assert.match(appraisals, /Template goal-weight table/);
    assert.match(appraisals, /Appraisal cycle form/);
    assert.match(appraisals, /Appraisal table/);

    const feedback = source("app/(app)/performance/feedback/page.tsx");
    assert.match(feedback, /Feedback criteria table/);
    assert.match(feedback, /Feedback rating table/);
    assert.match(feedback, /Self-feedback and manager-feedback/);
    assert.match(feedback, /Review controls/);
  });

  it("calls the planned performance HRMS endpoints", () => {
    const expected = new Map([
      ["app/(app)/performance/page.tsx", ["/api/hrms/performance/goals", "/api/hrms/performance/cycles", "/api/hrms/performance/appraisals", "/api/hrms/performance/feedback"]],
      ["app/(app)/performance/goals/page.tsx", ["/api/hrms/performance/goals", "/api/hrms/performance/kras", "scope=mine"]],
      ["app/(app)/performance/appraisals/page.tsx", ["/api/hrms/performance/templates", "/api/hrms/performance/cycles", "/api/hrms/performance/appraisals", "scope=mine"]],
      ["app/(app)/performance/feedback/page.tsx", ["/api/hrms/performance/feedback/criteria", "/api/hrms/performance/feedback", "scope=mine"]],
    ]);

    for (const [path, endpoints] of expected) {
      const page = source(path);
      for (const endpoint of endpoints) {
        assert.match(page, new RegExp(endpoint.replaceAll("/", "\\/")), `${path} should call ${endpoint}`);
      }
    }
  });

  it("keeps performance UI out of metadata, migrations, API routes, generated files, and helpers", () => {
    const combined = performancePages.map(source).join("\n");

    assert.doesNotMatch(combined, /from "@\/lib\/hrms\/performance|from "@\/lib\/generated|supabase\/migrations|metadata\//);
  });
});
