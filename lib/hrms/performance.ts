type PerformancePayload = Record<string, unknown>;

export type PerformanceGoalStatus = "draft" | "active" | "paused" | "completed" | "cancelled" | "archived";
export type PerformanceKraStatus = "draft" | "active" | "inactive" | "completed" | "archived";
export type AppraisalTemplateStatus = "draft" | "active" | "inactive" | "archived";
export type AppraisalCycleStatus = "draft" | "scheduled" | "active" | "review" | "calibration" | "closed" | "cancelled";
export type AppraisalStatus = "draft" | "self_review" | "manager_review" | "hr_review" | "calibrated" | "completed" | "cancelled";
export type PerformanceFeedbackStatus = "draft" | "submitted" | "acknowledged" | "archived";

export type WeightedPerformanceItem = {
  weight?: number;
};

const CALLER_WRITABLE_GOAL_STATUSES = new Set(["draft", "active", "submitted"]);
const CALLER_WRITABLE_KRA_STATUSES = new Set(["draft", "active", "submitted"]);
const CALLER_WRITABLE_TEMPLATE_STATUSES = new Set(["draft", "active"]);
const CALLER_WRITABLE_CYCLE_STATUSES = new Set(["draft", "active", "review_open"]);
const CALLER_WRITABLE_APPRAISAL_STATUSES = new Set(["draft", "self_submitted"]);
const CALLER_WRITABLE_FEEDBACK_STATUSES = new Set<PerformanceFeedbackStatus>(["draft", "submitted"]);

const READ_ONLY_FIELDS = [
  "id",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "completed_at",
  "completed_by",
  "cancelled_at",
  "cancelled_by",
  "closed_at",
  "closed_by",
  "submitted_at",
  "submitted_by",
  "approved_at",
  "approved_by",
  "acknowledged_at",
  "acknowledged_by",
] as const;

const GOAL_FIELDS = [
  "employee_id",
  "title",
  "description",
  "goal_type",
  "status",
  "start_date",
  "end_date",
  "target_value",
  "weight",
  "progress_percent",
  "manager_employee_id",
] as const;
const KRA_FIELDS = ["employee_id", "goal_id", "title", "description", "target_value", "achieved_value", "weight", "status"] as const;
const TEMPLATE_FIELDS = ["name", "description", "status", "scoring_scale", "is_active"] as const;
const TEMPLATE_GOAL_FIELDS = ["template_id", "title", "description", "category", "weight", "max_score", "sequence"] as const;
const CYCLE_FIELDS = [
  "template_id",
  "name",
  "start_date",
  "end_date",
  "self_review_start",
  "self_review_end",
  "manager_review_start",
  "manager_review_end",
  "status",
] as const;
const APPRAISAL_FIELDS = ["cycle_id", "employee_id", "reviewer_employee_id", "status", "self_summary", "manager_summary", "final_score"] as const;
const APPRAISAL_GOAL_FIELDS = ["appraisal_id", "performance_goal_id", "template_goal_id", "title", "weight", "self_score", "manager_score", "final_score", "comments"] as const;
const FEEDBACK_FIELDS = ["employee_id", "provider_employee_id", "cycle_id", "feedback_type", "status", "summary"] as const;
const FEEDBACK_CRITERIA_FIELDS = ["name", "description", "category", "max_rating", "weight", "is_active"] as const;
const FEEDBACK_RATING_FIELDS = ["feedback_id", "criteria_id", "rating", "comments"] as const;

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

function normalizeNumber(value: unknown, min = 0, max = Number.POSITIVE_INFINITY) {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  return Number.isFinite(amount) && amount >= min && amount <= max ? amount : undefined;
}

function normalizeInteger(value: unknown) {
  const amount = normalizeNumber(value, 0);
  return amount !== undefined && Number.isInteger(amount) ? amount : undefined;
}

function pickCleanFields(input: PerformancePayload, fields: readonly string[]) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = cleanString(input[field]);
    if (value !== undefined && value !== null) payload[field] = value;
  }
  return payload;
}

function withNumber(payload: Record<string, unknown>, field: string, min = 0, max = Number.POSITIVE_INFINITY) {
  const amount = normalizeNumber(payload[field], min, max);
  if (amount === undefined) delete payload[field];
  else payload[field] = amount;
}

function withInteger(payload: Record<string, unknown>, field: string) {
  const amount = normalizeInteger(payload[field]);
  if (amount === undefined) delete payload[field];
  else payload[field] = amount;
}

function normalizeWeight(payload: Record<string, unknown>) {
  withNumber(payload, "weight", 0, 100);
}

function parseDateOnly(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  return Date.parse(`${value}T00:00:00.000Z`);
}

export function stripPerformanceReadOnlyFields(input: PerformancePayload) {
  const payload = { ...input };
  for (const field of READ_ONLY_FIELDS) delete payload[field];
  return payload;
}

export function validatePerformanceDateRange(startDate: string | null | undefined, endDate: string | null | undefined, label = "Performance date range") {
  if (!startDate || !endDate) return { valid: false, reason: `${label} is required.` };
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { valid: false, reason: `${label} must use valid ISO dates.` };
  if (end < start) return { valid: false, reason: `${label} end date cannot be before start date.` };
  return { valid: true };
}

export function sumPerformanceWeights(items: readonly WeightedPerformanceItem[]) {
  return Number(items.reduce((total, item) => total + (Number(item.weight) || 0), 0).toFixed(2));
}

export function validatePerformanceWeights(items: readonly WeightedPerformanceItem[]) {
  const total = sumPerformanceWeights(items);
  return total === 100
    ? { valid: true, total }
    : { valid: false, total, reason: "Performance weights must total 100." };
}

export function normalizePerformanceGoalPayload(input: PerformancePayload) {
  const source = { ...stripPerformanceReadOnlyFields(input) };
  if (source.owner_id && !source.employee_id) source.employee_id = source.owner_id;
  if (source.period_start && !source.start_date) source.start_date = source.period_start;
  if (source.period_end && !source.end_date) source.end_date = source.period_end;
  if (source.due_date && !source.end_date) source.end_date = source.due_date;
  if (source.measurable_target && !source.description) source.description = source.measurable_target;
  if (source.progress && !source.progress_percent) source.progress_percent = source.progress;
  if (source.status === "in_progress") source.status = "active";
  if (source.status === "completed") source.status = "closed";
  const payload = pickCleanFields(source, GOAL_FIELDS);
  normalizeWeight(payload);
  withNumber(payload, "target_value");
  withNumber(payload, "progress_percent");
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_GOAL_STATUSES, "draft");
  return payload;
}

export function normalizePerformanceKraPayload(input: PerformancePayload) {
  const source = { ...stripPerformanceReadOnlyFields(input) };
  if (source.actual_value && !source.achieved_value) source.achieved_value = source.actual_value;
  if (source.status === "inactive") source.status = "cancelled";
  if (source.status === "completed") source.status = "closed";
  const payload = pickCleanFields(source, KRA_FIELDS);
  normalizeWeight(payload);
  withNumber(payload, "target_value");
  withNumber(payload, "achieved_value");
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_KRA_STATUSES, "draft");
  return payload;
}

export function normalizeAppraisalTemplatePayload(input: PerformancePayload) {
  const source = { ...stripPerformanceReadOnlyFields(input) };
  if (source.is_default !== undefined && source.is_active === undefined) source.is_active = source.is_default;
  if (source.status === "inactive") source.status = "archived";
  const payload = pickCleanFields(source, TEMPLATE_FIELDS);
  withInteger(payload, "scoring_scale");
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_TEMPLATE_STATUSES, "draft");
  return payload;
}

export function normalizeAppraisalTemplateGoals(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const source = { ...stripPerformanceReadOnlyFields(item as PerformancePayload) };
    if (source.appraisal_template_id && !source.template_id) source.template_id = source.appraisal_template_id;
    if (source.sort_order && !source.sequence) source.sequence = source.sort_order;
    const payload = pickCleanFields(source, TEMPLATE_GOAL_FIELDS);
    normalizeWeight(payload);
    withNumber(payload, "max_score", 0);
    withInteger(payload, "sequence");
    return payload;
  }).filter((item) => item.title && item.weight !== undefined);
}

export function normalizeAppraisalCyclePayload(input: PerformancePayload) {
  const source = { ...stripPerformanceReadOnlyFields(input) };
  if (source.appraisal_template_id && !source.template_id) source.template_id = source.appraisal_template_id;
  if (source.period_start && !source.start_date) source.start_date = source.period_start;
  if (source.period_end && !source.end_date) source.end_date = source.period_end;
  if (source.review_start && !source.self_review_start) source.self_review_start = source.review_start;
  if (source.review_end && !source.manager_review_end) source.manager_review_end = source.review_end;
  if (source.status === "open" || source.status === "scheduled") source.status = "active";
  if (source.status === "in_review" || source.status === "review") source.status = "review_open";
  const payload = pickCleanFields(source, CYCLE_FIELDS);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_CYCLE_STATUSES, "draft");
  return payload;
}

export function normalizeAppraisalPayload(input: PerformancePayload) {
  const source = { ...stripPerformanceReadOnlyFields(input) };
  if (source.appraisal_cycle_id && !source.cycle_id) source.cycle_id = source.appraisal_cycle_id;
  if (source.reviewer_id && !source.reviewer_employee_id) source.reviewer_employee_id = source.reviewer_id;
  if (source.manager_id && !source.reviewer_employee_id) source.reviewer_employee_id = source.manager_id;
  if (source.overall_score && !source.final_score) source.final_score = source.overall_score;
  if (source.status === "self_review") source.status = "draft";
  if (source.status === "manager_review") source.status = "self_submitted";
  if (source.status === "hr_review" || source.status === "calibrated" || source.status === "completed") source.status = "closed";
  const payload = pickCleanFields(source, APPRAISAL_FIELDS);
  withNumber(payload, "final_score", 0);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_APPRAISAL_STATUSES, "draft");
  return payload;
}

export function normalizeAppraisalGoalPayload(input: PerformancePayload) {
  const payload = pickCleanFields(stripPerformanceReadOnlyFields(input), APPRAISAL_GOAL_FIELDS);
  normalizeWeight(payload);
  for (const field of ["self_score", "manager_score", "final_score"]) withNumber(payload, field, 0);
  return payload;
}

export function normalizeAppraisalGoals(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((item) => normalizeAppraisalGoalPayload(item as PerformancePayload)).filter((item) => item.title || item.performance_goal_id || item.performance_kra_id);
}

export function normalizePerformanceFeedbackPayload(input: PerformancePayload) {
  const source = { ...stripPerformanceReadOnlyFields(input) };
  if (source.reviewer_id && !source.provider_employee_id) source.provider_employee_id = source.reviewer_id;
  if (source.appraisal_cycle_id && !source.cycle_id) source.cycle_id = source.appraisal_cycle_id;
  if (source.comments && !source.summary) source.summary = source.comments;
  if (source.status === "acknowledged") source.status = "reviewed";
  const payload = pickCleanFields(source, FEEDBACK_FIELDS);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_FEEDBACK_STATUSES, "draft");
  return payload;
}

export function normalizeFeedbackCriteriaPayload(input: PerformancePayload) {
  const source = { ...stripPerformanceReadOnlyFields(input) };
  if (source.max_score && !source.max_rating) source.max_rating = source.max_score;
  const payload = pickCleanFields(source, FEEDBACK_CRITERIA_FIELDS);
  normalizeWeight(payload);
  withInteger(payload, "max_rating");
  return payload;
}

export function normalizeFeedbackRatingPayload(input: PerformancePayload) {
  const source = { ...stripPerformanceReadOnlyFields(input) };
  if (source.score && !source.rating) source.rating = source.score;
  const payload = pickCleanFields(source, FEEDBACK_RATING_FIELDS);
  withInteger(payload, "rating");
  return payload;
}

export function normalizeFeedbackRatings(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((item) => normalizeFeedbackRatingPayload(item as PerformancePayload)).filter((item) => item.criteria_id && item.rating !== undefined);
}
