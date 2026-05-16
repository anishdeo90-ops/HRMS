import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const reportRoutes = [
  "app/api/hrms/reports/route.ts",
  "app/api/hrms/reports/[key]/route.ts",
  "app/api/hrms/dashboards/route.ts",
  "app/api/hrms/automation/route.ts",
  "app/api/hrms/automation/notifications/route.ts",
  "app/api/hrms/automation/runs/route.ts",
] as const;

function source(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("reports API route source contract", () => {
  it("adds the Phase 9 reports, dashboards, and automation API route groups", () => {
    for (const route of reportRoutes) source(route);
    source("app/api/hrms/reports/_shared.ts");
  });

  it("authenticates every route and checks local report authorization", () => {
    const shared = source("app/api/hrms/reports/_shared.ts");
    for (const route of reportRoutes) {
      const text = source(route);
      const authSource = `${text}\n${shared}`;
      assert.match(authSource, /currentHrmsProfile/, `${route} should resolve authenticated HRMS profile`);
      assert.match(text, /if \(!user\)/, `${route} should reject unauthenticated access`);
      assert.match(authSource, /can(View|Run|Manage).*?(Report|Dashboard|Automation|Notification)/, `${route} should use report authorization helpers`);
      assert.doesNotMatch(text, /createAdminClient/, `${route} should not broad-read reports through an admin client`);
    }
  });

  it("covers the governed Phase 9 report and automation tables", () => {
    const combined = reportRoutes.map(source).join("\n") + source("app/api/hrms/reports/_shared.ts");
    for (const table of [
      "hrms_report_runs",
      "hrms_automation_rules",
      "hrms_notification_rules",
      "hrms_automation_execution_logs",
      "employees",
      "attendance_days",
      "leave_ledger_entries",
      "expense_claims",
      "payroll_entries",
      "employee_separations",
    ]) {
      assert.match(combined, new RegExp(table), `${table} should be represented in Phase 9 APIs`);
    }
  });

  it("uses explicit employee foreign keys for report embeds", () => {
    const shared = source("app/api/hrms/reports/_shared.ts");
    for (const pattern of [
      /employee:employees!attendance_days_employee_id_fkey/,
      /employee:employees!employee_shift_assignments_employee_id_fkey/,
      /employee:employees!leave_allocations_employee_id_fkey/,
      /employee:employees!leave_ledger_entries_employee_id_fkey/,
      /employee:employees!employee_advances_employee_id_fkey/,
      /employee:employees!expense_claims_employee_id_fkey/,
      /employee:employees!payroll_entries_employee_id_fkey/,
      /employee:employees!salary_slips_employee_id_fkey/,
      /employee:employees!employee_separations_employee_id_fkey/,
    ]) {
      assert.match(shared, pattern);
    }
    assert.doesNotMatch(shared, /employee:employees\(/);
  });

  it("normalizes report and automation payloads through Trisha helper modules", () => {
    const combined = reportRoutes.map(source).join("\n");
    assert.match(combined, /normalizeReportRunPayload/);
    assert.match(combined, /normalizeReportFilters/);
    assert.match(combined, /normalizeAutomationRulePayload/);
    assert.match(combined, /normalizeNotificationRulePayload/);
    assert.match(combined, /normalizeAutomationExecutionPayload/);
  });

  it("keeps Phase 9 report permission strings aligned with metadata naming", () => {
    const auth = source("lib/hrms/reports-authorization.ts");
    assert.match(auth, /permission\.payroll_reports\.view/);
    assert.match(auth, /permission\.performance\.reports\.view/);
    assert.match(auth, /permission\.lifecycle\.reports\.view/);
    assert.doesNotMatch(auth, /permission\.payroll\.reports\.view/);
    assert.doesNotMatch(auth, /permission\.performance_reports\.view/);
  });
});
