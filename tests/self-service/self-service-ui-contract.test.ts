import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { NavSection, getNavForRole } from "../../lib/nav/config";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("self-service UI contract", () => {
  it("adds employee-only self-service navigation", () => {
    assert.deepEqual(
      getNavForRole("employee")
        .filter((item) => item.section === NavSection.SELF_SERVICE)
        .map((item) => item.href),
      ["/self-service", "/self-service/notifications"],
    );
    assert.equal(getNavForRole("recruiter").some((item) => item.href.startsWith("/self-service")), false);
    assert.equal(getNavForRole("payroll_manager").some((item) => item.href.startsWith("/self-service")), false);
  });

  it("renders overview and notifications from self-service APIs", () => {
    const overview = source("app/(app)/self-service/page.tsx");
    const notifications = source("app/(app)/self-service/notifications/page.tsx");
    const summaryApi = source("app/api/hrms/self-service/summary/route.ts");

    assert.match(overview, /\/api\/hrms\/self-service\/summary/);
    assert.match(summaryApi, /Attendance Days/);
    assert.match(summaryApi, /Salary Slips/);
    assert.match(summaryApi, /Unread Notifications/);
    assert.match(notifications, /\/api\/hrms\/self-service\/notifications/);
    assert.match(notifications, /PATCH/);
  });
});
