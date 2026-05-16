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

const payrollRoutes = [
  "/payroll",
  "/payroll/salary-structures",
  "/payroll/runs",
  "/payroll/salary-slips",
  "/payroll/tax-benefits",
] as const;

describe("Payroll UI contract", () => {
  it("enables only the Phase 5 payroll routes in nav config", () => {
    const items = NAV_CONFIG.filter((item) => item.section === NavSection.PAYROLL);
    assert.deepEqual(items.map((item) => item.href), [...payrollRoutes]);
    assert.equal(items.every((item) => item.enabled), true);
    assert.equal(items.some((item) => item.href === "/payroll/structures"), false);
    assert.equal(items.some((item) => item.href === "/payroll/slips"), false);
  });

  it("scopes payroll navigation to payroll, HR, admin, and employee self-service routes", () => {
    for (const role of ["admin", "hr_manager", "payroll_manager"] as const) {
      assert.deepEqual(getNavForRole(role).filter((item) => item.section === NavSection.PAYROLL).map((item) => item.href), [...payrollRoutes]);
    }

    assert.deepEqual(getNavForRole("employee").filter((item) => item.section === NavSection.PAYROLL).map((item) => item.href), [
      "/payroll/salary-slips",
      "/payroll/tax-benefits",
    ]);

    for (const role of ["recruiter", "hod", "leave_approver", "expense_approver", "interviewer", "hr_user"] as const) {
      assert.deepEqual(getNavForRole(role).filter((item) => item.section === NavSection.PAYROLL), [], `${role} should not see payroll nav`);
    }
  });

  it("creates all payroll route pages with route-aware guards", () => {
    for (const path of [
      "app/(app)/payroll/page.tsx",
      "app/(app)/payroll/salary-structures/page.tsx",
      "app/(app)/payroll/runs/page.tsx",
      "app/(app)/payroll/salary-slips/page.tsx",
      "app/(app)/payroll/tax-benefits/page.tsx",
    ]) {
      const page = source(path);
      assert.match(page, /fetch\("\/api\/me"\)/, `${path} should check the current profile`);
      assert.match(page, /getNavForRole/, `${path} should use centralized nav visibility`);
      assert.match(page, /router\.replace\("\/dashboard"\)/, `${path} should fail closed to dashboard`);
    }
  });

  it("calls the planned payroll HRMS endpoints", () => {
    const expected = new Map([
      ["app/(app)/payroll/page.tsx", ["/api/hrms/payroll/periods", "/api/hrms/payroll/runs", "/api/hrms/payroll/salary-slips", "/api/hrms/payroll/salary-structures"]],
      ["app/(app)/payroll/salary-structures/page.tsx", ["/api/hrms/payroll/salary-components", "/api/hrms/payroll/salary-structures", "/api/hrms/payroll/salary-structure-assignments"]],
      ["app/(app)/payroll/runs/page.tsx", ["/api/hrms/payroll/periods", "/api/hrms/payroll/runs"]],
      ["app/(app)/payroll/salary-slips/page.tsx", ["/api/hrms/payroll/salary-slips", "scope=mine"]],
      ["app/(app)/payroll/tax-benefits/page.tsx", ["/api/hrms/payroll/tax-slabs", "/api/hrms/payroll/tax-declarations", "/api/hrms/payroll/benefit-applications", "/api/hrms/payroll/benefit-claims"]],
    ]);

    for (const [path, endpoints] of expected) {
      const page = source(path);
      for (const endpoint of endpoints) {
        assert.match(page, new RegExp(endpoint.replaceAll("/", "\\/")), `${path} should call ${endpoint}`);
      }
    }
  });

  it("keeps payroll UI out of metadata, migrations, API routes, and helpers", () => {
    const combined = [
      "app/(app)/payroll/page.tsx",
      "app/(app)/payroll/salary-structures/page.tsx",
      "app/(app)/payroll/runs/page.tsx",
      "app/(app)/payroll/salary-slips/page.tsx",
      "app/(app)/payroll/tax-benefits/page.tsx",
    ].map(source).join("\n");

    assert.doesNotMatch(combined, /from "@\/lib\/hrms\/payroll|from "@\/lib\/generated|supabase\/migrations|metadata\//);
  });
});
