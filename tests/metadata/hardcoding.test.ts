import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { scanHardcoding } from "../../scripts/metadata/check-hardcoding";

describe("metadata hardcoding scanner", () => {
  it("reports a fake unregistered HRMS role literal as BLOCKER", async () => {
    const root = await mkdtemp(join(tmpdir(), "metadata-hardcoding-"));
    mkdirSync(join(root, "app"), { recursive: true });
    writeFileSync(join(root, "app", "page.tsx"), `export const role = "benefits_admin";`);

    const result = await scanHardcoding(root);

    assert.equal(result.blockers.length, 1);
    assert.match(result.blockers[0].message, /BLOCKER/);
    assert.match(result.blockers[0].message, /benefits_admin/);
  });

  it("does not block allowlisted legacy ATS literals", async () => {
    const result = await scanHardcoding(process.cwd());

    assert.ok(result.warnings.some((warning) => warning.message.includes("legacy")));
    assert.equal(result.blockers.length, 0);
  });

  it("ignores generated file paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "metadata-generated-hardcoding-"));
    mkdirSync(join(root, "lib", "generated"), { recursive: true });
    writeFileSync(join(root, "lib", "generated", "roles.ts"), `export const value = "benefits_admin";`);

    const result = await scanHardcoding(root);

    assert.equal(result.blockers.length, 0);
  });
});
