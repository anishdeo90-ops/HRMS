import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { validateRegistry } from "../../scripts/metadata/validate";

function writeRegistry(root: string, yaml: string) {
  const metadataDir = join(root, "metadata");
  mkdirSync(metadataDir, { recursive: true });
  writeFileSync(join(metadataDir, "roles.yaml"), yaml);
}

describe("metadata validation", () => {
  it("rejects duplicate keys", () => {
    const root = mkdtempSync(join(tmpdir(), "metadata-duplicate-"));
    writeRegistry(root, `
items:
  - key: role.hr_manager
    label: HR Manager
    domain: security
    owner: hr
    source_ref: { system: test, module: security, artifact: role }
    introduced_in_phase: 1
    db_table: roles
    ts_export: ROLE_KEYS
    api_routes: []
    ui_surfaces: []
    tests: []
  - key: role.hr_manager
    label: HR Manager Duplicate
    domain: security
    owner: hr
    source_ref: { system: test, module: security, artifact: role }
    introduced_in_phase: 1
    db_table: roles
    ts_export: ROLE_KEYS
    api_routes: []
    ui_surfaces: []
    tests: []
`);

    const result = validateRegistry(root);

    assert.equal(result.valid, false);
    assert.match(result.messages.join("\n"), /duplicate/i);
  });

  it("rejects registry items missing source_ref", () => {
    const root = mkdtempSync(join(tmpdir(), "metadata-missing-source-"));
    writeRegistry(root, `
items:
  - key: role.employee
    label: Employee
    domain: employee_core
    owner: hr
    introduced_in_phase: 1
    db_table: roles
    ts_export: ROLE_KEYS
    api_routes: []
    ui_surfaces: []
    tests: []
`);

    const result = validateRegistry(root);

    assert.equal(result.valid, false);
    assert.match(result.messages.join("\n"), /source_ref/);
  });
});
