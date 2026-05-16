import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HRMS_RECRUITMENT_CONCEPTS,
  isJoinedRecruitmentCandidate,
  mapOfferStatusToAppointmentStatus,
  normalizeAppointmentLetterPayload,
  normalizeAppointmentTemplatePayload,
  normalizeCandidateHandoffPayload,
  normalizeRecruitmentFilters,
  recruitmentStageFromAtsStatus,
  stripRecruitmentReadOnlyFields,
  validateRecruitmentDateRange,
} from "@/lib/hrms/recruitment";

describe("recruitment helper utilities", () => {
  it("maps existing ATS concepts to HRMS recruitment terminology without renaming ATS tables", () => {
    const concepts = Object.fromEntries(HRMS_RECRUITMENT_CONCEPTS.map((concept) => [concept.key, concept]));

    assert.equal(concepts.job_requisition.atsTable, "jobs");
    assert.equal(concepts.job_applicant.atsTable, "candidates");
    assert.equal(concepts.interview.atsTable, "interviews");
    assert.equal(concepts.job_offer.atsTable, "candidate_offers");
    assert.equal(concepts.appointment_letter.atsTable, "recruitment_appointment_letters");
    assert.equal(concepts.candidate_employee_handoff.atsTable, "recruitment_onboarding_handoffs");
  });

  it("strips audit, soft-delete, and action-controlled fields without mutating source objects", () => {
    const source = {
      id: "letter-1",
      candidate_id: "candidate-1",
      is_deleted: true,
      sent_at: "2026-05-15",
      accepted_at: "2026-05-16",
      created_by: "profile-1",
    };

    assert.deepEqual(stripRecruitmentReadOnlyFields(source), { candidate_id: "candidate-1" });
    assert.equal(source.id, "letter-1");
  });

  it("normalizes appointment templates and blocks archived caller status", () => {
    assert.deepEqual(normalizeAppointmentTemplatePayload({
      key: " Senior Appointment ",
      template_name: " Senior   Appointment ",
      html: "<p>Hello</p>",
      variables: [" name ", ""],
      status: "archived",
      created_at: "2026-05-15",
    }), {
      template_key: "senior_appointment",
      name: "Senior Appointment",
      body_html: "<p>Hello</p>",
      status: "draft",
      variables: ["name"],
      is_active: false,
    });
  });

  it("normalizes appointment letters and handoffs while blocking decision statuses", () => {
    assert.deepEqual(normalizeAppointmentLetterPayload({
      candidate_id: "candidate-1",
      offer_id: "offer-1",
      appointment_date: "2026-05-15",
      status: "accepted",
      ctc_data: { annual: 1200000 },
      sent_by: "profile-1",
    }), {
      candidate_id: "candidate-1",
      candidate_offer_id: "offer-1",
      status: "draft",
      issue_date: "2026-05-15",
      compensation_snapshot: { annual: 1200000 },
      metadata: {},
    });

    assert.deepEqual(normalizeCandidateHandoffPayload({
      candidate_id: "candidate-1",
      offer_id: "offer-1",
      joining_date: "2026-06-01",
      notes: " Ready ",
      status: "completed",
    }), {
      candidate_id: "candidate-1",
      candidate_offer_id: "offer-1",
      status: "draft",
      requested_joining_date: "2026-06-01",
      handoff_notes: "Ready",
      metadata: {},
    });
  });

  it("maps ATS statuses and joined candidate signals for HRMS views", () => {
    assert.equal(recruitmentStageFromAtsStatus("Appointed/Offered"), "offer");
    assert.equal(recruitmentStageFromAtsStatus("PI Done"), "interview");
    assert.equal(recruitmentStageFromAtsStatus("Rejected/Dropped"), "closed_unsuccessful");
    assert.equal(mapOfferStatusToAppointmentStatus("offer_confirmed"), "accepted");
    assert.equal(isJoinedRecruitmentCandidate({ final_status: "Joined" }), true);
    assert.equal(isJoinedRecruitmentCandidate({ doj_actual: "2026-06-01" }), true);
    assert.equal(isJoinedRecruitmentCandidate({ final_status: "Offered" }), false);
  });

  it("normalizes filters and validates optional date ranges", () => {
    assert.deepEqual(normalizeRecruitmentFilters({ candidate_id: " candidate-1 ", ignored: "x", status: "" }), {
      candidate_id: "candidate-1",
    });
    assert.deepEqual(validateRecruitmentDateRange(null, null), { valid: true });
    assert.deepEqual(validateRecruitmentDateRange("2026-05-31", "2026-05-01"), {
      valid: false,
      reason: "Recruitment date range end date cannot be before start date.",
    });
  });
});
