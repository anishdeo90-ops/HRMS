import type { ReportDefinition } from "@/lib/hrms/reports";
import {
  HRMS_REPORT_CATALOG,
  normalizeReportFilters,
  normalizeReportRunPayload,
  resolveReportDefinition,
} from "@/lib/hrms/reports";
import {
  canRunReport,
  canViewDashboards,
  canViewReport,
  canViewReports,
  canManageReports,
} from "@/lib/hrms/reports-authorization";

export {
  HRMS_REPORT_CATALOG,
  canManageReports,
  canRunReport,
  canViewDashboards,
  canViewReport,
  canViewReports,
  normalizeReportFilters,
  normalizeReportRunPayload,
  resolveReportDefinition,
};

const EMPLOYEE_SELECT = "id, employee_code, name, profile_id, department_id, reporting_manager_id";

function filterValue(filters: Record<string, unknown>, key: string) {
  const value = filters[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function applyEmployeeFilters(query: any, filters: Record<string, unknown>) {
  for (const field of ["employee_id", "department_id", "branch_id", "status"]) {
    const value = filterValue(filters, field);
    if (value) query = query.eq(field === "status" ? "employment_status" : field, value);
  }
  return query;
}

function applyDateFilters(query: any, filters: Record<string, unknown>, column: string) {
  const dateFrom = filterValue(filters, "date_from");
  const dateTo = filterValue(filters, "date_to");
  if (dateFrom) query = query.gte(column, dateFrom);
  if (dateTo) query = query.lte(column, dateTo);
  return query;
}

async function rows(query: any) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exactCount(query: any) {
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export function visibleReportCatalog(profile: unknown) {
  return HRMS_REPORT_CATALOG.filter((report) => canViewReport(profile as any, report));
}

export async function executeHrmsReport(supabase: any, definition: ReportDefinition, filters: Record<string, unknown>) {
  if (definition.key === "report.hrms.employee_information") {
    let query = supabase
      .from("employees")
      .select("id, employee_code, name, employment_status, joining_date, work_email, department:hr_departments(name), branch:hr_branches(name), grade:hr_grades(name)")
      .order("name")
      .limit(500);
    query = applyEmployeeFilters(query, filters);
    return { report: definition, filters, data: await rows(query) };
  }

  if (definition.key === "report.hrms.employee_analytics") {
    const [active, inactive, total] = await Promise.all([
      exactCount(supabase.from("employees").select("id", { count: "exact", head: true }).eq("is_active", true)),
      exactCount(supabase.from("employees").select("id", { count: "exact", head: true }).eq("is_active", false)),
      exactCount(supabase.from("employees").select("id", { count: "exact", head: true })),
    ]);
    return { report: definition, filters, data: [{ active, inactive, total }] };
  }

  if (definition.key === "report.hrms.monthly_attendance_sheet") {
    let query = supabase
      .from("attendance_days")
      .select(`*,employee:employees!attendance_days_employee_id_fkey(${EMPLOYEE_SELECT})`)
      .order("attendance_date", { ascending: false })
      .limit(500);
    query = applyDateFilters(query, filters, "attendance_date");
    if (filterValue(filters, "employee_id")) query = query.eq("employee_id", filterValue(filters, "employee_id"));
    return { report: definition, filters, data: await rows(query) };
  }

  if (definition.key === "report.hrms.shift_attendance") {
    let query = supabase
      .from("employee_shift_assignments")
      .select(`*,employee:employees!employee_shift_assignments_employee_id_fkey(${EMPLOYEE_SELECT}),shift:attendance_shift_types(*)`)
      .order("start_date", { ascending: false })
      .limit(500);
    query = applyDateFilters(query, filters, "start_date");
    if (filterValue(filters, "employee_id")) query = query.eq("employee_id", filterValue(filters, "employee_id"));
    return { report: definition, filters, data: await rows(query) };
  }

  if (definition.key === "report.hrms.leave_balance") {
    let query = supabase
      .from("leave_allocations")
      .select(`*,employee:employees!leave_allocations_employee_id_fkey(${EMPLOYEE_SELECT}),leave_type:leave_types(*)`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (filterValue(filters, "employee_id")) query = query.eq("employee_id", filterValue(filters, "employee_id"));
    return { report: definition, filters, data: await rows(query) };
  }

  if (definition.key === "report.hrms.leave_ledger") {
    let query = supabase
      .from("leave_ledger_entries")
      .select(`*,employee:employees!leave_ledger_entries_employee_id_fkey(${EMPLOYEE_SELECT}),leave_type:leave_types(*)`)
      .order("entry_date", { ascending: false })
      .limit(500);
    query = applyDateFilters(query, filters, "entry_date");
    if (filterValue(filters, "employee_id")) query = query.eq("employee_id", filterValue(filters, "employee_id"));
    return { report: definition, filters, data: await rows(query) };
  }

  if (definition.key === "report.hrms.employee_advance_summary") {
    let query = supabase
      .from("employee_advances")
      .select(`*,employee:employees!employee_advances_employee_id_fkey(${EMPLOYEE_SELECT})`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (filterValue(filters, "status")) query = query.eq("status", filterValue(filters, "status"));
    return { report: definition, filters, data: await rows(query) };
  }

  if (definition.key === "report.hrms.unpaid_expense_claims") {
    const query = supabase
      .from("expense_claims")
      .select(`*,employee:employees!expense_claims_employee_id_fkey(${EMPLOYEE_SELECT})`)
      .in("status", ["approved", "unpaid", "submitted"])
      .order("created_at", { ascending: false })
      .limit(500);
    return { report: definition, filters, data: await rows(query) };
  }

  if (definition.key === "report.hrms.salary_register") {
    let query = supabase
      .from("payroll_entries")
      .select(`*,employee:employees!payroll_entries_employee_id_fkey(${EMPLOYEE_SELECT}),period:payroll_periods(*)`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (filterValue(filters, "period_id")) query = query.eq("payroll_period_id", filterValue(filters, "period_id"));
    return { report: definition, filters, data: await rows(query) };
  }

  if (definition.key === "report.hrms.bank_remittance") {
    let query = supabase
      .from("salary_slips")
      .select(`*,employee:employees!salary_slips_employee_id_fkey(${EMPLOYEE_SELECT}, bank_account_number, ifsc_code)`)
      .in("status", ["issued", "published", "paid"])
      .order("created_at", { ascending: false })
      .limit(500);
    if (filterValue(filters, "employee_id")) query = query.eq("employee_id", filterValue(filters, "employee_id"));
    return { report: definition, filters, data: await rows(query) };
  }

  if (definition.key === "report.hrms.recruitment_analytics") {
    const [candidates, interviews, offers] = await Promise.all([
      exactCount(supabase.from("candidates").select("id", { count: "exact", head: true })),
      exactCount(supabase.from("interviews").select("id", { count: "exact", head: true })),
      exactCount(supabase.from("offers").select("id", { count: "exact", head: true })),
    ]);
    return { report: definition, filters, data: [{ candidates, interviews, offers }] };
  }

  if (definition.key === "report.hrms.employee_exits") {
    let query = supabase
      .from("employee_separations")
      .select(`*,employee:employees!employee_separations_employee_id_fkey(${EMPLOYEE_SELECT})`)
      .order("last_working_date", { ascending: false })
      .limit(500);
    query = applyDateFilters(query, filters, "last_working_date");
    return { report: definition, filters, data: await rows(query) };
  }

  if (definition.key === "report.hrms.birthdays_anniversaries") {
    const data = await rows(supabase
      .from("employees")
      .select("id, employee_code, name, date_of_birth, joining_date, department:hr_departments(name)")
      .eq("is_active", true)
      .limit(500));
    return { report: definition, filters, data };
  }

  return { report: definition, filters, data: [] };
}
