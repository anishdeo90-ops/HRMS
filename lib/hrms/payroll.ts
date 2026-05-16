type PayrollPayload = Record<string, unknown>;

export type SalaryComponentType = "earning" | "deduction" | "employer_contribution";
export type SalaryStructureStatus = "draft" | "active" | "inactive" | "archived";
export type PayrollPeriodStatus = "draft" | "open" | "processing" | "approved" | "paid" | "closed" | "cancelled";
export type PayrollEntryStatus = "draft" | "calculated" | "approved" | "paid" | "held" | "cancelled";
export type SalarySlipStatus = "draft" | "generated" | "approved" | "published" | "paid" | "cancelled";
export type TaxDeclarationStatus = "draft" | "submitted" | "approved" | "rejected";
export type BenefitClaimStatus = "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "paid";

export type SalaryStructureDetail = {
  salary_component_id?: string;
  component_key?: string;
  component_type?: SalaryComponentType;
  amount?: number;
  formula?: string;
  sort_order?: number;
};

const CALLER_WRITABLE_STRUCTURE_STATUSES = new Set<SalaryStructureStatus>(["draft", "active", "inactive"]);
const CALLER_WRITABLE_PERIOD_STATUSES = new Set<PayrollPeriodStatus>(["draft", "open"]);
const CALLER_WRITABLE_ENTRY_STATUSES = new Set<PayrollEntryStatus>(["draft", "calculated"]);
const CALLER_WRITABLE_SLIP_STATUSES = new Set<SalarySlipStatus>(["draft", "generated"]);
const CALLER_WRITABLE_TAX_STATUSES = new Set<TaxDeclarationStatus>(["draft", "submitted"]);
const CALLER_WRITABLE_BENEFIT_STATUSES = new Set<BenefitClaimStatus>(["draft", "submitted"]);

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
  "published_by",
  "published_at",
  "paid_by",
  "paid_at",
  "closed_by",
  "closed_at",
  "cancelled_by",
  "cancelled_at",
  "gross_pay_calculated_at",
  "net_pay_calculated_at",
] as const;

const STRUCTURE_FIELDS = ["name", "description", "status", "is_default"] as const;
const STRUCTURE_DETAIL_FIELDS = ["salary_component_id", "component_key", "component_type", "amount", "formula", "sort_order"] as const;
const ASSIGNMENT_FIELDS = ["employee_id", "salary_structure_id", "effective_from", "effective_to", "status", "notes"] as const;
const COMPONENT_FIELDS = ["key", "name", "label", "category", "calculation", "taxable", "recurrence", "effective_from", "effective_to", "is_active", "description"] as const;
const PERIOD_FIELDS = ["name", "period_name", "month", "year", "fiscal_year", "period_start", "period_end", "start_date", "end_date", "payment_date", "pay_date", "status", "notes"] as const;
const ENTRY_FIELDS = [
  "payroll_period_id",
  "employee_id",
  "salary_structure_assignment_id",
  "gross_pay",
  "total_deductions",
  "deductions",
  "employer_contributions",
  "net_pay",
  "status",
  "notes",
] as const;
const SLIP_FIELDS = ["payroll_period_id", "payroll_entry_id", "employee_id", "slip_number", "gross_pay", "total_deductions", "net_pay", "status", "issued_on", "notes"] as const;
const SLIP_LINE_FIELDS = ["salary_component_id", "salary_component_key", "component_key", "amount", "line_type", "display_order", "notes"] as const;
const TAX_DECLARATION_FIELDS = ["employee_id", "financial_year", "fiscal_year", "tax_year", "declaration_key", "declaration_type", "declared_amount", "approved_amount", "status", "notes"] as const;
const BENEFIT_APPLICATION_FIELDS = ["employee_id", "benefit_key", "benefit_name", "requested_amount", "status", "effective_from", "effective_to", "notes"] as const;
const BENEFIT_CLAIM_FIELDS = ["employee_id", "benefit_application_id", "benefit_key", "benefit_name", "claim_amount", "claim_date", "status", "notes"] as const;
const TAX_SLAB_FIELDS = ["name", "financial_year", "fiscal_year", "tax_year", "regime", "min_income", "max_income", "rate", "tax_rate", "cess_rate", "is_active"] as const;
const GRATUITY_RULE_FIELDS = ["name", "effective_from", "effective_to", "formula", "is_active", "notes"] as const;

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

function normalizeNonNegativeNumber(value: unknown) {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

function normalizeInteger(value: unknown) {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  return Number.isInteger(amount) && amount >= 0 ? amount : undefined;
}

function pickCleanFields(input: PayrollPayload, fields: readonly string[]) {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = cleanString(input[field]);
    if (value !== undefined && value !== null) payload[field] = value;
  }
  return payload;
}

function withNonNegativeNumber(payload: Record<string, unknown>, field: string) {
  const amount = normalizeNonNegativeNumber(payload[field]);
  if (amount === undefined) delete payload[field];
  else payload[field] = amount;
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

function normalizeComponentType(value: unknown) {
  const cleaned = cleanString(value);
  if (typeof cleaned !== "string") return undefined;
  const normalized = cleaned.toLowerCase().replace(/[\s-]+/g, "_") as SalaryComponentType;
  return normalized === "earning" || normalized === "deduction" || normalized === "employer_contribution"
    ? normalized
    : undefined;
}

export function stripPayrollReadOnlyFields(input: PayrollPayload) {
  const payload = { ...input };
  for (const field of READ_ONLY_FIELDS) delete payload[field];
  return payload;
}

export function normalizeSalaryStructurePayload(input: PayrollPayload) {
  const payload = pickCleanFields(stripPayrollReadOnlyFields(input), STRUCTURE_FIELDS);
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_STRUCTURE_STATUSES, "draft");
  return payload;
}

export function normalizeSalaryComponentPayload(input: PayrollPayload) {
  return pickCleanFields(stripPayrollReadOnlyFields(input), COMPONENT_FIELDS);
}

export function normalizeSalaryStructureDetails(input: unknown): SalaryStructureDetail[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const payload = pickCleanFields(stripPayrollReadOnlyFields(item as PayrollPayload), STRUCTURE_DETAIL_FIELDS);
    withNonNegativeNumber(payload, "amount");
    const sortOrder = normalizeInteger(payload.sort_order);
    if (sortOrder === undefined) delete payload.sort_order;
    else payload.sort_order = sortOrder;
    const componentType = normalizeComponentType(payload.component_type);
    if (componentType === undefined) delete payload.component_type;
    else payload.component_type = componentType;
    return payload as SalaryStructureDetail;
  }).filter((item) => item.component_key && item.component_type && item.amount !== undefined);
}

export function sumSalaryStructureDetails(details: readonly SalaryStructureDetail[]) {
  const totals = details.reduce((acc, item) => {
    const amount = Number(item.amount) || 0;
    if (item.component_type === "deduction") acc.deductions += amount;
    else if (item.component_type === "employer_contribution") acc.employer_contributions += amount;
    else if (item.component_type === "earning") acc.earnings += amount;
    return acc;
  }, { earnings: 0, deductions: 0, employer_contributions: 0 });

  return {
    earnings: Number(totals.earnings.toFixed(2)),
    deductions: Number(totals.deductions.toFixed(2)),
    employer_contributions: Number(totals.employer_contributions.toFixed(2)),
    net: Number((totals.earnings - totals.deductions).toFixed(2)),
  };
}

export type PayrollStructureAssignment = {
  id: string;
  employee_id: string;
  base_amount?: number | string | null;
  structure?: {
    id?: string;
    name?: string | null;
    details?: Array<{
      id?: string;
      salary_component_id?: string | null;
      amount?: number | string | null;
      sequence?: number | null;
      component?: {
        id?: string;
        code?: string | null;
        component_type?: SalaryComponentType | string | null;
      } | null;
    }> | null;
  } | null;
};

export function buildPayrollAmountsFromAssignment(assignment: PayrollStructureAssignment) {
  const details = assignment.structure?.details ?? [];
  const totals = details.reduce((acc, detail) => {
    const amount = Number(detail.amount ?? 0);
    const type = detail.component?.component_type;
    if (!Number.isFinite(amount)) return acc;
    if (type === "deduction") acc.deductions += amount;
    else if (type === "employer_contribution") acc.employer_contributions += amount;
    else acc.earnings += amount;
    return acc;
  }, { earnings: 0, deductions: 0, employer_contributions: 0 });

  const fallbackGross = Number(assignment.base_amount ?? 0);
  const gross = totals.earnings > 0 ? totals.earnings : Number.isFinite(fallbackGross) ? fallbackGross : 0;
  const totalDeductions = totals.deductions;
  return {
    gross_pay: Number(gross.toFixed(2)),
    total_deductions: Number(totalDeductions.toFixed(2)),
    net_pay: Number(Math.max(gross - totalDeductions, 0).toFixed(2)),
    employer_contributions: Number(totals.employer_contributions.toFixed(2)),
  };
}

export function buildSalarySlipLinesFromAssignment(assignment: PayrollStructureAssignment) {
  return (assignment.structure?.details ?? [])
    .filter((detail) => detail.salary_component_id && Number(detail.amount ?? 0) >= 0)
    .map((detail, index) => ({
      salary_component_id: detail.salary_component_id,
      line_type: detail.component?.component_type === "deduction" || detail.component?.component_type === "employer_contribution"
        ? detail.component.component_type
        : "earning",
      amount: Number(Number(detail.amount ?? 0).toFixed(2)),
      sequence: typeof detail.sequence === "number" ? detail.sequence : index,
    }));
}

export function normalizeSalaryStructureAssignmentPayload(input: PayrollPayload) {
  const payload = pickCleanFields(stripPayrollReadOnlyFields(input), ASSIGNMENT_FIELDS);
  payload.status = normalizeStatus(payload.status, new Set(["draft", "active"] as const), "draft");
  return payload;
}

export function validatePayrollPeriodDateRange(startDate: string | null | undefined, endDate: string | null | undefined) {
  if (!startDate || !endDate) return { valid: false, reason: "Payroll period date range is required." };
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { valid: false, reason: "Payroll period dates must be valid ISO dates." };
  if (end < start) return { valid: false, reason: "Payroll period end date cannot be before start date." };
  return { valid: true };
}

export function normalizePayrollPeriodPayload(input: PayrollPayload) {
  const payload = pickCleanFields(stripPayrollReadOnlyFields(input), PERIOD_FIELDS);
  if (payload.period_start && !payload.start_date) payload.start_date = payload.period_start;
  if (payload.period_end && !payload.end_date) payload.end_date = payload.period_end;
  if (payload.year && !payload.fiscal_year) payload.fiscal_year = payload.year;
  delete payload.name;
  delete payload.period_name;
  delete payload.period_start;
  delete payload.period_end;
  delete payload.year;
  delete payload.payment_date;
  delete payload.pay_date;
  delete payload.notes;
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_PERIOD_STATUSES, "draft");
  for (const field of ["month", "fiscal_year"]) {
    const value = normalizeInteger(payload[field]);
    if (value === undefined) delete payload[field];
    else payload[field] = value;
  }
  return payload;
}

export function normalizePayrollEntryPayload(input: PayrollPayload) {
  const payload = pickCleanFields(stripPayrollReadOnlyFields(input), ENTRY_FIELDS);
  withNonNegativeNumber(payload, "gross_pay");
  withNonNegativeNumber(payload, "total_deductions");
  withNonNegativeNumber(payload, "deductions");
  withNonNegativeNumber(payload, "employer_contributions");
  withNonNegativeNumber(payload, "net_pay");
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_ENTRY_STATUSES, "draft");
  return payload;
}

export function normalizePayrollEntries(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((item) => normalizePayrollEntryPayload(item as PayrollPayload)).filter((item) => item.employee_id);
}

export function normalizeSalarySlipPayload(input: PayrollPayload) {
  const payload = pickCleanFields(stripPayrollReadOnlyFields(input), SLIP_FIELDS);
  withNonNegativeNumber(payload, "gross_pay");
  withNonNegativeNumber(payload, "total_deductions");
  withNonNegativeNumber(payload, "net_pay");
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_SLIP_STATUSES, "draft");
  return payload;
}

export function normalizeSalarySlipLines(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    const payload = pickCleanFields(stripPayrollReadOnlyFields(item as PayrollPayload), SLIP_LINE_FIELDS);
    withNonNegativeNumber(payload, "amount");
    const displayOrder = normalizeInteger(payload.display_order);
    if (displayOrder === undefined) delete payload.display_order;
    else payload.display_order = displayOrder;
    return payload;
  }).filter((item) => (item.salary_component_id || item.salary_component_key || item.component_key) && item.amount !== undefined);
}

export function normalizeTaxDeclarationPayload(input: PayrollPayload) {
  const payload = pickCleanFields(stripPayrollReadOnlyFields(input), TAX_DECLARATION_FIELDS);
  withPositiveNumber(payload, "declared_amount");
  withNonNegativeNumber(payload, "approved_amount");
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_TAX_STATUSES, "draft");
  return payload;
}

export function normalizeBenefitApplicationPayload(input: PayrollPayload) {
  const payload = pickCleanFields(stripPayrollReadOnlyFields(input), BENEFIT_APPLICATION_FIELDS);
  withPositiveNumber(payload, "requested_amount");
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_BENEFIT_STATUSES, "draft");
  return payload;
}

export function normalizeBenefitClaimPayload(input: PayrollPayload) {
  const payload = pickCleanFields(stripPayrollReadOnlyFields(input), BENEFIT_CLAIM_FIELDS);
  withPositiveNumber(payload, "claim_amount");
  payload.status = normalizeStatus(payload.status, CALLER_WRITABLE_BENEFIT_STATUSES, "draft");
  return payload;
}

export function normalizeTaxSlabPayload(input: PayrollPayload) {
  const payload = pickCleanFields(stripPayrollReadOnlyFields(input), TAX_SLAB_FIELDS);
  for (const field of ["min_income", "max_income", "rate", "tax_rate", "cess_rate"]) withNonNegativeNumber(payload, field);
  return payload;
}

export function normalizeGratuityRulePayload(input: PayrollPayload) {
  return pickCleanFields(stripPayrollReadOnlyFields(input), GRATUITY_RULE_FIELDS);
}
