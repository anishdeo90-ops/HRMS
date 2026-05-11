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

describe("Attendance API route source contract", () => {
  it("adds check-in GET/POST with auth context, helper normalization, and append-only inserts", () => {
    const source = routeSource("app/api/hrms/attendance/check-ins/route.ts");

    assert.match(source, /createClient/);
    assert.match(source, /currentProfile/);
    assert.match(source, /canViewAttendance/);
    assert.match(source, /canCheckInAttendance/);
    assert.match(source, /normalizeCheckInPayload/);
    assert.match(source, /validateCheckInSequence/);
    assert.match(source, /\.from\("employee_check_ins"\)/);
    assert.match(source, /\.insert\(/);
    assert.doesNotMatch(source, /\.from\("employee_check_ins"\)[\s\S]*\.update\(/, "check-ins should remain append-intent");
    assert.doesNotMatch(source, /\.from\("employee_check_ins"\)[\s\S]*\.delete\(/, "check-ins should not delete raw events");
  });

  it("adds attendance day GET/PATCH without mutating employee records", () => {
    const source = routeSource("app/api/hrms/attendance/days/route.ts");

    assert.match(source, /export async function GET/);
    assert.match(source, /export async function PATCH/);
    assert.match(source, /canViewAttendance/);
    assert.match(source, /canManageAttendance/);
    assert.match(source, /ATTENDANCE_DAY_STATUSES/);
    assert.match(source, /\.from\("attendance_days"\)/);
    assert.doesNotMatch(source, /\.from\("employees"\)\s*[\r\n]+\s*\.update\(/, "attendance API should not mutate employee records");
  });

  it("adds correction request list/create with governed payload helpers", () => {
    const source = routeSource("app/api/hrms/attendance/corrections/route.ts");

    assert.match(source, /export async function GET/);
    assert.match(source, /export async function POST/);
    assert.match(source, /normalizeCorrectionRequestPayload/);
    assert.match(source, /approval_queue/);
    assert.match(source, /canApproveAttendanceCorrection/);
    assert.match(source, /canRequestAttendanceCorrection/);
    assert.match(source, /\.from\("attendance_days"\)[\s\S]*\.eq\("employee_id", target\.employee\.id\)[\s\S]*\.eq\("attendance_date", payload\.attendance_date\)/);
    assert.match(source, /\.from\("attendance_correction_requests"\)/);
    assert.match(source, /\.insert\(/);
    assert.doesNotMatch(source, /\.from\("employees"\)\s*[\r\n]+\s*\.update\(/, "correction API should not mutate employee records");
  });

  it("adds correction PATCH actions for approve, reject, cancel, and draft updates", () => {
    const source = routeSource("app/api/hrms/attendance/corrections/[id]/route.ts");

    for (const token of [
      "stripAttendanceReadOnlyFields",
      "canApproveAttendanceCorrection",
      "canManageAttendance",
      "canRequestAttendanceCorrection",
      "canViewAttendance",
      "approve",
      "reject",
      "cancel",
      "approved",
      "rejected",
      "cancelled",
      "decided_at",
    ]) {
      assert.match(source, new RegExp(token), `${token} should be represented in correction detail route`);
    }

    assert.match(source, /\.from\("attendance_correction_requests"\)/);
    assert.match(source, /const requesterCanEdit = canRequestAttendanceCorrection/);
    assert.match(source, /\.from\("attendance_days"\)[\s\S]*\.eq\("employee_id", nextEmployeeId\)[\s\S]*\.eq\("attendance_date", nextAttendanceDate\)/);
    assert.doesNotMatch(source, /\.from\("employee_check_ins"\)[\s\S]*\.update\(/, "corrections should not rewrite raw check-ins");
    assert.doesNotMatch(source, /\.from\("employees"\)\s*[\r\n]+\s*\.update\(/, "correction detail API should not mutate employee records");
  });

  it("uses admin client only after local auth/profile checks in attendance routes", () => {
    for (const path of [
      "app/api/hrms/attendance/check-ins/route.ts",
      "app/api/hrms/attendance/days/route.ts",
      "app/api/hrms/attendance/corrections/route.ts",
      "app/api/hrms/attendance/corrections/[id]/route.ts",
    ]) {
      const source = routeSource(path);
      const firstAdmin = source.indexOf("await createAdminClient");
      const firstAuth = source.indexOf("currentProfile");
      assert.notEqual(firstAdmin, -1, `${path} should use admin client for authorized joined reads`);
      assert.notEqual(firstAuth, -1, `${path} should resolve current profile`);
      assert.equal(firstAuth < firstAdmin, true, `${path} should define profile checks before admin use`);
    }
  });
});
