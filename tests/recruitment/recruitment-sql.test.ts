import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationPath = join(repoRoot, "supabase", "migrations", "20260516030000_recruitment_unification.sql");
const reportsMigrationPath = join(repoRoot, "supabase", "migrations", "20260516000000_hrms_reports_dashboards_automation.sql");
const schemaFullPath = join(repoRoot, "supabase", "schema_full.sql");

const recruitmentTables = [
  "recruitment_status_mappings",
  "recruitment_appointment_letter_templates",
  "recruitment_appointment_letters",
  "recruitment_onboarding_handoffs",
];

function migrationSql() {
  assert.equal(existsSync(migrationPath), true, "Phase 10 recruitment migration should exist");
  return readFileSync(migrationPath, "utf8");
}

function normalizedSql() {
  return migrationSql().replace(/\s+/g, " ").toLowerCase();
}

describe("HRMS recruitment unification SQL migration contract", () => {
  it("keeps the Phase 9 reports migration as the dependency boundary", () => {
    assert.equal(existsSync(reportsMigrationPath), true, "Phase 9 reports migration should remain present");
  });

  it("preserves the existing ATS schema objects as compatibility sentinels", () => {
    assert.equal(existsSync(schemaFullPath), true, "full ATS schema sentinel should remain present");
    const schema = readFileSync(schemaFullPath, "utf8").toLowerCase();

    for (const table of ["jobs", "candidates", "interviews", "candidate_offers", "hiring_requests"]) {
      assert.match(schema, new RegExp(`create table if not exists public\\.${table}\\b`), `${table} should remain in the ATS schema`);
    }
  });

  it("creates only additive Phase 10 recruitment tables", () => {
    const sql = normalizedSql();

    for (const table of recruitmentTables) {
      assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`), `${table} should be created`);
    }
  });

  it("enables row level security on every Phase 10 recruitment table", () => {
    const sql = normalizedSql();

    for (const table of recruitmentTables) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${table} should enable RLS`);
    }
  });

  it("defines recruitment helpers as security definer functions with fixed search_path", () => {
    const sql = migrationSql().toLowerCase();
    const helpers = [
      "can_manage_recruitment",
      "can_view_recruitment_candidate",
      "can_manage_recruitment_candidate",
      "can_manage_appointment_letters",
      "can_view_appointment_letter",
      "can_manage_recruitment_handoffs",
      "can_view_recruitment_handoff",
    ];

    for (const helper of helpers) {
      assert.match(sql, new RegExp(`create or replace function public\\.${helper}\\b`), `${helper} should be created`);
      assert.match(sql, new RegExp(`public\\.${helper}[\\s\\S]*?security definer[\\s\\S]*?set search_path = public`, "i"), `${helper} should be security definer with fixed search_path`);
    }
  });

  it("adds Phase 10 recruitment permissions while preserving cumulative HRMS permission fallbacks", () => {
    const sql = normalizedSql();

    assert.match(sql, /has_permission\(permission_key text\)/);
    for (const permission of [
      "permission.self_service.notifications.view",
      "permission.lifecycle.reports.view",
      "permission.performance.reports.view",
      "permission.payroll_reports.view",
      "permission.reports.view",
      "permission.recruitment.view",
      "permission.recruitment.manage",
      "permission.recruitment.job_openings.manage",
      "permission.recruitment.job_requisitions.request",
      "permission.recruitment.job_requisitions.approve",
      "permission.recruitment.applicants.view",
      "permission.recruitment.applicants.manage",
      "permission.recruitment.interviews.manage",
      "permission.recruitment.interviews.feedback.submit",
      "permission.recruitment.offers.manage",
      "permission.recruitment.appointment_letters.manage",
      "permission.recruitment.handoffs.manage",
      "permission.recruitment.reports.view",
    ]) {
      assert.match(sql, new RegExp(permission.replace(/\./g, "\\.")), `${permission} should be present`);
    }

    const recruiterBlock = sql.match(/p\.role = 'recruiter'[\s\S]*?\)\s*\)\s*or\s*\(\s*p\.role = 'interviewer'/)?.[0] ?? "";
    assert.match(recruiterBlock, /permission\.recruitment\.view/);
    assert.doesNotMatch(recruiterBlock, /permission\.payroll|permission\.expenses|permission\.reports\.view|permission\.automation|permission\.notification_rules/, "recruiter fallback should stay recruitment-scoped");
  });

  it("uses operation-specific fail-closed policies", () => {
    const sql = normalizedSql();

    for (const table of recruitmentTables) {
      for (const operation of ["select", "insert", "update", "delete"]) {
        assert.match(sql, new RegExp(`create policy "[^"]+" on public\\.${table} for ${operation}\\b`), `${table} should have ${operation} policy`);
      }
      assert.doesNotMatch(sql, new RegExp(`on public\\.${table} for all\\b`), `${table} should not use broad FOR ALL policies`);
    }

    assert.doesNotMatch(sql, /using \(true\)/, "Phase 10 policies should not be open using (true)");
  });

  it("constrains status mappings, templates, appointment letters, and handoffs", () => {
    const sql = normalizedSql();

    for (const sourceTable of ["jobs", "candidates", "interviews", "candidate_offers", "hiring_requests"]) {
      assert.match(sql, new RegExp(`'${sourceTable}'`), `${sourceTable} should be a supported mapping source`);
    }
    for (const state of ["draft", "active", "archived", "generated", "sent", "accepted", "declined", "cancelled", "ready_for_onboarding", "employee_created", "onboarding_started"]) {
      assert.match(sql, new RegExp(`'${state}'`), `${state} should be governed in constraints`);
    }

    assert.match(sql, /unique \(source_table, source_field, source_value\)/);
    assert.match(sql, /unique \(template_key\)/);
    assert.match(sql, /unique \(letter_no\)/);
    assert.match(sql, /unique \(candidate_offer_id, letter_no\)/);
  });

  it("adds indexes, partial uniqueness guards, and updated-at triggers", () => {
    const sql = normalizedSql();

    assert.match(sql, /recruitment_appointment_templates_default_uidx/);
    assert.match(sql, /where is_default = true and is_active = true and status = 'active'/);
    assert.match(sql, /recruitment_onboarding_handoffs_active_candidate_uidx/);
    assert.match(sql, /where status not in \('cancelled'\)/);
    assert.match(sql, /recruitment_status_mappings_lookup_idx/);
    assert.match(sql, /recruitment_appointment_letters_candidate_status_idx/);
    assert.match(sql, /recruitment_onboarding_handoffs_requested_idx/);

    for (const table of recruitmentTables) {
      assert.match(sql, new RegExp(`create trigger ${table}_updated_at before update on public\\.${table} for each row execute function public\\.touch_updated_at\\(\\)`), `${table} should use touch_updated_at`);
    }
  });

  it("does not destructively modify existing ATS tables or mutate ATS records", () => {
    const sql = normalizedSql();

    assert.doesNotMatch(sql, /drop table/);
    assert.doesNotMatch(sql, /rename to/);
    for (const table of ["jobs", "candidates", "interviews", "candidate_offers", "hiring_requests"]) {
      assert.doesNotMatch(sql, new RegExp(`alter table public\\.${table}[^;]*(drop column|rename column|rename to)`), `${table} should not be destructively altered`);
      assert.doesNotMatch(sql, new RegExp(`update public\\.${table}\\b`), `${table} records should not be mutated`);
      assert.doesNotMatch(sql, new RegExp(`delete from public\\.${table}\\b`), `${table} records should not be deleted`);
    }
  });
});
