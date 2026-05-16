import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PAYROLL_PERMISSION_KEYS,
  canManagePayroll,
  canManageSalaryStructures,
  canRunPayroll,
  canUsePayrollSelfService,
  canViewPayroll,
  canViewPayrollRecord,
} from "@/lib/hrms/payroll-authorization";

const target = {
  employee_id: "employee-1",
  profile_id: "employee-profile",
  department_id: "department-1",
  reporting_manager_profile_id: "manager-profile",
};

describe("payroll authorization", () => {
  it("allows admin, HR manager, and payroll manager to manage payroll", () => {
    for (const role of ["admin", "hr_manager", "payroll_manager"]) {
      const profile = { id: `${role}-profile`, role, is_active: true };

      assert.equal(canManagePayroll(profile), true, `${role} should manage payroll`);
      assert.equal(canViewPayroll(profile), true, `${role} should view payroll`);
      assert.equal(canRunPayroll(profile), true, `${role} should run payroll`);
      assert.equal(canManageSalaryStructures(profile), true, `${role} should manage salary structures`);
    }
  });

  it("allows employees to view only their own payroll self-service records", () => {
    const employee = {
      id: "employee-profile",
      role: "employee",
      is_active: true,
    };

    assert.equal(canViewPayrollRecord(employee, target, "salary_slip"), true);
    assert.equal(canUsePayrollSelfService(employee, target, "salary_slip"), true);
    assert.equal(canViewPayrollRecord(employee, { ...target, profile_id: "other-profile" }, "salary_slip"), false);
    assert.equal(canManagePayroll(employee), false);
  });

  it("allows explicit payroll permissions without broad role access", () => {
    const hrUser = {
      id: "hr-user-profile",
      role: "hr_user",
      is_active: true,
      permissions: [PAYROLL_PERMISSION_KEYS.view, PAYROLL_PERMISSION_KEYS.salaryStructuresManage],
    };

    assert.equal(canViewPayroll(hrUser), true);
    assert.equal(canManageSalaryStructures(hrUser), true);
    assert.equal(canRunPayroll(hrUser), false);
    assert.equal(canManagePayroll(hrUser), false);
  });

  it("keeps tax and benefit self-service scoped to the employee owner", () => {
    const employee = {
      id: "employee-profile",
      role: "employee",
      is_active: true,
    };

    assert.equal(canUsePayrollSelfService(employee, target, "tax_declaration"), true);
    assert.equal(canUsePayrollSelfService(employee, target, "benefit_application"), true);
    assert.equal(canUsePayrollSelfService(employee, target, "benefit_claim"), true);
    assert.equal(canUsePayrollSelfService(employee, { ...target, profile_id: "other-profile" }, "benefit_claim"), false);
  });

  it("fails closed for inactive profiles and unrelated ATS roles", () => {
    assert.equal(canViewPayroll({ id: "payroll-profile", role: "payroll_manager", is_active: false }), false);
    assert.equal(canManagePayroll({ id: "recruiter-profile", role: "recruiter", is_active: true }), false);
    assert.equal(canViewPayrollRecord(null, target, "payroll_entry"), false);
    assert.equal(canUsePayrollSelfService({ id: "employee-profile", role: "employee", is_active: true }, null, "salary_slip"), false);
  });
});
