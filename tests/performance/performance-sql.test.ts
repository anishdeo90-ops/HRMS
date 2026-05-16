import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = join(repoRoot, "supabase", "migrations", "20260515160000_performance_management.sql");
const payrollMigrationPath = join(repoRoot, "supabase", "migrations", "20260515130000_payroll_salary_tax_benefits.sql");

function migrationSql() {
  assert.equal(existsSync(migrationPath), true, "performance management migration should exist");
  return readFileSync(migrationPath, "utf8");
}

function normalizedSql() {
  return migrationSql().replace(/\s+/g, " ").toLowerCase();
}

const performanceTables = [
  "performance_goals",
  "performance_kras",
  "appraisal_templates",
  "appraisal_template_goals",
  "appraisal_cycles",
  "appraisals",
  "appraisal_goals",
  "employee_performance_feedback",
  "employee_feedback_criteria",
  "employee_feedback_ratings",
];

describe("Performance management SQL migration contract", () => {
  it("keeps the Phase 5 payroll migration as the dependency boundary", () => {
    assert.equal(existsSync(payrollMigrationPath), true, "Phase 5 payroll migration should remain present");
  });

  it("creates all Phase 6 performance tables", () => {
    const sql = normalizedSql();

    for (const table of performanceTables) {
      assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`), `${table} should be created`);
    }
  });

  it("enables row level security on every Phase 6 performance table", () => {
    const sql = normalizedSql();

    for (const table of performanceTables) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${table} should enable RLS`);
    }
  });

  it("defines performance helper functions as security definer functions with fixed search_path", () => {
    const sql = normalizedSql();
    const helpers = [
      "can_manage_performance",
      "can_manage_performance_setup",
      "can_view_performance_record",
      "can_review_performance_record",
      "can_submit_performance_feedback",
    ];

    for (const helper of helpers) {
      assert.match(sql, new RegExp(`create or replace function public\\.${helper}\\b`), `${helper} should be created`);
      assert.match(sql, new RegExp(`public\\.${helper}[\\s\\S]*?security definer[\\s\\S]*?set search_path = public`, "i"), `${helper} should be security definer with fixed search_path`);
    }
  });

  it("adds performance permissions with scoped HR user and HOD fallbacks", () => {
    const sql = normalizedSql();

    assert.match(sql, /has_permission\(permission_key text\)/);
    assert.match(sql, /rp\.permission_key = \$1/);
    assert.match(sql, /p\.role = 'hr_user'[\s\S]*permission\.performance\.view_team/);
    assert.match(sql, /p\.role = 'hod'[\s\S]*permission\.performance\.appraisals\.review/);
    assert.doesNotMatch(sql, /p\.role = 'recruiter'[\s\S]*permission\.performance/, "recruiters should not get performance fallback permissions");
  });

  it("scopes team performance access through reporting manager checks", () => {
    const sql = normalizedSql();

    assert.match(sql, /manager\.profile_id = auth\.uid\(\).*public\.is_reporting_manager\(manager\.id, e\.id\).*permission\.performance\.view_team/);
    assert.match(sql, /manager\.profile_id = auth\.uid\(\).*public\.is_reporting_manager\(manager\.id, e\.id\).*permission\.performance\.appraisals\.review/);
  });

  it("uses operation-specific fail-closed policies", () => {
    const sql = normalizedSql();

    for (const table of performanceTables) {
      for (const operation of ["select", "insert", "update", "delete"]) {
        assert.match(sql, new RegExp(`create policy "[^"]+" on public\\.${table} for ${operation}\\b`), `${table} should have ${operation} policy`);
      }
      assert.doesNotMatch(sql, new RegExp(`on public\\.${table} for all\\b`), `${table} should not use broad FOR ALL policies`);
    }

    assert.doesNotMatch(sql, /using \(true\)/, "performance policies should not be open using (true)");
  });

  it("constrains governed statuses, ratings, scores, weights, dates, and uniqueness", () => {
    const sql = normalizedSql();

    for (const state of ["draft", "active", "submitted", "approved", "closed", "cancelled"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed performance goal status`);
    }

    for (const state of ["self_submitted", "manager_reviewed", "rejected"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed appraisal status`);
    }

    assert.match(sql, /weight numeric\(5,2\) not null default 0 check \(weight >= 0 and weight <= 100\)/);
    assert.match(sql, /progress_percent numeric\(5,2\) not null default 0 check \(progress_percent >= 0 and progress_percent <= 100\)/);
    assert.match(sql, /final_score numeric\(5,2\) check \(final_score is null or \(final_score >= 0 and final_score <= 5\)\)/);
    assert.match(sql, /rating integer not null check \(rating between 1 and 5\)/);
    assert.match(sql, /check \(end_date >= start_date\)/);
    assert.match(sql, /unique \(cycle_id, employee_id\)/);
    assert.match(sql, /unique \(feedback_id, criteria_id\)/);
  });

  it("adds updated-at triggers for mutable performance tables", () => {
    const sql = normalizedSql();

    for (const table of performanceTables) {
      assert.match(sql, new RegExp(`create trigger ${table}_updated_at before update on public\\.${table} for each row execute function public\\.touch_updated_at\\(\\)`), `${table} should use touch_updated_at`);
    }
  });
});
