import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PERFORMANCE_PERMISSION_KEYS,
  canManagePerformance,
  canManagePerformanceRecord,
  canReviewTeamPerformance,
  canUsePerformanceSelfService,
  canViewPerformance,
  canViewPerformanceRecord,
} from "@/lib/hrms/performance-authorization";

const target = {
  employee_id: "employee-1",
  profile_id: "employee-profile",
  department_id: "department-1",
  reporting_manager_id: "manager-employee",
  reporting_manager_profile_id: "manager-profile",
  reviewer_id: "reviewer-employee",
  reviewer_profile_id: "reviewer-profile",
};

describe("performance authorization", () => {
  it("allows admin and HR manager to manage performance", () => {
    for (const role of ["admin", "hr_manager"]) {
      const profile = { id: `${role}-profile`, role, is_active: true };

      assert.equal(canManagePerformance(profile), true, `${role} should manage performance`);
      assert.equal(canViewPerformance(profile), true, `${role} should view performance`);
      assert.equal(canManagePerformanceRecord(profile, "template"), true, `${role} should manage templates`);
    }
  });

  it("allows HOD and assigned reviewers to review their team only", () => {
    const hod = { id: "manager-profile", employee_id: "manager-employee", role: "hod", is_active: true };
    const reviewer = { id: "reviewer-profile", employee_id: "reviewer-employee", role: "hr_user", is_active: true };

    assert.equal(canReviewTeamPerformance(hod, target), true);
    assert.equal(canManagePerformanceRecord(hod, "goal", target), true);
    assert.equal(canReviewTeamPerformance(reviewer, target), true);
    assert.equal(canReviewTeamPerformance({ ...hod, id: "other-profile", employee_id: "other-employee" }, target), false);
  });

  it("allows employees to view only their own performance self-service records", () => {
    const employee = { id: "employee-profile", employee_id: "employee-1", role: "employee", is_active: true };

    assert.equal(canViewPerformanceRecord(employee, target, "goal"), true);
    assert.equal(canUsePerformanceSelfService(employee, target, "appraisal"), true);
    assert.equal(canViewPerformanceRecord(employee, { ...target, profile_id: "other-profile", employee_id: "other-employee" }, "goal"), false);
    assert.equal(canManagePerformance(employee), false);
  });

  it("allows explicit permissions without broad role access", () => {
    const profile = {
      id: "ops-profile",
      role: "recruiter",
      is_active: true,
      permissions: [PERFORMANCE_PERMISSION_KEYS.view, PERFORMANCE_PERMISSION_KEYS.goalsManage],
    };

    assert.equal(canViewPerformance(profile), true);
    assert.equal(canManagePerformance(profile), false);
    assert.equal(canManagePerformanceRecord(profile, "goal", target), true);
    assert.equal(canManagePerformanceRecord(profile, "template"), false);
  });

  it("fails closed for inactive profiles, unrelated roles, and missing targets", () => {
    assert.equal(canViewPerformance({ id: "hr-profile", role: "hr_manager", is_active: false }), false);
    assert.equal(canManagePerformance({ id: "payroll-profile", role: "payroll_manager", is_active: true }), false);
    assert.equal(canViewPerformanceRecord(null, target, "appraisal"), false);
    assert.equal(canUsePerformanceSelfService({ id: "employee-profile", role: "employee", is_active: true }, null, "goal"), false);
  });
});
