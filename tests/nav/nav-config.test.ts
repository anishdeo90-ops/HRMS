import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { NAV_CONFIG, NavSection, canViewSettings, getNavForRole, getSectionsForRole } from "../../lib/nav/config";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("role-based navigation config", () => {
  it("keeps current enabled routes visible through typed NAV_CONFIG", () => {
    const enabledHrefs = NAV_CONFIG.filter((item) => item.enabled).map((item) => item.href);

    assert.deepEqual(enabledHrefs, [
      "/dashboard",
      "/my-activity",
      "/candidates",
      "/jobs",
      "/hod-portal",
      "/jds",
      "/recruitment",
      "/recruitment/appointments",
      "/people/employees",
      "/people/organization",
      "/time/attendance",
      "/time/shifts",
      "/time/approvals",
      "/expenses",
      "/expenses/claims",
      "/expenses/advances",
      "/travel",
      "/vehicles",
      "/payroll",
      "/payroll/salary-structures",
      "/payroll/runs",
      "/payroll/salary-slips",
      "/payroll/tax-benefits",
      "/performance",
      "/performance/goals",
      "/performance/appraisals",
      "/performance/feedback",
      "/lifecycle",
      "/lifecycle/onboarding",
      "/lifecycle/separation",
      "/lifecycle/promotions",
      "/lifecycle/transfers",
      "/grievances",
      "/training",
      "/self-service",
      "/self-service/notifications",
      "/reports",
      "/reports/dashboards",
    ]);
  });

  it("keeps planned later-phase routes in config but disabled", () => {
    for (const href of [
      "/time/leave",
      "/interviews",
    ]) {
      const item = NAV_CONFIG.find((entry) => entry.href === href);
      assert.ok(item, `${href} should exist in nav config`);
      assert.equal(item?.enabled, false, `${href} should be disabled until its route is built`);
    }
  });

  it("filters visible nav and sections by role", () => {
    assert.deepEqual(getNavForRole("recruiter").map((item) => item.href), [
      "/dashboard",
      "/my-activity",
      "/candidates",
      "/jobs",
      "/jds",
      "/recruitment",
      "/recruitment/appointments",
    ]);
    assert.deepEqual(getSectionsForRole("recruiter"), [NavSection.NONE, NavSection.RECRUITING]);

    assert.deepEqual(getSectionsForRole("admin"), [
      NavSection.NONE,
      NavSection.RECRUITING,
      NavSection.PEOPLE,
      NavSection.TIME,
      NavSection.FINANCE,
      NavSection.PAYROLL,
      NavSection.PERFORMANCE,
      NavSection.LIFECYCLE,
      NavSection.REPORTS,
    ]);
    assert.ok(getNavForRole("employee").some((item) => item.href === "/time/attendance"));
    assert.deepEqual(
      getNavForRole("employee")
        .filter((item) => item.section === NavSection.PAYROLL)
        .map((item) => item.href),
      ["/payroll/salary-slips", "/payroll/tax-benefits"],
    );
    assert.equal(getNavForRole("employee").some((item) => item.href === "/candidates"), false);
    assert.equal(getNavForRole("payroll_manager").some((item) => item.href === "/candidates"), false);
    assert.equal(getSectionsForRole("payroll_manager").includes(NavSection.PAYROLL), true);
    assert.deepEqual(
      getNavForRole("payroll_manager")
        .filter((item) => item.section === NavSection.REPORTS)
        .map((item) => item.href),
      ["/reports", "/reports/dashboards"],
    );
    assert.deepEqual(
      getNavForRole("finance_manager")
        .filter((item) => item.section === NavSection.REPORTS)
        .map((item) => item.href),
      ["/reports", "/reports/dashboards"],
    );
    assert.deepEqual(
      getNavForRole("employee")
        .filter((item) => item.section === NavSection.PERFORMANCE)
        .map((item) => item.href),
      ["/performance", "/performance/goals", "/performance/appraisals", "/performance/feedback"],
    );
    assert.deepEqual(
      getNavForRole("employee")
        .filter((item) => item.section === NavSection.LIFECYCLE)
        .map((item) => item.href),
      ["/lifecycle", "/lifecycle/onboarding", "/lifecycle/separation", "/grievances", "/training"],
    );
    assert.deepEqual(
      getNavForRole("employee")
        .filter((item) => item.section === NavSection.SELF_SERVICE)
        .map((item) => item.href),
      ["/self-service", "/self-service/notifications"],
    );
    assert.equal(getNavForRole("employee").some((item) => item.href === "/settings"), false);
  });

  it("keeps Settings outside main nav and limited to admin or HR manager", () => {
    assert.equal(canViewSettings("admin"), true);
    assert.equal(canViewSettings("hr_manager"), true);
    assert.equal(canViewSettings("hr_user"), false);
    assert.equal(canViewSettings("recruiter"), false);

    assert.equal(NAV_CONFIG.some((item) => item.href === "/settings"), false);
    assert.match(source("components/sidebar.tsx"), /canViewSettings\(profile\.role\)/);
  });
});
