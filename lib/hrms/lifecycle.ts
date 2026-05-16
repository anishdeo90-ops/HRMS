type LifecyclePayload = Record<string, unknown>;

export type LifecycleOnboardingStatus = "draft" | "pending" | "in_progress" | "completed" | "cancelled";
export type LifecycleBoardingActivityStatus = "pending" | "in_progress" | "completed" | "skipped" | "cancelled";
export type LifecycleSeparationStatus = "draft" | "submitted" | "hr_review" | "approved" | "rejected" | "completed" | "cancelled";
export type LifecycleEmploymentChangeStatus = "draft" | "submitted" | "approved" | "rejected" | "effective" | "cancelled";
export type LifecycleGrievanceStatus = "draft" | "submitted" | "under_review" | "resolved" | "rejected" | "withdrawn";
export type LifecycleTrainingProgramStatus = "draft" | "active" | "inactive" | "archived";
export type LifecycleTrainingEventStatus = "draft" | "scheduled" | "open" | "completed" | "cancelled";
export type LifecycleFeedbackStatus = "draft" | "submitted" | "archived";
export type LifecycleDailySummaryStatus = "draft" | "submitted" | "approved" | "rejected";

const CALLER_WRITABLE_ONBOARDING_STATUSES = new Set<LifecycleOnboardingStatus>(["draft", "pending", "in_progress"]);
const CALLER_WRITABLE_ACTIVITY_STATUSES = new Set<LifecycleBoardingActivityStatus>(["pending", "in_progress", "completed"]);
const CALLER_WRITABLE_SEPARATION_STATUSES = new Set<LifecycleSeparationStatus>(["draft", "submitted"]);
const CALLER_WRITABLE_CHANGE_STATUSES = new Set<LifecycleEmploymentChangeStatus>(["draft", "submitted"]);
const CALLER_WRITABLE_GRIEVANCE_STATUSES = new Set<LifecycleGrievanceStatus>(["draft", "submitted", "withdrawn"]);
const CALLER_WRITABLE_PROGRAM_STATUSES = new Set<LifecycleTrainingProgramStatus>(["draft", "active", "inactive"]);
const CALLER_WRITABLE_EVENT_STATUSES = new Set<LifecycleTrainingEventStatus>(["draft", "scheduled", "open"]);
const CALLER_WRITABLE_FEEDBACK_STATUSES = new Set<LifecycleFeedbackStatus>(["draft", "submitted"]);
const CALLER_WRITABLE_DAILY_SUMMARY_STATUSES = new Set<LifecycleDailySummaryStatus>(["draft", "submitted"]);

const READ_ONLY_FIELDS = [
  "id",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "approved_at",
  "approved_by",
  "rejected_at",
  "rejected_by",
  "completed_at",
  "completed_by",
  "cancelled_at",
  "cancelled_by",
  "resolved_at",
  "resolved_by",
  "closed_at",
  "closed_by",
  "submitted_at",
  "submitted_by",
  "effective_applied_at",
] as const;

const TEMPLATE_FIELDS = ["name", "description", "status", "is_active"] as const;
const ONBOARDING_FIELDS = ["employee_id", "candidate_id", "template_id", "owner_employee_id", "status", "start_date", "joining_date", "due_date", "notes"] as const;
const ACTIVITY_FIELDS = ["onboarding_id", "employee_id", "activity_name", "title", "description", "assigned_to_employee_id", "due_date", "completed_date", "status", "sequence"] as const;
const SEPARATION_FIELDS = ["employee_id", "template_id", "separation_type", "reason", "status", "requested_date", "last_working_date", "notice_end_date", "notes"] as const;
const CHANGE_FIELDS = ["employee_id", "status", "effective_date", "reason", "notes", "from_department_id", "to_department_id", "from_branch_id", "to_branch_id", "from_grade_id", "to_grade_id", "new_grade_id", "salary_change_percent", "from_designation_id", "to_designation_id", "from_manager_employee_id", "to_manager_employee_id"] as const;
const GRIEVANCE_TYPE_FIELDS = ["name", "code", "description", "sla_days", "is_active"] as const;
const GRIEVANCE_FIELDS = ["employee_id", "grievance_type_id", "title", "subject", "description", "status", "priority", "incident_date", "assigned_to_employee_id", "resolution_notes"] as const;
const EXIT_INTERVIEW_FIELDS = ["separation_id", "employee_id", "interviewer_employee_id", "scheduled_date", "completed_date", "status", "feedback", "rehire_eligible"] as const;
const TRAINING_PROGRAM_FIELDS = ["name", "description", "status", "category", "duration_hours", "is_mandatory"] as const;
const TRAINING_EVENT_FIELDS = ["program_id", "title", "description", "status", "start_date", "end_date", "trainer_employee_id", "location", "capacity"] as const;
const TRAINING_FEEDBACK_FIELDS = ["event_id", "employee_id", "rating", "comments", "status"] as const;
const DAILY_SUMMARY_FIELDS = ["employee_id", "summary_date", "work_date", "work_summary", "summary", "blockers", "hours_worked", "status", "manager_notes"] as const;

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

function normalizeInteger(value: unknown, min = 0, max = Number.POSITIVE_INFINITY) {
  const amount = normalizeNumber(value, min, max);
  return amount !== undefined && Number.isInteger(amount) ? amount : undefined;
}

function pickCleanFields(input: LifecyclePayload, fields: readonly string[]) {
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

function withInteger(payload: Record<string, unknown>, field: string, min = 0, max = Number.POSITIVE_INFINITY) {
  const amount = normalizeInteger(payload[field], min, max);
  if (amount === undefined) delete payload[field];
  else payload[field] = amount;
}

function parseDateOnly(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  return Date.parse(`${value}T00:00:00.000Z`);
}

export function stripLifecycleReadOnlyFields(input: LifecyclePayload) {
  const payload = { ...input };
  for (const field of READ_ONLY_FIELDS) delete payload[field];
  return payload;
}

export function validateLifecycleDateRange(startDate: string | null | undefined, endDate: string | null | undefined, label = "Lifecycle date range") {
  if (!startDate || !endDate) return { valid: false, reason: `${label} is required.` };
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { valid: false, reason: `${label} must use valid ISO dates.` };
  if (end < start) return { valid: false, reason: `${label} end date cannot be before start date.` };
  return { valid: true };
}

export function normalizeOnboardingTemplatePayload(input: LifecyclePayload) {
  const source = { ...stripLifecycleReadOnlyFields(input) };
  if (source.status === "archived") source.status = "inactive";
  const payload = pickCleanFields(source, TEMPLATE_FIELDS);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_PROGRAM_STATUSES, "draft");
  return payload;
}

export function normalizeOnboardingPayload(input: LifecyclePayload) {
  const source = { ...stripLifecycleReadOnlyFields(input) };
  if (source.owner_id && !source.employee_id) source.employee_id = source.owner_id;
  if (source.joined_candidate_id && !source.candidate_id) source.candidate_id = source.joined_candidate_id;
  if (source.onboarding_template_id && !source.template_id) source.template_id = source.onboarding_template_id;
  if (source.assignee_employee_id && !source.owner_employee_id) source.owner_employee_id = source.assignee_employee_id;
  if (source.target_date && !source.due_date) source.due_date = source.target_date;
  if (source.date_of_joining && !source.joining_date) source.joining_date = source.date_of_joining;
  if (source.status === "started") source.status = "in_progress";
  const payload = pickCleanFields(source, ONBOARDING_FIELDS);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_ONBOARDING_STATUSES, "draft");
  return payload;
}

export function normalizeBoardingActivityPayload(input: LifecyclePayload) {
  const source = { ...stripLifecycleReadOnlyFields(input) };
  if (source.name && !source.title) source.title = source.name;
  if (source.title && !source.activity_name) source.activity_name = source.title;
  if (source.sort_order && !source.sequence) source.sequence = source.sort_order;
  if (source.assignee_employee_id && !source.assigned_to_employee_id) source.assigned_to_employee_id = source.assignee_employee_id;
  const payload = pickCleanFields(source, ACTIVITY_FIELDS);
  withInteger(payload, "sequence");
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_ACTIVITY_STATUSES, "pending");
  return payload;
}

export function normalizeBoardingActivities(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((item) => normalizeBoardingActivityPayload(item as LifecyclePayload)).filter((item) => item.activity_name);
}

export function normalizeSeparationTemplatePayload(input: LifecyclePayload) {
  const payload = pickCleanFields(stripLifecycleReadOnlyFields(input), TEMPLATE_FIELDS);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_PROGRAM_STATUSES, "draft");
  return payload;
}

export function normalizeSeparationPayload(input: LifecyclePayload) {
  const source = { ...stripLifecycleReadOnlyFields(input) };
  if (source.type && !source.separation_type) source.separation_type = source.type;
  if (source.separation_template_id && !source.template_id) source.template_id = source.separation_template_id;
  if (source.exit_date && !source.last_working_date) source.last_working_date = source.exit_date;
  const payload = pickCleanFields(source, SEPARATION_FIELDS);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_SEPARATION_STATUSES, "draft");
  return payload;
}

export function normalizePromotionPayload(input: LifecyclePayload) {
  const source = { ...stripLifecycleReadOnlyFields(input) };
  if (source.grade_id && !source.new_grade_id) source.new_grade_id = source.grade_id;
  if (source.current_grade_id && !source.from_grade_id) source.from_grade_id = source.current_grade_id;
  if (source.new_grade_id && !source.to_grade_id) source.to_grade_id = source.new_grade_id;
  if (source.promotion_date && !source.effective_date) source.effective_date = source.promotion_date;
  const payload = pickCleanFields(source, CHANGE_FIELDS);
  withNumber(payload, "salary_change_percent", -100, 1000);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_CHANGE_STATUSES, "draft");
  return payload;
}

export function normalizeTransferPayload(input: LifecyclePayload) {
  const source = { ...stripLifecycleReadOnlyFields(input) };
  if (source.department_id && !source.to_department_id) source.to_department_id = source.department_id;
  if (source.branch_id && !source.to_branch_id) source.to_branch_id = source.branch_id;
  if (source.current_department_id && !source.from_department_id) source.from_department_id = source.current_department_id;
  if (source.new_department_id && !source.to_department_id) source.to_department_id = source.new_department_id;
  if (source.transfer_date && !source.effective_date) source.effective_date = source.transfer_date;
  const payload = pickCleanFields(source, CHANGE_FIELDS);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_CHANGE_STATUSES, "draft");
  return payload;
}

export function normalizeGrievanceTypePayload(input: LifecyclePayload) {
  const payload = pickCleanFields(stripLifecycleReadOnlyFields(input), GRIEVANCE_TYPE_FIELDS);
  withInteger(payload, "sla_days", 0);
  return payload;
}

export function normalizeGrievancePayload(input: LifecyclePayload) {
  const source = { ...stripLifecycleReadOnlyFields(input) };
  if (source.type_id && !source.grievance_type_id) source.grievance_type_id = source.type_id;
  if (source.subject && !source.title) source.title = source.subject;
  if (source.title && !source.subject) source.subject = source.title;
  if (source.details && !source.description) source.description = source.details;
  const payload = pickCleanFields(source, GRIEVANCE_FIELDS);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_GRIEVANCE_STATUSES, "draft");
  return payload;
}

export function normalizeExitInterviewPayload(input: LifecyclePayload) {
  const source = { ...stripLifecycleReadOnlyFields(input) };
  if (source.notes && !source.feedback) source.feedback = source.notes;
  const payload = pickCleanFields(source, EXIT_INTERVIEW_FIELDS);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_SEPARATION_STATUSES, "draft");
  return payload;
}

export function normalizeTrainingProgramPayload(input: LifecyclePayload) {
  const payload = pickCleanFields(stripLifecycleReadOnlyFields(input), TRAINING_PROGRAM_FIELDS);
  withNumber(payload, "duration_hours", 0);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_PROGRAM_STATUSES, "draft");
  return payload;
}

export function normalizeTrainingEventPayload(input: LifecyclePayload) {
  const source = { ...stripLifecycleReadOnlyFields(input) };
  if (source.training_program_id && !source.program_id) source.program_id = source.training_program_id;
  if (source.event_name && !source.title) source.title = source.event_name;
  const payload = pickCleanFields(source, TRAINING_EVENT_FIELDS);
  withInteger(payload, "capacity", 0);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_EVENT_STATUSES, "draft");
  return payload;
}

export function normalizeTrainingFeedbackPayload(input: LifecyclePayload) {
  const source = { ...stripLifecycleReadOnlyFields(input) };
  if (source.training_event_id && !source.event_id) source.event_id = source.training_event_id;
  if (source.score && !source.rating) source.rating = source.score;
  const payload = pickCleanFields(source, TRAINING_FEEDBACK_FIELDS);
  withInteger(payload, "rating", 1, 5);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_FEEDBACK_STATUSES, "draft");
  return payload;
}

export function normalizeDailyWorkSummaryPayload(input: LifecyclePayload) {
  const source = { ...stripLifecycleReadOnlyFields(input) };
  if (source.date && !source.work_date) source.work_date = source.date;
  if (source.work_date && !source.summary_date) source.summary_date = source.work_date;
  if (source.summary && !source.work_summary) source.work_summary = source.summary;
  const payload = pickCleanFields(source, DAILY_SUMMARY_FIELDS);
  withNumber(payload, "hours_worked", 0, 24);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_DAILY_SUMMARY_STATUSES, "draft");
  return payload;
}
