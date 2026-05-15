import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  canManageDepartmentApprovers,
  canManageEmployeeCore,
  canManageEmployeeDocuments,
  canManageOrganization,
  canUpdateEmployeeBasic,
  canViewEmployee,
} from "../../lib/hrms/authorization";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function routeSource(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("Employee Core authorization helpers", () => {
  it("keeps employee core management limited to HR and admin roles", () => {
    assert.equal(canManageEmployeeCore({ role: "admin" }), true);
    assert.equal(canManageEmployeeCore({ role: "hr_manager" }), true);
    assert.equal(canManageEmployeeCore({ role: "hr_user" }), false);
    assert.equal(canManageEmployeeCore({ role: "recruiter" }), false);
  });

  it("allows HR users to update basic employee records without granting document management to recruiters or HODs", () => {
    assert.equal(canUpdateEmployeeBasic({ role: "hr_user" }), true);
    assert.equal(canManageEmployeeDocuments({ role: "hr_user" }), true);
    assert.equal(canManageEmployeeDocuments({ role: "recruiter" }), false);
    assert.equal(canManageEmployeeDocuments({ role: "hod" }), false);
  });

  it("restricts employee self access to the employee row linked to that profile", () => {
    assert.equal(canViewEmployee({ role: "employee", id: "profile-1" }, { profile_id: "profile-1" }), true);
    assert.equal(canViewEmployee({ role: "employee", id: "profile-1" }, { profile_id: "profile-2" }), false);
    assert.equal(canViewEmployee({ role: "hr_manager", id: "profile-1" }, { profile_id: "profile-2" }), true);
  });

  it("maps organization and approver capabilities to SQL permission boundaries", () => {
    assert.equal(canManageOrganization({ role: "admin" }), true);
    assert.equal(canManageOrganization({ role: "hr_manager" }), true);
    assert.equal(canManageOrganization({ role: "hr_user" }), true);
    assert.equal(canManageOrganization({ role: "employee" }), false);
    assert.equal(canManageDepartmentApprovers({ role: "hr_manager" }), true);
    assert.equal(canManageDepartmentApprovers({ role: "hod" }), false);
  });
});

describe("Employee Core API route contract", () => {
  it("adds organization API support for governed organization resources", () => {
    const source = routeSource("app/api/hrms/organization/route.ts");
    for (const resource of ["companies", "branches", "departments", "grades", "employment_types", "department_approvers"]) {
      assert.match(source, new RegExp(resource), `${resource} should be supported`);
    }
    assert.match(source, /unsupported resource/i);
  });

  it("adds employee CRUD and joined-candidate conversion APIs without candidate status mutation", () => {
    const listRoute = routeSource("app/api/hrms/employees/route.ts");
    const detailRoute = routeSource("app/api/hrms/employees/[id]/route.ts");
    const conversionRoute = routeSource("app/api/hrms/employees/from-candidate/[candidateId]/route.ts");

    assert.match(listRoute, /normalizeEmployeePayload/);
    assert.match(detailRoute, /stripEmployeeReadOnlyFields/);
    assert.match(conversionRoute, /isJoinedCandidate/);
    assert.match(conversionRoute, /joined_candidate_id/);
    assert.doesNotMatch(conversionRoute, /\.from\("candidates"\)[\s\S]*\.update\(/, "conversion should not mutate candidates");
  });

  it("adds employee document API with private bucket, signed URLs, categories, and sanitized paths", () => {
    const source = routeSource("app/api/hrms/employees/[id]/documents/route.ts");
    assert.match(source, /EMPLOYEE_DOCUMENTS_BUCKET/);
    assert.match(source, /employee-documents/);
    assert.match(source, /createSignedUrl/);
    assert.match(source, /buildEmployeeDocumentStoragePath/);
    assert.match(source, /DOCUMENT_CATEGORIES/);
  });
});
