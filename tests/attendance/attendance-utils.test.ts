import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateOvertimeMinutes,
  findOpenCheckIn,
  getNextCheckInEventType,
  hasShiftAssignmentOverlap,
  normalizeAttendanceDayStatus,
  normalizeCheckInPayload,
  normalizeCorrectionRequestPayload,
  normalizeRosterEntryPayload,
  normalizeShiftAssignmentPayload,
  normalizeShiftTypePayload,
  stripAttendanceCorrectionReadOnlyFields,
  stripAttendanceReadOnlyFields,
  validateCheckInSequence,
  validateRosterDate,
} from "../../lib/hrms/attendance";
import {
  ATTENDANCE_PERMISSION_KEYS,
  canApproveAttendanceCorrection,
  canApproveAttendance,
  canApproveOvertime,
  canApproveShiftRequest,
  canCheckIn,
  canCheckInAttendance,
  canManageAttendance,
  canManageOvertime,
  canManageShifts,
  canRequestAttendanceCorrection,
  canViewAttendance,
  canViewShifts,
  hasAttendanceCapability,
} from "../../lib/hrms/attendance-authorization";

describe("Attendance pure helpers", () => {
  it("detects the current open check-in from the latest event", () => {
    assert.deepEqual(
      findOpenCheckIn([
        { id: "out-1", event_type: "out", check_time: "2026-05-11T12:00:00.000Z" },
        { id: "in-1", event_type: "in", check_time: "2026-05-11T09:00:00.000Z" },
        { id: "in-2", event_type: "in", check_time: "2026-05-11T13:00:00.000Z" },
      ]),
      { id: "in-2", event_type: "in", check_time: "2026-05-11T13:00:00.000Z" },
    );

    assert.equal(
      findOpenCheckIn([
        { event_type: "in", check_time: "2026-05-11T09:00:00.000Z" },
        { event_type: "out", check_time: "2026-05-11T18:00:00.000Z" },
      ]),
      null,
    );
  });

  it("enforces check-in and check-out sequencing", () => {
    assert.equal(getNextCheckInEventType([]), "in");
    assert.equal(getNextCheckInEventType([{ event_type: "in", check_time: "2026-05-11T09:00:00.000Z" }]), "out");
    assert.deepEqual(validateCheckInSequence([], "in"), { valid: true });
    assert.deepEqual(validateCheckInSequence([], "out"), { valid: false, reason: "No open check-in to close." });
    assert.deepEqual(
      validateCheckInSequence([{ event_type: "in", check_time: "2026-05-11T09:00:00.000Z" }], "in"),
      { valid: false, reason: "Open check-in already exists." },
    );
    assert.deepEqual(
      validateCheckInSequence([{ event_type: "in", check_time: "2026-05-11T09:00:00.000Z" }], "out"),
      { valid: true },
    );
  });

  it("normalizes check-in payloads through governed event/source values", () => {
    assert.deepEqual(
      normalizeCheckInPayload({
        employee_id: " employee-1 ",
        event_type: "OUT",
        check_time: " 2026-05-11T18:00:00.000Z ",
        source: "ADMIN",
        notes: "  forgot earlier ",
        created_by: "profile-1",
      }),
      {
        employee_id: "employee-1",
        event_type: "out",
        check_time: "2026-05-11T18:00:00.000Z",
        source: "admin",
        notes: "forgot earlier",
      },
    );
  });

  it("normalizes governed attendance day statuses", () => {
    assert.equal(normalizeAttendanceDayStatus(" Half Day "), "half_day");
    assert.equal(normalizeAttendanceDayStatus("weekly-off"), "weekly_off");
    assert.equal(normalizeAttendanceDayStatus("ON DUTY"), "on_duty");
    assert.equal(normalizeAttendanceDayStatus("unknown"), undefined);
  });

  it("normalizes correction request payloads and strips read-only fields", () => {
    const payload = normalizeCorrectionRequestPayload({
      id: "request-1",
      employee_id: " employee-1 ",
      attendance_day_id: "",
      attendance_date: " 2026-05-11 ",
      requested_status: " Half Day ",
      requested_check_in: " 2026-05-11T09:05:00.000Z ",
      requested_check_out: "",
      reason: "  Missed morning punch  ",
      status: "submitted",
      approver_comment: "nope",
      created_at: "2026-05-11T09:00:00.000Z",
    });

    assert.deepEqual(payload, {
      employee_id: "employee-1",
      attendance_date: "2026-05-11",
      requested_status: "half_day",
      requested_check_in: "2026-05-11T09:05:00.000Z",
      reason: "Missed morning punch",
      status: "submitted",
    });

    assert.deepEqual(
      stripAttendanceReadOnlyFields({
        id: "day-1",
        employee_id: "employee-1",
        attendance_date: "2026-05-11",
        status: "Present",
        first_check_in: "2026-05-11T09:00:00.000Z",
        created_at: "2026-05-11T09:00:00.000Z",
        updated_by: "profile-1",
      }),
      {
        employee_id: "employee-1",
        attendance_date: "2026-05-11",
        status: "present",
        first_check_in: "2026-05-11T09:00:00.000Z",
      },
    );
    assert.deepEqual(stripAttendanceCorrectionReadOnlyFields({ id: "request-1", reason: "  Fix punch " }), { reason: "Fix punch" });
  });

  it("normalizes shift setup and roster payloads", () => {
    assert.deepEqual(normalizeShiftTypePayload({ code: " day ", name: " Day ", ignored: true }), { code: "day", name: "Day" });
    assert.deepEqual(
      normalizeShiftAssignmentPayload({ employee_id: " employee-1 ", shift_type_id: " shift-1 ", created_at: "no" }),
      { employee_id: "employee-1", shift_type_id: "shift-1" },
    );
    assert.deepEqual(normalizeRosterEntryPayload({ employee_id: "employee-1", roster_date: "2026-05-11", status: "bad" }), {
      employee_id: "employee-1",
      roster_date: "2026-05-11",
      status: "scheduled",
    });
  });

  it("detects shift assignment overlaps by employee and inclusive date ranges", () => {
    const existing = [
      { id: "old", employee_id: "employee-1", effective_from: "2026-05-01", effective_to: "2026-05-15", is_active: true },
      { id: "other", employee_id: "employee-2", effective_from: "2026-05-01", effective_to: null, is_active: true },
      { id: "inactive", employee_id: "employee-1", effective_from: "2026-06-01", effective_to: null, is_active: false },
    ];

    assert.equal(hasShiftAssignmentOverlap({ employee_id: "employee-1", effective_from: "2026-05-15", effective_to: "2026-05-20" }, existing), true);
    assert.equal(hasShiftAssignmentOverlap({ id: "old", employee_id: "employee-1", effective_from: "2026-05-10", effective_to: "2026-05-20" }, existing), false);
    assert.equal(hasShiftAssignmentOverlap({ employee_id: "employee-1", effective_from: "2026-05-16", effective_to: null }, existing), false);
  });

  it("validates roster dates against assignment windows", () => {
    assert.deepEqual(validateRosterDate("2026-05-11"), { valid: true });
    assert.deepEqual(validateRosterDate("not-a-date"), { valid: false, reason: "Roster date must be a valid ISO date." });
    assert.deepEqual(
      validateRosterDate("2026-05-01", { effective_from: "2026-05-02", effective_to: "2026-05-31" }),
      { valid: false, reason: "Roster date is outside the shift assignment window." },
    );
  });

  it("calculates positive overtime minutes after unpaid breaks", () => {
    assert.equal(calculateOvertimeMinutes("2026-05-11T18:00:00.000Z", "2026-05-11T20:15:30.000Z"), 135);
    assert.equal(calculateOvertimeMinutes("2026-05-11T18:00:00.000Z", "2026-05-11T20:15:00.000Z", 30), 105);
    assert.equal(calculateOvertimeMinutes("2026-05-11T20:00:00.000Z", "2026-05-11T19:00:00.000Z"), 0);
  });
});

describe("Attendance authorization helpers", () => {
  it("exports Phase 4 permission keys", () => {
    assert.equal(ATTENDANCE_PERMISSION_KEYS.checkIn, "permission.attendance.check_in");
    assert.equal(ATTENDANCE_PERMISSION_KEYS.correctionsApprove, "permission.attendance.corrections.approve");
    assert.equal(ATTENDANCE_PERMISSION_KEYS.shiftsManage, "permission.shifts.manage");
    assert.equal(ATTENDANCE_PERMISSION_KEYS.overtimeApprove, "permission.overtime.approve");
  });

  it("honors explicit capabilities and inactive profiles fail closed", () => {
    assert.equal(hasAttendanceCapability({ permissions: ["permission.attendance.view_team"] }, "permission.attendance.view_team"), true);
    assert.equal(hasAttendanceCapability({ is_active: false, permissions: ["permission.attendance.view_team"] }, "permission.attendance.view_team"), false);
  });

  it("checks self, team, manager, and HR attendance access", () => {
    assert.equal(canManageAttendance({ role: "hr_manager" }), true);
    assert.equal(canViewAttendance({ role: "employee", id: "profile-1" }, { profile_id: "profile-1" }), true);
    assert.equal(canViewAttendance({ role: "hod", id: "manager-profile" }, { reporting_manager_profile_id: "manager-profile" }), true);
    assert.equal(canViewAttendance({ permissions: ["permission.attendance.view_team"], id: "manager-profile" }, { reporting_manager_profile_id: "manager-profile" }), true);
    assert.equal(canViewAttendance({ permissions: ["permission.attendance.view_team"], id: "profile-3" }, { profile_id: "profile-2" }), false);
    assert.equal(canViewAttendance({ role: "employee", id: "profile-1" }, { profile_id: "profile-2" }), false);
  });

  it("checks check-in, correction, shift, and overtime capabilities", () => {
    const self = { role: "employee", id: "profile-1", permissions: ["permission.attendance.check_in", "permission.attendance.corrections.request"] };
    const employee = { profile_id: "profile-1" };

    assert.equal(canCheckInAttendance(self, employee), true);
    assert.equal(canCheckIn(self, employee), true);
    assert.equal(canRequestAttendanceCorrection(self, employee), true);
    assert.equal(canApproveAttendanceCorrection({ role: "hod", id: "manager-profile" }, { reporting_manager_profile_id: "manager-profile" }), true);
    assert.equal(canApproveAttendanceCorrection({ permissions: ["permission.attendance.corrections.approve"], id: "profile-2" }, employee), false);
    assert.equal(canApproveAttendanceCorrection({ department_approvals: [{ department_id: "dept-1", approval_scope: "attendance_correction" }] }, { department_id: "dept-1" }), true);
    assert.equal(canApproveAttendance({ role: "hod", id: "manager-profile" }, { reporting_manager_profile_id: "manager-profile" }), true);
    assert.equal(canViewShifts({ role: "employee", permissions: ["permission.shifts.view"] }), true);
    assert.equal(canManageShifts({ role: "hr_user", permissions: ["permission.shifts.manage"] }), true);
    assert.equal(canApproveShiftRequest({ permissions: ["permission.shifts.approve"] }), true);
    assert.equal(canApproveShiftRequest({ permissions: ["permission.shifts.approve"], id: "profile-2" }, employee), false);
    assert.equal(canApproveShiftRequest({ department_approvals: [{ department_id: "dept-1", approval_scope: "shift_request" }] }, { department_id: "dept-1" }), true);
    assert.equal(canManageOvertime({ permissions: ["permission.overtime.manage"] }), true);
    assert.equal(canApproveOvertime({ role: "hr_manager" }), true);
    assert.equal(canApproveOvertime({ permissions: ["permission.overtime.approve"], id: "profile-2" }, employee), false);
    assert.equal(canApproveOvertime({ department_approvals: [{ department_id: "dept-1", approval_scope: "overtime" }] }, { department_id: "dept-1" }), true);
  });
});
