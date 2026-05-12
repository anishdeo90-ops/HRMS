import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { TIME_ROUTE_ACCESS, getVisibleTimeRoutes } from "../../lib/hrms/route-access";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("Leave UI route contract", () => {
  it("uses the generated leave route key", () => {
    assert.equal(TIME_ROUTE_ACCESS.leave.key, "route.time.leave");
    assert.equal(TIME_ROUTE_ACCESS.leave.href, "/time/leave");
  });

  it("keeps employee Time self-service separate from approval navigation", () => {
    assert.deepEqual(getVisibleTimeRoutes({ role: "employee" }).map((route) => route.key), [
      "route.time.attendance",
      "route.time.shifts",
      "route.time.leave",
    ]);
  });

  it("allows leave approvers to see leave and approvals only", () => {
    assert.deepEqual(getVisibleTimeRoutes({ role: "leave_approver" }).map((route) => route.key), [
      "route.time.leave",
      "route.time.approvals",
    ]);
  });

  it("does not expose leave to unrelated or inactive roles", () => {
    for (const role of ["recruiter", "candidate", "interviewer", "payroll_manager"]) {
      assert.equal(getVisibleTimeRoutes({ role }).some((route) => route.href === "/time/leave"), false);
    }
    assert.equal(getVisibleTimeRoutes({ role: "employee", is_active: false }).some((route) => route.href === "/time/leave"), false);
  });

  it("preserves ATS links and places Leave under Time with an icon mapping", () => {
    const sidebar = source("components/sidebar.tsx");
    for (const href of ["/dashboard", "/my-activity", "/candidates", "/jobs", "/hod-portal", "/jds", "/settings"]) {
      assert.match(sidebar, new RegExp(href.replaceAll("/", "\\/")), `${href} should remain in sidebar`);
    }
    assert.match(sidebar, /TIME_ROUTE_ICONS/);
    assert.match(sidebar, /"\/time\/leave": PlaneTakeoff/);
    assert.match(sidebar, />Time</);
  });

  it("guards direct leave route access through /api/me and getVisibleTimeRoutes", () => {
    const page = source("app/(app)/time/leave/page.tsx");
    assert.match(page, /fetch\("\/api\/me"\)/);
    assert.match(page, /getVisibleTimeRoutes/);
    assert.match(page, /route\.href === "\/time\/leave"/);
  });

  it("covers leave surfaces in the Leave page", () => {
    const page = source("app/(app)/time/leave/page.tsx");
    for (const token of ["Balances", "Applications", "Setup", "Ledger", "Comp Off", "Encashments"]) {
      assert.match(page, new RegExp(token), `leave page should include ${token}`);
    }
    for (const api of [
      "/api/hrms/leave/setup",
      "/api/hrms/leave/balances",
      "/api/hrms/leave/applications",
      "/api/hrms/leave/ledger",
      "/api/hrms/leave/compensatory",
      "/api/hrms/leave/encashments",
    ]) {
      assert.match(page, new RegExp(api.replaceAll("/", "\\/")), `${api} should be used`);
    }
  });

  it("adds leave approval queues without removing attendance, shift, or overtime queues", () => {
    const approvalsPage = source("app/(app)/time/approvals/page.tsx");
    for (const token of ["Attendance Corrections", "Shift Requests", "Overtime", "Leave Applications", "Compensatory Leave", "Encashments"]) {
      assert.match(approvalsPage, new RegExp(token), `approvals page should include ${token}`);
    }
    assert.match(approvalsPage, /LEAVE_ONLY_ROLES/);
    assert.match(approvalsPage, /\/api\/hrms\/leave\/approvals/);
  });
});
