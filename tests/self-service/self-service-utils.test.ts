import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAcknowledgeEmployeeNotification,
  canManageEmployeeNotifications,
  canUseSelfService,
  canViewEmployeeNotifications,
  canViewSelfServiceProfile,
} from "../../lib/hrms/self-service-authorization";
import { normalizeNotificationPayload, notificationStatusPatch } from "../../lib/hrms/self-service";

describe("self-service helpers", () => {
  it("allows employees to use only their own self-service profile", () => {
    const profile = { id: "profile-1", employee_id: "employee-1", role: "employee", is_active: true };

    assert.equal(canUseSelfService(profile, { employee_id: "employee-1", profile_id: "profile-1" }), true);
    assert.equal(canViewSelfServiceProfile(profile, { employee_id: "employee-1", profile_id: "profile-1" }), true);
    assert.equal(canUseSelfService(profile, { employee_id: "employee-2", profile_id: "profile-2" }), false);
  });

  it("keeps notification management limited while allowing own acknowledgement", () => {
    const employee = { id: "profile-1", employee_id: "employee-1", role: "employee", is_active: true };
    const admin = { id: "profile-2", role: "admin", is_active: true };
    const target = { employee_id: "employee-1", profile_id: "profile-1" };

    assert.equal(canViewEmployeeNotifications(employee, target), true);
    assert.equal(canAcknowledgeEmployeeNotification(employee, target), true);
    assert.equal(canManageEmployeeNotifications(employee), false);
    assert.equal(canManageEmployeeNotifications(admin), true);
  });

  it("normalizes notification payloads and status patches", () => {
    const payload = normalizeNotificationPayload({
      employee_id: "employee-1",
      title: "  Leave approved  ",
      category: "leave",
      severity: "success",
      status: "read",
    });

    assert.equal(payload.title, "Leave approved");
    assert.equal(payload.category, "leave");
    assert.equal(payload.severity, "success");
    assert.equal(payload.status, "read");
    assert.ok(payload.read_at);

    assert.deepEqual(notificationStatusPatch("unread"), { status: "unread", read_at: null, archived_at: null });
    assert.equal(notificationStatusPatch("invalid"), null);
  });
});
