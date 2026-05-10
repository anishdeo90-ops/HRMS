import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import fg from "fast-glob";
import { parse } from "yaml";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const metadataRoot = join(repoRoot, "metadata");

const requiredFields = [
  "key",
  "label",
  "domain",
  "owner",
  "source_ref",
  "introduced_in_phase",
  "db_table",
  "ts_export",
  "api_routes",
  "ui_surfaces",
  "tests",
];

function asArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: Record<string, unknown>[] }).items;
  }
  return [];
}

describe("metadata registry contract", () => {
  it("all governed YAML registry items include required traceability fields", async () => {
    assert.equal(existsSync(metadataRoot), true, "metadata directory should exist");
    const files = await fg("**/*.{yaml,yml}", {
      cwd: metadataRoot,
      absolute: true,
      ignore: ["allowlists/**", "lineage.yaml"],
    });

    assert.ok(files.length > 0, "expected governed metadata YAML files");

    const keys = new Map<string, string>();
    for (const file of files) {
      const data = parse(readFileSync(file, "utf8"));
      const items = asArray(data);
      assert.ok(items.length > 0, `${relative(repoRoot, file)} should contain registry items`);

      for (const item of items) {
        for (const field of requiredFields) {
          assert.ok(item[field] !== undefined, `${item.key ?? relative(repoRoot, file)} missing ${field}`);
        }

        const key = String(item.key);
        assert.equal(keys.has(key), false, `duplicate metadata key ${key} in ${relative(repoRoot, file)} and ${keys.get(key)}`);
        keys.set(key, relative(repoRoot, file));
      }
    }
  });

  it("legacy ATS allowlist entries include expiry and replacement metadata", () => {
    const allowlistPath = join(metadataRoot, "allowlists", "legacy-ats-literals.yaml");
    assert.equal(existsSync(allowlistPath), true, "legacy ATS allowlist should exist");
    const entries = asArray(parse(readFileSync(allowlistPath, "utf8")));
    assert.ok(entries.length > 0, "legacy ATS allowlist should contain entries");

    for (const entry of entries) {
      for (const field of ["literal", "file", "reason", "expires_after_phase", "replacement_key"]) {
        assert.ok(entry[field] !== undefined, `allowlist entry missing ${field}`);
      }
    }
  });
});
