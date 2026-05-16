import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { NAV_CONFIG, NavSection, getNavForRole } from "../../lib/nav/config";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

const recruitmentRoutes = ["/recruitment", "/recruitment/appointments"] as const;
const recruitmentPages = ["app/(app)/recruitment/page.tsx", "app/(app)/recruitment/appointments/page.tsx"] as const;

describe("Phase 10 recruitment UI contract", () => {
  it("adds only the Phase 10 HRMS recruitment entries to existing Recruiting nav", () => {
    const recruitingItems = NAV_CONFIG.filter((item) => item.section === NavSection.RECRUITING);

    assert.deepEqual(recruitingItems.map((item) => item.href), [
      "/candidates",
      "/jobs",
      "/hod-portal",
      "/jds",
      "/recruitment",
      "/recruitment/appointments",
      "/interviews",
    ]);

    for (const href of ["/candidates", "/jobs", "/hod-portal", "/jds", ...recruitmentRoutes]) {
      assert.equal(NAV_CONFIG.find((item) => item.href === href)?.enabled, true, `${href} should stay enabled`);
    }
    assert.equal(NAV_CONFIG.find((item) => item.href === "/interviews")?.enabled, false);
  });

  it("preserves ATS recruiting labels and scopes HRMS recruitment routes to recruiting roles", () => {
    assert.deepEqual(
      NAV_CONFIG.filter((item) => ["/candidates", "/jobs", "/hod-portal", "/jds"].includes(item.href)).map((item) => item.label),
      ["Candidates", "Jobs", "HOD Portal", "JDs & Forms"],
    );

    for (const role of ["admin", "hr_manager", "hr_user", "recruiter"] as const) {
      assert.deepEqual(
        getNavForRole(role)
          .filter((item) => recruitmentRoutes.includes(item.href as (typeof recruitmentRoutes)[number]))
          .map((item) => item.href),
        [...recruitmentRoutes],
      );
    }

    assert.deepEqual(
      getNavForRole("hod").filter((item) => item.section === NavSection.RECRUITING).map((item) => item.href),
      ["/jobs", "/hod-portal"],
    );

    for (const role of ["employee", "payroll_manager", "finance_manager", "leave_approver", "expense_approver", "interviewer"] as const) {
      assert.equal(
        getNavForRole(role).some((item) => recruitmentRoutes.includes(item.href as (typeof recruitmentRoutes)[number])),
        false,
        `${role} should not gain broad recruitment access`,
      );
    }
  });

  it("creates guarded recruitment pages through centralized nav visibility", () => {
    for (const path of recruitmentPages) {
      const page = source(path);
      assert.match(page, /fetch\("\/api\/me"\)/, `${path} should check the current profile`);
      assert.match(page, /getNavForRole/, `${path} should use centralized nav visibility`);
      assert.match(page, /router\.replace\("\/dashboard"\)/, `${path} should fail closed to dashboard`);
    }
  });

  it("uses only the planned Phase 10 recruitment HRMS endpoints from UI", () => {
    const overview = source("app/(app)/recruitment/page.tsx");
    const appointments = source("app/(app)/recruitment/appointments/page.tsx");

    assert.match(overview, /\/api\/hrms\/recruitment/);
    assert.match(overview, /\/api\/hrms\/recruitment\/handoffs/);
    assert.match(appointments, /\/api\/hrms\/recruitment\/appointments/);
  });

  it("keeps required HRMS terminology, ATS links, and empty states visible", () => {
    const overview = source("app/(app)/recruitment/page.tsx");
    const appointments = source("app/(app)/recruitment/appointments/page.tsx");

    for (const label of [
      "Openings / Jobs",
      "Applicants / Candidates",
      "Interviews / Feedback",
      "Offers / Appointment Letters",
      "Candidate-to-employee handoffs",
      "Existing ATS workspaces",
      "/jobs",
      "/candidates",
      "/hod-portal",
      "/jds",
      "No recruitment activity found",
      "No onboarding handoffs found",
    ]) {
      assert.match(overview, new RegExp(label.replaceAll("/", "\\/")));
    }

    for (const label of [
      "Appointment Letters",
      "Appointment letter templates",
      "Issued appointment-letter status",
      "Candidate offer",
      "No appointment letter templates found",
      "No issued appointment letters found",
    ]) {
      assert.match(appointments, new RegExp(label.replaceAll("/", "\\/")));
    }
  });

  it("does not import out-of-lane helpers, generated artifacts, metadata, migrations, or APIs", () => {
    const combined = recruitmentPages.map(source).join("\n");

    assert.doesNotMatch(combined, /@\/lib\/hrms\/recruitment/);
    assert.doesNotMatch(combined, /@\/lib\/generated/);
    assert.doesNotMatch(combined, /metadata\//);
    assert.doesNotMatch(combined, /supabase\/migrations/);
    assert.doesNotMatch(combined, /app\/api/);
  });
});
