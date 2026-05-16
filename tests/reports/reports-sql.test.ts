import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = join(repoRoot, "supabase", "migrations", "20260516000000_hrms_reports_dashboards_automation.sql");
const selfServiceMigrationPath = join(repoRoot, "supabase", "migrations", "20260515210000_employee_self_service.sql");

function migrationSql() {
  assert.equal(existsSync(migrationPath), true, "Phase 9 reports migration should exist");
  return readFileSync(migrationPath, "utf8");
}

function normalizedSql() {
  return migrationSql().replace(/\s+/g, " ").toLowerCase();
}

const reportsTables = [
  "hrms_report_runs",
  "hrms_report_exports",
  "hrms_dashboard_layouts",
  "hrms_dashboard_widgets",
  "hrms_notification_rules",
  "hrms_automation_schedules",
  "hrms_automation_runs",
  "hrms_automation_notifications",
];

describe("HRMS reports, dashboards, notifications, and automation SQL migration contract", () => {
  it("keeps the Phase 8 self-service migration as the dependency boundary", () => {
    assert.equal(existsSync(selfServiceMigrationPath), true, "Phase 8 self-service migration should remain present");
  });

  it("creates all Phase 9 report and automation tables", () => {
    const sql = normalizedSql();

    for (const table of reportsTables) {
      assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`), `${table} should be created`);
    }
  });

  it("enables row level security on every Phase 9 table", () => {
    const sql = normalizedSql();

    for (const table of reportsTables) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${table} should enable RLS`);
    }
  });

  it("defines report and automation helpers as security definer functions with fixed search_path", () => {
    const sql = migrationSql().toLowerCase();
    const helpers = [
      "can_manage_reports",
      "can_view_report_key",
      "can_view_dashboard_layout",
      "can_manage_dashboard_layout",
      "can_manage_hrms_automation",
      "can_view_hrms_automation_run",
    ];

    for (const helper of helpers) {
      assert.match(sql, new RegExp(`create or replace function public\\.${helper}\\b`), `${helper} should be created`);
      assert.match(sql, new RegExp(`public\\.${helper}[\\s\\S]*?security definer[\\s\\S]*?set search_path = public`, "i"), `${helper} should be security definer with fixed search_path`);
    }
  });

  it("adds Phase 9 permissions while preserving prior HRMS permission fallbacks", () => {
    const sql = normalizedSql();

    assert.match(sql, /has_permission\(permission_key text\)/);
    assert.match(sql, /rp\.permission_key = \$1/);
    for (const permission of [
      "permission.reports.view",
      "permission.reports.export",
      "permission.dashboards.view",
      "permission.notification_rules.view",
      "permission.notification_rules.manage",
      "permission.automation_rules.view",
      "permission.automation_rules.manage",
      "permission.automation_executions.view",
      "permission.automation_executions.run",
      "permission.payroll_reports.view",
      "permission.performance.reports.view",
      "permission.lifecycle.reports.view",
      "permission.self_service.notifications.view",
    ]) {
      assert.match(sql, new RegExp(permission.replace(/\./g, "\\.")), `${permission} should be present`);
    }

    assert.doesNotMatch(sql, /p\.role = 'recruiter'[\s\S]*permission\.(reports|automation|notification_rules|dashboards)/, "recruiters should not get Phase 9 fallback permissions");
    const payrollManagerBlock = sql.match(/p\.role = 'payroll_manager'[\s\S]*?\)\s*\)\s*or\s*\(\s*p\.role = 'finance_manager'/)?.[0] ?? "";
    assert.doesNotMatch(payrollManagerBlock, /permission\.automation_rules|permission\.notification_rules/, "payroll managers should not get automation or notification rule fallback permissions");
    assert.doesNotMatch(payrollManagerBlock, /permission\.reports\.view/, "payroll managers should not get global reports fallback permissions");
  });

  it("uses governed report keys for the Phase 9 coverage list", () => {
    const sql = normalizedSql();
    const reportKeys = [
      "report.people.employee_information",
      "report.people.employee_analytics",
      "report.attendance.monthly_sheet",
      "report.attendance.shift_attendance",
      "report.leave.balance",
      "report.leave.ledger",
      "report.expenses.advance_summary",
      "report.expenses.unpaid_claims",
      "report.payroll.salary_register",
      "report.payroll.bank_remittance",
      "report.recruitment.analytics",
      "report.lifecycle.separation_pipeline",
      "report.events.birthdays_anniversaries",
    ];

    for (const key of reportKeys) {
      assert.match(sql, new RegExp(key.replace(/\./g, "\\.")), `${key} should be governed in report runs`);
    }
  });

  it("uses operation-specific fail-closed policies", () => {
    const sql = normalizedSql();

    for (const table of reportsTables) {
      for (const operation of ["select", "insert", "update", "delete"]) {
        assert.match(sql, new RegExp(`create policy "[^"]+" on public\\.${table} for ${operation}\\b`), `${table} should have ${operation} policy`);
      }
      assert.doesNotMatch(sql, new RegExp(`on public\\.${table} for all\\b`), `${table} should not use broad FOR ALL policies`);
    }

    assert.doesNotMatch(sql, /using \(true\)/, "Phase 9 policies should not be open using (true)");
  });

  it("constrains statuses, scope, formats, dashboard visibility, and automation coverage", () => {
    const sql = normalizedSql();

    for (const state of ["queued", "running", "completed", "failed", "cancelled"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed report run/export status`);
    }
    for (const state of ["draft", "active", "paused", "archived"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed rule status`);
    }
    for (const state of ["succeeded", "skipped"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be a governed automation execution status`);
    }
    for (const automationType of [
      "leave_accrual",
      "leave_expiry",
      "attendance_reminder",
      "interview_reminder",
      "birthday_anniversary",
      "payroll_readiness",
      "pending_approval",
    ]) {
      assert.match(sql, new RegExp(`'${automationType}'`), `${automationType} should be a governed automation type`);
    }

    assert.match(sql, /scope_type text not null default 'company' check \(scope_type in \('company', 'department', 'team', 'self'\)\)/);
    assert.match(sql, /format text not null default 'csv' check \(format in \('csv', 'xlsx', 'pdf'\)\)/);
    assert.match(sql, /widget_type text not null check \(widget_type in \('metric', 'chart', 'table', 'list'\)\)/);
    assert.match(sql, /visibility text not null default 'system' check \(visibility in \('system', 'role', 'department', 'user'\)\)/);
    assert.match(sql, /visibility = 'system' and role_key is null and department_id is null and owner_profile_id is null/);
  });

  it("adds uniqueness, idempotency, indexes, and updated-at triggers", () => {
    const sql = normalizedSql();

    assert.match(sql, /unique \(dashboard_layout_id, widget_key\)/);
    assert.match(sql, /unique \(rule_key\)/);
    assert.match(sql, /unique \(automation_key\)/);
    assert.match(sql, /unique \(schedule_id, idempotency_key\)/);
    assert.match(sql, /unique \(automation_run_id, recipient_employee_id, source_table, source_id\)/);
    assert.match(sql, /hrms_report_runs_report_status_idx/);
    assert.match(sql, /hrms_automation_schedules_active_next_idx/);

    for (const table of reportsTables.filter((table) => table !== "hrms_automation_notifications")) {
      assert.match(sql, new RegExp(`create trigger ${table}_updated_at before update on public\\.${table} for each row execute function public\\.touch_updated_at\\(\\)`), `${table} should use touch_updated_at`);
    }
  });
});
