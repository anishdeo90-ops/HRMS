export type RecruitmentPayload = Record<string, unknown>;

export type RecruitmentConceptKey =
  | "job_requisition"
  | "job_applicant"
  | "interview"
  | "job_offer"
  | "appointment_letter"
  | "candidate_employee_handoff";

export type RecruitmentTemplateStatus = "draft" | "active" | "inactive" | "archived";
export type AppointmentLetterStatus = "draft" | "generated" | "sent" | "accepted" | "declined" | "withdrawn" | "cancelled";
export type CandidateHandoffStatus = "draft" | "ready_for_onboarding" | "onboarding_started" | "completed" | "cancelled";

export type RecruitmentConcept = {
  key: RecruitmentConceptKey;
  hrmsLabel: string;
  atsTable: string;
  atsLabel: string;
  route: string;
};

const CALLER_WRITABLE_TEMPLATE_STATUSES = new Set<RecruitmentTemplateStatus>(["draft", "active", "inactive"]);
const CALLER_WRITABLE_APPOINTMENT_STATUSES = new Set<AppointmentLetterStatus>(["draft", "generated", "sent"]);
const CALLER_WRITABLE_HANDOFF_STATUSES = new Set<CandidateHandoffStatus>(["draft", "ready_for_onboarding"]);

const READ_ONLY_FIELDS = [
  "id",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "deleted_at",
  "deleted_by",
  "is_deleted",
  "sent_at",
  "sent_by",
  "accepted_at",
  "declined_at",
  "withdrawn_at",
  "cancelled_at",
  "employee_created_at",
  "onboarding_started_at",
  "completed_at",
] as const;

const FILTER_FIELDS = [
  "candidate_id",
  "job_id",
  "offer_id",
  "template_id",
  "status",
  "recruiter_id",
  "designation_id",
  "site_id",
  "date_from",
  "date_to",
] as const;

const APPOINTMENT_TEMPLATE_FIELDS = [
  "template_key",
  "name",
  "title",
  "description",
  "body_html",
  "status",
  "variables",
  "is_active",
] as const;

const APPOINTMENT_LETTER_FIELDS = [
  "candidate_id",
  "job_id",
  "candidate_offer_id",
  "template_id",
  "letter_number",
  "title",
  "body_html",
  "status",
  "issue_date",
  "joining_date",
  "valid_until",
  "compensation_snapshot",
  "metadata",
] as const;

const CANDIDATE_HANDOFF_FIELDS = [
  "candidate_id",
  "job_id",
  "candidate_offer_id",
  "employee_id",
  "onboarding_id",
  "status",
  "requested_joining_date",
  "actual_joining_date",
  "handoff_notes",
  "metadata",
] as const;

export const HRMS_RECRUITMENT_CONCEPTS: readonly RecruitmentConcept[] = [
  {
    key: "job_requisition",
    hrmsLabel: "Job requisition",
    atsTable: "jobs",
    atsLabel: "Job",
    route: "/jobs",
  },
  {
    key: "job_applicant",
    hrmsLabel: "Job applicant",
    atsTable: "candidates",
    atsLabel: "Candidate",
    route: "/candidates",
  },
  {
    key: "interview",
    hrmsLabel: "Interview feedback",
    atsTable: "interviews",
    atsLabel: "Interview",
    route: "/candidates",
  },
  {
    key: "job_offer",
    hrmsLabel: "Job offer",
    atsTable: "candidate_offers",
    atsLabel: "Candidate offer",
    route: "/candidates",
  },
  {
    key: "appointment_letter",
    hrmsLabel: "Appointment letter",
    atsTable: "recruitment_appointment_letters",
    atsLabel: "Appointment letter",
    route: "/recruitment/appointments",
  },
  {
    key: "candidate_employee_handoff",
    hrmsLabel: "Candidate-to-employee handoff",
    atsTable: "recruitment_onboarding_handoffs",
    atsLabel: "Candidate handoff",
    route: "/recruitment",
  },
] as const;

function cleanString(value: unknown) {
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeKey(value: unknown) {
  const cleaned = cleanString(value);
  if (typeof cleaned !== "string") return undefined;
  return cleaned.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || undefined;
}

function normalizeStatus<T extends string>(value: unknown, allowed: Set<T>, fallback: T) {
  const key = normalizeKey(value) as T | undefined;
  return key && allowed.has(key) ? key : fallback;
}

function normalizeObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined && item !== ""));
}

function normalizeArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(cleanString).filter((item) => item !== undefined && item !== null);
}

function pickCleanFields(input: RecruitmentPayload, fields: readonly string[]) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = cleanString(input[field]);
    if (value !== undefined && value !== null) payload[field] = value;
  }
  return payload;
}

function parseDateOnly(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  return Date.parse(`${value}T00:00:00.000Z`);
}

export function stripRecruitmentReadOnlyFields(input: RecruitmentPayload) {
  const payload = { ...input };
  for (const field of READ_ONLY_FIELDS) delete payload[field];
  return payload;
}

export function validateRecruitmentDateRange(startDate: string | null | undefined, endDate: string | null | undefined, label = "Recruitment date range") {
  if (!startDate && !endDate) return { valid: true };
  if (!startDate || !endDate) return { valid: false, reason: `${label} requires both start and end dates.` };
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { valid: false, reason: `${label} must use valid ISO dates.` };
  if (end < start) return { valid: false, reason: `${label} end date cannot be before start date.` };
  return { valid: true };
}

export function normalizeRecruitmentFilters(input: unknown) {
  const source = normalizeObject(input);
  const filters: Record<string, unknown> = {};
  for (const field of FILTER_FIELDS) {
    const value = cleanString(source[field]);
    if (value !== undefined && value !== null) filters[field] = value;
  }
  return filters;
}

export function normalizeAppointmentTemplatePayload(input: RecruitmentPayload) {
  const source = { ...stripRecruitmentReadOnlyFields(input) };
  if (source.key && !source.template_key) source.template_key = source.key;
  if (source.template_name && !source.name) source.name = source.template_name;
  if (source.html && !source.body_html) source.body_html = source.html;
  if (!source.template_key) source.template_key = normalizeKey(source.name ?? source.title);
  const payload = pickCleanFields(source, APPOINTMENT_TEMPLATE_FIELDS);
  payload.template_key = normalizeKey(payload.template_key);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_TEMPLATE_STATUSES, "draft");
  payload.variables = normalizeArray(source.variables);
  payload.is_active = payload.status === "active";
  return payload;
}

export function normalizeAppointmentLetterPayload(input: RecruitmentPayload) {
  const source = { ...stripRecruitmentReadOnlyFields(input) };
  if (source.offer_id && !source.candidate_offer_id) source.candidate_offer_id = source.offer_id;
  if (source.template_key && !source.template_id) source.template_id = source.template_key;
  if (source.html && !source.body_html) source.body_html = source.html;
  if (source.appointment_date && !source.issue_date) source.issue_date = source.appointment_date;
  const payload = pickCleanFields(source, APPOINTMENT_LETTER_FIELDS);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_APPOINTMENT_STATUSES, "draft");
  payload.compensation_snapshot = normalizeObject(source.compensation_snapshot ?? source.ctc_data);
  payload.metadata = normalizeObject(source.metadata);
  return payload;
}

export function normalizeCandidateHandoffPayload(input: RecruitmentPayload) {
  const source = { ...stripRecruitmentReadOnlyFields(input) };
  if (source.offer_id && !source.candidate_offer_id) source.candidate_offer_id = source.offer_id;
  if (source.notes && !source.handoff_notes) source.handoff_notes = source.notes;
  if (source.joining_date && !source.requested_joining_date) source.requested_joining_date = source.joining_date;
  const payload = pickCleanFields(source, CANDIDATE_HANDOFF_FIELDS);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_HANDOFF_STATUSES, "draft");
  payload.metadata = normalizeObject(source.metadata);
  return payload;
}

export function recruitmentStageFromAtsStatus(status: string | null | undefined) {
  const key = normalizeKey(status);
  if (!key) return "sourced";
  if (key.includes("joined")) return "joined";
  if (key.includes("offered") || key.includes("appointed")) return "offer";
  if (key.includes("gf")) return "background_verification";
  if (key.includes("pi") || key.includes("interview")) return "interview";
  if (key.includes("shortlisted")) return "shortlisted";
  if (key.includes("rejected") || key.includes("dropped")) return "closed_unsuccessful";
  if (key.includes("hold")) return "on_hold";
  return "sourced";
}

export const mapAtsCandidateStatusToRecruitmentStage = recruitmentStageFromAtsStatus;

export function mapOfferStatusToAppointmentStatus(status: string | null | undefined): AppointmentLetterStatus {
  const key = normalizeKey(status);
  if (key === "joined" || key === "offer_confirmed") return "accepted";
  if (key === "withdrawn") return "withdrawn";
  if (key === "offer_sent" || key === "ctc_sent" || key === "ctc_confirmed") return "sent";
  return "draft";
}

export function isJoinedRecruitmentCandidate(candidate: RecruitmentPayload | null | undefined) {
  if (!candidate) return false;
  const status = typeof candidate.final_status === "string" ? candidate.final_status.trim().toLowerCase() : "";
  return status === "joined"
    || Boolean(candidate.doj_actual)
    || Boolean(candidate.doj);
}
