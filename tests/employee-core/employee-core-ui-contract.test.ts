import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { PEOPLE_ROUTE_ACCESS, getVisiblePeopleRoutes } from "../../lib/hrms/route-access";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("People route access", () => {
  it("allows admin and HR roles to see People routes", () => {
    for (const role of ["admin", "hr_manager", "hr_user"]) {
      const routes = getVisiblePeopleRoutes({ role });
      assert.deepEqual(routes.map((route) => route.key), ["route.people.employees", "route.people.organization"]);
    }
  });

  it("does not broaden recruiter or HOD navigation", () => {
    assert.deepEqual(getVisiblePeopleRoutes({ role: "recruiter" }), []);
    assert.deepEqual(getVisiblePeopleRoutes({ role: "hod" }), []);
  });

  it("uses generated route keys and keeps existing ATS nav entries intact", () => {
    assert.equal(PEOPLE_ROUTE_ACCESS.employees.key, "route.people.employees");
    assert.equal(PEOPLE_ROUTE_ACCESS.organization.key, "route.people.organization");

    const sidebar = source("components/sidebar.tsx");
    const navConfig = source("lib/nav/config.ts");
    for (const href of ["/dashboard", "/my-activity", "/candidates", "/jobs", "/hod-portal", "/jds", "/settings"]) {
      const target = href === "/settings" ? sidebar : navConfig;
      assert.match(target, new RegExp(href.replaceAll("/", "\\/")), `${href} should remain in navigation`);
    }
    assert.match(sidebar, /getNavForRole\(profile\.role\)/);
    assert.match(sidebar, /getSectionsForRole\(profile\.role\)/);
  });

  it("adds the planned People pages without starting later HRMS modules", () => {
    const employeesPage = source("app/(app)/people/employees/page.tsx");
    const organizationPage = source("app/(app)/people/organization/page.tsx");

    assert.match(employeesPage, /\/api\/hrms\/employees/);
    assert.match(employeesPage, /from-candidate/);
    assert.match(employeesPage, /documents/);
    assert.match(organizationPage, /\/api\/hrms\/organization/);
    assert.doesNotMatch(employeesPage + organizationPage, /attendance|payroll|leave|expense|performance|lifecycle|automation/i);
  });
});
