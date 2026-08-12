/**
 * HRMS view models — the shapes the frontend renders.
 *
 * These follow `docs/hrms/10-foundation-spec.md`: money is an integer in paise,
 * dates are ISO strings, nothing is denormalised into per-approver columns, and
 * `payable_fraction` is stored on the attendance day rather than recomputed.
 *
 * The backend is Codex's. When `/api/hrms/*` lands, these become the response
 * types and `demo-data.ts` goes away — nothing else should need to change.
 */

import type { DayStatus, EmployeeStatus, RequestStatus } from "./status";

/* ── Org structure ─────────────────────────────────────────────── */

export interface LookupItem {
  id: string;
  name: string;
  code?: string;
  is_active: boolean;
  /** Only set on masters that hang off another master. */
  parent_id?: string;
  parent_name?: string;
  employee_count?: number;
  description?: string;
}

export interface BusinessUnit extends LookupItem {
  head_employee_id?: string;
  head_name?: string;
}

/* ── Employee spine ────────────────────────────────────────────── */

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  email: string;
  mobile?: string;
  photo_url?: string;

  // Current assignment — effective-dated in the schema (§4.5), flattened here.
  designation?: string;
  department?: string;
  sub_department?: string;
  business_unit?: string;
  branch?: string;
  employment_type?: string;
  function_role?: string;
  reporting_manager_id?: string;
  reporting_manager?: string;

  date_of_joining?: string;
  confirmation_date?: string;
  probation_end_date?: string;
  status: EmployeeStatus;

  // Personal
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  marital_status?: string;
  nationality?: string;

  // Contact
  personal_email?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_number?: string;
  current_address?: string;
  permanent_address?: string;

  // Statutory / banking — PII, field-level access controlled (§7)
  pan?: string;
  aadhaar_last4?: string;
  uan?: string;
  esic_number?: string;
  bank_name?: string;
  bank_account_last4?: string;
  ifsc?: string;

  // Additional
  shift_name?: string;
  work_location?: string;
  attendance_mode?: "working_hours_only" | "strict_shift_timing";
  ctc_annual_paise?: number;

  /** Provenance — set when the employee came from an ATS candidate (§6.2b). */
  source_candidate_id?: string;
}

export interface EmployeeFamilyMember {
  id: string;
  name: string;
  relation: string;
  date_of_birth?: string;
  is_dependent: boolean;
  contact_number?: string;
}

export interface EmployeeEducation {
  id: string;
  qualification: string;
  institute: string;
  specialization?: string;
  year_of_passing?: number;
  percentage?: number;
}

export interface EmployeeExperience {
  id: string;
  company: string;
  designation: string;
  from_date: string;
  to_date?: string;
  last_ctc_paise?: number;
}

export interface EmployeeDocument {
  id: string;
  document_type: string;
  file_name?: string;
  uploaded_at?: string;
  expires_at?: string;
  status: "pending" | "uploaded" | "verified" | "rejected";
  is_mandatory: boolean;
  remarks?: string;
}

/* ── Attendance ────────────────────────────────────────────────── */

export interface AttendancePunch {
  id: string;
  punched_at: string;
  direction: "in" | "out";
  source: "web" | "mobile" | "biometric" | "frs" | "manual";
  location?: string;
}

/**
 * One materialised row per employee per date. `payable_fraction` is stored, not
 * derived downstream — it is the HRMS → Payroll contract (§6.2a).
 */
export interface AttendanceDay {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  work_date: string;
  shift_name?: string;
  first_in?: string;
  last_out?: string;
  worked_minutes?: number;
  extra_minutes?: number;
  day_status: DayStatus;
  payable_fraction: 1 | 0.5 | 0;
  penalty_reason?: string;
  is_regularized?: boolean;
  punches?: AttendancePunch[];
}

/* ── Leave ─────────────────────────────────────────────────────── */

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  /** NULL is no limit — never a 9999 sentinel (§8). */
  annual_quota_days: number | null;
  is_paid: boolean;
  allows_half_day: boolean;
  requires_document: boolean;
  carry_forward_cap_days: number | null;
  is_active: boolean;
}

export interface LeaveBalance {
  leave_type_id: string;
  leave_type: string;
  opening: number;
  accrued: number;
  used: number;
  /** Derived from the ledger, never a stored counter (§4.4). */
  balance: number;
}

/* ── Approval engine (§5) ──────────────────────────────────────── */

/** The eleven request types the reference built as eleven separate screens. */
export type RequestType =
  | "leave"
  | "regularization"
  | "on_duty"
  | "comp_off"
  | "wfh"
  | "week_off_swap"
  | "early_in_out"
  | "expense_claim"
  | "goal"
  | "candidate_offer"
  | "separation";

export interface ApprovalStep {
  sequence: number;
  approver_source: "manager" | "admin" | "business_head" | "role" | "explicit";
  approver_name?: string;
  status: RequestStatus | "skipped";
  acted_at?: string;
  comment?: string;
}

export interface ApprovalRequest {
  id: string;
  request_code: string;
  request_type: RequestType;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department?: string;
  /** What the request is about, rendered as the summary column. */
  subject: string;
  from_date?: string;
  to_date?: string;
  days?: number;
  amount_paise?: number;
  reason?: string;
  applied_at: string;
  /** Derived from the steps — rejected if any step rejected (§3.1 of doc 15). */
  status: RequestStatus;
  steps: ApprovalStep[];
}

/* ── Tickets & separation ──────────────────────────────────────── */

export interface Ticket {
  id: string;
  ticket_code: string;
  subject: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed";
  raised_by_id: string;
  raised_by: string;
  assigned_to?: string;
  created_at: string;
  resolved_at?: string;
}

export interface Separation {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department?: string;
  designation?: string;
  separation_type: "resignation" | "termination" | "retirement" | "absconding";
  resignation_date: string;
  notice_days: number;
  last_working_date: string;
  reason?: string;
  status: RequestStatus;
  clearance_pending?: string[];
  exit_interview_done?: boolean;
}

/* ── Expense claims ────────────────────────────────────────────── */

export interface ExpenseClaimLine {
  id: string;
  expense_type: string;
  expense_date: string;
  amount_paise: number;
  description?: string;
  has_receipt: boolean;
}

export interface ExpenseClaim {
  id: string;
  claim_code: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  claim_date: string;
  /** Derived from the lines, never typed (§3.3 of doc 15). */
  total_amount_paise: number;
  status: RequestStatus;
  steps: ApprovalStep[];
  lines: ExpenseClaimLine[];
}

/* ── Performance ───────────────────────────────────────────────── */

export interface Goal {
  id: string;
  goal_code: string;
  title: string;
  employee_id: string;
  employee_name: string;
  cycle_name?: string;
  weightage: number;
  target: string;
  achieved?: string;
  progress_percent: number;
  due_date?: string;
  status: RequestStatus | "in_progress" | "completed";
}

export interface Kra {
  id: string;
  kra_code: string;
  kpi_name: string;
  measurement: string;
  weightage: number;
  score?: number;
  assigned_date?: string;
  designation?: string;
}

export interface PerformanceCycle {
  id: string;
  cycle_code: string;
  cycle_name: string;
  cycle_type: "annual" | "half_yearly" | "quarterly" | "probation";
  period_start: string;
  period_end: string;
  self_review_start?: string;
  self_review_end?: string;
  manager_review_start?: string;
  manager_review_end?: string;
  status: "draft" | "active" | "closed";
  participants?: number;
}

export interface AppraisalTemplate {
  id: string;
  template_name: string;
  template_type: string;
  sections: number;
  questions: number;
  is_active: boolean;
}

export interface Appraisal {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  designation?: string;
  cycle_name: string;
  template_name?: string;
  self_score?: number;
  manager_score?: number;
  final_rating?: number;
  status: "not_started" | "self_review" | "manager_review" | "hr_review" | "completed";
  submitted_at?: string;
}

export interface RankingEntry {
  rank: number;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department?: string;
  attendance_score: number;
  goal_score: number;
  total_score: number;
  change?: number;
}

/* ── Onboarding (§ doc 14) ─────────────────────────────────────── */

export interface OnboardingCase {
  id: string;
  case_code: string;
  candidate_name: string;
  email: string;
  mobile?: string;
  designation?: string;
  department?: string;
  branch?: string;
  offered_annual_salary_paise?: number;
  /** From the ATS requisition — lets us flag offers over budget (§1.4 doc 15). */
  budget_annual_paise?: number;
  proposed_doj?: string;
  actual_doj?: string;
  status:
    | "pending_approval"
    | "approved"
    | "rejected"
    | "offer_sent"
    | "offer_declined"
    | "documents_pending"
    | "documents_submitted"
    | "joined";
  documents_received?: number;
  documents_required?: number;
  /** Provenance back to the ATS candidate (§6.2b). */
  source_candidate_id?: string;
  decline_reason?: string;
}

export interface DocumentTypeMaster {
  id: string;
  name: string;
  category: string;
  is_mandatory: boolean;
  requires_expiry: boolean;
  applies_to: string;
  is_active: boolean;
}

export interface OnboardingFormMaster {
  id: string;
  form_name: string;
  applies_to: string;
  sections: number;
  documents_required: number;
  is_active: boolean;
}

/* ── More module ───────────────────────────────────────────────── */

/** A read-only projection of the ATS requisition — HRMS owns no jobs table. */
export interface JobOpeningView {
  id: string;
  job_title: string;
  experience_years?: string;
  budget_annual_paise?: number;
  openings: number;
  priority: "low" | "medium" | "high" | "critical";
  status: string;
  created_by?: string;
  created_at: string;
  in_progress_at?: string;
  closed_at?: string;
}

export interface Asset {
  id: string;
  asset_code: string;
  category: string;
  make?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  status: "in_stock" | "allocated" | "in_repair" | "retired";
  allocated_to?: string;
  allocated_on?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body?: string;
  category: string;
  published_at: string;
  /** NULL means it never expires — the reference used a boolean and went stale. */
  expires_at: string | null;
  audience_scope: "organization" | "branch" | "department" | "business_unit";
  audience_scope_name?: string;
  is_pinned: boolean;
}

/* ── Settings ──────────────────────────────────────────────────── */

export interface Shift {
  id: string;
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  working_hours: number;
  grace_in_minutes: number;
  grace_out_minutes: number;
  half_day_after_minutes: number | null;
  attendance_mode: "working_hours_only" | "strict_shift_timing";
  week_off_days: string[];
  is_active: boolean;
}

export interface Holiday {
  id: string;
  name: string;
  holiday_date: string;
  holiday_type: "public" | "restricted" | "regional";
  applies_to: string;
  is_active: boolean;
}

export interface CronJob {
  id: string;
  name: string;
  description?: string;
  schedule: string;
  last_run_at?: string;
  next_run_at?: string;
  last_status?: "success" | "failed" | "running";
  is_enabled: boolean;
}

export interface EmailTemplateMaster {
  id: string;
  name: string;
  event_key: string;
  subject: string;
  is_active: boolean;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  member_count: number;
  permissions: string[];
}

export interface ActivityLogEntry {
  id: string;
  occurred_at: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_label?: string;
  ip_address?: string;
}
