import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import fg from "fast-glob";
import { parse } from "yaml";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const metadataRoot = join(repoRoot, "metadata");

const requiredFields = [
  "key",
  "label",
  "domain",
  "owner",
  "source_ref",
  "introduced_in_phase",
  "db_table",
  "ts_export",
  "api_routes",
  "ui_surfaces",
  "tests",
];

function asArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: Record<string, unknown>[] }).items;
  }
  return [];
}

describe("metadata registry contract", () => {
  it("all governed YAML registry items include required traceability fields", async () => {
    assert.equal(existsSync(metadataRoot), true, "metadata directory should exist");
    const files = await fg("**/*.{yaml,yml}", {
      cwd: metadataRoot,
      absolute: true,
      ignore: ["allowlists/**", "lineage.yaml"],
    });

    assert.ok(files.length > 0, "expected governed metadata YAML files");

    const keys = new Map<string, string>();
    for (const file of files) {
      const data = parse(readFileSync(file, "utf8"));
      const items = asArray(data);
      assert.ok(items.length > 0, `${relative(repoRoot, file)} should contain registry items`);

      for (const item of items) {
        for (const field of requiredFields) {
          assert.ok(item[field] !== undefined, `${item.key ?? relative(repoRoot, file)} missing ${field}`);
        }

        const key = String(item.key);
        assert.equal(keys.has(key), false, `duplicate metadata key ${key} in ${relative(repoRoot, file)} and ${keys.get(key)}`);
        keys.set(key, relative(repoRoot, file));
      }
    }
  });

  it("legacy ATS allowlist entries include expiry and replacement metadata", () => {
    const allowlistPath = join(metadataRoot, "allowlists", "legacy-ats-literals.yaml");
    assert.equal(existsSync(allowlistPath), true, "legacy ATS allowlist should exist");
    const entries = asArray(parse(readFileSync(allowlistPath, "utf8")));
    assert.ok(entries.length > 0, "legacy ATS allowlist should contain entries");

    for (const entry of entries) {
      for (const field of ["literal", "file", "reason", "expires_after_phase", "replacement_key"]) {
        assert.ok(entry[field] !== undefined, `allowlist entry missing ${field}`);
      }
    }
  });

  it("Phase 3 Employee Core metadata keys are registered with source references", async () => {
    const files = await fg("**/*.{yaml,yml}", {
      cwd: metadataRoot,
      absolute: true,
      ignore: ["allowlists/**"],
    });

    const items = files.flatMap((file) => asArray(parse(readFileSync(file, "utf8"))));
    const byKey = new Map(items.map((item) => [String(item.key), item]));
    const expectedKeys = [
      "permission.employee.view",
      "permission.employee.manage",
      "permission.employee.update_basic",
      "permission.organization.manage",
      "permission.department_approvers.manage",
      "permission.documents.view",
      "permission.documents.manage",
      "route.people.employees",
      "route.people.organization",
      "form.employee.profile",
      "approval_rule.employee_core.department_approver",
      "workflow.employee.status",
    ];

    for (const key of expectedKeys) {
      const item = byKey.get(key);
      assert.ok(item, `${key} should be registered for Phase 3`);
      assert.ok(item.source_ref, `${key} should include source_ref`);
    }
  });

  it("Phase 4 Attendance metadata keys are registered with source references", async () => {
    const files = await fg("**/*.{yaml,yml}", {
      cwd: metadataRoot,
      absolute: true,
      ignore: ["allowlists/**"],
    });

    const items = files.flatMap((file) => asArray(parse(readFileSync(file, "utf8"))));
    const byKey = new Map(items.map((item) => [String(item.key), item]));
    const expectedKeys = [
      "permission.attendance.check_in",
      "permission.attendance.view_self",
      "permission.attendance.view_team",
      "permission.attendance.manage",
      "permission.attendance.corrections.request",
      "permission.attendance.corrections.approve",
      "permission.shifts.view",
      "permission.shifts.manage",
      "permission.shifts.request",
      "permission.shifts.approve",
      "permission.overtime.view",
      "permission.overtime.manage",
      "permission.overtime.approve",
      "route.time.attendance",
      "route.time.shifts",
      "route.time.approvals",
      "form.attendance.check_in",
      "form.attendance.correction_request",
      "form.shift.type",
      "form.shift.assignment",
      "form.shift.roster",
      "form.overtime.record",
      "approval_rule.attendance.correction_department_approver",
      "approval_rule.shift.request_department_approver",
      "approval_rule.overtime.department_approver",
      "workflow.attendance.day_status",
      "workflow.attendance.correction",
      "workflow.shift.request",
      "workflow.overtime.status",
      "import_alias.attendance.check_in.employee_code",
      "import_alias.attendance.roster.employee_code",
    ];

    for (const key of expectedKeys) {
      const item = byKey.get(key);
      assert.ok(item, `${key} should be registered for Phase 4`);
      assert.ok(item.source_ref, `${key} should include source_ref`);
    }
  });

  it("Phase 5 Leave metadata keys are registered with source references", async () => {
    const files = await fg("**/*.{yaml,yml}", {
      cwd: metadataRoot,
      absolute: true,
      ignore: ["allowlists/**"],
    });

    const items = files.flatMap((file) => asArray(parse(readFileSync(file, "utf8"))));
    const byKey = new Map(items.map((item) => [String(item.key), item]));
    const expectedKeys = [
      "permission.leave.types.manage",
      "permission.leave.policies.manage",
      "permission.leave.allocations.manage",
      "permission.leave.view_self",
      "permission.leave.view_team",
      "permission.leave.apply",
      "permission.leave.approve",
      "permission.leave.cancel",
      "permission.leave.ledger.view",
      "permission.leave.reports.view",
      "route.time.leave",
      "form.leave_application.request",
      "form.leave.type",
      "form.leave.period",
      "form.leave.policy",
      "form.leave.policy_detail",
      "form.leave.allocation",
      "form.leave.holiday_list",
      "form.leave.block_list",
      "workflow.leave.application",
      "approval_rule.leave.department_approver",
      "approval_rule.leave.leave_approver",
      "leave_type.earned_leave",
      "leave_type.casual_leave",
      "leave_type.sick_leave",
      "leave_type.leave_without_pay",
      "leave_type.compensatory_off",
      "report.leave.balance",
      "report.leave.ledger",
      "import_alias.leave.allocation.employee_code",
      "import_alias.leave.allocation.leave_type",
      "import_alias.leave.holiday_list.date",
      "import_alias.leave.block_list.date",
    ];

    for (const key of expectedKeys) {
      const item = byKey.get(key);
      assert.ok(item, `${key} should be registered for Phase 5`);
      assert.ok(item.source_ref, `${key} should include source_ref`);
    }
  });
});
