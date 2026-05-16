import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveReportDefinition } from "@/lib/hrms/reports";
import {
  REPORTS_PERMISSION_KEYS,
  canManageAutomation,
  canManageDashboards,
  canManageReports,
  canRunReport,
  canViewAutomation,
  canViewDashboards,
  canViewFinanceReports,
  canViewPayrollReports,
  canViewReport,
  canViewReports,
} from "@/lib/hrms/reports-authorization";

const salaryRegister = resolveReportDefinition("report.hrms.salary_register");
const employeeInfo = resolveReportDefinition("report.hrms.employee_information");
const unpaidClaims = resolveReportDefinition("report.hrms.unpaid_expense_claims");

describe("reports authorization", () => {
  it("allows admin and HR manager to manage reports, dashboards, and automation", () => {
    for (const role of ["admin", "hr_manager"]) {
      const profile = { id: `${role}-profile`, role, is_active: true };

      assert.equal(canManageReports(profile), true);
      assert.equal(canViewReports(profile), true);
      assert.equal(canViewReport(profile, employeeInfo), true);
      assert.equal(canViewDashboards(profile), true);
      assert.equal(canManageDashboards(profile), true);
      assert.equal(canViewAutomation(profile), true);
      assert.equal(canManageAutomation(profile), true);
    }
  });

  it("keeps payroll manager limited to payroll and finance-safe reports", () => {
    const payroll = { id: "payroll-profile", role: "payroll_manager", is_active: true };

    assert.equal(canViewReports(payroll), true);
    assert.equal(canViewPayrollReports(payroll), true);
    assert.equal(canViewFinanceReports(payroll), true);
    assert.equal(canRunReport(payroll, salaryRegister), true);
    assert.equal(canRunReport(payroll, unpaidClaims), true);
    assert.equal(canRunReport(payroll, employeeInfo), false);
    assert.equal(canViewDashboards(payroll), true);
    assert.equal(canManageAutomation(payroll), false);
  });

  it("allows explicit governed report permissions without broad role access", () => {
    const profile = {
      id: "specialist-profile",
      role: "hr_user",
      is_active: true,
      permissions: [REPORTS_PERMISSION_KEYS.payrollReportsView],
    };

    assert.equal(REPORTS_PERMISSION_KEYS.payrollReportsView, "permission.payroll_reports.view");
    assert.equal(REPORTS_PERMISSION_KEYS.performanceReportsView, "permission.performance.reports.view");
    assert.equal(canViewPayrollReports(profile), true);
    assert.equal(canRunReport(profile, salaryRegister), true);
    assert.equal(canManageReports(profile), false);
    assert.equal(canRunReport(profile, employeeInfo), false);
  });

  it("fails closed for inactive profiles, employees, and unrelated ATS roles", () => {
    assert.equal(canViewReports(null), false);
    assert.equal(canViewReports({ id: "admin-profile", role: "admin", is_active: false }), false);
    assert.equal(canViewReports({ id: "employee-profile", role: "employee", is_active: true }), false);
    assert.equal(canViewReports({ id: "recruiter-profile", role: "recruiter", is_active: true }), false);
    assert.equal(canRunReport({ id: "payroll-profile", role: "payroll_manager", is_active: false }, salaryRegister), false);
  });
});
