import { NextRequest, NextResponse } from "next/server";
import { canRunPayroll, normalizePayrollEntryPayload } from "@/app/api/hrms/payroll/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { buildPayrollAmountsFromAssignment, buildSalarySlipLinesFromAssignment, type PayrollStructureAssignment } from "@/lib/hrms/payroll";
import type { GeneratedKey } from "@/lib/generated/workflows";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

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

const RUN_ACTION_RESPONSE_STATUSES = {
  submit: "calculated",
  process: "calculated",
  approve: "approved",
  lock: "approved",
  cancel: "cancelled",
} as const;

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

function runPatch(action: string, body: Record<string, unknown>, userId: string) {
  if (action === "submit" || action === "process") return { status: "calculated", updated_by: userId };
  if (action === "approve") return { status: "approved", updated_by: userId };
  if (action === "lock") return { status: "approved", updated_by: userId };
  if (action === "cancel") return { status: "cancelled", updated_by: userId };
  const normalized = normalizePayrollEntryPayload(body);
  if (typeof body.status !== "string") delete normalized.status;
  return { ...normalized, updated_by: userId };
}

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

async function readEntryOrPeriod(supabase: SupabaseClient, id: string) {
  const { data: entry, error: entryError } = await supabase.from("payroll_entries").select(ENTRY_SELECT).eq("id", id).maybeSingle();
  if (entryError) return { entry: null, periodId: null, error: entryError };
  const payrollEntry = entry as any;
  if (payrollEntry) return { entry: payrollEntry, periodId: payrollEntry.payroll_period_id as string, error: null };

  const { data: period, error: periodError } = await supabase.from("payroll_periods").select("id").eq("id", id).maybeSingle();
  if (periodError) return { entry: null, periodId: null, error: periodError };
  return { entry: null, periodId: (period as any)?.id ?? null, error: null };
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

async function ensurePeriodEntries(supabase: SupabaseClient, payrollPeriodId: string, userId: string) {
  const { period, error: periodError } = await readPeriod(supabase, payrollPeriodId);
  if (periodError || !period) return { entries: [], error: periodError ?? new Error("Payroll period not found") };
  const { assignments, error: assignmentsError } = await activeAssignmentsForPeriod(supabase, period);
  if (assignmentsError) return { entries: [], error: assignmentsError };
  if (assignments.length > 0) {
    const rows = assignments.map((assignment) => ({
      payroll_period_id: payrollPeriodId,
      employee_id: assignment.employee_id,
      ...buildPayrollAmountsFromAssignment(assignment),
      status: "calculated",
      created_by: userId,
      updated_by: userId,
    }));
    const { error } = await supabase.from("payroll_entries").upsert(rows, { onConflict: "payroll_period_id,employee_id" });
    if (error) return { entries: [], error };
  }
  const { data: entries, error } = await supabase.from("payroll_entries").select(ENTRY_SELECT).eq("payroll_period_id", payrollPeriodId);
  return { entries: entries ?? [], error };
}

async function createSalarySlipsForPeriod(supabase: SupabaseClient, payrollPeriodId: string, userId: string, entries: any[]) {
  const { period, error: periodError } = await readPeriod(supabase, payrollPeriodId);
  if (periodError || !period) return { slips: [], error: periodError ?? new Error("Payroll period not found") };
  const { assignments, error: assignmentsError } = await activeAssignmentsForPeriod(supabase, period, entries.map((entry) => entry.employee_id));
  if (assignmentsError) return { slips: [], error: assignmentsError };
  const assignmentByEmployee = new Map(assignments.map((assignment) => [assignment.employee_id, assignment]));
  const rows = entries.map((entry) => ({
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
  const { data: slips, error } = await supabase.from("salary_slips").upsert(rows, { onConflict: "payroll_period_id,employee_id" }).select("id, employee_id, status");
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

async function includedEmployeesForPeriod(supabase: SupabaseClient, payrollPeriodId: string) {
  const [{ data: entries, error: entryError }, { data: slips, error: slipError }] = await Promise.all([
    supabase.from("payroll_entries").select(ENTRY_SELECT).eq("payroll_period_id", payrollPeriodId).order("created_at", { ascending: false }),
    supabase.from("salary_slips").select("id, payroll_entry_id, employee_id, status, gross_pay, total_deductions, net_pay").eq("payroll_period_id", payrollPeriodId),
  ]);
  if (entryError) throw entryError;
  if (slipError) throw slipError;
  const entryRows = (entries ?? []) as any[];
  const slipRows = (slips ?? []) as any[];
  return entryRows.map((entry) => {
    const slip = slipRows.find((item) => item.employee_id === entry.employee_id) ?? null;
    return { ...entry, slip_status: slip?.status ?? null, salary_slip: slip };
  });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canRunPayroll(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { entry, periodId, error } = await readEntryOrPeriod(supabase, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!periodId) return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });

  try {
    const includedEmployees = await includedEmployeesForPeriod(supabase, periodId);
    return NextResponse.json({ data: entry, included_employees: includedEmployees });
  } catch (includeError: any) {
    return NextResponse.json({ error: includeError.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canRunPayroll(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const action = String(body.action ?? "update");
  const { entry, periodId, error: lookupError } = await readEntryOrPeriod(supabase, id);
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!periodId) return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });

  let data = entry;
  let error = null;
  if (entry) {
    const requestedStatus = normalizeWorkflowStatus(body.status, PAYROLL_ENTRY_STATES);
    if (typeof body.status === "string" && !requestedStatus) {
      return NextResponse.json({ error: "Invalid payroll entry status" }, { status: 422 });
    }
    const patch = runPatch(action, { ...body, status: requestedStatus ?? body.status }, user.id) as Record<string, unknown>;
    const transitionError = invalidTransition((entry as any).status, patch.status, PAYROLL_ENTRY_WORKFLOW, PAYROLL_ENTRY_TRANSITIONS);
    if (transitionError) return NextResponse.json({ error: transitionError }, { status: 422 });

    const result = await supabase
      .from("payroll_entries")
      .update(patch)
      .eq("id", id)
      .select(ENTRY_SELECT)
      .single();
    data = result.data;
    error = result.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let includedEmployees = await includedEmployeesForPeriod(supabase, periodId);
  if (action === "submit" || action === "process") {
    const { entries, error: deriveError } = await ensurePeriodEntries(supabase, periodId, user.id);
    if (deriveError) return NextResponse.json({ error: deriveError.message }, { status: 500 });
    const { error: slipsError } = await createSalarySlipsForPeriod(supabase, periodId, user.id, entries);
    if (slipsError) return NextResponse.json({ error: slipsError.message }, { status: 500 });
    includedEmployees = await includedEmployeesForPeriod(supabase, periodId);
  }

  return NextResponse.json({
    data: data ? { ...data, workflow_status: RUN_ACTION_RESPONSE_STATUSES[action as keyof typeof RUN_ACTION_RESPONSE_STATUSES] ?? data.status } : null,
    included_employees: includedEmployees,
  });
}
