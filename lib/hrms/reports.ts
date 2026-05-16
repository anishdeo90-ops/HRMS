export type ReportPayload = Record<string, unknown>;

export type ReportCategory =
  | "people"
  | "time"
  | "leave"
  | "finance"
  | "payroll"
  | "recruitment"
  | "lifecycle"
  | "events";

export type ReportFormat = "json" | "csv" | "xlsx";
export type ReportRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type DashboardWidgetStatus = "draft" | "active" | "inactive" | "archived";

export type ReportDefinition = {
  key: string;
  title: string;
  category: ReportCategory;
  description: string;
  permission: string;
  sourceTables: readonly string[];
  defaultFormat: ReportFormat;
};

export type ReportDateRangeValidation =
  | { valid: true }
  | { valid: false; reason: string };

const CALLER_WRITABLE_RUN_STATUSES = new Set<ReportRunStatus>(["queued"]);
const CALLER_WRITABLE_WIDGET_STATUSES = new Set<DashboardWidgetStatus>(["draft", "active", "inactive"]);
const REPORT_FORMATS = new Set<ReportFormat>(["json", "csv", "xlsx"]);

const READ_ONLY_FIELDS = [
  "id",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "started_at",
  "completed_at",
  "failed_at",
  "cancelled_at",
  "row_count",
  "result_url",
  "error_message",
] as const;

const REPORT_RUN_FIELDS = [
  "report_key",
  "report_title",
  "category",
  "status",
  "format",
  "parameters",
  "filters",
  "requested_by",
] as const;

const DASHBOARD_WIDGET_FIELDS = [
  "dashboard_key",
  "widget_key",
  "title",
  "category",
  "metric_key",
  "status",
  "sort_order",
  "config",
  "refresh_interval_minutes",
] as const;

export const HRMS_REPORT_CATALOG: readonly ReportDefinition[] = [
  {
    key: "report.hrms.employee_information",
    title: "Employee information",
    category: "people",
    description: "Employee master data with organization assignments and employment status.",
    permission: "permission.reports.view",
    sourceTables: ["employees", "hr_departments", "hr_branches", "hr_grades"],
    defaultFormat: "json",
  },
  {
    key: "report.hrms.employee_analytics",
    title: "Employee analytics",
    category: "people",
    description: "Headcount and employment-status summary for the employee population.",
    permission: "permission.reports.view",
    sourceTables: ["employees", "hr_departments"],
    defaultFormat: "json",
  },
  {
    key: "report.hrms.monthly_attendance_sheet",
    title: "Monthly attendance sheet",
    category: "time",
    description: "Attendance-day detail by employee and attendance date.",
    permission: "permission.attendance.manage",
    sourceTables: ["attendance_days", "employees"],
    defaultFormat: "xlsx",
  },
  {
    key: "report.hrms.shift_attendance",
    title: "Shift attendance",
    category: "time",
    description: "Shift assignment and attendance coverage by employee.",
    permission: "permission.shifts.view",
    sourceTables: ["employee_shift_assignments", "attendance_shift_types", "employees"],
    defaultFormat: "json",
  },
  {
    key: "report.hrms.leave_balance",
    title: "Leave balance",
    category: "leave",
    description: "Current leave balances by employee and leave type.",
    permission: "permission.leave.reports.view",
    sourceTables: ["leave_allocations", "leave_ledger_entries", "employees"],
    defaultFormat: "json",
  },
  {
    key: "report.hrms.leave_ledger",
    title: "Leave ledger",
    category: "leave",
    description: "Leave ledger transactions with employee and leave type context.",
    permission: "permission.leave.reports.view",
    sourceTables: ["leave_ledger_entries", "leave_types", "employees"],
    defaultFormat: "xlsx",
  },
  {
    key: "report.hrms.employee_advance_summary",
    title: "Employee advance summary",
    category: "finance",
    description: "Employee advance status and outstanding amount summary.",
    permission: "permission.employee_advances.manage",
    sourceTables: ["employee_advances", "employees"],
    defaultFormat: "json",
  },
  {
    key: "report.hrms.unpaid_expense_claims",
    title: "Unpaid expense claims",
    category: "finance",
    description: "Approved and unpaid employee expense claims.",
    permission: "permission.expenses.manage",
    sourceTables: ["expense_claims", "employees"],
    defaultFormat: "xlsx",
  },
  {
    key: "report.hrms.salary_register",
    title: "Salary register",
    category: "payroll",
    description: "Payroll-entry salary register by period and employee.",
    permission: "permission.payroll_reports.view",
    sourceTables: ["payroll_entries", "payroll_periods", "employees"],
    defaultFormat: "xlsx",
  },
  {
    key: "report.hrms.bank_remittance",
    title: "Bank remittance",
    category: "payroll",
    description: "Net-pay remittance data for payroll disbursement checks.",
    permission: "permission.payroll_reports.view",
    sourceTables: ["salary_slips", "employees"],
    defaultFormat: "xlsx",
  },
  {
    key: "report.hrms.recruitment_analytics",
    title: "Recruitment analytics",
    category: "recruitment",
    description: "ATS recruiting pipeline counts preserved for HR reporting.",
    permission: "permission.reports.view",
    sourceTables: ["candidates", "jobs", "interviews", "offers"],
    defaultFormat: "json",
  },
  {
    key: "report.hrms.employee_exits",
    title: "Employee exits",
    category: "lifecycle",
    description: "Employee separation pipeline and last-working-day tracking.",
    permission: "permission.lifecycle.reports.view",
    sourceTables: ["employee_separations", "employees"],
    defaultFormat: "json",
  },
  {
    key: "report.hrms.birthdays_anniversaries",
    title: "Birthdays and anniversaries",
    category: "events",
    description: "Upcoming employee birthday and work-anniversary reminders.",
    permission: "permission.reports.view",
    sourceTables: ["employees"],
    defaultFormat: "json",
  },
] as const;

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

function normalizeFormat(value: unknown, fallback: ReportFormat = "json") {
  const cleaned = cleanString(value);
  if (typeof cleaned !== "string") return fallback;
  const normalized = cleaned.toLowerCase() as ReportFormat;
  return REPORT_FORMATS.has(normalized) ? normalized : fallback;
}

function normalizeNumber(value: unknown, min = 0, max = Number.POSITIVE_INFINITY) {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  return Number.isFinite(amount) && amount >= min && amount <= max ? amount : undefined;
}

function normalizeInteger(value: unknown, min = 0, max = Number.POSITIVE_INFINITY) {
  const amount = normalizeNumber(value, min, max);
  return amount !== undefined && Number.isInteger(amount) ? amount : undefined;
}

function pickCleanFields(input: ReportPayload, fields: readonly string[]) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = cleanString(input[field]);
    if (value !== undefined && value !== null) payload[field] = value;
  }
  return payload;
}

function normalizeObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined && item !== ""));
}

function parseDateOnly(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  return Date.parse(`${value}T00:00:00.000Z`);
}

export function stripReportReadOnlyFields(input: ReportPayload) {
  const payload = { ...input };
  for (const field of READ_ONLY_FIELDS) delete payload[field];
  return payload;
}

export function validateReportDateRange(startDate: string | null | undefined, endDate: string | null | undefined, label = "Report date range"): ReportDateRangeValidation {
  if (!startDate && !endDate) return { valid: true };
  if (!startDate || !endDate) return { valid: false, reason: `${label} requires both start and end dates.` };
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { valid: false, reason: `${label} must use valid ISO dates.` };
  if (end < start) return { valid: false, reason: `${label} end date cannot be before start date.` };
  return { valid: true };
}

export function normalizeReportFilters(input: unknown) {
  const source = normalizeObject(input);
  const filters: Record<string, unknown> = {};
  for (const field of ["employee_id", "department_id", "branch_id", "status", "period_id", "date_from", "date_to", "month"]) {
    const value = cleanString(source[field]);
    if (value !== undefined && value !== null) filters[field] = value;
  }
  return filters;
}

export function resolveReportDefinition(key: string | null | undefined) {
  if (!key) return undefined;
  return HRMS_REPORT_CATALOG.find((report) => report.key === key);
}

export function normalizeReportRunPayload(input: ReportPayload) {
  const source = { ...stripReportReadOnlyFields(input) };
  if (source.reportKey && !source.report_key) source.report_key = source.reportKey;
  if (source.key && !source.report_key) source.report_key = source.key;
  const definition = resolveReportDefinition(typeof source.report_key === "string" ? source.report_key : undefined);
  if (definition) {
    source.report_title = definition.title;
    source.category = definition.category;
    if (!source.format) source.format = definition.defaultFormat;
  }
  const payload = pickCleanFields(source, REPORT_RUN_FIELDS);
  payload.parameters = normalizeReportFilters(source.parameters ?? source.filters ?? source);
  payload.filters = payload.parameters;
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_RUN_STATUSES, "queued");
  payload.format = normalizeFormat(payload.format, definition?.defaultFormat ?? "json");
  return payload;
}

export function normalizeDashboardWidgetPayload(input: ReportPayload) {
  const source = { ...stripReportReadOnlyFields(input) };
  if (source.key && !source.widget_key) source.widget_key = source.key;
  if (source.report_key && !source.metric_key) source.metric_key = source.report_key;
  const payload = pickCleanFields(source, DASHBOARD_WIDGET_FIELDS);
  payload.config = normalizeObject(source.config);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_WIDGET_STATUSES, "draft");
  const sortOrder = normalizeInteger(payload.sort_order);
  if (sortOrder === undefined) delete payload.sort_order;
  else payload.sort_order = sortOrder;
  const refresh = normalizeInteger(payload.refresh_interval_minutes, 1, 1440);
  if (refresh === undefined) delete payload.refresh_interval_minutes;
  else payload.refresh_interval_minutes = refresh;
  return payload;
}
