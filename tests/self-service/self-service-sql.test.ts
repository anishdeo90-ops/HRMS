import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = join(repoRoot, "supabase", "migrations", "20260515210000_employee_self_service.sql");
const lifecycleMigrationPath = join(repoRoot, "supabase", "migrations", "20260515190000_employee_lifecycle.sql");

function migrationSql() {
  assert.equal(existsSync(migrationPath), true, "employee self-service migration should exist");
  return readFileSync(migrationPath, "utf8");
}

function normalizedSql() {
  return migrationSql().replace(/\s+/g, " ").toLowerCase();
}

describe("Employee self-service SQL migration contract", () => {
  it("keeps Phase 7 lifecycle as the dependency boundary", () => {
    assert.equal(existsSync(lifecycleMigrationPath), true, "Phase 7 lifecycle migration should remain present");
  });

  it("creates employee notifications with governed statuses and categories", () => {
    const sql = normalizedSql();

    assert.match(sql, /create table if not exists public\.employee_notifications\b/);
    assert.match(sql, /employee_id uuid not null references public\.employees\(id\) on delete cascade/);
    for (const status of ["unread", "read", "archived"]) {
      assert.match(sql, new RegExp(`'${status}'`), `${status} should be a governed notification status`);
    }
    for (const category of ["profile", "attendance", "leave", "expenses", "payroll", "performance", "lifecycle", "system"]) {
      assert.match(sql, new RegExp(`'${category}'`), `${category} should be a governed notification category`);
    }
  });

  it("defines self-service helper functions as security definer functions with fixed search_path", () => {
    const sql = migrationSql().toLowerCase();
    const helpers = [
      "can_use_self_service",
      "can_view_self_service_profile",
      "can_manage_employee_notifications",
      "can_view_employee_notification",
      "can_acknowledge_employee_notification",
    ];

    for (const helper of helpers) {
      assert.match(sql, new RegExp(`create or replace function public\\.${helper}\\b`), `${helper} should be created`);
      assert.match(sql, new RegExp(`public\\.${helper}[\\s\\S]*?security definer[\\s\\S]*?set search_path = public`, "i"), `${helper} should be security definer with fixed search_path`);
    }
  });

  it("uses governed self-service permissions and employee self checks", () => {
    const sql = normalizedSql();

    assert.match(sql, /permission\.self_service\.view/);
    assert.match(sql, /permission\.self_service\.profile\.view/);
    assert.match(sql, /permission\.self_service\.notifications\.view/);
    assert.match(sql, /permission\.self_service\.notifications\.acknowledge/);
    assert.match(sql, /permission\.self_service\.notifications\.manage/);
    assert.match(sql, /e\.profile_id = auth\.uid\(\)/);
    assert.doesNotMatch(sql, /p\.role = 'recruiter'[\s\S]*permission\.self_service/, "recruiters should not get self-service fallback permissions");
  });

  it("uses operation-specific fail-closed notification policies", () => {
    const sql = normalizedSql();

    for (const operation of ["select", "insert", "update", "delete"]) {
      assert.match(sql, new RegExp(`create policy "[^"]+" on public\\.employee_notifications for ${operation}\\b`));
    }
    assert.doesNotMatch(sql, /on public\.employee_notifications for all\b/);
    assert.doesNotMatch(sql, /using \(true\)/);
  });

  it("adds an updated-at trigger for employee notifications", () => {
    const sql = normalizedSql();

    assert.match(sql, /create trigger employee_notifications_updated_at before update on public\.employee_notifications for each row execute function public\.touch_updated_at\(\)/);
  });
});
