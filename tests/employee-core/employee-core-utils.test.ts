import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEmployeeDocumentStoragePath,
  isJoinedCandidate,
  normalizeEmployeePayload,
  stripEmployeeReadOnlyFields,
} from "../../lib/hrms/employee-core";

describe("Employee Core pure helpers", () => {
  it("detects joined candidates from final status or joining dates", () => {
    assert.equal(isJoinedCandidate({ final_status: "Joined" }), true);
    assert.equal(isJoinedCandidate({ final_status: " joined " }), true);
    assert.equal(isJoinedCandidate({ doj_actual: "2026-05-11" }), true);
    assert.equal(isJoinedCandidate({ doj: "2026-05-15" }), true);
    assert.equal(isJoinedCandidate({ final_status: "Offered" }), false);
    assert.equal(isJoinedCandidate({}), false);
  });

  it("normalizes employee payloads without inventing candidate status changes", () => {
    const payload = normalizeEmployeePayload({
      employee_code: " emp-001 ",
      name: "  Asha  Rao ",
      work_email: " ASHA@example.COM ",
      mobile: " 9999999999 ",
      employment_status: "",
      is_active: undefined,
      company_id: "",
      branch_id: "branch-1",
    });

    assert.deepEqual(payload, {
      employee_code: "emp-001",
      name: "Asha Rao",
      work_email: "asha@example.com",
      mobile: "9999999999",
      employment_status: "draft",
      branch_id: "branch-1",
      is_active: true,
    });
    assert.equal("final_status" in payload, false);
  });

  it("strips read-only employee fields from update payloads", () => {
    const payload = stripEmployeeReadOnlyFields({
      id: "employee-id",
      employee_code: "EMP-002",
      name: "Updated Name",
      created_at: "2026-05-11",
      created_by: "profile-id",
      updated_at: "2026-05-12",
      joined_candidate_id: "candidate-id",
    });

    assert.deepEqual(payload, {
      name: "Updated Name",
    });
  });

  it("builds sanitized private employee document storage paths", () => {
    assert.equal(
      buildEmployeeDocumentStoragePath("employee-1", "identity", "Passport Scan (Final).pdf", 1778483304000),
      "employee-1/identity/1778483304000-Passport_Scan_Final_.pdf",
    );
    assert.equal(
      buildEmployeeDocumentStoragePath("employee-1", "../tax docs", " Form 16 #1.pdf ", 1778483304000),
      "employee-1/tax_docs/1778483304000-Form_16_1.pdf",
    );
  });
});
