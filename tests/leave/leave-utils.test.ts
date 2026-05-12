import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLedgerEntry,
  buildLedgerReversalEntry,
  calculateLeaveUnits,
  normalizeLeaveApplicationPayload,
  validateEncashmentEligibility,
  validateLeaveBalanceAvailable,
  validateLeaveDateRange,
  validateNoOverlappingLeaveApplication,
} from "@/lib/hrms/leave";
import {
  LEAVE_PERMISSION_KEYS,
  canApproveLeave,
  canRequestLeave,
  canViewLeave,
  canViewLeaveLedger,
} from "@/lib/hrms/leave-authorization";

describe("Leave pure helpers", () => {
  it("calculates full-day and half-day leave units from inclusive date ranges", () => {
    assert.equal(calculateLeaveUnits("2026-05-11", "2026-05-11"), 1);
    assert.equal(calculateLeaveUnits("2026-05-11", "2026-05-13"), 3);
    assert.equal(calculateLeaveUnits("2026-05-11", "2026-05-13", true), 2.5);
    assert.equal(calculateLeaveUnits("2026-05-13", "2026-05-11"), 0);
  });

  it("validates leave date ranges and normalizes application payloads", () => {
    assert.deepEqual(validateLeaveDateRange("2026-05-11", "2026-05-12"), { valid: true });
    assert.equal(validateLeaveDateRange("2026-05-12", "2026-05-11").valid, false);
    const payload = normalizeLeaveApplicationPayload({
      employee_id: "emp-1",
      leave_type_key: "leave_type.earned_leave",
      from_date: "2026-05-11",
      to_date: "2026-05-12",
      half_day: true,
      status: "Submitted",
      approver_employee_id: "readonly",
    });
    assert.equal(payload.total_days, 1.5);
    assert.equal(payload.status, "submitted");
    assert.equal(payload.approver_employee_id, undefined);
  });

  it("detects overlapping active leave applications", () => {
    const result = validateNoOverlappingLeaveApplication(
      { employee_id: "emp-1", from_date: "2026-05-11", to_date: "2026-05-12" },
      [
        { employee_id: "emp-1", from_date: "2026-05-12", to_date: "2026-05-13", status: "submitted" },
        { employee_id: "emp-1", from_date: "2026-05-14", to_date: "2026-05-15", status: "cancelled" },
      ],
    );
    assert.equal(result.valid, false);
  });

  it("validates balances, encashment eligibility, and ledger reversal entries", () => {
    assert.equal(validateLeaveBalanceAvailable(4, 3).valid, true);
    assert.equal(validateLeaveBalanceAvailable(1, 3).valid, false);
    assert.equal(validateLeaveBalanceAvailable(1, 3, { allowNegative: true, maxNegativeBalance: 2 }).valid, true);
    assert.equal(validateEncashmentEligibility({ encashment: true, availableBalance: 5, requestedDays: 2, encashmentCap: 3 }).valid, true);
    assert.equal(validateEncashmentEligibility({ encashment: false, availableBalance: 5, requestedDays: 2 }).valid, false);

    const entry = buildLedgerEntry({
      employee_id: "emp-1",
      leave_type_key: "leave_type.earned_leave",
      source_type: "leave_application",
      source_id: "source-1",
      source_action: "approve",
      days_delta: -2,
      entry_type: "application",
    });
    const reversal = buildLedgerReversalEntry({ ...entry, id: "ledger-1" }, "cancel");
    assert.equal(reversal.days_delta, 2);
    assert.equal(reversal.is_reversal, true);
    assert.equal(reversal.reversal_of_id, "ledger-1");
  });
});

describe("Leave authorization helpers", () => {
  const employee = { id: "emp-1", profile_id: "profile-1", department_id: "dept-1", reporting_manager_profile_id: "manager-1" };

  it("allows employee self-service without team approval power", () => {
    const profile = { id: "profile-1", role: "employee", is_active: true, permissions: [LEAVE_PERMISSION_KEYS.viewSelf, LEAVE_PERMISSION_KEYS.apply] };
    assert.equal(canViewLeave(profile, employee), true);
    assert.equal(canRequestLeave(profile, employee), true);
    assert.equal(canApproveLeave(profile, employee), false);
  });

  it("scopes managers and department approvers to their targets", () => {
    const manager = { id: "manager-1", role: "hod", is_active: true, permissions: [LEAVE_PERMISSION_KEYS.viewTeam, LEAVE_PERMISSION_KEYS.approve] };
    const approver = {
      id: "approver-profile",
      role: "leave_approver",
      is_active: true,
      permissions: [LEAVE_PERMISSION_KEYS.approve],
      department_approvals: [{ department_id: "dept-1", approval_scope: "leave_application" }],
    };
    assert.equal(canViewLeave(manager, employee), true);
    assert.equal(canApproveLeave(manager, employee), true);
    assert.equal(canApproveLeave(approver, employee), true);
    assert.equal(canApproveLeave(approver, { ...employee, department_id: "dept-2" }), false);
  });

  it("does not let setup-only permissions approve leave", () => {
    const setupOnly = {
      id: "setup-profile",
      role: "hr_user",
      is_active: true,
      permissions: [LEAVE_PERMISSION_KEYS.typesManage, LEAVE_PERMISSION_KEYS.policiesManage],
    };
    assert.equal(canApproveLeave(setupOnly, employee), false);
  });

  it("fails closed for inactive profiles and ledger access without scope", () => {
    const inactive = { id: "profile-1", role: "employee", is_active: false, permissions: [LEAVE_PERMISSION_KEYS.ledgerView] };
    assert.equal(canViewLeave(inactive, employee), false);
    assert.equal(canViewLeaveLedger(inactive, employee), false);
  });
});
