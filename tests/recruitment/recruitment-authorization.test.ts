import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RECRUITMENT_PERMISSION_KEYS,
  canCreateCandidateHandoff,
  canManageAppointments,
  canManageRecruitment,
  canManageRecruitmentRecord,
  canReadAssignedRecruitment,
  canSubmitInterviewFeedback,
  canViewRecruitment,
  canViewRecruitmentRecord,
} from "@/lib/hrms/recruitment-authorization";

describe("recruitment authorization", () => {
  it("allows admin and HR manager to view and manage recruitment", () => {
    for (const role of ["admin", "hr_manager"]) {
      const profile = { id: `${role}-profile`, role, is_active: true };

      assert.equal(canViewRecruitment(profile), true);
      assert.equal(canManageRecruitment(profile), true);
      assert.equal(canManageAppointments(profile), true);
      assert.equal(canCreateCandidateHandoff(profile), true);
      assert.equal(canManageRecruitmentRecord(profile, "applicant"), true);
    }
  });

  it("preserves recruiter scoped access for owned or assigned records", () => {
    const profile = { id: "recruiter-1", role: "recruiter", is_active: true };
    const owned = { id: "candidate-1", hr_id: "recruiter-1", assigned_recruiter_ids: ["recruiter-2"] };
    const assigned = { id: "job-1", assigned_recruiter_ids: ["recruiter-1"] };
    const unrelated = { id: "candidate-2", hr_id: "recruiter-3" };

    assert.equal(canViewRecruitment(profile), true);
    assert.equal(canReadAssignedRecruitment(profile, owned), true);
    assert.equal(canReadAssignedRecruitment(profile, assigned), true);
    assert.equal(canViewRecruitmentRecord(profile, owned, "applicant"), true);
    assert.equal(canManageRecruitmentRecord(profile, "applicant", owned), true);
    assert.equal(canReadAssignedRecruitment(profile, unrelated), false);
    assert.equal(canManageRecruitmentRecord(profile, "applicant", unrelated), false);
    assert.equal(canManageAppointments(profile), false);
  });

  it("keeps HOD read-only for applicants and interviewer feedback scoped to assigned interviews", () => {
    const hod = { id: "hod-1", role: "hod", is_active: true };
    const interviewer = { id: "interviewer-1", role: "interviewer", is_active: true };

    assert.equal(canViewRecruitmentRecord(hod, { id: "candidate-1" }, "applicant"), true);
    assert.equal(canManageRecruitmentRecord(hod, "applicant", { id: "candidate-1" }), false);
    assert.equal(canSubmitInterviewFeedback(interviewer, { interviewer_id: "interviewer-1" }), true);
    assert.equal(canSubmitInterviewFeedback(interviewer, { interviewer_id: "interviewer-2" }), false);
  });

  it("supports narrow governed permission strings without broad role access", () => {
    const profile = {
      id: "specialist-1",
      role: "employee",
      is_active: true,
      permissions: [RECRUITMENT_PERMISSION_KEYS.appointmentsManage],
    };

    assert.equal(RECRUITMENT_PERMISSION_KEYS.view, "permission.recruitment.view");
    assert.equal(RECRUITMENT_PERMISSION_KEYS.handoffsManage, "permission.recruitment.handoffs.manage");
    assert.equal(canManageAppointments(profile), true);
    assert.equal(canManageRecruitment(profile), false);
    assert.equal(canCreateCandidateHandoff(profile), false);
  });

  it("fails closed for null, inactive, and candidate profiles", () => {
    assert.equal(canViewRecruitment(null), false);
    assert.equal(canViewRecruitment({ id: "admin-1", role: "admin", is_active: false }), false);
    assert.equal(canManageRecruitment({ id: "candidate-1", role: "candidate", is_active: true }), false);
    assert.equal(canCreateCandidateHandoff({ id: "recruiter-1", role: "recruiter", is_active: true }), false);
  });
});
