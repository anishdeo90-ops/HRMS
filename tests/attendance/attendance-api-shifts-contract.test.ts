import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function routeSource(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("Shift and overtime API route contract", () => {
  it("supports shift setup, assignment, and roster resources through a governed resource pattern", () => {
    const source = routeSource("app/api/hrms/shifts/route.ts");

    for (const resource of ["shift_types", "locations", "assignments", "roster"]) {
      assert.match(source, new RegExp(resource), `${resource} should be supported`);
    }

    for (const table of ["attendance_shift_types", "attendance_shift_locations", "employee_shift_assignments", "shift_roster_entries"]) {
      assert.match(source, new RegExp(table), `${table} should be used by the resource map`);
    }

    assert.match(source, /unsupported resource/i);
    assert.match(source, /canManageShifts/);
    assert.match(source, /normalizeShiftTypePayload|SHIFT_TYPE_FIELDS/);
    assert.match(source, /normalizeShiftAssignmentPayload|ASSIGNMENT_FIELDS/);
    assert.match(source, /normalizeRosterEntryPayload|ROSTER_FIELDS/);
    assert.match(source, /\.from\(table\)\.select\("\*"\)\.eq\("id", body\.id\)/);
    assert.match(source, /Roster date requires an active shift assignment/);
  });

  it("adds shift request list, submit, approve, reject, and cancel handling", () => {
    const listSource = routeSource("app/api/hrms/shifts/requests/route.ts");
    const detailSource = routeSource("app/api/hrms/shifts/requests/[id]/route.ts");
    const combined = `${listSource}\n${detailSource}`;

    assert.match(listSource, /shift_requests/);
    assert.match(listSource, /requested_shift_type_id/);
    assert.match(listSource, /status:\s*"submitted"/);
    assert.match(detailSource, /approve/);
    assert.match(detailSource, /reject/);
    assert.match(detailSource, /cancel/);
    assert.match(detailSource, /decided_at/);
    assert.match(combined, /canApproveShiftRequest/);
    assert.match(combined, /canManageShifts/);
    assert.doesNotMatch(listSource, /admin\.from\("shift_requests"\)/, "shift request lists should not use broad admin reads");
    assert.match(detailSource, /SHIFT_REQUEST_DETAIL_SELECT/);
    assert.match(detailSource, /(existing|record)\.status !== "submitted"/);
  });

  it("adds overtime submit and manager decision APIs without payroll behavior", () => {
    const listSource = routeSource("app/api/hrms/overtime/route.ts");
    const detailSource = routeSource("app/api/hrms/overtime/[id]/route.ts");
    const combined = `${listSource}\n${detailSource}`;

    assert.match(listSource, /overtime_records/);
    assert.match(listSource, /calculateOvertimeMinutes|overtime_minutes/);
    assert.match(listSource, /status:\s*"submitted"/);
    assert.match(detailSource, /approve/);
    assert.match(detailSource, /reject/);
    assert.match(detailSource, /cancel/);
    assert.match(detailSource, /decided_at/);
    assert.match(combined, /canApproveOvertime/);
    assert.match(combined, /permission\.overtime|canManageOvertime/);
    assert.doesNotMatch(listSource, /admin\.from\("overtime_records"\)/, "overtime lists should not use broad admin reads");
    assert.match(listSource, /\.from\("attendance_days"\)[\s\S]*\.eq\("employee_id", payload\.employee_id\)[\s\S]*\.eq\("attendance_date", payload\.overtime_date\)/);
    assert.match(detailSource, /OVERTIME_DETAIL_SELECT/);
    assert.match(detailSource, /(existing|record)\.status !== "submitted"/);
    assert.match(detailSource, /overtime_minutes must be positive/);
    assert.match(detailSource, /\.from\("attendance_days"\)[\s\S]*\.eq\("employee_id", record\.employee_id\)[\s\S]*\.eq\("attendance_date", nextOvertimeDate\)/);
    assert.doesNotMatch(combined, /payroll|salary|ctc|payslip|earning|deduction/i, "overtime APIs should remain attendance-only");
  });
});
