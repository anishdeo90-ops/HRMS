import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const payrollRoutes = [
  "app/api/hrms/payroll/periods/route.ts",
  "app/api/hrms/payroll/salary-components/route.ts",
  "app/api/hrms/payroll/salary-structures/route.ts",
  "app/api/hrms/payroll/salary-structure-assignments/route.ts",
  "app/api/hrms/payroll/runs/route.ts",
  "app/api/hrms/payroll/runs/[id]/route.ts",
  "app/api/hrms/payroll/salary-slips/route.ts",
  "app/api/hrms/payroll/tax-benefits/route.ts",
  "app/api/hrms/payroll/tax-slabs/route.ts",
  "app/api/hrms/payroll/tax-declarations/route.ts",
  "app/api/hrms/payroll/tax-declarations/[id]/route.ts",
  "app/api/hrms/payroll/benefit-applications/route.ts",
  "app/api/hrms/payroll/benefit-applications/[id]/route.ts",
  "app/api/hrms/payroll/benefit-claims/route.ts",
  "app/api/hrms/payroll/benefit-claims/[id]/route.ts",
] as const;

function readSource(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("payroll API route source contract", () => {
  it("adds the Phase 5 payroll route groups", () => {
    for (const route of payrollRoutes) readSource(route);
    readSource("app/api/hrms/payroll/_shared.ts");
    readSource("app/api/hrms/payroll/_tax-resources.ts");
  });

  it("authenticates every payroll route and checks local payroll authorization", () => {
    for (const route of payrollRoutes) {
      const source = readSource(route);
      const authSource = source.includes("PayrollTaxResource") ? `${source}\n${readSource("app/api/hrms/payroll/_tax-resources.ts")}` : source;
      assert.match(authSource, /currentHrmsProfile/, `${route} should resolve authenticated HRMS profile`);
      assert.match(authSource, /if \(!user\)/, `${route} should reject unauthenticated access`);
      assert.match(authSource, /can(Manage|Run|View).*Payroll|canViewPayrollRecord|PayrollTaxResource/, `${route} should use payroll authorization gates`);
      assert.doesNotMatch(source, /createAdminClient/, `${route} should not broad-read payroll through an admin client`);
    }
  });

  it("covers salary, run, slip, tax, benefit, and gratuity payroll tables", () => {
    const combined = payrollRoutes.map(readSource).join("\n");
    for (const table of [
      "salary_components",
      "salary_structures",
      "salary_structure_details",
      "salary_structure_assignments",
      "payroll_periods",
      "payroll_entries",
      "salary_slips",
      "salary_slip_lines",
      "income_tax_slabs",
      "employee_tax_exemption_declarations",
      "employee_benefit_applications",
      "employee_benefit_claims",
      "gratuity_rules",
    ]) {
      assert.match(combined, new RegExp(table), `${table} should be represented in payroll APIs`);
    }
  });

  it("uses explicit employee foreign keys for payroll embeds", () => {
    const expectedEmbeds = new Map([
      ["app/api/hrms/payroll/salary-structures/route.ts", /employee:employees!salary_structure_assignments_employee_id_fkey/],
      ["app/api/hrms/payroll/salary-structure-assignments/route.ts", /employee:employees!salary_structure_assignments_employee_id_fkey/],
      ["app/api/hrms/payroll/runs/route.ts", /employee:employees!payroll_entries_employee_id_fkey/],
      ["app/api/hrms/payroll/runs/[id]/route.ts", /employee:employees!payroll_entries_employee_id_fkey/],
      ["app/api/hrms/payroll/salary-slips/route.ts", /employee:employees!salary_slips_employee_id_fkey/],
      ["app/api/hrms/payroll/tax-benefits/route.ts", /employee:employees!employee_tax_exemption_declarations_employee_id_fkey/],
      ["app/api/hrms/payroll/tax-benefits/route.ts", /employee:employees!employee_benefit_applications_employee_id_fkey/],
      ["app/api/hrms/payroll/tax-benefits/route.ts", /employee:employees!employee_benefit_claims_employee_id_fkey/],
      ["app/api/hrms/payroll/_tax-resources.ts", /employee:employees!employee_tax_exemption_declarations_employee_id_fkey/],
      ["app/api/hrms/payroll/_tax-resources.ts", /employee:employees!employee_benefit_applications_employee_id_fkey/],
      ["app/api/hrms/payroll/_tax-resources.ts", /employee:employees!employee_benefit_claims_employee_id_fkey/],
    ]);

    for (const [route, pattern] of expectedEmbeds) {
      const source = readSource(route);
      assert.match(source, pattern, `${route} should qualify employees embeds by FK name`);
      assert.doesNotMatch(source, /employee:employees\(/, `${route} should not rely on ambiguous employees embeds`);
    }
  });

  it("normalizes create and update payloads through payroll API helpers", () => {
    const expected = new Map([
      ["app/api/hrms/payroll/salary-components/route.ts", /normalizeSalaryComponentPayload/],
      ["app/api/hrms/payroll/salary-structures/route.ts", /normalizeSalaryStructurePayload|normalizeSalaryStructureDetails/],
      ["app/api/hrms/payroll/salary-structure-assignments/route.ts", /normalizeSalaryStructureAssignmentPayload/],
      ["app/api/hrms/payroll/periods/route.ts", /normalizePayrollPeriodPayload/],
      ["app/api/hrms/payroll/runs/route.ts", /normalizePayrollPeriodPayload|normalizePayrollEntries/],
      ["app/api/hrms/payroll/runs/[id]/route.ts", /normalizePayrollEntryPayload/],
      ["app/api/hrms/payroll/salary-slips/route.ts", /normalizeSalarySlipPayload|normalizeSalarySlipLines/],
      ["app/api/hrms/payroll/tax-benefits/route.ts", /normalizeTaxDeclarationPayload|normalizeBenefitApplicationPayload|normalizeBenefitClaimPayload|normalizeTaxSlabPayload|normalizeGratuityRulePayload/],
      ["app/api/hrms/payroll/_tax-resources.ts", /normalizeTaxDeclarationPayload|normalizeBenefitApplicationPayload|normalizeBenefitClaimPayload|normalizeTaxSlabPayload/],
    ]);

    for (const [route, pattern] of expected) assert.match(readSource(route), pattern, `${route} should normalize payroll payloads`);
  });

  it("queries payroll periods with the live schema date columns", () => {
    const source = readSource("app/api/hrms/payroll/periods/route.ts");
    assert.match(source, /order\("start_date"/, "payroll periods should order by start_date");
    assert.match(source, /gte\("start_date"/, "payroll periods should filter from by start_date");
    assert.match(source, /lte\("end_date"/, "payroll periods should filter to by end_date");
    assert.doesNotMatch(source, /period_start|period_end/, "payroll periods API should not query non-existent period_start/period_end columns");
  });

  it("keeps employee self-service routes scoped before returning payroll records", () => {
    for (const route of [
      "app/api/hrms/payroll/salary-structures/route.ts",
      "app/api/hrms/payroll/salary-slips/route.ts",
      "app/api/hrms/payroll/tax-benefits/route.ts",
    ]) {
      const source = readSource(route);
      assert.match(source, /resolveLeaveTargetEmployee/, `${route} should resolve employee scope locally`);
      assert.match(source, /canViewPayrollRecord/, `${route} should check self-service payroll visibility`);
      assert.match(source, /targetFromPayrollRecord/, `${route} should filter returned employee payroll records`);
    }
  });

  it("supports controlled payroll run and salary slip status actions with metadata-aligned statuses", () => {
    const runs = readSource("app/api/hrms/payroll/runs/route.ts");
    const runDecision = readSource("app/api/hrms/payroll/runs/[id]/route.ts");
    const slips = readSource("app/api/hrms/payroll/salary-slips/route.ts");

    assert.match(runs, /payroll_entries/, "payroll runs should expose payroll entries");
    for (const token of ["submit", "process", "approve", "lock", "cancel"]) {
      assert.match(runDecision, new RegExp(token), `payroll runs should support ${token} action`);
    }
    for (const status of ["draft", "calculated", "approved", "paid", "cancelled"]) {
      assert.match(runDecision, new RegExp(status), `payroll runs should use ${status} workflow status`);
      assert.match(slips, new RegExp(status), `salary slips should use ${status} workflow status`);
    }
    assert.doesNotMatch(runDecision, /status:\s*"submitted"|status:\s*"locked"/, "payroll entries should not write stale submitted/locked statuses");
    assert.doesNotMatch(slips, /status:\s*"issued"|status:\s*"published"/, "salary slips should not write stale issued/published statuses");
  });
});
