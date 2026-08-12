/**
 * The status vocabulary — `docs/hrms/10-foundation-spec.md §8`.
 *
 * One vocabulary for every request type in the approval engine. The reference
 * product used "Accepted" on one screen and "Approved" on another, and three
 * different column names for the same status on a single grid. We do not.
 */

export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export const REQUEST_STATUSES: RequestStatus[] = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
];

/** Tailwind classes per status. Badge colour is derived, never hand-typed. */
const REQUEST_TONE: Record<RequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export function requestTone(status: string): string {
  return REQUEST_TONE[status as RequestStatus] ?? "bg-gray-100 text-gray-500";
}

/**
 * Attendance day status. `payable_fraction` is stored alongside it — the HRMS →
 * Payroll contract (`§6.2a`) — and is never recomputed downstream.
 */
export type DayStatus =
  | "present"
  | "half_day"
  | "absent"
  | "weekly_off"
  | "holiday"
  | "on_leave"
  | "on_duty"
  | "wfh";

const DAY_TONE: Record<DayStatus, string> = {
  present: "bg-green-100 text-green-700",
  half_day: "bg-amber-100 text-amber-800",
  absent: "bg-red-100 text-red-700",
  weekly_off: "bg-gray-100 text-gray-500",
  holiday: "bg-brand-100 text-brand-700",
  on_leave: "bg-blue-100 text-blue-700",
  on_duty: "bg-slate-200 text-slate-700",
  wfh: "bg-brand-50 text-brand-600",
};

const DAY_LABEL: Record<DayStatus, string> = {
  present: "Present",
  half_day: "Half Day",
  absent: "Absent",
  weekly_off: "Weekly Off",
  holiday: "Holiday",
  on_leave: "On Leave",
  on_duty: "On Duty",
  wfh: "Work From Home",
};

export function dayTone(status: string): string {
  return DAY_TONE[status as DayStatus] ?? "bg-gray-100 text-gray-500";
}

export function dayLabel(status: string): string {
  return DAY_LABEL[status as DayStatus] ?? titleCase(status);
}

/** Employment status on the directory. */
export type EmployeeStatus = "active" | "probation" | "notice" | "separated" | "on_leave";

const EMP_TONE: Record<EmployeeStatus, string> = {
  active: "bg-green-100 text-green-700",
  probation: "bg-amber-100 text-amber-800",
  notice: "bg-orange-100 text-orange-700",
  separated: "bg-gray-100 text-gray-500",
  on_leave: "bg-blue-100 text-blue-700",
};

export function employeeTone(status: string): string {
  return EMP_TONE[status as EmployeeStatus] ?? "bg-gray-100 text-gray-500";
}

/** `half_day` → `Half Day`. Labels are derived from the stored token. */
export function titleCase(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Generic tone for priority-ish lookups used across modules. */
export function priorityTone(value: string): string {
  switch (value.toLowerCase()) {
    case "critical":
    case "high":
      return "bg-red-100 text-red-700";
    case "medium":
      return "bg-amber-100 text-amber-800";
    case "low":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-100 text-gray-500";
  }
}

/** Onboarding case state — `docs/hrms/14-onboarding.md`. */
export const CASE_TONE: Record<string, string> = {
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-brand-100 text-brand-700",
  rejected: "bg-red-100 text-red-700",
  offer_sent: "bg-slate-200 text-slate-700",
  offer_declined: "bg-red-100 text-red-700",
  documents_pending: "bg-amber-100 text-amber-800",
  documents_submitted: "bg-brand-50 text-brand-600",
  joined: "bg-green-100 text-green-700",
};

export function caseTone(status: string): string {
  return CASE_TONE[status] ?? "bg-gray-100 text-gray-500";
}
