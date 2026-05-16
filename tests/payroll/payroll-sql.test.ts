import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = join(repoRoot, "supabase", "migrations", "20260515130000_payroll_salary_tax_benefits.sql");
const phase4MigrationPath = join(repoRoot, "supabase", "migrations", "20260512120000_expenses_advances_travel.sql");

function migrationSql() {
  assert.equal(existsSync(migrationPath), true, "payroll migration should exist");
  return readFileSync(migrationPath, "utf8");
}

function normalizedSql() {
  return migrationSql().replace(/\s+/g, " ").toLowerCase();
}

const payrollTables = [
  "salary_components",
  "salary_structures",
  "salary_structure_details",
  "salary_structure_assignments",
  "payroll_periods",
  "payroll_entries",
  "salary_slips",
  "salary_slip_lines",
  "additional_salaries",
  "employee_incentives",
  "salary_withholdings",
  "income_tax_slabs",
  "employee_tax_exemption_declarations",
  "employee_benefit_applications",
  "employee_benefit_claims",
  "gratuity_rules",
];

describe("Payroll, salary, tax, and benefits SQL migration contract", () => {
  it("keeps the Phase 4 finance migration as the dependency boundary", () => {
    assert.equal(existsSync(phase4MigrationPath), true, "Phase 4 finance migration should remain present");
  });

  it("creates all Phase 5 payroll tables", () => {
    const sql = normalizedSql();

    for (const table of payrollTables) {
      if (table === "salary_components") {
        assert.match(sql, /alter table public\.salary_components add column if not exists id uuid/, "salary_components should be upgraded from Phase 1 metadata shape");
      } else {
        assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`), `${table} should be created`);
      }
    }
  });

  it("enables row level security on every Phase 5 payroll table", () => {
    const sql = normalizedSql();

    for (const table of payrollTables) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${table} should enable RLS`);
    }
  });

  it("defines payroll helper functions as security definer functions with fixed search_path", () => {
    const sql = normalizedSql();
    const helpers = [
      "can_manage_payroll",
      "can_view_payroll_record",
      "can_manage_salary_structure",
      "can_view_salary_slip",
      "can_manage_tax_benefits",
    ];

    for (const helper of helpers) {
      assert.match(sql, new RegExp(`create or replace function public\\.${helper}\\b`), `${helper} should be created`);
      assert.match(sql, new RegExp(`public\\.${helper}[\\s\\S]*?security definer[\\s\\S]*?set search_path = public`, "i"), `${helper} should be security definer with fixed search_path`);
    }
  });

  it("adds payroll permissions without broad HR user payroll access", () => {
    const sql = normalizedSql();

    assert.match(sql, /has_permission\(permission_key text\)/);
    assert.match(sql, /rp\.permission_key = \$1/);
    assert.match(sql, /public\.has_role\('role\.payroll_manager'\)/);
    assert.match(sql, /permission\.payroll\.manage/);
    assert.match(sql, /permission\.salary_slips\.view_self/);
    const hrUserBlock = sql.match(/p\.role = 'hr_user'[\s\S]*?\)\s*\)\s*\)\s*\)\s*\), false\)/)?.[0] ?? "";
    assert.doesNotMatch(hrUserBlock, /permission\.payroll\.manage/, "hr_user should not get broad payroll management fallback");
  });

  it("uses operation-specific fail-closed policies", () => {
    const sql = normalizedSql();

    for (const table of payrollTables) {
      for (const operation of ["select", "insert", "update", "delete"]) {
        assert.match(sql, new RegExp(`create policy "[^"]+" on public\\.${table} for ${operation}\\b`), `${table} should have ${operation} policy`);
      }
      assert.doesNotMatch(sql, new RegExp(`on public\\.${table} for all\\b`), `${table} should not use broad FOR ALL policies`);
    }

    assert.doesNotMatch(sql, /using \(true\)/, "payroll policies should not be open using (true)");
  });

  it("constrains governed payroll statuses, amounts, dates, and unique periods", () => {
    const sql = normalizedSql();

    for (const state of ["draft", "open", "processing", "submitted", "locked", "cancelled"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed payroll period status`);
    }

    for (const state of ["draft", "calculated", "approved", "paid", "cancelled"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed salary slip status`);
    }

    assert.match(sql, /amount numeric\(12,2\) not null check \(amount >= 0\)/);
    assert.match(sql, /gross_pay numeric\(12,2\) not null default 0 check \(gross_pay >= 0\)/);
    assert.match(sql, /net_pay numeric\(12,2\) not null default 0 check \(net_pay >= 0\)/);
    assert.match(sql, /check \(end_date >= start_date\)/);
    assert.match(sql, /unique \(fiscal_year, month\)/);
  });

  it("adds updated-at triggers for mutable payroll tables", () => {
    const sql = normalizedSql();

    for (const table of payrollTables) {
      assert.match(sql, new RegExp(`create trigger ${table}_updated_at before update on public\\.${table} for each row execute function public\\.touch_updated_at\\(\\)`), `${table} should use touch_updated_at`);
    }
  });
});
