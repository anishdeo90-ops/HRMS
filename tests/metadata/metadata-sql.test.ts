import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const seedSql = readFileSync("supabase/generated/metadata_seed.sql", "utf8");
const migrationSql = readFileSync("supabase/migrations/20260510000000_metadata_governance.sql", "utf8");

const requiredTables = [
  "metadata_registry",
  "metadata_versions",
  "metadata_lineage",
  "roles",
  "permissions",
  "role_permissions",
  "app_routes",
  "workflow_definitions",
  "workflow_states",
  "workflow_transitions",
  "form_schemas",
  "field_definitions",
  "report_definitions",
  "approval_rules",
  "approval_steps",
  "salary_components",
  "leave_types",
];

describe("metadata SQL governance contract", () => {
  it("generates registry seed SQL with upsert semantics", () => {
    assert.match(seedSql, /insert into metadata_registry/i);
    assert.match(seedSql, /on conflict/i);
  });

  it("creates all required metadata tables", () => {
    for (const table of requiredTables) {
      assert.match(migrationSql, new RegExp(`create table if not exists ${table}`, "i"));
    }
  });

  it("enables row level security for every created table", () => {
    const createdTables = [...migrationSql.matchAll(/create table if not exists\s+([a-z_]+)/gi)].map((match) => match[1]);
    assert.ok(createdTables.length > 0, "expected migration to create tables");

    for (const table of createdTables) {
      assert.match(migrationSql, new RegExp(`alter table ${table} enable row level security`, "i"));
    }
  });

  it("does not hardcode HRMS role arrays in policies", () => {
    assert.doesNotMatch(migrationSql, /array\['admin','hr_manager'\]/i);
  });
});
