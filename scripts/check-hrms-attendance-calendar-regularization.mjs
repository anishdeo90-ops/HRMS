import { existsSync, readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

const calendarRoute = readFileSync("app/api/hrms/calendar/route.ts", "utf8");
const calendarPage = readFileSync("app/(app)/hrms/calendar/page.tsx", "utf8");
const inOutPage = readFileSync("app/(app)/hrms/me/in-out/page.tsx", "utf8");
const correctionModal = readFileSync("components/hrms/attendance-correction-modal.tsx", "utf8");
const status = readFileSync("lib/hrms/status.ts", "utf8");
const migrationPath = "supabase/migrations/20260819080938_hrms_attendance_regularization_calendar.sql";
const decision = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";
const allMigrations = readdirSync("supabase/migrations")
  .filter((name) => name.endsWith(".sql"))
  .map((name) => readFileSync(`supabase/migrations/${name}`, "utf8"))
  .join("\n");

assert(calendarRoute.includes("attendance_days"), "calendar API must read attendance_days");
assert(calendarRoute.includes("attendance_punches"), "calendar API must include punch rows");
assert(calendarRoute.includes('kind: "attendance"'), "calendar must emit attendance events");
assert(calendarPage.includes('"attendance"'), "calendar page must expose an attendance layer");
assert(calendarPage.includes("Apply Approval"), "calendar day must offer attendance correction");
assert(calendarPage.includes("CorrectionModal"), "calendar must reuse the correction modal");

assert(inOutPage.includes("CorrectionModal"), "in-out page must expose correction modal");
assert(correctionModal.includes('/api/hrms/attendance/regularizations'), "correction must submit through approval API");
assert(correctionModal.includes("toast.error"), "correction submit errors must not crash the page");
assert(correctionModal.includes("sm:grid-cols-2"), "correction modal must use a tidy two-column form layout");
assert(!correctionModal.includes("<FormGrid>"), "correction modal must not use the generic grid that creates a three-column row here");
assert(correctionModal.includes('request_type: "early_in_out"'), "correction must use early_in_out approval type");
assert(correctionModal.includes("previous_first_in") && correctionModal.includes("requested_first_in"), "correction must preserve old and requested in-time");
assert(correctionModal.includes("previous_last_out") && correctionModal.includes("requested_last_out"), "correction must preserve old and requested out-time");

assert(status.includes("dayShortLabel"), "attendance statuses must have short labels");
for (const label of ["P", "AB", "WO", "HP/HA"]) assert(status.includes(`"${label}"`), `missing ${label} label`);

assert(decision.includes("drop constraint if exists approval_steps_request_id_sequence_key"), "approval steps must allow manager + HR on same sequence");
assert(decision.includes("request_type in ('regularization','on_duty','wfh','early_in_out')"), "approved early_in_out must apply attendance");
assert(decision.includes("requested_first_in") && decision.includes("requested_last_out"), "approval must apply requested punch times");
assert(allMigrations.includes("distinct on (approver_id)"), "approval creation must dedupe manager/hr approvers");
assert(allMigrations.includes("v_second_approver_id := case"), "duplicate HR approver must be routed to admin");
assert(allMigrations.includes("v_hr_manager_id <> v_approver_id"), "HR manager should only be the second approver when not already first approver");

console.log("HRMS attendance calendar regularization check passed");
