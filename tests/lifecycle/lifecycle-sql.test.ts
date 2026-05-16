import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = join(repoRoot, "supabase", "migrations", "20260515190000_employee_lifecycle.sql");
const performanceMigrationPath = join(repoRoot, "supabase", "migrations", "20260515160000_performance_management.sql");

function migrationSql() {
  assert.equal(existsSync(migrationPath), true, "employee lifecycle migration should exist");
  return readFileSync(migrationPath, "utf8");
}

function normalizedSql() {
  return migrationSql().replace(/\s+/g, " ").toLowerCase();
}

const lifecycleTables = [
  "employee_onboarding_templates",
  "employee_onboardings",
  "employee_boarding_activities",
  "employee_separation_templates",
  "employee_separations",
  "employee_promotions",
  "employee_transfers",
  "grievance_types",
  "employee_grievances",
  "exit_interviews",
  "training_programs",
  "training_events",
  "training_feedback",
  "daily_work_summaries",
];

describe("Employee lifecycle SQL migration contract", () => {
  it("keeps the Phase 6 performance migration as the dependency boundary", () => {
    assert.equal(existsSync(performanceMigrationPath), true, "Phase 6 performance migration should remain present");
  });

  it("creates all Phase 7 lifecycle tables", () => {
    const sql = normalizedSql();

    for (const table of lifecycleTables) {
      assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`), `${table} should be created`);
    }
  });

  it("enables row level security on every Phase 7 lifecycle table", () => {
    const sql = normalizedSql();

    for (const table of lifecycleTables) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${table} should enable RLS`);
    }
  });

  it("defines lifecycle helper functions as security definer functions with fixed search_path", () => {
    const sql = migrationSql().toLowerCase();
    const helpers = [
      "can_manage_lifecycle",
      "can_view_lifecycle_record",
      "can_review_lifecycle_record",
      "can_manage_lifecycle_setup",
      "can_view_grievance",
      "can_manage_grievance",
      "can_view_training",
      "can_manage_training",
      "can_submit_daily_work_summary",
    ];

    for (const helper of helpers) {
      assert.match(sql, new RegExp(`create or replace function public\\.${helper}\\b`), `${helper} should be created`);
      assert.match(sql, new RegExp(`public\\.${helper}[\\s\\S]*?security definer[\\s\\S]*?set search_path = public`, "i"), `${helper} should be security definer with fixed search_path`);
    }
  });

  it("creates table-dependent helpers after their lifecycle tables exist", () => {
    const sql = normalizedSql();

    assert.ok(
      sql.indexOf("create table if not exists public.employee_grievances") <
        sql.indexOf("create or replace function public.can_view_grievance"),
      "can_view_grievance should be created after employee_grievances exists",
    );
  });

  it("adds lifecycle permissions without broad recruiter, payroll, or finance fallback access", () => {
    const sql = normalizedSql();

    assert.match(sql, /has_permission\(permission_key text\)/);
    assert.match(sql, /rp\.permission_key = \$1/);
    assert.match(sql, /permission\.lifecycle\.view_self/);
    assert.match(sql, /permission\.lifecycle\.view_team/);
    assert.match(sql, /permission\.lifecycle\.manage/);
    assert.match(sql, /permission\.grievances\.resolve/);
    assert.match(sql, /permission\.training\.feedback\.submit/);
    assert.doesNotMatch(sql, /p\.role = 'recruiter'[\s\S]*permission\.lifecycle/, "recruiters should not get lifecycle fallback permissions");
    const payrollManagerBlock = sql.match(/p\.role = 'payroll_manager'[\s\S]*?\)\s*\)\s*or\s*\(\s*p\.role = 'employee'/)?.[0] ?? "";
    assert.doesNotMatch(payrollManagerBlock, /permission\.lifecycle/, "payroll managers should not get lifecycle fallback permissions");
    assert.doesNotMatch(sql, /p\.role = 'finance_manager'[\s\S]*permission\.lifecycle/, "finance managers should not get lifecycle fallback permissions");
  });

  it("preserves prior department approver scopes and extends lifecycle scopes", () => {
    const sql = normalizedSql();
    const scopes = [
      "employee_core",
      "attendance_correction",
      "shift_request",
      "overtime",
      "leave_application",
      "compensatory_leave",
      "leave_encashment",
      "expense_claim",
      "employee_advance",
      "travel_request",
      "performance_goal",
      "performance_appraisal",
      "lifecycle_onboarding",
      "lifecycle_separation",
      "lifecycle_promotion",
      "lifecycle_transfer",
      "grievance_resolution",
    ];

    assert.match(sql, /department_approvers_approval_scope_check/);
    for (const scope of scopes) {
      assert.match(sql, new RegExp(`'${scope}'`), `${scope} should remain in approval scopes`);
    }
  });

  it("scopes lifecycle team access through reporting manager checks", () => {
    const sql = normalizedSql();

    assert.match(sql, /manager\.profile_id = auth\.uid\(\).*public\.is_reporting_manager\(manager\.id, e\.id\).*permission\.lifecycle\.view_team/);
    assert.match(sql, /manager\.profile_id = auth\.uid\(\).*public\.is_reporting_manager\(manager\.id, e\.id\).*permission\.separation\.approve/);
  });

  it("uses operation-specific fail-closed policies", () => {
    const sql = normalizedSql();

    for (const table of lifecycleTables) {
      for (const operation of ["select", "insert", "update", "delete"]) {
        assert.match(sql, new RegExp(`create policy "[^"]+" on public\\.${table} for ${operation}\\b`), `${table} should have ${operation} policy`);
      }
      assert.doesNotMatch(sql, new RegExp(`on public\\.${table} for all\\b`), `${table} should not use broad FOR ALL policies`);
    }

    assert.doesNotMatch(sql, /using \(true\)/, "lifecycle policies should not be open using (true)");
  });

  it("constrains governed statuses, ratings, dates, uniqueness, and employment-change integrity", () => {
    const sql = normalizedSql();

    for (const state of ["draft", "active", "completed", "cancelled"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed onboarding status`);
    }

    for (const state of ["submitted", "approved", "rejected", "exit_pending", "exited"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed separation status`);
    }

    for (const state of ["applied", "assigned", "under_review", "resolved", "scheduled", "in_progress", "reviewed", "archived"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed lifecycle status`);
    }

    assert.match(sql, /rating integer not null check \(rating between 1 and 5\)/);
    assert.match(sql, /overall_rating integer check \(overall_rating is null or overall_rating between 1 and 5\)/);
    assert.match(sql, /check \(due_date >= start_date\)/);
    assert.match(sql, /check \(last_working_date >= requested_date\)/);
    assert.match(sql, /check \(end_date >= start_date\)/);
    assert.match(sql, /unique \(name\)/);
    assert.match(sql, /unique \(employee_id\)/);
    assert.match(sql, /unique \(joined_candidate_id\)/);
    assert.match(sql, /unique \(event_id, employee_id\)/);
    assert.match(sql, /unique \(employee_id, work_date\)/);
    assert.match(sql, /old_department_id is distinct from new_department_id/);
    assert.match(sql, /from_department_id is distinct from to_department_id/);
  });

  it("adds updated-at triggers for mutable lifecycle tables", () => {
    const sql = normalizedSql();

    for (const table of lifecycleTables) {
      assert.match(sql, new RegExp(`create trigger ${table}_updated_at before update on public\\.${table} for each row execute function public\\.touch_updated_at\\(\\)`), `${table} should use touch_updated_at`);
    }
  });
});
