import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const routes = [
  "app/api/hrms/expenses/claims/route.ts",
  "app/api/hrms/expenses/claims/[id]/route.ts",
  "app/api/hrms/expenses/claims/[id]/attachments/route.ts",
  "app/api/hrms/expenses/advances/route.ts",
  "app/api/hrms/expenses/advances/[id]/route.ts",
  "app/api/hrms/travel/requests/route.ts",
  "app/api/hrms/travel/requests/[id]/route.ts",
  "app/api/hrms/vehicles/logs/route.ts",
  "app/api/hrms/vehicles/services/route.ts",
] as const;

function readRoute(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("expense API route source contract", () => {
  it("adds all Manager 02 API routes", () => {
    for (const route of routes) readRoute(route);
  });

  it("authenticates and checks local authorization in every sensitive route", () => {
    for (const route of routes) {
      const source = readRoute(route);
      assert.match(source, /currentHrmsProfile/, `${route} should resolve authenticated HRMS profile`);
      assert.match(source, /if \(!user\)/, `${route} should reject unauthenticated access`);
      assert.match(source, /can(View|Create|Approve|Manage)Expense/, `${route} should use expense authorization helpers`);
      assert.doesNotMatch(source, /admin\.from\("(expense_claims|employee_advances|travel_requests|vehicle_logs|vehicle_services)"/, `${route} should not broad-read finance data through admin client`);
    }
  });

  it("avoids fragile recursive employees embeds for reporting manager checks", () => {
    for (const route of routes) {
      const source = readRoute(route);
      assert.doesNotMatch(source, /reporting_manager:employees!employees_reporting_manager_id_fkey/, `${route} should avoid PostgREST self-relationship schema-cache dependency`);
    }

    const accessSource = readFileSync(join(repoRoot, "lib/hrms/employee-access.ts"), "utf8");
    assert.doesNotMatch(accessSource, /reporting_manager:employees!employees_reporting_manager_id_fkey/, "employee access helper should avoid PostgREST recursive employees embeds");
    assert.match(accessSource, /employee_id: approverEmployee\?\.id \?\? null/, "current profile should carry employee_id for direct manager comparisons");
  });

  it("uses explicit employee foreign keys for finance embeds", () => {
    const expectedEmbeds = new Map([
      ["app/api/hrms/expenses/claims/route.ts", /employee:employees!expense_claims_employee_id_fkey/],
      ["app/api/hrms/expenses/claims/[id]/route.ts", /employee:employees!expense_claims_employee_id_fkey/],
      ["app/api/hrms/expenses/claims/[id]/attachments/route.ts", /employee:employees!expense_claims_employee_id_fkey/],
      ["app/api/hrms/expenses/advances/route.ts", /employee:employees!employee_advances_employee_id_fkey/],
      ["app/api/hrms/expenses/advances/[id]/route.ts", /employee:employees!employee_advances_employee_id_fkey/],
      ["app/api/hrms/travel/requests/route.ts", /employee:employees!travel_requests_employee_id_fkey/],
      ["app/api/hrms/travel/requests/[id]/route.ts", /employee:employees!travel_requests_employee_id_fkey/],
      ["app/api/hrms/vehicles/logs/route.ts", /employee:employees!vehicle_logs_employee_id_fkey/],
      ["app/api/hrms/vehicles/services/route.ts", /employee:employees!vehicle_services_employee_id_fkey/],
    ]);

    for (const [route, pattern] of expectedEmbeds) {
      const source = readRoute(route);
      assert.match(source, pattern, `${route} should qualify the employees embed by FK name`);
      assert.doesNotMatch(source, /employee:employees\(/, `${route} should not rely on ambiguous employees embeds`);
    }
  });

  it("uses normalization helpers on create and update routes", () => {
    const expected = new Map([
      ["app/api/hrms/expenses/claims/route.ts", /normalizeExpenseClaimPayload|normalizeExpenseLineItems/],
      ["app/api/hrms/expenses/claims/[id]/route.ts", /normalizeExpenseClaimPayload/],
      ["app/api/hrms/expenses/advances/route.ts", /normalizeAdvancePayload/],
      ["app/api/hrms/expenses/advances/[id]/route.ts", /normalizeAdvancePayload/],
      ["app/api/hrms/travel/requests/route.ts", /normalizeTravelRequestPayload/],
      ["app/api/hrms/travel/requests/[id]/route.ts", /normalizeTravelRequestPayload/],
      ["app/api/hrms/vehicles/logs/route.ts", /normalizeVehicleLogPayload/],
      ["app/api/hrms/vehicles/services/route.ts", /normalizeVehicleServicePayload/],
    ]);

    for (const [route, pattern] of expected) assert.match(readRoute(route), pattern, `${route} should normalize payloads`);
  });

  it("supports planned decision actions without payroll or accounting imports", () => {
    const decisions = [
      ["app/api/hrms/expenses/claims/[id]/route.ts", /approve|reject|cancel|paid/],
      ["app/api/hrms/expenses/advances/[id]/route.ts", /approve|reject|cancel|settled/],
      ["app/api/hrms/travel/requests/[id]/route.ts", /approve|reject|cancel|completed/],
    ] as const;

    for (const [route, pattern] of decisions) assert.match(readRoute(route), pattern, `${route} should support decision actions`);

    for (const route of routes) {
      assert.doesNotMatch(readRoute(route), /payroll|salary_slip|salarySlip|ctc|accounting|journal/i, `${route} must not import payroll or accounting behavior`);
    }
  });

  it("keeps attachments private and returns signed URLs only after access checks", () => {
    const source = readRoute("app/api/hrms/expenses/claims/[id]/attachments/route.ts");
    const accessIndex = source.search(/can(View|Create|Approve|Manage)Expense/);
    const signedUrlIndex = source.indexOf("createSignedUrl");

    assert.match(source, /expense-attachments/);
    assert.match(source, /buildExpenseAttachmentPath/);
    assert.ok(accessIndex >= 0 && signedUrlIndex > accessIndex, "signed URLs should be created after local access checks");
  });
});
