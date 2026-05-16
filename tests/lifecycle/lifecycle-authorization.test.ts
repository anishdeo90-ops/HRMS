import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIFECYCLE_PERMISSION_KEYS,
  canManageLifecycle,
  canManageLifecycleRecord,
  canManageTraining,
  canReviewTeamLifecycle,
  canUseLifecycleSelfService,
  canViewLifecycle,
  canViewLifecycleRecord,
  canViewTraining,
} from "@/lib/hrms/lifecycle-authorization";

const target = {
  employee_id: "employee-1",
  profile_id: "employee-profile",
  department_id: "department-1",
  reporting_manager_id: "manager-employee",
  reporting_manager_profile_id: "manager-profile",
  assigned_employee_id: "assignee-employee",
  assigned_profile_id: "assignee-profile",
  trainer_employee_id: "trainer-employee",
  trainer_profile_id: "trainer-profile",
};

describe("lifecycle authorization", () => {
  it("allows admin and HR manager to manage lifecycle records", () => {
    for (const role of ["admin", "hr_manager"]) {
      const profile = { id: `${role}-profile`, role, is_active: true };

      assert.equal(canManageLifecycle(profile), true, `${role} should manage lifecycle`);
      assert.equal(canViewLifecycle(profile), true, `${role} should view lifecycle`);
      assert.equal(canManageLifecycleRecord(profile, "onboarding_template"), true);
      assert.equal(canManageLifecycleRecord(profile, "grievance_type"), true);
    }
  });

  it("allows HOD and assigned reviewers to review their team only", () => {
    const hod = { id: "manager-profile", employee_id: "manager-employee", role: "hod", is_active: true };
    const assignee = { id: "assignee-profile", employee_id: "assignee-employee", role: "hr_user", is_active: true };

    assert.equal(canReviewTeamLifecycle(hod, target), true);
    assert.equal(canManageLifecycleRecord(hod, "daily_summary", target), true);
    assert.equal(canReviewTeamLifecycle(assignee, target), true);
    assert.equal(canReviewTeamLifecycle({ ...hod, id: "other-profile", employee_id: "other-employee" }, target), false);
  });

  it("allows employee self-service for own grievance, training feedback, and daily summaries", () => {
    const employee = { id: "employee-profile", employee_id: "employee-1", role: "employee", is_active: true };

    assert.equal(canUseLifecycleSelfService(employee, target, "grievance"), true);
    assert.equal(canManageLifecycleRecord(employee, "grievance", target), true);
    assert.equal(canManageLifecycleRecord(employee, "training_feedback", target), true);
    assert.equal(canViewLifecycleRecord(employee, { ...target, profile_id: "other-profile", employee_id: "other-employee" }, "grievance"), false);
  });

  it("allows explicit permissions without broad role access", () => {
    const profile = {
      id: "ops-profile",
      role: "recruiter",
      is_active: true,
      permissions: [LIFECYCLE_PERMISSION_KEYS.view, LIFECYCLE_PERMISSION_KEYS.trainingManage, LIFECYCLE_PERMISSION_KEYS.employmentChangesManage],
    };

    assert.equal(canViewLifecycle(profile), true);
    assert.equal(canManageLifecycle(profile), false);
    assert.equal(canManageTraining(profile), true);
    assert.equal(canViewTraining(profile), true);
    assert.equal(canManageLifecycleRecord(profile, "promotion", target), true);
    assert.equal(canManageLifecycleRecord(profile, "onboarding_template"), false);
  });

  it("fails closed for inactive profiles, unrelated roles, and missing targets", () => {
    assert.equal(canViewLifecycle({ id: "hr-profile", role: "hr_manager", is_active: false }), false);
    assert.equal(canManageLifecycle({ id: "payroll-profile", role: "payroll_manager", is_active: true }), false);
    assert.equal(canViewLifecycleRecord(null, target, "separation"), false);
    assert.equal(canUseLifecycleSelfService({ id: "employee-profile", role: "employee", is_active: true }, null, "grievance"), false);
  });
});
