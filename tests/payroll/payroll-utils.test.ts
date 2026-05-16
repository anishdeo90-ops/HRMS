import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizePayrollEntryPayload,
  normalizePayrollPeriodPayload,
  normalizeBenefitApplicationPayload,
  normalizeBenefitClaimPayload,
  normalizeSalaryStructureDetails,
  normalizeSalaryStructurePayload,
  normalizeSalarySlipLines,
  normalizeSalarySlipPayload,
  normalizeTaxDeclarationPayload,
  stripPayrollReadOnlyFields,
  sumSalaryStructureDetails,
  validatePayrollPeriodDateRange,
} from "@/lib/hrms/payroll";

describe("payroll helper utilities", () => {
  it("normalizes salary structures, defaults status, and strips read-only fields", () => {
    const payload = normalizeSalaryStructurePayload({
      id: "structure-1",
      created_by: "profile-1",
      name: "  Standard   Payroll  ",
      description: "  monthly structure  ",
      status: "Submitted",
      is_default: true,
      approved_at: "2026-05-12",
    });

    assert.deepEqual(payload, {
      name: "Standard Payroll",
      description: "monthly structure",
      status: "draft",
      is_default: true,
    });
  });

  it("normalizes salary structure details and sums monthly amounts by category", () => {
    const details = normalizeSalaryStructureDetails([
      { salary_component_id: "basic", component_key: " basic ", component_type: "Earning", amount: "50000", sort_order: "2" },
      { salary_component_id: "pf", component_key: "pf", component_type: "deduction", amount: 1800, sort_order: 3 },
      { component_key: "ignored", component_type: "earning", amount: -1 },
    ]);

    assert.deepEqual(details, [
      { salary_component_id: "basic", component_key: "basic", component_type: "earning", amount: 50000, sort_order: 2 },
      { salary_component_id: "pf", component_key: "pf", component_type: "deduction", amount: 1800, sort_order: 3 },
    ]);
    assert.deepEqual(sumSalaryStructureDetails(details), {
      earnings: 50000,
      deductions: 1800,
      employer_contributions: 0,
      net: 48200,
    });
  });

  it("normalizes payroll periods and validates date ranges", () => {
    assert.deepEqual(validatePayrollPeriodDateRange("2026-05-31", "2026-05-01"), {
      valid: false,
      reason: "Payroll period end date cannot be before start date.",
    });

    const payload = normalizePayrollPeriodPayload({
      period_name: " May   2026 ",
      period_start: "2026-05-01",
      period_end: "2026-05-31",
      payment_date: "2026-06-05",
      status: "PAID",
      closed_at: "2026-06-10",
    });

    assert.deepEqual(payload, {
      start_date: "2026-05-01",
      end_date: "2026-05-31",
      status: "draft",
    });
  });

  it("normalizes payroll entries and blocks caller-controlled decision fields", () => {
    const payload = normalizePayrollEntryPayload({
      payroll_period_id: "period-1",
      employee_id: "employee-1",
      gross_pay: "60000.50",
      total_deductions: "5000.25",
      net_pay: "55000.25",
      status: "approved",
      approved_by: "profile-1",
      paid_at: "2026-06-05",
    });

    assert.deepEqual(payload, {
      payroll_period_id: "period-1",
      employee_id: "employee-1",
      gross_pay: 60000.5,
      total_deductions: 5000.25,
      net_pay: 55000.25,
      status: "draft",
    });
  });

  it("normalizes employee self-service payroll payloads and blocks decision states", () => {
    assert.deepEqual(normalizeSalarySlipPayload({
      payroll_entry_id: "entry-1",
      employee_id: "employee-1",
      gross_pay: "80000",
      total_deductions: "5000",
      net_pay: "75000",
      status: "paid",
      paid_at: "2026-06-05",
    }), {
      payroll_entry_id: "entry-1",
      employee_id: "employee-1",
      gross_pay: 80000,
      total_deductions: 5000,
      net_pay: 75000,
      status: "draft",
    });

    assert.deepEqual(normalizeSalarySlipLines([
      { salary_component_key: "basic", amount: "50000", line_type: "earning", display_order: "1", id: "readonly" },
    ]), [
      { salary_component_key: "basic", amount: 50000, line_type: "earning", display_order: 1 },
    ]);

    assert.equal(normalizeTaxDeclarationPayload({ declared_amount: "15000", status: "approved" }).status, "draft");
    assert.equal(normalizeBenefitApplicationPayload({ benefit_key: "meal_card", requested_amount: "2200", status: "approved" }).status, "draft");
    assert.equal(normalizeBenefitClaimPayload({ benefit_key: "meal_card", claim_amount: "1200", status: "paid" }).status, "draft");
  });

  it("strips read-only fields without mutating the source object", () => {
    const input = { id: "x", employee_id: "employee-1", paid_at: "2026-06-05" };
    const output = stripPayrollReadOnlyFields(input);

    assert.deepEqual(output, { employee_id: "employee-1" });
    assert.equal(input.id, "x");
  });
});
