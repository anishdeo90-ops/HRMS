import { NextRequest, NextResponse } from "next/server";
import { canRunPayroll, normalizePayrollEntries, normalizePayrollEntryPayload } from "@/app/api/hrms/payroll/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { buildPayrollAmountsFromAssignment, buildSalarySlipLinesFromAssignment, type PayrollStructureAssignment } from "@/lib/hrms/payroll";
import type { GeneratedKey } from "@/lib/generated/workflows";
import { createClient } from "@/lib/supabase/server";

const ENTRY_SELECT = [
  "*",
  "employee:employees!payroll_entries_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)",
  "period:payroll_periods(*)",
].join(",");

const ASSIGNMENT_SELECT = [
  "*",
  "employee:employees!salary_structure_assignments_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)",
  "structure:salary_structures(*,details:salary_structure_details(*,component:salary_components(*)))",
].join(",");

const SLIP_SELECT = "id, payroll_entry_id, payroll_period_id, employee_id, status, gross_pay, total_deductions, net_pay";

const PAYROLL_ENTRY_WORKFLOW = "workflow.payroll.entry_status" satisfies GeneratedKey;
const PAYROLL_ENTRY_STATES = ["draft", "calculated", "approved", "paid", "cancelled"] as const;
const PAYROLL_ENTRY_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["calculated", "cancelled"],
  calculated: ["approved"],
  approved: ["paid"],
  paid: [],
  cancelled: [],
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function normalizeWorkflowStatus(value: unknown, allowed: readonly string[]) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.includes(normalized) ? normalized : null;
}

function invalidTransition(currentStatus: string, nextStatus: unknown, workflowKey: GeneratedKey, transitions: Record<string, readonly string[]>) {
  if (typeof nextStatus !== "string" || nextStatus === currentStatus) return null;
  if (transitions[currentStatus]?.includes(nextStatus)) return null;
  return `Invalid status transition for ${workflowKey}: ${currentStatus} -> ${nextStatus}`;
}

async function readPeriod(supabase: SupabaseClient, periodId: string) {
  const { data, error } = await supabase.from("payroll_periods").select("id, start_date, end_date").eq("id", periodId).single();
  return { period: data, error };
}

async function activeAssignmentsForPeriod(supabase: SupabaseClient, period: { start_date: string; end_date: string }, employeeIds?: string[]) {
  let query = supabase
    .from("salary_structure_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("status", "active")
    .lte("effective_from", period.end_date)
    .or(`effective_to.is.null,effective_to.gte.${period.start_date}`)
    .order("effective_from", { ascending: false });
  if (employeeIds?.length) query = query.in("employee_id", employeeIds);
  const { data, error } = await query;
  if (error) return { assignments: [], error };

  const latestByEmployee = new Map<string, PayrollStructureAssignment>();
  for (const assignment of ((data ?? []) as unknown as PayrollStructureAssignment[])) {
    if (!latestByEmployee.has(assignment.employee_id)) latestByEmployee.set(assignment.employee_id, assignment);
  }
  return { assignments: Array.from(latestByEmployee.values()), error: null };
}

async function derivePayrollEntries(supabase: SupabaseClient, payrollPeriodId: string, userId: string, employeeIds?: string[]) {
  const { period, error: periodError } = await readPeriod(supabase, payrollPeriodId);
  if (periodError || !period) return { data: null, error: periodError ?? new Error("Payroll period not found") };

  const { assignments, error: assignmentsError } = await activeAssignmentsForPeriod(supabase, period, employeeIds);
  if (assignmentsError) return { data: null, error: assignmentsError };
  if (assignments.length === 0) return { data: [], error: null };

  const rows = assignments.map((assignment) => ({
    payroll_period_id: payrollPeriodId,
    employee_id: assignment.employee_id,
    ...buildPayrollAmountsFromAssignment(assignment),
    status: "calculated",
    created_by: userId,
    updated_by: userId,
  }));

  const { data, error } = await supabase
    .from("payroll_entries")
    .upsert(rows, { onConflict: "payroll_period_id,employee_id" })
    .select(ENTRY_SELECT);
  return { data, error };
}

async function salarySlipsByPeriod(supabase: SupabaseClient, payrollPeriodIds: string[]) {
  if (payrollPeriodIds.length === 0) return new Map<string, any[]>();
  const { data, error } = await supabase.from("salary_slips").select(SLIP_SELECT).in("payroll_period_id", payrollPeriodIds);
  if (error) throw error;
  const byPeriod = new Map<string, any[]>();
  for (const slip of ((data ?? []) as any[])) {
    const records = byPeriod.get(slip.payroll_period_id) ?? [];
    records.push(slip);
    byPeriod.set(slip.payroll_period_id, records);
  }
  return byPeriod;
}

async function attachSlipStatus(supabase: SupabaseClient, entries: any[]) {
  const slips = await salarySlipsByPeriod(supabase, Array.from(new Set(entries.map((entry) => entry.payroll_period_id).filter(Boolean))));
  return entries.map((entry) => {
    const periodSlips = slips.get(entry.payroll_period_id) ?? [];
    const slip = periodSlips.find((item) => item.employee_id === entry.employee_id) ?? null;
    return { ...entry, slip_status: slip?.status ?? null, salary_slip: slip };
  });
}

async function createSalarySlipsForEntries(supabase: SupabaseClient, payrollPeriodId: string, userId: string, entries: any[]) {
  if (entries.length === 0) return { slips: [], error: null };
  const { period, error: periodError } = await readPeriod(supabase, payrollPeriodId);
  if (periodError || !period) return { slips: [], error: periodError ?? new Error("Payroll period not found") };
  const { assignments, error: assignmentsError } = await activeAssignmentsForPeriod(supabase, period, entries.map((entry) => entry.employee_id));
  if (assignmentsError) return { slips: [], error: assignmentsError };
  const assignmentByEmployee = new Map(assignments.map((assignment) => [assignment.employee_id, assignment]));

  const slipRows = entries.map((entry) => ({
    payroll_entry_id: entry.id,
    payroll_period_id: payrollPeriodId,
    employee_id: entry.employee_id,
    gross_pay: Number(entry.gross_pay ?? 0),
    total_deductions: Number(entry.total_deductions ?? 0),
    net_pay: Number(entry.net_pay ?? 0),
    status: "calculated",
    submitted_at: new Date().toISOString(),
    created_by: userId,
    updated_by: userId,
  }));
  const { data: slips, error } = await supabase
    .from("salary_slips")
    .upsert(slipRows, { onConflict: "payroll_period_id,employee_id" })
    .select("id, payroll_entry_id, payroll_period_id, employee_id, status");
  if (error) return { slips: [], error };

  const lineRows = (slips ?? []).flatMap((slip) => {
    const assignment = assignmentByEmployee.get(slip.employee_id);
    return assignment
      ? buildSalarySlipLinesFromAssignment(assignment).map((line) => ({ ...line, salary_slip_id: slip.id, created_by: userId }))
      : [];
  });
  if (lineRows.length > 0) {
    const { error: deleteError } = await supabase.from("salary_slip_lines").delete().in("salary_slip_id", (slips ?? []).map((slip) => slip.id));
    if (deleteError) return { slips: [], error: deleteError };
    const { error: linesError } = await supabase.from("salary_slip_lines").insert(lineRows);
    if (linesError) return { slips: [], error: linesError };
  }
  return { slips: slips ?? [], error: null };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canRunPayroll(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  let query = supabase.from("payroll_entries").select(ENTRY_SELECT).order("created_at", { ascending: false }).limit(200);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  if (searchParams.get("period_id")) query = query.eq("payroll_period_id", searchParams.get("period_id"));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try {
    const enriched = await attachSlipStatus(supabase, data ?? []);
    return NextResponse.json({ data: enriched, included_employees: enriched });
  } catch (slipError: any) {
    return NextResponse.json({ error: slipError.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canRunPayroll(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  if (typeof body.payroll_period_id === "string" && !Array.isArray(body.entries)) {
    const employeeIds = Array.isArray(body.employee_ids) ? body.employee_ids.filter((value: unknown): value is string => typeof value === "string") : undefined;
    const { data: derived, error: deriveError } = await derivePayrollEntries(supabase, body.payroll_period_id, user.id, employeeIds);
    if (deriveError) return NextResponse.json({ error: deriveError.message }, { status: 500 });
    const entries = derived ?? [];
    if (["submit", "process", "generate_slips"].includes(String(body.action ?? ""))) {
      const { error: slipsError } = await createSalarySlipsForEntries(supabase, body.payroll_period_id, user.id, entries);
      if (slipsError) return NextResponse.json({ error: slipsError.message }, { status: 500 });
    }
    const enriched = await attachSlipStatus(supabase, entries);
    return NextResponse.json({ data: enriched, included_employees: enriched }, { status: 201 });
  }

  const entries = normalizePayrollEntries(body.entries ?? [body]);
  if (entries.length === 0) return NextResponse.json({ error: "At least one payroll entry is required" }, { status: 400 });
  const { data, error } = await supabase
    .from("payroll_entries")
    .insert(entries.map((entry) => ({ ...entry, created_by: user.id })))
    .select(ENTRY_SELECT);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canRunPayroll(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { data: existing, error: existingError } = await supabase.from("payroll_entries").select("id, status").eq("id", body.id).single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const requestedStatus = normalizeWorkflowStatus(body.status, PAYROLL_ENTRY_STATES);
  if (typeof body.status === "string" && !requestedStatus) {
    return NextResponse.json({ error: "Invalid payroll entry status" }, { status: 422 });
  }
  const patch = normalizePayrollEntryPayload({ ...body, status: requestedStatus ?? body.status }) as Record<string, unknown>;
  if (typeof body.status !== "string") delete patch.status;
  const transitionError = invalidTransition((existing as any).status, patch.status, PAYROLL_ENTRY_WORKFLOW, PAYROLL_ENTRY_TRANSITIONS);
  if (transitionError) return NextResponse.json({ error: transitionError }, { status: 422 });

  const { data, error } = await supabase
    .from("payroll_entries")
    .update({ ...patch, updated_by: user.id })
    .eq("id", body.id)
    .select(ENTRY_SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
