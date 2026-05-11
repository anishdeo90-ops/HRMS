import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = join(repoRoot, "supabase", "migrations", "20260511160000_attendance_checkins_shifts.sql");
const employeeCoreMigrationPath = join(repoRoot, "supabase", "migrations", "20260510220000_employee_core_organization.sql");

function migrationSql() {
  assert.equal(existsSync(migrationPath), true, "attendance migration should exist");
  return readFileSync(migrationPath, "utf8");
}

function normalizedSql() {
  return migrationSql().replace(/\s+/g, " ").toLowerCase();
}

describe("Attendance SQL migration contract", () => {
  it("keeps the Phase 3 Employee Core migration as the dependency boundary", () => {
    assert.equal(existsSync(employeeCoreMigrationPath), true, "employee core migration should remain present");
  });

  it("creates the required attendance, shift, roster, correction, and overtime tables", () => {
    const sql = normalizedSql();
    const tables = [
      "attendance_shift_types",
      "attendance_shift_locations",
      "employee_shift_assignments",
      "shift_roster_entries",
      "employee_check_ins",
      "attendance_days",
      "attendance_correction_requests",
      "shift_requests",
      "overtime_records",
    ];

    for (const table of tables) {
      assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`), `${table} should be created`);
    }
  });

  it("enables row level security on every Phase 4 table", () => {
    const sql = normalizedSql();
    const tables = [
      "attendance_shift_types",
      "attendance_shift_locations",
      "employee_shift_assignments",
      "shift_roster_entries",
      "employee_check_ins",
      "attendance_days",
      "attendance_correction_requests",
      "shift_requests",
      "overtime_records",
    ];

    for (const table of tables) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${table} should enable RLS`);
    }
  });

  it("defines attendance helper functions as security definer functions with a fixed search path", () => {
    const sql = normalizedSql();
    const helpers = [
      "can_check_in",
      "can_view_attendance",
      "can_manage_attendance",
      "can_approve_attendance",
      "can_manage_shifts",
    ];

    for (const helper of helpers) {
      assert.match(sql, new RegExp(`create or replace function public\\.${helper}\\b`), `${helper} should be created`);
      assert.match(sql, new RegExp(`public\\.${helper}[\\s\\S]*?security definer[\\s\\S]*?set search_path = public`, "i"), `${helper} should be security definer with fixed search_path`);
    }
  });

  it("scopes Phase 4 approvals and team visibility without global attendance reads", () => {
    const sql = normalizedSql();

    assert.match(sql, /department_approvers_approval_scope_check check \(approval_scope in \('employee_core', 'attendance_correction', 'shift_request', 'overtime'\)\)/);
    assert.match(sql, /has_permission\(permission_key text\)/);
    assert.match(sql, /rp\.permission_key = \$1/);
    assert.doesNotMatch(sql, /rp\.permission_key = permission_key/, "permission helper should compare against the function argument, not an ambiguous column name");
    assert.match(sql, /manager\.profile_id = auth\.uid\(\).*public\.is_reporting_manager\(manager\.id, e\.id\).*permission\.attendance\.view_team/);
    assert.doesNotMatch(sql, /has_permission\('permission\.attendance\.view_team'\)\s*\)\s*, false\);/, "view_team should not grant global attendance visibility");
    assert.match(sql, /can_approve_attendance\(target_employee_id uuid, approval_scope text\)/);
    assert.match(sql, /da\.approval_scope = approval_scope/);
    assert.match(sql, /can_approve_attendance\(employee_id, 'attendance_correction'\)/);
    assert.match(sql, /can_approve_attendance\(employee_id, 'shift_request'\)/);
    assert.match(sql, /can_approve_attendance\(employee_id, 'overtime'\)/);
    assert.doesNotMatch(sql, /p\.role = 'employee' and permission_key in \([^)]*permission\.overtime\.manage/, "employees should not inherit global overtime manage fallback");
    assert.match(sql, /foreign key \(attendance_day_id, employee_id, attendance_date\).*on delete restrict/);
    assert.match(sql, /foreign key \(attendance_day_id, employee_id, overtime_date\).*on delete restrict/);
    assert.doesNotMatch(sql, /attendance_day_id uuid references public\.attendance_days\(id\) on delete set null/);
  });

  it("adds operation-specific policies for high-risk attendance tables", () => {
    const sql = normalizedSql();
    const tables = [
      "employee_check_ins",
      "attendance_days",
      "attendance_correction_requests",
      "employee_shift_assignments",
      "shift_roster_entries",
      "shift_requests",
      "overtime_records",
    ];

    for (const table of tables) {
      for (const operation of ["select", "insert", "update", "delete"]) {
        assert.match(sql, new RegExp(`create policy "[^"]+" on public\\.${table} for ${operation}\\b`), `${table} should have ${operation} policy`);
      }
    }

    assert.doesNotMatch(sql, /on public\.(employee_check_ins|attendance_days|attendance_correction_requests|employee_shift_assignments|shift_roster_entries|shift_requests|overtime_records) for all\b/, "attendance tables should not use broad FOR ALL policies");
    assert.doesNotMatch(sql, /using \(true\)/, "attendance policies should not be open using (true)");
  });

  it("constrains statuses and event types to governed Phase 4 values", () => {
    const sql = normalizedSql();
    for (const state of ["present", "absent", "half_day", "late", "on_duty", "holiday", "weekly_off"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed attendance day status`);
    }
    for (const state of ["draft", "submitted", "approved", "rejected", "cancelled"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed request status`);
    }
    assert.match(sql, /event_type text not null check \(event_type in \('in', 'out'\)\)/, "check-in event type should be constrained");
    assert.match(sql, /overtime_minutes integer not null check \(overtime_minutes > 0\)/, "overtime minutes should be positive");
  });
});
