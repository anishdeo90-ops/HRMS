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

const lifecycleRoutes = [
  "/lifecycle",
  "/lifecycle/onboarding",
  "/lifecycle/separation",
  "/lifecycle/promotions",
  "/lifecycle/transfers",
  "/grievances",
  "/training",
] as const;

const lifecyclePages = [
  "app/(app)/lifecycle/page.tsx",
  "app/(app)/lifecycle/onboarding/page.tsx",
  "app/(app)/lifecycle/separation/page.tsx",
  "app/(app)/lifecycle/promotions/page.tsx",
  "app/(app)/lifecycle/transfers/page.tsx",
  "app/(app)/grievances/page.tsx",
  "app/(app)/training/page.tsx",
] as const;

describe("Lifecycle UI contract", () => {
  it("enables only the Phase 7 lifecycle routes in nav config", () => {
    const items = NAV_CONFIG.filter((item) => item.section === NavSection.LIFECYCLE);

    assert.deepEqual(items.map((item) => item.href), [...lifecycleRoutes]);
    assert.equal(items.every((item) => item.enabled), true);
  });

  it("scopes lifecycle navigation to HR, HOD, and employee self-service roles", () => {
    const fullAccess = ["/lifecycle", "/lifecycle/onboarding", "/lifecycle/separation", "/lifecycle/promotions", "/lifecycle/transfers", "/grievances", "/training"];
    for (const role of ["admin", "hr_manager", "hr_user", "hod"] as const) {
      assert.deepEqual(getNavForRole(role).filter((item) => item.section === NavSection.LIFECYCLE).map((item) => item.href), fullAccess);
    }

    assert.deepEqual(
      getNavForRole("employee").filter((item) => item.section === NavSection.LIFECYCLE).map((item) => item.href),
      ["/lifecycle", "/lifecycle/onboarding", "/lifecycle/separation", "/grievances", "/training"],
    );

    for (const role of ["recruiter", "payroll_manager", "leave_approver", "expense_approver", "interviewer"] as const) {
      assert.deepEqual(getNavForRole(role).filter((item) => item.section === NavSection.LIFECYCLE), [], `${role} should not see lifecycle nav`);
    }
  });

  it("creates all lifecycle route pages with route-aware guards", () => {
    for (const path of lifecyclePages) {
      const page = source(path);
      assert.match(page, /fetch\("\/api\/me"\)/, `${path} should check the current profile`);
      assert.match(page, /getNavForRole/, `${path} should use centralized nav visibility`);
      assert.match(page, /router\.replace\("\/dashboard"\)/, `${path} should fail closed to dashboard`);
    }
  });

  it("renders the required Phase 7 page contract sections", () => {
    const overview = source("app/(app)/lifecycle/page.tsx");
    assert.match(overview, /Onboarding queue/);
    assert.match(overview, /Separation queue/);
    assert.match(overview, /Promotion and transfer activity/);
    assert.match(overview, /Daily work summary snapshot/);

    const onboarding = source("app/(app)/lifecycle/onboarding/page.tsx");
    assert.match(onboarding, /Onboarding template list/);
    assert.match(onboarding, /Employee onboarding checklist/);
    assert.match(onboarding, /Activity status table/);
    assert.match(onboarding, /Create\/update form for HR users/);
    assert.match(onboarding, /Employee-safe own onboarding state/);

    const separation = source("app/(app)/lifecycle/separation/page.tsx");
    assert.match(separation, /Separation template list/);
    assert.match(separation, /Separation request\/table/);
    assert.match(separation, /Exit checklist and exit interview status/);
    assert.match(separation, /HR approval controls/);
    assert.match(separation, /Employee-safe own separation state/);

    const promotions = source("app/(app)/lifecycle/promotions/page.tsx");
    assert.match(promotions, /Promotion record table/);
    assert.match(promotions, /Current\/new role, department, grade and salary-reference fields/);
    assert.match(promotions, /Approval\/status controls/);

    const transfers = source("app/(app)/lifecycle/transfers/page.tsx");
    assert.match(transfers, /Transfer record table/);
    assert.match(transfers, /From\/to company, branch, department, reporting manager and effective date/);
    assert.match(transfers, /Approval\/status controls/);

    const grievances = source("app/(app)/grievances/page.tsx");
    assert.match(grievances, /Grievance type list/);
    assert.match(grievances, /Employee grievance form\/table/);
    assert.match(grievances, /Assignment, status, resolution summary/);
    assert.match(grievances, /Employee-safe own grievance view/);

    const training = source("app/(app)/training/page.tsx");
    assert.match(training, /Training program list/);
    assert.match(training, /Training event calendar\/table/);
    assert.match(training, /Feedback\/rating capture/);
    assert.match(training, /Employee training participation view/);
  });

  it("calls the planned lifecycle, grievance, and training HRMS endpoints", () => {
    const expected = new Map([
      ["app/(app)/lifecycle/page.tsx", ["/api/hrms/lifecycle/onboarding", "/api/hrms/lifecycle/separation", "/api/hrms/lifecycle/promotions", "/api/hrms/lifecycle/transfers", "/api/hrms/lifecycle/daily-summaries", "scope=mine"]],
      ["app/(app)/lifecycle/onboarding/page.tsx", ["/api/hrms/lifecycle/onboarding/templates", "/api/hrms/lifecycle/onboarding", "/api/hrms/lifecycle/onboarding/activities", "scope=mine"]],
      ["app/(app)/lifecycle/separation/page.tsx", ["/api/hrms/lifecycle/separation/templates", "/api/hrms/lifecycle/separation", "/api/hrms/lifecycle/exit-interviews", "scope=mine"]],
      ["app/(app)/lifecycle/promotions/page.tsx", ["/api/hrms/lifecycle/promotions"]],
      ["app/(app)/lifecycle/transfers/page.tsx", ["/api/hrms/lifecycle/transfers"]],
      ["app/(app)/grievances/page.tsx", ["/api/hrms/grievances/types", "/api/hrms/grievances", "scope=mine"]],
      ["app/(app)/training/page.tsx", ["/api/hrms/training/programs", "/api/hrms/training/events", "/api/hrms/training/feedback", "scope=mine"]],
    ]);

    for (const [path, endpoints] of expected) {
      const page = source(path);
      for (const endpoint of endpoints) {
        assert.match(page, new RegExp(endpoint.replaceAll("/", "\\/")), `${path} should call ${endpoint}`);
      }
    }
  });

  it("keeps lifecycle UI out of metadata, migrations, API routes, generated files, and helpers", () => {
    const combined = lifecyclePages.map(source).join("\n");

    assert.doesNotMatch(combined, /from "@\/lib\/hrms\/lifecycle|from "@\/lib\/generated|supabase\/migrations|metadata\//);
  });
});
