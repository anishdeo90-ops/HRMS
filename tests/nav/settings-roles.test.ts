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

describe("settings role management", () => {
  it("uses the central typed role list for invite and edit role selects", () => {
    const settings = source("app/(app)/settings/page.tsx");

    assert.match(settings, /import \{ ROLES \} from "@\/lib\/types"/);
    assert.equal((settings.match(/ROLES\.filter/g) ?? []).length, 2);
    assert.doesNotMatch(settings, /<option value="payroll_manager">/);
    assert.doesNotMatch(settings, /<option value="recruiter">Recruiter<\/option>/);
    assert.match(settings, /role\.value !== "candidate"/);
  });

  it("validates saved user roles against the same central role list", () => {
    for (const path of ["app/api/users/route.ts", "app/api/users/[id]/route.ts"]) {
      const api = source(path);
      assert.match(api, /import \{ ROLES \} from "@\/lib\/types"/);
      assert.match(api, /VALID_PROFILE_ROLES/);
      assert.match(api, /Invalid role/);
      assert.match(api, /role\.value !== "candidate"/);
    }
  });
});
