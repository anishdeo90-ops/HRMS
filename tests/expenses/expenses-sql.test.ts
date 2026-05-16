import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = join(repoRoot, "supabase", "migrations", "20260512120000_expenses_advances_travel.sql");
const integrityMigrationPath = join(repoRoot, "supabase", "migrations", "20260516060000_integrity_fixes.sql");
const leaveMigrationPath = join(repoRoot, "supabase", "migrations", "20260511190000_leave_management.sql");

function migrationSql() {
  assert.equal(existsSync(migrationPath), true, "expenses migration should exist");
  return readFileSync(migrationPath, "utf8");
}

function normalizedSql() {
  return migrationSql().replace(/\s+/g, " ").toLowerCase();
}

function integrityMigrationSql() {
  assert.equal(existsSync(integrityMigrationPath), true, "integrity repair migration should exist");
  return readFileSync(integrityMigrationPath, "utf8");
}

function normalizedIntegritySql() {
  return integrityMigrationSql().replace(/\s+/g, " ").toLowerCase();
}

const expenseTables = [
  "expense_claim_types",
  "expense_claims",
  "expense_claim_items",
  "employee_advances",
  "travel_requests",
  "travel_itineraries",
  "vehicle_logs",
  "vehicle_services",
];

describe("Expenses, advances, travel, and vehicle SQL migration contract", () => {
  it("keeps the leave migration as the dependency boundary", () => {
    assert.equal(existsSync(leaveMigrationPath), true, "leave migration should remain present");
  });

  it("creates all Phase 4 finance workflow tables", () => {
    const sql = normalizedSql();

    for (const table of expenseTables) {
      assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`), `${table} should be created`);
    }
  });

  it("enables row level security on every Phase 4 finance table", () => {
    const sql = normalizedSql();

    for (const table of expenseTables) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${table} should enable RLS`);
    }
  });

  it("defines finance helper functions as security definer functions with fixed search_path", () => {
    const sql = normalizedSql();
    const helpers = [
      "current_employee_id",
      "can_manage_expenses",
      "can_view_expense_record",
      "can_approve_expense_record",
      "can_create_expense_record",
      "can_manage_expense_attachment",
    ];

    for (const helper of helpers) {
      assert.match(sql, new RegExp(`create or replace function public\\.${helper}\\b`), `${helper} should be created`);
      assert.match(sql, new RegExp(`public\\.${helper}[\\s\\S]*?security definer[\\s\\S]*?set search_path = public`, "i"), `${helper} should be security definer with fixed search_path`);
    }
  });

  it("scopes self, team, approver, HR, finance, and admin access without open policies", () => {
    const sql = normalizedSql();

    assert.match(sql, /department_approvers_approval_scope_check check \(approval_scope in \('employee_core', 'attendance_correction', 'shift_request', 'overtime', 'leave_application', 'compensatory_leave', 'leave_encashment', 'expense_claim', 'employee_advance', 'travel_request'\)\)/);
    assert.match(sql, /has_permission\(permission_key text\)/);
    assert.match(sql, /rp\.permission_key = \$1/);
    assert.doesNotMatch(sql, /rp\.permission_key = permission_key/, "permission helper should compare against the function argument, not an ambiguous column name");
    assert.match(sql, /manager\.profile_id = auth\.uid\(\).*public\.is_reporting_manager\(manager\.id, e\.id\).*permission\.expenses\.view_team/);
    assert.match(sql, /public\.has_permission\('permission\.expenses\.manage'\).*public\.has_permission\('permission\.employee_advances\.manage'\).*public\.has_permission\('permission\.travel_requests\.manage'\).*public\.has_role\('role\.finance_manager'\)/);
    assert.match(sql, /can_approve_expense_record\(target_employee_id uuid, approval_scope text\)/);
    assert.match(sql, /da\.approval_scope = approval_scope/);
    assert.match(sql, /can_approve_expense_record\(employee_id, 'expense_claim'\)/);
    assert.match(sql, /can_approve_expense_record\(employee_id, 'employee_advance'\)/);
    assert.match(sql, /can_approve_expense_record\(employee_id, 'travel_request'\)/);
    assert.doesNotMatch(sql, /using \(true\)/, "finance policies should not be open using (true)");
  });

  it("adds operation-specific policies for finance tables and attachment storage", () => {
    const sql = normalizedSql();

    for (const table of expenseTables) {
      for (const operation of ["select", "insert", "update", "delete"]) {
        assert.match(sql, new RegExp(`create policy "[^"]+" on public\\.${table} for ${operation}\\b`), `${table} should have ${operation} policy`);
      }
      assert.doesNotMatch(sql, new RegExp(`on public\\.${table} for all\\b`), `${table} should not use broad FOR ALL policies`);
    }

    for (const operation of ["select", "insert", "update", "delete"]) {
      assert.match(sql, new RegExp(`create policy "[^"]+" on storage\\.objects for ${operation}\\b`), `storage objects should have ${operation} policy`);
    }
  });

  it("creates a private expense attachment bucket", () => {
    const sql = normalizedSql();

    assert.match(sql, /insert into storage\.buckets \([^)]*id[^)]*name[^)]*public/, "storage bucket should be inserted");
    assert.match(sql, /expense-attachments/, "expense attachment bucket should be named expense-attachments");
    assert.match(sql, /values \('expense-attachments', 'expense-attachments', false/, "expense attachment bucket should be private");
  });

  it("constrains governed statuses, amounts, dates, and updated-at triggers", () => {
    const sql = normalizedSql();

    for (const state of ["draft", "submitted", "approved", "rejected", "cancelled", "paid"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed claim status`);
    }

    for (const state of ["draft", "submitted", "approved", "rejected", "cancelled", "settled"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed advance status`);
    }

    for (const state of ["draft", "submitted", "approved", "rejected", "cancelled", "completed"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed travel status`);
    }

    assert.match(sql, /amount numeric\(12,2\) not null check \(amount > 0\)/);
    assert.match(sql, /total_amount numeric\(12,2\) not null default 0 check \(total_amount >= 0\)/);
    assert.match(sql, /requested_amount numeric\(12,2\) not null check \(requested_amount > 0\)/);
    assert.match(sql, /check \(end_date >= start_date\)/);
    assert.match(sql, /odometer_end integer check \(odometer_end is null or odometer_end >= odometer_start\)/);

    for (const table of expenseTables) {
      assert.match(sql, new RegExp(`create trigger ${table}_updated_at before update on public\\.${table} for each row execute function public\\.touch_updated_at\\(\\)`), `${table} should use touch_updated_at`);
    }
  });

  it("adds additive expense claim to advance settlement schema in the integrity migration", () => {
    const sql = normalizedIntegritySql();

    assert.match(sql, /alter table public\.employee_advances add column if not exists settled_by uuid references public\.profiles\(id\) on delete set null/);
    assert.match(sql, /add column if not exists settled_amount numeric\(12,2\)/);
    assert.match(sql, /add column if not exists outstanding_amount numeric\(12,2\)/);
    assert.match(sql, /alter column outstanding_amount set not null/);
    assert.match(sql, /employee_advances_settlement_amounts_check/);
    assert.match(sql, /employee_advances_id_employee_unique unique \(id, employee_id\)/);
    assert.match(sql, /create or replace function public\.sync_employee_advance_settlement_totals\(\)/);
    assert.match(sql, /create trigger employee_advances_settlement_totals/);

    assert.match(sql, /alter table public\.expense_claims add column if not exists settlement_advance_id uuid/);
    assert.match(sql, /add column if not exists settlement_amount numeric\(12,2\)/);
    assert.match(sql, /add column if not exists settlement_note text/);
    assert.match(sql, /expense_claims_settlement_amount_check/);
    assert.match(sql, /expense_claims_settlement_advance_employee_fkey/);
    assert.match(sql, /foreign key \(settlement_advance_id, employee_id\) references public\.employee_advances\(id, employee_id\)/);
    assert.match(sql, /expense_claims_settlement_advance_idx/);
    assert.match(sql, /employee_advances_outstanding_idx/);
  });

  it("documents intentional polymorphic or external id columns instead of adding unsafe foreign keys", () => {
    const sql = normalizedIntegritySql();

    assert.match(sql, /comment on column public\.communication_logs\.provider_message_id/);
    assert.match(sql, /external provider message identifier/);
    assert.match(sql, /comment on column public\.employee_notifications\.source_id/);
    assert.match(sql, /polymorphic source row id/);
    assert.match(sql, /comment on column public\.hrms_automation_notifications\.source_id/);
    assert.match(sql, /comment on column public\.leave_ledger_entries\.source_id/);
    assert.doesNotMatch(sql, /foreign key \(provider_message_id\)/);
    assert.doesNotMatch(sql, /foreign key \(source_id\)/);
  });
});
