export type AttendanceEventType = "in" | "out";
export type AttendanceDayStatus = "present" | "absent" | "half_day" | "late" | "on_duty" | "holiday" | "weekly_off";
export type AttendanceRequestStatus = "draft" | "submitted" | "approved" | "rejected" | "cancelled";
export type CheckInSource = "web" | "import" | "admin";
export type RosterEntryStatus = "scheduled" | "cancelled";

export type AttendanceCheckInEvent = {
  id?: string | null;
  event_type?: AttendanceEventType | string | null;
  check_time?: string | Date | null;
  created_at?: string | Date | null;
};

export type ShiftAssignmentWindow = {
  id?: string | null;
  employee_id?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active?: boolean | null;
};

type AttendancePayload = Record<string, unknown>;

const ATTENDANCE_DAY_STATUSES = new Set<AttendanceDayStatus>([
  "present",
  "absent",
  "half_day",
  "late",
  "on_duty",
  "holiday",
  "weekly_off",
]);

const REQUEST_STATUSES = new Set<AttendanceRequestStatus>(["draft", "submitted", "approved", "rejected", "cancelled"]);
const CHECK_IN_EVENT_TYPES = new Set<AttendanceEventType>(["in", "out"]);
const CHECK_IN_SOURCES = new Set<CheckInSource>(["web", "import", "admin"]);
const ROSTER_STATUSES = new Set<RosterEntryStatus>(["scheduled", "cancelled"]);

const ATTENDANCE_READ_ONLY_FIELDS = [
  "id",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "approver_employee_id",
  "approver_comment",
  "decided_at",
] as const;

const CHECK_IN_WRITABLE_FIELDS = [
  "employee_id",
  "event_type",
  "check_time",
  "source",
  "shift_type_id",
  "location_id",
  "notes",
] as const;

const ATTENDANCE_WRITABLE_FIELDS = [
  "employee_id",
  "attendance_day_id",
  "attendance_date",
  "status",
  "requested_status",
  "requested_check_in",
  "requested_check_out",
  "first_check_in",
  "last_check_out",
  "total_work_minutes",
  "shift_type_id",
  "location_id",
  "source",
  "remarks",
  "reason",
] as const;

const SHIFT_TYPE_FIELDS = ["code", "name", "start_time", "end_time", "grace_minutes", "break_minutes", "is_night_shift", "is_active"] as const;
const SHIFT_ASSIGNMENT_FIELDS = ["employee_id", "shift_type_id", "location_id", "effective_from", "effective_to", "is_active"] as const;
const ROSTER_FIELDS = ["employee_id", "shift_type_id", "location_id", "roster_date", "status"] as const;

function cleanString(value: unknown) {
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : undefined;
}

function pickCleanFields(input: AttendancePayload, fields: readonly string[]) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = cleanString(input[field]);
    if (value !== undefined && value !== null) payload[field] = value;
  }
  return payload;
}

function toTime(value: string | Date | null | undefined) {
  if (!value) return Number.NaN;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : Number.NaN;
}

function normalizeDateOnly(value: string | null | undefined) {
  const cleaned = cleanString(value);
  if (typeof cleaned !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return undefined;
  const time = Date.parse(`${cleaned}T00:00:00.000Z`);
  return Number.isFinite(time) ? cleaned : undefined;
}

function normalizeRequestStatus(value: unknown) {
  const cleaned = cleanString(value);
  if (typeof cleaned !== "string") return undefined;
  const normalized = cleaned.toLowerCase().replace(/[\s-]+/g, "_");
  return REQUEST_STATUSES.has(normalized as AttendanceRequestStatus) ? normalized : undefined;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA <= endB && startB <= endA;
}

export function normalizeAttendanceDayStatus(value: unknown) {
  const cleaned = cleanString(value);
  if (typeof cleaned !== "string") return undefined;
  const normalized = cleaned.toLowerCase().replace(/[\s-]+/g, "_");
  return ATTENDANCE_DAY_STATUSES.has(normalized as AttendanceDayStatus) ? normalized : undefined;
}

export function findOpenCheckIn(events: AttendanceCheckInEvent[]) {
  const latest = events
    .filter((event) => event.event_type === "in" || event.event_type === "out")
    .filter((event) => Number.isFinite(toTime(event.check_time ?? event.created_at)))
    .sort((left, right) => toTime(right.check_time ?? right.created_at) - toTime(left.check_time ?? left.created_at))[0];

  return latest?.event_type === "in" ? latest : null;
}

export function getNextCheckInEventType(events: AttendanceCheckInEvent[]) {
  return findOpenCheckIn(events) ? "out" : "in";
}

export function validateCheckInSequence(events: AttendanceCheckInEvent[], nextEventType: AttendanceEventType) {
  const openCheckIn = findOpenCheckIn(events);
  if (nextEventType === "in" && openCheckIn) return { valid: false, reason: "Open check-in already exists." };
  if (nextEventType === "out" && !openCheckIn) return { valid: false, reason: "No open check-in to close." };
  return { valid: true };
}

export function normalizeCheckInPayload(input: AttendancePayload) {
  const payload = pickCleanFields(input, CHECK_IN_WRITABLE_FIELDS);
  const eventType = typeof payload.event_type === "string" ? payload.event_type.toLowerCase() : undefined;
  payload.event_type = CHECK_IN_EVENT_TYPES.has(eventType as AttendanceEventType) ? eventType : "in";

  const source = typeof payload.source === "string" ? payload.source.toLowerCase() : undefined;
  payload.source = CHECK_IN_SOURCES.has(source as CheckInSource) ? source : "web";
  return payload;
}

export function stripAttendanceReadOnlyFields(input: AttendancePayload) {
  const payload: Record<string, unknown> = {};
  for (const field of ATTENDANCE_WRITABLE_FIELDS) {
    const value = cleanString(input[field]);
    if (value === undefined) continue;
    if (field === "status" || field === "requested_status") {
      const normalized = normalizeAttendanceDayStatus(value) ?? normalizeRequestStatus(value);
      if (normalized) payload[field] = normalized;
      continue;
    }
    payload[field] = value;
  }

  for (const field of ATTENDANCE_READ_ONLY_FIELDS) delete payload[field];
  return payload;
}

export const stripAttendanceCorrectionReadOnlyFields = stripAttendanceReadOnlyFields;

export function normalizeCorrectionRequestPayload(input: AttendancePayload) {
  const payload = stripAttendanceReadOnlyFields(input);
  delete payload.status;

  const requestedStatus = normalizeAttendanceDayStatus(input.requested_status);
  if (requestedStatus) payload.requested_status = requestedStatus;

  const requestStatus = normalizeRequestStatus(input.status);
  payload.status = requestStatus ?? "draft";

  if (!payload.attendance_day_id) delete payload.attendance_day_id;
  if (!payload.requested_check_in) delete payload.requested_check_in;
  if (!payload.requested_check_out) delete payload.requested_check_out;
  return payload;
}

export function normalizeShiftTypePayload(input: AttendancePayload) {
  return pickCleanFields(input, SHIFT_TYPE_FIELDS);
}

export function normalizeShiftAssignmentPayload(input: AttendancePayload) {
  return pickCleanFields(input, SHIFT_ASSIGNMENT_FIELDS);
}

export function normalizeRosterEntryPayload(input: AttendancePayload) {
  const payload = pickCleanFields(input, ROSTER_FIELDS);
  const status = typeof payload.status === "string" ? payload.status.toLowerCase() : undefined;
  payload.status = ROSTER_STATUSES.has(status as RosterEntryStatus) ? status : "scheduled";
  return payload;
}

export function hasShiftAssignmentOverlap(candidate: ShiftAssignmentWindow, existingAssignments: ShiftAssignmentWindow[]) {
  if (!candidate.employee_id || !candidate.effective_from) return false;
  const candidateStart = Date.parse(`${candidate.effective_from}T00:00:00.000Z`);
  const candidateEnd = candidate.effective_to ? Date.parse(`${candidate.effective_to}T00:00:00.000Z`) : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(candidateStart) || Number.isNaN(candidateEnd) || candidateEnd < candidateStart) return false;

  return existingAssignments.some((assignment) => {
    if (assignment.is_active === false) return false;
    if (candidate.id && assignment.id === candidate.id) return false;
    if (assignment.employee_id !== candidate.employee_id || !assignment.effective_from) return false;

    const assignmentStart = Date.parse(`${assignment.effective_from}T00:00:00.000Z`);
    const assignmentEnd = assignment.effective_to ? Date.parse(`${assignment.effective_to}T00:00:00.000Z`) : Number.POSITIVE_INFINITY;
    if (!Number.isFinite(assignmentStart) || Number.isNaN(assignmentEnd) || assignmentEnd < assignmentStart) return false;
    return rangesOverlap(candidateStart, candidateEnd, assignmentStart, assignmentEnd);
  });
}

export function validateRosterDate(rosterDate: string, assignment?: Pick<ShiftAssignmentWindow, "effective_from" | "effective_to"> | null) {
  const normalizedRosterDate = normalizeDateOnly(rosterDate);
  if (!normalizedRosterDate) return { valid: false, reason: "Roster date must be a valid ISO date." };
  if (!assignment?.effective_from) return { valid: true };

  const rosterTime = Date.parse(`${normalizedRosterDate}T00:00:00.000Z`);
  const assignmentStart = Date.parse(`${assignment.effective_from}T00:00:00.000Z`);
  const assignmentEnd = assignment.effective_to ? Date.parse(`${assignment.effective_to}T00:00:00.000Z`) : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(assignmentStart) || Number.isNaN(assignmentEnd) || !rangesOverlap(rosterTime, rosterTime, assignmentStart, assignmentEnd)) {
    return { valid: false, reason: "Roster date is outside the shift assignment window." };
  }

  return { valid: true };
}

export function calculateOvertimeMinutes(startTime: string | Date | null | undefined, endTime: string | Date | null | undefined, breakMinutes = 0) {
  const start = toTime(startTime);
  const end = toTime(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const grossMinutes = Math.floor((end - start) / 60000);
  return Math.max(0, grossMinutes - Math.max(0, Math.floor(breakMinutes)));
}
