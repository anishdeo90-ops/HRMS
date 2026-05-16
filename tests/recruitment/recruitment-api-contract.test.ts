import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const recruitmentRoutes = [
  "app/api/hrms/recruitment/route.ts",
  "app/api/hrms/recruitment/applicants/route.ts",
  "app/api/hrms/recruitment/jobs/route.ts",
  "app/api/hrms/recruitment/interviews/route.ts",
  "app/api/hrms/recruitment/offers/route.ts",
  "app/api/hrms/recruitment/appointments/route.ts",
  "app/api/hrms/recruitment/appointments/templates/route.ts",
  "app/api/hrms/recruitment/handoffs/route.ts",
] as const;

const readOnlyRoutes = [
  "app/api/hrms/recruitment/route.ts",
  "app/api/hrms/recruitment/applicants/route.ts",
  "app/api/hrms/recruitment/jobs/route.ts",
  "app/api/hrms/recruitment/interviews/route.ts",
  "app/api/hrms/recruitment/offers/route.ts",
] as const;

function source(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("recruitment API route source contract", () => {
  it("adds the Phase 10 HRMS recruitment API route group without moving ATS APIs", () => {
    for (const route of recruitmentRoutes) source(route);
    source("app/api/hrms/recruitment/_shared.ts");

    for (const route of [
      "app/api/candidates/route.ts",
      "app/api/jobs/route.ts",
      "app/api/hiring-requests/route.ts",
      "app/api/interviews/route.ts",
      "app/api/recruitment-forms/route.ts",
      "app/api/candidates/[id]/offers/route.ts",
    ]) {
      source(route);
    }
  });

  it("authenticates every recruitment route through the HRMS profile and local authorization helpers", () => {
    const shared = source("app/api/hrms/recruitment/_shared.ts");
    for (const route of recruitmentRoutes) {
      const text = source(route);
      const combined = `${text}\n${shared}`;
      assert.match(combined, /currentHrmsProfile/, `${route} should resolve authenticated HRMS profile`);
      assert.match(combined, /if \(!user\)/, `${route} should reject unauthenticated access`);
      assert.match(combined, /can(View|Manage|Create).*Recruitment|canManageAppointments/, `${route} should use recruitment authorization helpers`);
    }
  });

  it("keeps read-only HRMS recruitment wrappers free of ATS mutations", () => {
    for (const route of readOnlyRoutes) {
      const text = source(route);
      assert.doesNotMatch(text, /\.insert\s*\(/, `${route} should not insert`);
      assert.doesNotMatch(text, /\.update\s*\(/, `${route} should not update`);
      assert.doesNotMatch(text, /\.delete\s*\(/, `${route} should not delete`);
      assert.doesNotMatch(text, /\.upsert\s*\(/, `${route} should not upsert`);
    }
  });

  it("wraps expected ATS and HRMS recruitment tables with explicit relationship embeds", () => {
    const combined = recruitmentRoutes.map(source).join("\n") + source("app/api/hrms/recruitment/_shared.ts");
    for (const table of [
      "v_pipeline_funnel",
      "jobs",
      "job_recruiters",
      "interviews",
      "candidate_offers",
      "recruitment_appointment_letter_templates",
      "recruitment_appointment_letters",
      "recruitment_onboarding_handoffs",
      "employees",
    ]) {
      assert.match(combined, new RegExp(table), `${table} should be represented in Phase 10 APIs`);
    }

    assert.match(combined, /candidates!candidate_offers_candidate_id_fkey/);
    assert.match(combined, /candidates!recruitment_appointment_letters_candidate_id_fkey/);
    assert.match(combined, /candidates!recruitment_onboarding_handoffs_candidate_id_fkey/);
  });

  it("normalizes appointment and handoff payloads through Trisha helper modules", () => {
    const combined = recruitmentRoutes.map(source).join("\n");
    assert.match(combined, /normalizeAppointmentLetterPayload/);
    assert.match(combined, /normalizeAppointmentTemplatePayload/);
    assert.match(combined, /normalizeCandidateHandoffPayload/);
  });

  it("keeps candidate-to-employee handoff auditable and does not mutate ATS candidates", () => {
    const handoffs = source("app/api/hrms/recruitment/handoffs/route.ts");
    assert.match(handoffs, /isJoinedCandidate/);
    assert.match(handoffs, /joined_candidate_id/);
    assert.match(handoffs, /recruitment_onboarding_handoffs/);
    assert.doesNotMatch(handoffs, /\.from\("candidates"\)\.update\s*\(/);
    assert.doesNotMatch(handoffs, /\.from\("candidate_offers"\)\.update\s*\(/);
  });

  it("keeps recruitment permission strings aligned with metadata naming", () => {
    const auth = source("lib/hrms/recruitment-authorization.ts");
    for (const permission of [
      "permission.recruitment.view",
      "permission.recruitment.manage",
      "permission.recruitment.appointments.manage",
      "permission.recruitment.handoffs.manage",
      "permission.recruitment.reports.view",
    ]) {
      assert.match(auth, new RegExp(permission.replaceAll(".", "\\.")));
    }
    assert.doesNotMatch(auth, /permission\.recruiting\./);
  });
});
