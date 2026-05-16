import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXPENSE_PERMISSION_KEYS,
  canApproveExpenseRecord,
  canCreateExpenseRecord,
  canManageExpenses,
  canViewExpenseRecord,
} from "@/lib/hrms/expense-authorization";

const target = {
  employee_id: "employee-1",
  profile_id: "employee-profile",
  department_id: "department-1",
  reporting_manager_profile_id: "manager-profile",
};

describe("expense authorization", () => {
  it("allows employees to create and view their own finance records", () => {
    const employee = {
      id: "employee-profile",
      role: "employee",
      is_active: true,
      permissions: [EXPENSE_PERMISSION_KEYS.viewSelf],
    };

    assert.equal(canCreateExpenseRecord(employee, target), true);
    assert.equal(canViewExpenseRecord(employee, target), true);
    assert.equal(canApproveExpenseRecord(employee, target, "expense_claim"), false);
  });

  it("allows reporting managers with team permission to view and approve direct reports", () => {
    const manager = {
      id: "manager-profile",
      employee_id: "manager-employee",
      role: "hod",
      is_active: true,
      permissions: [EXPENSE_PERMISSION_KEYS.viewTeam, EXPENSE_PERMISSION_KEYS.approve],
    };

    assert.equal(canViewExpenseRecord(manager, target), true);
    assert.equal(canApproveExpenseRecord(manager, target, "expense_claim"), true);
    assert.equal(canViewExpenseRecord(manager, { ...target, reporting_manager_profile_id: null, reporting_manager_id: "manager-employee" }), true);
  });

  it("allows department approvers only inside their scoped department and record family", () => {
    const approver = {
      id: "approver-profile",
      role: "expense_approver",
      is_active: true,
      department_approvals: [{ department_id: "department-1", approval_scope: "expense_claim" }],
    };

    assert.equal(canApproveExpenseRecord(approver, target, "expense_claim"), true);
    assert.equal(canApproveExpenseRecord(approver, target, "travel_request"), false);
  });

  it("allows HR, finance, and admin management access", () => {
    for (const role of ["admin", "hr_manager", "finance_manager"]) {
      const profile = { id: `${role}-profile`, role, is_active: true };

      assert.equal(canManageExpenses(profile), true, `${role} should manage expenses`);
      assert.equal(canViewExpenseRecord(profile, target), true, `${role} should view expenses`);
      assert.equal(canApproveExpenseRecord(profile, target, "employee_advance"), true, `${role} should approve advances`);
    }
  });

  it("fails closed for inactive profiles and unrelated recruiters", () => {
    assert.equal(canViewExpenseRecord({ id: "employee-profile", role: "employee", is_active: false }, target), false);
    assert.equal(canManageExpenses({ id: "recruiter-profile", role: "recruiter", is_active: true }), false);
    assert.equal(canApproveExpenseRecord(null, target, "expense_claim"), false);
  });
});
