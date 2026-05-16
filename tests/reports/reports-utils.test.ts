import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HRMS_REPORT_CATALOG,
  normalizeDashboardWidgetPayload,
  normalizeReportFilters,
  normalizeReportRunPayload,
  resolveReportDefinition,
  stripReportReadOnlyFields,
  validateReportDateRange,
} from "@/lib/hrms/reports";
import {
  normalizeAutomationExecutionPayload,
  normalizeAutomationRulePayload,
  normalizeNotificationRulePayload,
  stripAutomationReadOnlyFields,
} from "@/lib/hrms/automation";

describe("reports and automation helper utilities", () => {
  it("defines the Phase 9 report catalog coverage", () => {
    const keys = HRMS_REPORT_CATALOG.map((report) => report.key);

    for (const key of [
      "report.hrms.employee_information",
      "report.hrms.employee_analytics",
      "report.hrms.monthly_attendance_sheet",
      "report.hrms.shift_attendance",
      "report.hrms.leave_balance",
      "report.hrms.leave_ledger",
      "report.hrms.employee_advance_summary",
      "report.hrms.unpaid_expense_claims",
      "report.hrms.salary_register",
      "report.hrms.bank_remittance",
      "report.hrms.recruitment_analytics",
      "report.hrms.employee_exits",
      "report.hrms.birthdays_anniversaries",
    ]) {
      assert.ok(keys.includes(key), `${key} should be in the Phase 9 report catalog`);
    }
  });

  it("normalizes report runs, filters, formats, and strips read-only fields", () => {
    const payload = normalizeReportRunPayload({
      id: "run-1",
      reportKey: "report.hrms.salary_register",
      format: "XLSX",
      status: "completed",
      parameters: {
        employee_id: " employee-1 ",
        date_from: "2026-05-01",
        ignored: "",
      },
      completed_at: "2026-05-15",
    });

    assert.deepEqual(payload, {
      report_key: "report.hrms.salary_register",
      report_title: "Salary register",
      category: "payroll",
      status: "queued",
      format: "xlsx",
      parameters: {
        employee_id: "employee-1",
        date_from: "2026-05-01",
      },
      filters: {
        employee_id: "employee-1",
        date_from: "2026-05-01",
      },
    });

    assert.equal(resolveReportDefinition("report.hrms.salary_register")?.category, "payroll");
    assert.deepEqual(normalizeReportFilters({ status: " submitted ", unexpected: "x" }), { status: "submitted" });
  });

  it("validates report date ranges without requiring optional dates", () => {
    assert.deepEqual(validateReportDateRange(null, null), { valid: true });
    assert.deepEqual(validateReportDateRange("2026-05-31", "2026-05-01"), {
      valid: false,
      reason: "Report date range end date cannot be before start date.",
    });
  });

  it("normalizes dashboard widgets and blocks read-only fields", () => {
    const payload = normalizeDashboardWidgetPayload({
      id: "widget-1",
      key: "open_leave",
      dashboard_key: "hrms",
      title: " Open   Leave ",
      category: "leave",
      report_key: "report.hrms.leave_ledger",
      status: "archived",
      sort_order: "2",
      refresh_interval_minutes: "15",
      created_by: "profile-1",
    });

    assert.deepEqual(payload, {
      dashboard_key: "hrms",
      widget_key: "open_leave",
      title: "Open Leave",
      category: "leave",
      metric_key: "report.hrms.leave_ledger",
      status: "draft",
      sort_order: 2,
      config: {},
      refresh_interval_minutes: 15,
    });
  });

  it("normalizes automation and notification rules without leaking ATS run state", () => {
    assert.deepEqual(normalizeAutomationRulePayload({
      rule_key: " Birthday Reminder ",
      title: " Birthday   Reminder ",
      category: "events",
      status: "failed",
      conditions: { days_ahead: 7 },
      actions: { notify: true },
      last_run_at: "2026-05-15",
    }), {
      key: "birthday_reminder",
      name: "Birthday Reminder",
      category: "events",
      status: "draft",
      is_active: false,
      conditions: { days_ahead: 7 },
      actions: { notify: true },
    });

    assert.equal(normalizeNotificationRulePayload({ key: "leave", name: "Leave", status: "active" }).is_active, true);
    assert.equal(normalizeAutomationExecutionPayload({ rule_key: "leave_accrual", status: "succeeded" }).status, "queued");
  });

  it("does not mutate source objects when stripping read-only fields", () => {
    const report = { id: "run-1", report_key: "report.hrms.employee_information", completed_at: "x" };
    const automation = { id: "rule-1", key: "leave_accrual", last_run_at: "x" };

    assert.deepEqual(stripReportReadOnlyFields(report), { report_key: "report.hrms.employee_information" });
    assert.deepEqual(stripAutomationReadOnlyFields(automation), { key: "leave_accrual" });
    assert.equal(report.id, "run-1");
    assert.equal(automation.id, "rule-1");
  });
});
