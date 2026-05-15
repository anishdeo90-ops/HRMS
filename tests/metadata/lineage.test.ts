import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildLineageReport, validateLineage } from "../../scripts/metadata/lineage-report";

describe("metadata lineage report", () => {
  it("reports missing api lineage as a blocker", async () => {
    const root = await mkdtemp(join(tmpdir(), "metadata-lineage-"));
    mkdirSync(join(root, "metadata"), { recursive: true });
    writeFileSync(join(root, "metadata", "roles.yaml"), `
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
`);
    writeFileSync(join(root, "metadata", "lineage.yaml"), `
items:
  - key: role.hr_manager
    source_ref: source
    requirement: META-01
    registry: metadata/roles.yaml
    db: supabase/generated/metadata_seed.sql
    typescript: lib/generated/roles.ts
    ui: components/sidebar.tsx
    tests: tests/metadata/registry-contract.test.ts
    audit: .planning/phases/01-metadata-governance-foundation/01-METADATA-AUDIT.md
`);

    const result = validateLineage(root);

    assert.equal(result.valid, false);
    assert.match(result.messages.join("\n"), /missing lineage: api/);
  });

  it("passes complete lineage for role.hr_manager and emits a markdown table", () => {
    const result = validateLineage(process.cwd());
    const report = buildLineageReport(process.cwd());

    assert.equal(result.valid, true);
    assert.ok(result.entries.some((entry) => entry.key === "role.hr_manager"));
    assert.match(report.markdown, /\| Key \| Domain \| Status \|/);
  });
});
