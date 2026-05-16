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

  it("Phase 4 Expenses, Advances, and Travel metadata keys are registered with source references", async () => {
    const files = await fg("**/*.{yaml,yml}", {
      cwd: metadataRoot,
      absolute: true,
      ignore: ["allowlists/**"],
    });

    const items = files.flatMap((file) => asArray(parse(readFileSync(file, "utf8"))));
    const byKey = new Map(items.map((item) => [String(item.key), item]));
    const expectedKeys = [
      "role.expense_approver",
      "role.finance_manager",
      "permission.expenses.view_self",
      "permission.expenses.view_team",
      "permission.expenses.manage",
      "permission.expenses.approve",
      "permission.expense_claim_types.manage",
      "permission.employee_advances.view_self",
      "permission.employee_advances.manage",
      "permission.employee_advances.approve",
      "permission.travel_requests.view_self",
      "permission.travel_requests.manage",
      "permission.travel_requests.approve",
      "permission.vehicles.view_self",
      "permission.vehicles.manage",
      "route.finance.expenses",
      "route.finance.expense_claims",
      "route.finance.advances",
      "route.finance.travel",
      "route.finance.vehicles",
      "route.finance.approvals",
      "form.expense_claim.request",
      "form.employee_advance.request",
      "form.travel_request.request",
      "form.vehicle_log.entry",
      "form.vehicle_service.entry",
      "workflow.expense_claim.status",
      "workflow.employee_advance.status",
      "workflow.travel_request.status",
      "workflow.vehicle_service.status",
      "approval_rule.expense.department_head",
      "approval_rule.expense.finance_final",
      "approval_rule.advance.department_head",
      "approval_rule.advance.finance_final",
      "approval_rule.travel.department_head",
      "approval_rule.travel.finance_final",
      "report.expenses.unpaid_claims",
      "report.expenses.advance_summary",
      "report.expenses.travel_summary",
      "report.expenses.vehicle_costs",
    ];

    for (const key of expectedKeys) {
      const item = byKey.get(key);
      assert.ok(item, `${key} should be registered for Phase 4 expenses`);
      assert.ok(item.source_ref, `${key} should include source_ref`);
    }
  });

  it("Phase 5 Payroll, Salary, Tax, and Benefits metadata keys are registered with source references", async () => {
    const files = await fg("**/*.{yaml,yml}", {
      cwd: metadataRoot,
      absolute: true,
      ignore: ["allowlists/**"],
    });

    const items = files.flatMap((file) => asArray(parse(readFileSync(file, "utf8"))));
    const byKey = new Map(items.map((item) => [String(item.key), item]));
    const expectedKeys = [
      "role.payroll_manager",
      "permission.payroll.view",
      "permission.payroll.manage",
      "permission.salary_components.manage",
      "permission.salary_structures.manage",
      "permission.salary_structures.assign",
      "permission.payroll_periods.manage",
      "permission.payroll_entries.manage",
      "permission.salary_slips.view_self",
      "permission.salary_slips.manage",
      "permission.salary_slips.submit",
      "permission.salary_slips.cancel",
      "permission.tax_declarations.view_self",
      "permission.tax_declarations.manage",
      "permission.benefits.view_self",
      "permission.benefits.manage",
      "permission.payroll_reports.view",
      "route.payroll.overview",
      "route.payroll.salary_structures",
      "route.payroll.runs",
      "route.payroll.salary_slips",
      "route.payroll.tax_benefits",
      "form.payroll.salary_component",
      "form.payroll.salary_structure",
      "form.payroll.salary_structure_assignment",
      "form.payroll.payroll_period",
      "form.payroll.payroll_entry",
      "form.payroll.salary_slip",
      "form.payroll.additional_salary",
      "form.payroll.salary_withholding",
      "form.payroll.tax_exemption_declaration",
      "form.payroll.benefit_application",
      "form.payroll.benefit_claim",
      "form.payroll.gratuity_rule",
      "workflow.payroll.period_status",
      "workflow.payroll.entry_status",
      "workflow.payroll.salary_slip_status",
      "workflow.payroll.tax_declaration_status",
      "workflow.payroll.benefit_claim_status",
      "approval_rule.payroll.salary_slip_submit",
      "approval_rule.payroll.benefit_claim",
      "report.payroll.salary_register",
      "report.payroll.run_summary",
      "report.payroll.tax_declarations",
      "salary_component.basic",
      "salary_component.hra",
      "salary_component.pf_employee",
    ];

    for (const key of expectedKeys) {
      const item = byKey.get(key);
      assert.ok(item, `${key} should be registered for Phase 5 payroll`);
      assert.ok(item.source_ref, `${key} should include source_ref`);
    }
  });

  it("Phase 6 Performance Management metadata keys are registered with source references", async () => {
    const files = await fg("**/*.{yaml,yml}", {
      cwd: metadataRoot,
      absolute: true,
      ignore: ["allowlists/**"],
    });

    const items = files.flatMap((file) => asArray(parse(readFileSync(file, "utf8"))));
    const byKey = new Map(items.map((item) => [String(item.key), item]));
    const expectedKeys = [
      "permission.performance.view_self",
      "permission.performance.view_team",
      "permission.performance.manage",
      "permission.performance.goals.manage",
      "permission.performance.goals.update",
      "permission.performance.kras.manage",
      "permission.performance.cycles.manage",
      "permission.performance.appraisals.submit",
      "permission.performance.appraisals.review",
      "permission.performance.feedback.submit",
      "permission.performance.feedback.manage",
      "permission.performance.reports.view",
      "route.performance.overview",
      "route.performance.goals",
      "route.performance.appraisals",
      "route.performance.feedback",
      "form.performance.goal",
      "form.performance.kra",
      "form.performance.appraisal_template",
      "form.performance.appraisal_cycle",
      "form.performance.appraisal",
      "form.performance.feedback",
      "form.performance.feedback_criteria",
      "workflow.performance.goal_status",
      "workflow.performance.appraisal_cycle_status",
      "workflow.performance.appraisal_status",
      "workflow.performance.feedback_status",
      "approval_rule.performance.goal_manager",
      "approval_rule.performance.appraisal_manager_review",
      "approval_rule.performance.hr_final",
      "report.performance.goal_progress",
      "report.performance.appraisal_summary",
      "report.performance.feedback_summary",
    ];

    for (const key of expectedKeys) {
      const item = byKey.get(key);
      assert.ok(item, `${key} should be registered for Phase 6 performance`);
      assert.ok(item.source_ref, `${key} should include source_ref`);
    }
  });

  it("Phase 7 Employee Lifecycle metadata keys are registered with source references", async () => {
    const files = await fg("**/*.{yaml,yml}", {
      cwd: metadataRoot,
      absolute: true,
      ignore: ["allowlists/**"],
    });

    const items = files.flatMap((file) => asArray(parse(readFileSync(file, "utf8"))));
    const byKey = new Map(items.map((item) => [String(item.key), item]));
    const expectedKeys = [
      "permission.lifecycle.view_self",
      "permission.lifecycle.view_team",
      "permission.lifecycle.manage",
      "permission.onboarding.templates.manage",
      "permission.onboarding.manage",
      "permission.onboarding.activities.update",
      "permission.separation.templates.manage",
      "permission.separation.request",
      "permission.separation.approve",
      "permission.promotions.manage",
      "permission.promotions.approve",
      "permission.transfers.manage",
      "permission.transfers.approve",
      "permission.grievances.view_self",
      "permission.grievances.manage",
      "permission.grievances.resolve",
      "permission.training.manage",
      "permission.training.feedback.submit",
      "permission.daily_work_summaries.submit",
      "permission.daily_work_summaries.view_team",
      "permission.lifecycle.reports.view",
      "route.lifecycle.overview",
      "route.lifecycle.onboarding",
      "route.lifecycle.separation",
      "route.lifecycle.promotions",
      "route.lifecycle.transfers",
      "route.lifecycle.grievances",
      "route.lifecycle.training",
      "form.lifecycle.onboarding_template",
      "form.lifecycle.onboarding",
      "form.lifecycle.boarding_activity",
      "form.lifecycle.separation_template",
      "form.lifecycle.separation",
      "form.lifecycle.promotion",
      "form.lifecycle.transfer",
      "form.lifecycle.grievance_type",
      "form.lifecycle.grievance",
      "form.lifecycle.exit_interview",
      "form.lifecycle.training_program",
      "form.lifecycle.training_event",
      "form.lifecycle.training_feedback",
      "form.lifecycle.daily_work_summary",
      "workflow.lifecycle.onboarding_status",
      "workflow.lifecycle.boarding_activity_status",
      "workflow.lifecycle.separation_status",
      "workflow.lifecycle.promotion_status",
      "workflow.lifecycle.transfer_status",
      "workflow.lifecycle.grievance_status",
      "workflow.lifecycle.training_event_status",
      "workflow.lifecycle.daily_work_summary_status",
      "approval_rule.lifecycle.onboarding_hr",
      "approval_rule.lifecycle.separation_manager_review",
      "approval_rule.lifecycle.separation_hr_final",
      "approval_rule.lifecycle.promotion_manager",
      "approval_rule.lifecycle.promotion_hr_final",
      "approval_rule.lifecycle.transfer_manager",
      "approval_rule.lifecycle.transfer_hr_final",
      "approval_rule.lifecycle.grievance_assignment",
      "approval_rule.lifecycle.grievance_resolution",
      "approval_rule.lifecycle.training_feedback_review",
      "approval_rule.lifecycle.daily_work_summary_manager_review",
      "report.lifecycle.onboarding_progress",
      "report.lifecycle.separation_pipeline",
      "report.lifecycle.promotion_transfer_summary",
      "report.lifecycle.grievance_summary",
      "report.lifecycle.training_participation",
      "report.lifecycle.daily_work_summary",
    ];

    for (const key of expectedKeys) {
      const item = byKey.get(key);
      assert.ok(item, `${key} should be registered for Phase 7 lifecycle`);
      assert.ok(item.source_ref, `${key} should include source_ref`);
    }
  });

  it("Phase 8 Employee Self-Service metadata keys are registered with source references", async () => {
    const files = await fg("**/*.{yaml,yml}", {
      cwd: metadataRoot,
      absolute: true,
      ignore: ["allowlists/**"],
    });

    const items = files.flatMap((file) => asArray(parse(readFileSync(file, "utf8"))));
    const byKey = new Map(items.map((item) => [String(item.key), item]));
    const expectedKeys = [
      "permission.self_service.view",
      "permission.self_service.profile.view",
      "permission.self_service.notifications.view",
      "permission.self_service.notifications.acknowledge",
      "permission.self_service.notifications.manage",
      "route.self_service.overview",
      "route.self_service.notifications",
      "form.self_service.notification",
      "workflow.self_service.notification_status",
    ];

    for (const key of expectedKeys) {
      const item = byKey.get(key);
      assert.ok(item, `${key} should be registered for Phase 8 self-service`);
      assert.ok(item.source_ref, `${key} should include source_ref`);
    }
  });

  it("Phase 9 Reports, Dashboards, Notifications, and Automation metadata keys are registered with source references", async () => {
    const files = await fg("**/*.{yaml,yml}", {
      cwd: metadataRoot,
      absolute: true,
      ignore: ["allowlists/**"],
    });

    const items = files.flatMap((file) => asArray(parse(readFileSync(file, "utf8"))));
    const byKey = new Map(items.map((item) => [String(item.key), item]));
    const expectedKeys = [
      "permission.reports.view",
      "permission.reports.export",
      "permission.dashboards.view",
      "permission.notification_rules.view",
      "permission.notification_rules.manage",
      "permission.automation_rules.view",
      "permission.automation_rules.manage",
      "permission.automation_executions.view",
      "permission.automation_executions.run",
      "route.reports.overview",
      "route.reports.dashboards",
      "form.reports.report_run",
      "form.reports.dashboard_widget",
      "form.reports.notification_rule",
      "form.reports.automation_rule",
      "workflow.reports.report_run_status",
      "workflow.reports.notification_rule_status",
      "workflow.reports.automation_rule_status",
      "workflow.reports.automation_execution_status",
      "report.people.employee_information",
      "report.people.employee_analytics",
      "report.attendance.monthly_sheet",
      "report.attendance.shift_attendance",
      "report.payroll.bank_remittance",
      "report.recruitment.analytics",
      "report.events.birthdays_anniversaries",
    ];

    for (const key of expectedKeys) {
      const item = byKey.get(key);
      assert.ok(item, `${key} should be registered for Phase 9 reports`);
      assert.ok(item.source_ref, `${key} should include source_ref`);
    }
  });

  it("Phase 10 Recruitment Unification metadata keys are registered with source references", async () => {
    const files = await fg("**/*.{yaml,yml}", {
      cwd: metadataRoot,
      absolute: true,
      ignore: ["allowlists/**"],
    });

    const items = files.flatMap((file) => asArray(parse(readFileSync(file, "utf8"))));
    const byKey = new Map(items.map((item) => [String(item.key), item]));
    const expectedKeys = [
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
      "route.recruitment.overview",
      "route.recruitment.appointments",
      "form.recruitment.job_opening",
      "form.recruitment.job_applicant",
      "form.recruitment.interview_feedback",
      "form.recruitment.job_offer",
      "form.recruitment.job_requisition",
      "form.recruitment.status_mapping",
      "form.recruitment.appointment_letter_template",
      "form.recruitment.appointment_letter",
      "form.recruitment.onboarding_handoff",
      "workflow.recruitment.job_opening_status",
      "workflow.recruitment.applicant_status",
      "workflow.recruitment.interview_status",
      "workflow.recruitment.offer_status",
      "workflow.recruitment.appointment_letter_status",
      "workflow.recruitment.handoff_status",
      "approval_rule.recruitment.job_requisition_hod",
      "approval_rule.recruitment.offer_hr_final",
      "approval_rule.recruitment.appointment_letter_hr",
      "approval_rule.recruitment.onboarding_handoff_hr",
      "report.recruitment.pipeline",
      "report.recruitment.appointment_letters",
      "report.recruitment.handoff_readiness",
      "import_alias.job.title",
      "import_alias.candidate.mobile",
      "import_alias.job.opening_title",
      "import_alias.job.requisition_code",
      "import_alias.job.department",
      "import_alias.job.hiring_manager",
      "import_alias.candidate.applicant_name",
      "import_alias.candidate.email",
      "import_alias.candidate.source",
      "import_alias.candidate.job_opening",
      "import_alias.recruitment.appointment_letter.candidate_id",
    ];

    for (const key of expectedKeys) {
      const item = byKey.get(key);
      assert.ok(item, `${key} should be registered for Phase 10 recruitment`);
      assert.ok(item.source_ref, `${key} should include source_ref`);
    }
  });
});
