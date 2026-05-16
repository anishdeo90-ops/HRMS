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

describe("Time route access", () => {
  it("uses generated route keys for the Time navigation routes", () => {
    assert.equal(TIME_ROUTE_ACCESS.attendance.key, "route.time.attendance");
    assert.equal(TIME_ROUTE_ACCESS.shifts.key, "route.time.shifts");
    assert.equal(TIME_ROUTE_ACCESS.approvals.key, "route.time.approvals");
  });

  it("allows employee self-service access without approval navigation", () => {
    const routes = getVisibleTimeRoutes({ role: "employee" });
    assert.deepEqual(routes.map((route) => route.key), ["route.time.attendance", "route.time.shifts"]);
  });

  it("allows HR roles to see all Time routes", () => {
    for (const role of ["admin", "hr_manager"]) {
      const routes = getVisibleTimeRoutes({ role });
      assert.deepEqual(routes.map((route) => route.key), [
        "route.time.attendance",
        "route.time.shifts",
        "route.time.approvals",
      ]);
    }

    assert.deepEqual(getVisibleTimeRoutes({ role: "hr_user" }).map((route) => route.key), [
      "route.time.attendance",
      "route.time.shifts",
    ]);
  });

  it("allows HOD to reach approval work without People navigation changes", () => {
    assert.deepEqual(getVisibleTimeRoutes({ role: "hod" }).map((route) => route.key), [
      "route.time.attendance",
      "route.time.shifts",
      "route.time.approvals",
    ]);
  });

  it("does not broaden ATS-only or inactive user Time navigation", () => {
    assert.deepEqual(getVisibleTimeRoutes({ role: "recruiter" }), []);
    assert.deepEqual(getVisibleTimeRoutes({ role: "candidate" }), []);
    assert.deepEqual(getVisibleTimeRoutes({ role: "interviewer" }), []);
    assert.deepEqual(getVisibleTimeRoutes({ role: "payroll_manager" }), []);
    assert.deepEqual(getVisibleTimeRoutes({ role: "employee", is_active: false }), []);
  });

  it("adds Time to the sidebar while preserving existing ATS and People navigation hooks", () => {
    const sidebar = source("components/sidebar.tsx");
    const navConfig = source("lib/nav/config.ts");
    const routeAccess = source("lib/hrms/route-access.ts");

    for (const href of ["/dashboard", "/my-activity", "/candidates", "/jobs", "/hod-portal", "/jds", "/settings"]) {
      const target = href === "/settings" ? sidebar : navConfig;
      assert.match(target, new RegExp(href.replaceAll("/", "\\/")), `${href} should remain in navigation`);
    }
    for (const href of ["/time/attendance", "/time/shifts", "/time/approvals"]) {
      assert.match(routeAccess, new RegExp(href.replaceAll("/", "\\/")), `${href} should be available through Time routes`);
    }

    assert.match(sidebar, /getNavForRole\(profile\.role\)/);
    assert.match(sidebar, /getSectionsForRole\(profile\.role\)/);
    assert.match(navConfig, /label: "Time"/);
  });

  it("matches Time route metadata labels, roles, and sidebar settings", () => {
    const routesYaml = source("metadata/routes.yaml");
    const routeAccess = source("lib/hrms/route-access.ts");

    for (const key of ["route.time.attendance", "route.time.shifts", "route.time.approvals"]) {
      assert.match(routesYaml, new RegExp(`key: ${key}[\\s\\S]*section: time`), `${key} should be registered in the Time section`);
      assert.match(routeAccess, new RegExp(`key: "${key}"`), `${key} should be exposed by route access`);
    }

    assert.match(routesYaml, /key: route\.time\.approvals[\s\S]*label: Time Approvals/);
    assert.match(routeAccess, /label: "Time Approvals"/);
    assert.match(routesYaml, /key: route\.time\.approvals[\s\S]*roles: \[role\.admin, role\.hr_manager, role\.hod\]/);
    assert.doesNotMatch(routesYaml, /key: route\.time\.approvals[\s\S]*role\.hr_user[\s\S]*permissions: \[permission\.attendance\.corrections\.approve/);
  });

  it("covers required Time UI surfaces and HR-only shift setup controls", () => {
    const attendancePage = source("app/(app)/time/attendance/page.tsx");
    const shiftsPage = source("app/(app)/time/shifts/page.tsx");
    const approvalsPage = source("app/(app)/time/approvals/page.tsx");

    for (const token of ["Current status", "Today&apos;s check-ins", "Attendance days", "Correction request", "Department ID"]) {
      assert.match(attendancePage, new RegExp(token), `attendance page should include ${token}`);
    }
    for (const token of ["Shift Types", "Roster Entries", "Shift Requests", "Overtime", "canManageShiftSetup"]) {
      assert.match(shiftsPage, new RegExp(token), `shifts page should include ${token}`);
    }
    assert.match(shiftsPage, /isResource && canManageShiftSetup &&/);
    for (const token of ["Attendance Corrections", "Shift Requests", "Overtime", "approve", "reject"]) {
      assert.match(approvalsPage, new RegExp(token), `approvals page should include ${token}`);
    }
  });
});
