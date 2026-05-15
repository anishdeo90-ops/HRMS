import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = join(repoRoot, "supabase", "migrations", "20260511190000_leave_management.sql");
const attendanceMigrationPath = join(repoRoot, "supabase", "migrations", "20260511160000_attendance_checkins_shifts.sql");

function migrationSql() {
  assert.equal(existsSync(migrationPath), true, "leave migration should exist");
  return readFileSync(migrationPath, "utf8");
}

function normalizedSql() {
  return migrationSql().replace(/\s+/g, " ").toLowerCase();
}

const leaveTables = [
  "leave_types",
  "leave_periods",
  "leave_policies",
  "leave_policy_details",
  "leave_policy_assignments",
  "leave_allocations",
  "leave_applications",
  "leave_ledger_entries",
  "holiday_lists",
  "holiday_list_dates",
  "leave_block_lists",
  "leave_block_list_dates",
  "compensatory_leave_requests",
  "leave_encashments",
];

describe("Leave SQL migration contract", () => {
  it("keeps the Phase 4 attendance migration as the dependency boundary", () => {
    assert.equal(existsSync(attendanceMigrationPath), true, "attendance migration should remain present");
  });

  it("creates the required leave management tables", () => {
    const sql = normalizedSql();

    for (const table of leaveTables) {
      assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`), `${table} should be created`);
    }
  });

  it("enables row level security on every Phase 5 table", () => {
    const sql = normalizedSql();

    for (const table of leaveTables) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${table} should enable RLS`);
    }
  });

  it("defines leave helper functions as security definer functions with a fixed search path", () => {
    const sql = normalizedSql();
    const helpers = ["can_manage_leave", "can_view_leave", "can_apply_leave", "can_approve_leave"];

    for (const helper of helpers) {
      assert.match(sql, new RegExp(`create or replace function public\\.${helper}\\b`), `${helper} should be created`);
      assert.match(sql, new RegExp(`public\\.${helper}[\\s\\S]*?security definer[\\s\\S]*?set search_path = public`, "i"), `${helper} should be security definer with fixed search_path`);
    }
  });

  it("scopes leave permissions, approvers, and team visibility without global leave reads", () => {
    const sql = normalizedSql();

    assert.match(sql, /department_approvers_approval_scope_check check \(approval_scope in \('employee_core', 'attendance_correction', 'shift_request', 'overtime', 'leave_application', 'compensatory_leave', 'leave_encashment'\)\)/);
    assert.match(sql, /has_permission\(permission_key text\)/);
    assert.match(sql, /rp\.permission_key = \$1/);
    assert.doesNotMatch(sql, /rp\.permission_key = permission_key/, "permission helper should compare against the function argument, not an ambiguous column name");
    assert.match(sql, /manager\.profile_id = auth\.uid\(\).*public\.is_reporting_manager\(manager\.id, e\.id\).*permission\.leave\.view_team/);
    assert.doesNotMatch(sql, /has_permission\('permission\.leave\.view_team'\)\s*\)\s*, false\);/, "view_team should not grant global leave visibility");
    assert.match(sql, /can_approve_leave\(target_employee_id uuid, approval_scope text\)/);
    assert.match(sql, /da\.approval_scope = approval_scope/);
    assert.match(sql, /can_approve_leave\(employee_id, 'leave_application'\)/);
    assert.match(sql, /can_approve_leave\(employee_id, 'compensatory_leave'\)/);
    assert.match(sql, /can_approve_leave\(employee_id, 'leave_encashment'\)/);
  });

  it("adds operation-specific policies and keeps the ledger append-only for authenticated users", () => {
    const sql = normalizedSql();
    const highRiskTables = [
      "leave_policy_assignments",
      "leave_allocations",
      "leave_applications",
      "leave_ledger_entries",
      "compensatory_leave_requests",
      "leave_encashments",
    ];

    for (const table of highRiskTables) {
      assert.match(sql, new RegExp(`create policy "[^"]+" on public\\.${table} for select\\b`), `${table} should have select policy`);
      assert.match(sql, new RegExp(`create policy "[^"]+" on public\\.${table} for insert\\b`), `${table} should have insert policy`);
      assert.doesNotMatch(sql, new RegExp(`on public\\.${table} for all\\b`), `${table} should not use broad FOR ALL policies`);
    }

    assert.doesNotMatch(sql, /on public\.leave_ledger_entries for update\b/, "leave ledger should not expose update policy");
    assert.doesNotMatch(sql, /on public\.leave_ledger_entries for delete\b/, "leave ledger should not expose delete policy");
    assert.doesNotMatch(sql, /using \(true\)/, "leave policies should not be open using (true)");
  });

  it("constrains leave statuses, ledger entry types, and day quantities", () => {
    const sql = normalizedSql();

    for (const state of ["draft", "submitted", "approved", "rejected", "cancelled"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed leave status`);
    }

    for (const entryType of ["allocation", "carry_forward", "application", "cancellation", "encashment", "expiry", "adjustment", "compensatory_credit"]) {
      assert.match(sql, new RegExp(`'${entryType}'`), `${entryType} should be a governed ledger entry type`);
    }

    assert.match(sql, /total_days numeric\(8,2\) not null check \(total_days > 0\)/);
    assert.match(sql, /days_delta numeric\(8,2\) not null check \(days_delta <> 0\)/);
    assert.match(sql, /unique \(source_type, source_id, source_action\)/);
  });
});
