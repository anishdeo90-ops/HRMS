import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function source(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("self-service API contract", () => {
  it("scopes summary to the current employee before aggregating domain data", () => {
    const text = source("app/api/hrms/self-service/summary/route.ts");

    assert.match(text, /currentHrmsProfile/);
    assert.match(text, /resolveLeaveTargetEmployee\(supabase, user\.id, null\)/);
    assert.match(text, /canUseSelfService/);
    assert.match(text, /\.eq\("employee_id", employee\.id\)/);
  });

  it("keeps notification access self-scoped with acknowledge-only employee updates", () => {
    const text = source("app/api/hrms/self-service/notifications/route.ts");

    assert.match(text, /canViewEmployeeNotifications/);
    assert.match(text, /canManageEmployeeNotifications/);
    assert.match(text, /canAcknowledgeEmployeeNotification/);
    assert.match(text, /notificationStatusPatch/);
    assert.doesNotMatch(text, /\.delete\(/);
  });
});
