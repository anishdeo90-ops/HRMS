import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { NavSection, getNavForRole } from "../../lib/nav/config";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("Phase 9 reports UI contract", () => {
  it("enables reports navigation only for authorized HR, finance, and payroll roles", () => {
    const expected = ["/reports", "/reports/dashboards"];

    for (const role of ["admin", "hr_manager", "hr_user", "finance_manager", "payroll_manager"] as const) {
      assert.deepEqual(
        getNavForRole(role)
          .filter((item) => item.section === NavSection.REPORTS)
          .map((item) => item.href),
        expected,
      );
    }

    for (const role of ["employee", "recruiter", "hod", "leave_approver", "expense_approver", "interviewer"] as const) {
      assert.equal(getNavForRole(role).some((item) => item.section === NavSection.REPORTS), false, `${role} should not see reports nav`);
    }
  });

  it("renders guarded report and dashboard routes", () => {
    for (const path of ["app/(app)/reports/page.tsx", "app/(app)/reports/dashboards/page.tsx"]) {
      const page = source(path);
      assert.match(page, /\/api\/me/);
      assert.match(page, /getNavForRole/);
      assert.match(page, /router\.replace\("\/dashboard"\)/);
    }
  });

  it("uses the Phase 9 report, dashboard, and automation APIs from UI only", () => {
    const reports = source("app/(app)/reports/page.tsx");
    const dashboards = source("app/(app)/reports/dashboards/page.tsx");

    assert.match(reports, /\/api\/hrms\/reports/);
    assert.match(reports, /\/api\/hrms\/automation/);
    assert.match(reports, /method: "POST"/);
    assert.match(dashboards, /\/api\/hrms\/dashboards/);
    assert.match(dashboards, /\/api\/hrms\/automation/);
  });

  it("keeps required operational report and dashboard copy visible for empty states", () => {
    const reports = source("app/(app)/reports/page.tsx");
    const dashboards = source("app/(app)/reports/dashboards/page.tsx");

    for (const label of ["People", "Time", "Leave", "Finance", "Payroll", "Performance", "Lifecycle", "Recruitment", "Events"]) {
      assert.match(reports, new RegExp(label));
    }

    for (const label of ["Headcount", "Attendance", "Leave", "Expenses", "Payroll readiness", "Performance", "Lifecycle", "Approvals", "Alerts"]) {
      assert.match(dashboards, new RegExp(label));
    }

    assert.match(reports, /No HRMS reports found/);
    assert.match(reports, /No report rows to display/);
    assert.match(dashboards, /No operational alerts found/);
    assert.match(dashboards, /No automation rules visible/);
  });

  it("does not import out-of-lane report helpers or generated artifacts", () => {
    for (const path of ["app/(app)/reports/page.tsx", "app/(app)/reports/dashboards/page.tsx"]) {
      const page = source(path);
      assert.doesNotMatch(page, /@\/lib\/hrms\/reports/);
      assert.doesNotMatch(page, /@\/lib\/hrms\/automation/);
      assert.doesNotMatch(page, /@\/lib\/generated/);
      assert.doesNotMatch(page, /supabase\/migrations/);
      assert.doesNotMatch(page, /metadata\//);
    }
  });
});
