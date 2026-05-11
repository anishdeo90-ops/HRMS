export type LeaveRequestStatus = "draft" | "submitted" | "approved" | "rejected" | "cancelled";
export type LeaveAllocationStatus = "draft" | "submitted" | "approved" | "cancelled" | "expired";
export type LeaveLedgerEntryType =
  | "allocation"
  | "carry_forward"
  | "application"
  | "cancellation"
  | "encashment"
  | "expiry"
  | "adjustment"
  | "compensatory_credit";

type LeavePayload = Record<string, unknown>;

export type LeaveApplicationWindow = {
  id?: string | null;
  employee_id?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  status?: string | null;
};

export type LeaveLedgerInput = {
  employee_id: string;
  leave_type_key: string;
  leave_period_id?: string | null;
  source_type: string;
  source_id: string;
  source_action: string;
  days_delta: number;
  entry_type: LeaveLedgerEntryType;
  application_id?: string | null;
  allocation_id?: string | null;
  balance_after?: number | null;
  posting_date?: string | null;
  notes?: string | null;
};

const REQUEST_STATUSES = new Set<LeaveRequestStatus>(["draft", "submitted", "approved", "rejected", "cancelled"]);
const ALLOCATION_STATUSES = new Set<LeaveAllocationStatus>(["draft", "submitted", "approved", "cancelled", "expired"]);
const LEDGER_ENTRY_TYPES = new Set<LeaveLedgerEntryType>([
  "allocation",
  "carry_forward",
  "application",
  "cancellation",
  "encashment",
  "expiry",
  "adjustment",
  "compensatory_credit",
]);

const LEAVE_TYPE_FIELDS = [
  "key",
  "label",
  "accrual",
  "carry_forward",
  "encashment",
  "negative_balance",
  "holiday_weekend_behavior",
  "approval_behavior",
  "is_paid",
  "max_continuous_days",
  "requires_attachment_after_days",
  "is_active",
] as const;
const POLICY_FIELDS = ["company_id", "name", "code", "effective_from", "effective_to", "is_active"] as const;
const APPLICATION_FIELDS = ["employee_id", "leave_type_key", "leave_period_id", "from_date", "to_date", "half_day", "half_day_date", "total_days", "reason", "attachment_path", "status"] as const;
const COMPENSATORY_FIELDS = ["employee_id", "leave_type_key", "attendance_day_id", "work_date", "requested_days", "reason", "status"] as const;
const ENCASHMENT_FIELDS = ["employee_id", "leave_type_key", "leave_period_id", "requested_days", "reason", "status"] as const;

const READ_ONLY_FIELDS = ["id", "created_at", "created_by", "updated_at", "updated_by", "approver_employee_id", "approver_comment", "decided_at"] as const;

function cleanString(value: unknown) {
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : undefined;
}

function pickCleanFields(input: LeavePayload, fields: readonly string[]) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = cleanString(input[field]);
    if (value !== undefined && value !== null) payload[field] = value;
  }
  return payload;
}

function normalizeStatus(value: unknown, allowed: Set<string>, fallback: string) {
  const cleaned = cleanString(value);
  if (typeof cleaned !== "string") return fallback;
  const normalized = cleaned.toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.has(normalized) ? normalized : fallback;
}

function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  return Date.parse(`${value}T00:00:00.000Z`);
}

function daysBetweenInclusive(fromDate: string, toDate: string) {
  const from = parseDateOnly(fromDate);
  const to = parseDateOnly(toDate);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;
  return Math.floor((to - from) / 86400000) + 1;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA <= endB && startB <= endA;
}

export function validateLeaveDateRange(fromDate: string | null | undefined, toDate: string | null | undefined) {
  if (!fromDate || !toDate) return { valid: false, reason: "Leave date range is required." };
  const from = parseDateOnly(fromDate);
  const to = parseDateOnly(toDate);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return { valid: false, reason: "Leave dates must be valid ISO dates." };
  if (to < from) return { valid: false, reason: "Leave end date cannot be before start date." };
  return { valid: true };
}

export function calculateLeaveUnits(fromDate: string, toDate: string, halfDay = false) {
  const days = daysBetweenInclusive(fromDate, toDate);
  if (days <= 0) return 0;
  return halfDay ? Math.max(0.5, days - 0.5) : days;
}

export function stripLeaveReadOnlyFields(input: LeavePayload) {
  const payload = { ...input };
  for (const field of READ_ONLY_FIELDS) delete payload[field];
  return payload;
}

export function normalizeLeaveTypePayload(input: LeavePayload) {
  return pickCleanFields(stripLeaveReadOnlyFields(input), LEAVE_TYPE_FIELDS);
}

export function normalizeLeavePolicyPayload(input: LeavePayload) {
  return pickCleanFields(stripLeaveReadOnlyFields(input), POLICY_FIELDS);
}

export function normalizeLeaveApplicationPayload(input: LeavePayload) {
  const payload = pickCleanFields(stripLeaveReadOnlyFields(input), APPLICATION_FIELDS);
  payload.status = normalizeStatus(payload.status, REQUEST_STATUSES, "draft");
  payload.half_day = Boolean(payload.half_day);
  if (!payload.total_days && typeof payload.from_date === "string" && typeof payload.to_date === "string") {
    payload.total_days = calculateLeaveUnits(payload.from_date, payload.to_date, Boolean(payload.half_day));
  }
  return payload;
}

export function normalizeCompensatoryLeavePayload(input: LeavePayload) {
  const payload = pickCleanFields(stripLeaveReadOnlyFields(input), COMPENSATORY_FIELDS);
  payload.status = normalizeStatus(payload.status, REQUEST_STATUSES, "draft");
  return payload;
}

export function normalizeEncashmentPayload(input: LeavePayload) {
  const payload = pickCleanFields(stripLeaveReadOnlyFields(input), ENCASHMENT_FIELDS);
  payload.status = normalizeStatus(payload.status, REQUEST_STATUSES, "draft");
  return payload;
}

export function validateNoOverlappingLeaveApplication(candidate: LeaveApplicationWindow, existingApplications: LeaveApplicationWindow[]) {
  if (!candidate.employee_id || !candidate.from_date || !candidate.to_date) return { valid: false, reason: "Leave application requires employee and dates." };
  const candidateStart = parseDateOnly(candidate.from_date);
  const candidateEnd = parseDateOnly(candidate.to_date);
  if (!Number.isFinite(candidateStart) || !Number.isFinite(candidateEnd) || candidateEnd < candidateStart) return { valid: false, reason: "Leave date range is invalid." };

  const overlaps = existingApplications.some((application) => {
    if (application.id && candidate.id && application.id === candidate.id) return false;
    if (application.employee_id !== candidate.employee_id) return false;
    if (!application.from_date || !application.to_date) return false;
    if (["rejected", "cancelled"].includes(application.status ?? "")) return false;
    const existingStart = parseDateOnly(application.from_date);
    const existingEnd = parseDateOnly(application.to_date);
    return Number.isFinite(existingStart) && Number.isFinite(existingEnd) && rangesOverlap(candidateStart, candidateEnd, existingStart, existingEnd);
  });

  return overlaps ? { valid: false, reason: "Leave application overlaps an existing active request." } : { valid: true };
}

export function validateLeaveBalanceAvailable(balance: number, requestedDays: number, options: { allowNegative?: boolean; maxNegativeBalance?: number } = {}) {
  if (requestedDays <= 0) return { valid: false, reason: "Requested leave days must be positive." };
  if (options.allowNegative) {
    const floor = -Math.max(0, options.maxNegativeBalance ?? 0);
    return balance - requestedDays >= floor ? { valid: true } : { valid: false, reason: "Leave request exceeds negative balance limit." };
  }
  return balance >= requestedDays ? { valid: true } : { valid: false, reason: "Insufficient leave balance." };
}

export function validateEncashmentEligibility(input: { encashment?: boolean | null; availableBalance?: number | null; requestedDays?: number | null; encashmentCap?: number | null }) {
  if (!input.encashment) return { valid: false, reason: "Leave type is not eligible for encashment." };
  const requestedDays = input.requestedDays ?? 0;
  if (requestedDays <= 0) return { valid: false, reason: "Requested encashment days must be positive." };
  if ((input.availableBalance ?? 0) < requestedDays) return { valid: false, reason: "Insufficient leave balance for encashment." };
  if (input.encashmentCap && requestedDays > input.encashmentCap) return { valid: false, reason: "Requested encashment exceeds the cap." };
  return { valid: true };
}

export function buildLedgerEntry(input: LeaveLedgerInput) {
  if (!LEDGER_ENTRY_TYPES.has(input.entry_type)) throw new Error("Unsupported leave ledger entry type.");
  if (input.days_delta === 0) throw new Error("Leave ledger days_delta cannot be zero.");
  return {
    employee_id: input.employee_id,
    leave_type_key: input.leave_type_key,
    leave_period_id: input.leave_period_id ?? null,
    application_id: input.application_id ?? null,
    allocation_id: input.allocation_id ?? null,
    entry_type: input.entry_type,
    days_delta: input.days_delta,
    balance_after: input.balance_after ?? null,
    posting_date: input.posting_date ?? new Date().toISOString().slice(0, 10),
    source_type: input.source_type,
    source_id: input.source_id,
    source_action: input.source_action,
    is_reversal: false,
    reversal_of_id: null,
    notes: input.notes ?? null,
  };
}

export function buildLedgerReversalEntry(entry: ReturnType<typeof buildLedgerEntry> & { id?: string | null }, sourceAction = "reversal") {
  return {
    ...entry,
    id: undefined,
    days_delta: -Number(entry.days_delta),
    source_action: sourceAction,
    is_reversal: true,
    reversal_of_id: entry.id ?? null,
  };
}
