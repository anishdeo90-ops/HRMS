import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = join(repoRoot, "supabase", "migrations", "20260510220000_employee_core_organization.sql");

function migrationSql() {
  assert.equal(existsSync(migrationPath), true, "employee core migration should exist");
  return readFileSync(migrationPath, "utf8");
}

function normalizedSql() {
  return migrationSql().replace(/\s+/g, " ").toLowerCase();
}

describe("Employee Core SQL migration contract", () => {
  it("creates the required organization and employee tables", () => {
    const sql = normalizedSql();
    const tables = [
      "hr_companies",
      "hr_branches",
      "hr_departments",
      "hr_grades",
      "hr_employment_types",
      "employees",
      "department_approvers",
      "employee_documents",
    ];

    for (const table of tables) {
      assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`), `${table} should be created`);
    }
  });

  it("enables row level security on every Phase 3 table", () => {
    const sql = normalizedSql();
    const tables = [
      "hr_companies",
      "hr_branches",
      "hr_departments",
      "hr_grades",
      "hr_employment_types",
      "employees",
      "department_approvers",
      "employee_documents",
    ];

    for (const table of tables) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${table} should enable RLS`);
    }
  });

  it("defines helper functions as security definer functions with a fixed search path", () => {
    const sql = normalizedSql();
    const helpers = [
      "has_role",
      "has_permission",
      "can_manage_employee_core",
      "can_view_employee",
      "can_manage_employee_document",
      "is_reporting_manager",
    ];

    for (const helper of helpers) {
      assert.match(sql, new RegExp(`create or replace function public\\.${helper}\\b`), `${helper} should be created`);
      assert.match(sql, new RegExp(`public\\.${helper}[\\s\\S]*?security definer[\\s\\S]*?set search_path = public`, "i"), `${helper} should be security definer with fixed search_path`);
    }
  });

  it("adds operation-specific policies for employees and employee documents", () => {
    const sql = normalizedSql();
    for (const table of ["employees", "employee_documents"]) {
      for (const operation of ["select", "insert", "update", "delete"]) {
        assert.match(sql, new RegExp(`create policy "[^"]+" on public\\.${table} for ${operation}\\b`), `${table} should have ${operation} policy`);
      }
    }
    assert.doesNotMatch(sql, /on public\.(employees|employee_documents) for all\b/, "employee tables should not use broad FOR ALL policies");
    assert.doesNotMatch(sql, /using \(true\)/, "HRMS policies should not be open using (true)");
  });

  it("creates the private employee document bucket and storage policies", () => {
    const sql = normalizedSql();
    assert.match(sql, /insert into storage\.buckets \([^)]*id[^)]*name[^)]*public/, "storage bucket should be inserted");
    assert.match(sql, /employee-documents/, "employee document bucket should be named employee-documents");
    assert.match(sql, /false\)/, "employee document bucket should be private");
    for (const operation of ["select", "insert", "update", "delete"]) {
      assert.match(sql, new RegExp(`create policy "[^"]+" on storage\\.objects for ${operation}\\b`), `storage objects should have ${operation} policy`);
    }
  });
});
