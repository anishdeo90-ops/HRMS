type ExpensePayload = Record<string, unknown>;

export type ExpenseClaimStatus = "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "paid";
export type AdvanceStatus = "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "settled";
export type TravelRequestStatus = "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "completed";
export type VehicleExpenseStatus = "draft" | "submitted" | "approved" | "rejected" | "cancelled";

export type ExpenseLineItem = {
  expense_type_key?: string;
  description?: string;
  amount?: number;
  spent_on?: string;
  notes?: string;
};

const CLAIM_STATUSES = new Set<ExpenseClaimStatus>(["draft", "submitted", "approved", "rejected", "cancelled", "paid"]);
const ADVANCE_STATUSES = new Set<AdvanceStatus>(["draft", "submitted", "approved", "rejected", "cancelled", "settled"]);
const TRAVEL_STATUSES = new Set<TravelRequestStatus>(["draft", "submitted", "approved", "rejected", "cancelled", "completed"]);
const VEHICLE_STATUSES = new Set<VehicleExpenseStatus>(["draft", "submitted", "approved", "rejected", "cancelled"]);

const READ_ONLY_FIELDS = [
  "id",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "approved_by",
  "approved_at",
  "rejected_by",
  "rejected_at",
  "paid_by",
  "paid_at",
  "settled_by",
  "settled_at",
  "settled_amount",
  "completed_by",
  "completed_at",
  "total_amount",
  "attachment_path",
] as const;

const CLAIM_FIELDS = ["employee_id", "claim_type_key", "purpose", "claim_date", "status", "notes"] as const;
const ADVANCE_FIELDS = ["employee_id", "requested_amount", "purpose", "request_date", "status", "notes"] as const;
const TRAVEL_FIELDS = ["employee_id", "purpose", "destination", "start_date", "end_date", "estimated_amount", "status", "notes"] as const;
const ITINERARY_FIELDS = ["travel_date", "from_location", "to_location", "mode", "estimated_amount", "notes"] as const;
const VEHICLE_LOG_FIELDS = ["employee_id", "travel_date", "vehicle_number", "start_location", "end_location", "distance_km", "amount", "purpose", "status", "notes"] as const;
const VEHICLE_SERVICE_FIELDS = ["employee_id", "service_date", "vehicle_number", "vendor_name", "service_type", "amount", "status", "notes"] as const;

function cleanString(value: unknown) {
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeStatus<T extends string>(value: unknown, allowed: Set<T>, fallback: T) {
  const cleaned = cleanString(value);
  if (typeof cleaned !== "string") return fallback;
  const normalized = cleaned.toLowerCase().replace(/[\s-]+/g, "_") as T;
  return allowed.has(normalized) ? normalized : fallback;
}

function normalizePositiveNumber(value: unknown) {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function pickCleanFields(input: ExpensePayload, fields: readonly string[]) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = cleanString(input[field]);
    if (value !== undefined && value !== null) payload[field] = value;
  }
  return payload;
}

function withPositiveNumber(payload: Record<string, unknown>, field: string) {
  const amount = normalizePositiveNumber(payload[field]);
  if (amount === undefined) delete payload[field];
  else payload[field] = amount;
}

function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  return Date.parse(`${value}T00:00:00.000Z`);
}

function slugSegment(value: unknown, fallback: string) {
  const cleaned = String(value ?? "")
    .toLowerCase()
    .replace(/[/\\]+/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

export function stripExpenseReadOnlyFields(input: ExpensePayload) {
  const payload = { ...input };
  for (const field of READ_ONLY_FIELDS) delete payload[field];
  return payload;
}

export function normalizeExpenseClaimPayload(input: ExpensePayload) {
  const payload = pickCleanFields(stripExpenseReadOnlyFields(input), CLAIM_FIELDS);
  payload.status = normalizeStatus(payload.status, CLAIM_STATUSES, "draft");
  return payload;
}

export function normalizeExpenseLineItems(input: unknown): ExpenseLineItem[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const payload = pickCleanFields(stripExpenseReadOnlyFields(item as ExpensePayload), [
      "expense_type_key",
      "description",
      "amount",
      "spent_on",
      "notes",
    ]);
    withPositiveNumber(payload, "amount");
    return payload as ExpenseLineItem;
  }).filter((item) => item.expense_type_key && item.amount && item.spent_on);
}

export function sumExpenseLineItems(items: readonly ExpenseLineItem[]) {
  return Number(items.reduce((total, item) => total + (Number(item.amount) || 0), 0).toFixed(2));
}

export function buildExpenseAttachmentPath(employeeId: string, claimId: string, fileName: string) {
  const normalizedName = fileName.replace(/[/\\]+/g, "/").split("/").filter(Boolean).pop() ?? "attachment";
  const dotIndex = normalizedName.lastIndexOf(".");
  const base = dotIndex > 0 ? normalizedName.slice(0, dotIndex) : normalizedName;
  const extension = dotIndex > 0 ? normalizedName.slice(dotIndex + 1) : "";
  const safeBase = slugSegment(base, "attachment");
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeFileName = safeExtension ? `${safeBase}.${safeExtension}` : safeBase;
  return `${slugSegment(employeeId, "employee")}/${slugSegment(claimId, "claim")}/${safeFileName}`;
}

export function normalizeAdvancePayload(input: ExpensePayload) {
  const payload = pickCleanFields(stripExpenseReadOnlyFields(input), ADVANCE_FIELDS);
  withPositiveNumber(payload, "requested_amount");
  payload.status = normalizeStatus(payload.status, ADVANCE_STATUSES, "draft");
  return payload;
}

export function validateTravelDateRange(startDate: string | null | undefined, endDate: string | null | undefined) {
  if (!startDate || !endDate) return { valid: false, reason: "Travel date range is required." };
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { valid: false, reason: "Travel dates must be valid ISO dates." };
  if (end < start) return { valid: false, reason: "Travel end date cannot be before start date." };
  return { valid: true };
}

export function normalizeTravelItinerary(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const payload = pickCleanFields(stripExpenseReadOnlyFields(item as ExpensePayload), ITINERARY_FIELDS);
    withPositiveNumber(payload, "estimated_amount");
    return payload;
  }).filter((item) => item.travel_date && item.from_location && item.to_location);
}

export function normalizeTravelRequestPayload(input: ExpensePayload) {
  const payload = pickCleanFields(stripExpenseReadOnlyFields(input), TRAVEL_FIELDS);
  withPositiveNumber(payload, "estimated_amount");
  payload.status = normalizeStatus(payload.status, TRAVEL_STATUSES, "draft");
  if ("itinerary" in input) payload.itinerary = normalizeTravelItinerary(input.itinerary);
  return payload;
}

export function normalizeVehicleLogPayload(input: ExpensePayload) {
  const payload = pickCleanFields(stripExpenseReadOnlyFields(input), VEHICLE_LOG_FIELDS);
  withPositiveNumber(payload, "distance_km");
  withPositiveNumber(payload, "amount");
  payload.status = normalizeStatus(payload.status, VEHICLE_STATUSES, "draft");
  return payload;
}

export function normalizeVehicleServicePayload(input: ExpensePayload) {
  const payload = pickCleanFields(stripExpenseReadOnlyFields(input), VEHICLE_SERVICE_FIELDS);
  withPositiveNumber(payload, "amount");
  payload.status = normalizeStatus(payload.status, VEHICLE_STATUSES, "draft");
  return payload;
}
