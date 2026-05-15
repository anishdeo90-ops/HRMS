import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { FINANCE_ROUTE_ACCESS, getVisibleFinanceRoutes } from "../../lib/hrms/route-access";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("Finance route access and UI contract", () => {
  it("uses governed finance route keys for every finance route", () => {
    assert.equal(FINANCE_ROUTE_ACCESS.overview.key, "route.finance.expenses");
    assert.equal(FINANCE_ROUTE_ACCESS.claims.key, "route.finance.expense_claims");
    assert.equal(FINANCE_ROUTE_ACCESS.advances.key, "route.finance.employee_advances");
    assert.equal(FINANCE_ROUTE_ACCESS.travel.key, "route.finance.travel");
    assert.equal(FINANCE_ROUTE_ACCESS.vehicles.key, "route.finance.vehicles");
  });

  it("does not expose Finance navigation to recruiter-only or inactive users", () => {
    assert.deepEqual(getVisibleFinanceRoutes({ role: "recruiter" }), []);
    assert.deepEqual(getVisibleFinanceRoutes({ role: "candidate" }), []);
    assert.deepEqual(getVisibleFinanceRoutes({ role: "interviewer" }), []);
    assert.deepEqual(getVisibleFinanceRoutes({ role: "payroll_manager" }), []);
    assert.deepEqual(getVisibleFinanceRoutes({ role: "admin", is_active: false }), []);
  });

  it("shows scoped finance routes for employees, approvers, HR, finance, and admins", () => {
    assert.deepEqual(getVisibleFinanceRoutes({ role: "employee" }).map((route) => route.key), [
      "route.finance.expenses",
      "route.finance.expense_claims",
      "route.finance.employee_advances",
      "route.finance.travel",
      "route.finance.vehicles",
    ]);

    assert.deepEqual(getVisibleFinanceRoutes({ role: "expense_approver" }).map((route) => route.key), [
      "route.finance.expenses",
      "route.finance.expense_claims",
      "route.finance.employee_advances",
      "route.finance.travel",
    ]);

    for (const role of ["admin", "hr_manager", "finance_manager"]) {
      assert.deepEqual(getVisibleFinanceRoutes({ role }).map((route) => route.key), [
        "route.finance.expenses",
        "route.finance.expense_claims",
        "route.finance.employee_advances",
        "route.finance.travel",
        "route.finance.vehicles",
      ]);
    }
  });

  it("adds a Finance sidebar group while preserving existing navigation hooks", () => {
    const sidebar = source("components/sidebar.tsx");

    for (const token of ["getVisiblePeopleRoutes", "getVisibleTimeRoutes", "getVisibleFinanceRoutes", ">Finance<"]) {
      assert.match(sidebar, new RegExp(token));
    }
    for (const href of ["/expenses", "/expenses/claims", "/expenses/advances", "/travel", "/vehicles"]) {
      assert.match(sidebar, new RegExp(href.replaceAll("/", "\\/")), `${href} should be linked from Finance navigation`);
    }
  });

  it("pages call the planned HRMS finance endpoints", () => {
    const expected = new Map([
      ["app/(app)/expenses/page.tsx", ["/api/hrms/expenses/claims", "/api/hrms/expenses/advances", "/api/hrms/travel/requests"]],
      ["app/(app)/expenses/claims/page.tsx", ["/api/hrms/expenses/claims"]],
      ["app/(app)/expenses/advances/page.tsx", ["/api/hrms/expenses/advances"]],
      ["app/(app)/travel/page.tsx", ["/api/hrms/travel/requests"]],
      ["app/(app)/vehicles/page.tsx", ["/api/hrms/vehicles/logs", "/api/hrms/vehicles/services"]],
    ]);

    for (const [path, endpoints] of expected) {
      const page = source(path);
      for (const endpoint of endpoints) {
        assert.match(page, new RegExp(endpoint.replaceAll("/", "\\/")), `${path} should call ${endpoint}`);
      }
    }
  });

  it("keeps expense UI separate from payroll and salary slip behavior", () => {
    const combined = [
      "app/(app)/expenses/page.tsx",
      "app/(app)/expenses/claims/page.tsx",
      "app/(app)/expenses/advances/page.tsx",
      "app/(app)/travel/page.tsx",
      "app/(app)/vehicles/page.tsx",
    ].map(source).join("\n");

    assert.doesNotMatch(combined, /payroll|salary\s*slip|salary_slip|ctc|accounting|journal/i);
  });
});
