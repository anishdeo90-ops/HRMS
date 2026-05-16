import { NextRequest, NextResponse } from "next/server";
import { canManagePayroll, canViewPayrollRecord, normalizeSalarySlipLines, normalizeSalarySlipPayload, targetFromPayrollRecord } from "@/app/api/hrms/payroll/_shared";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import type { GeneratedKey } from "@/lib/generated/workflows";
import { createClient } from "@/lib/supabase/server";

const SLIP_SELECT = [
  "*",
  "employee:employees!salary_slips_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)",
  "lines:salary_slip_lines(*)",
].join(",");

const SALARY_SLIP_WORKFLOW = "workflow.payroll.salary_slip_status" satisfies GeneratedKey;
const SALARY_SLIP_STATES = ["draft", "calculated", "approved", "paid", "cancelled"] as const;
const SALARY_SLIP_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["calculated", "cancelled"],
  calculated: ["approved"],
  approved: ["paid"],
  paid: [],
  cancelled: [],
};

function slipPatch(action: string, body: any, userId: string) {
  if (action === "issue") return { status: "approved", submitted_at: new Date().toISOString(), updated_by: userId };
  if (action === "publish") return { status: "paid", paid_at: new Date().toISOString(), updated_by: userId };
  if (action === "cancel") return { status: "cancelled", cancelled_at: new Date().toISOString(), updated_by: userId };
  const normalized = normalizeSalarySlipPayload(body);
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

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");
  if (employeeId) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, employeeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!canViewPayrollRecord(profile, employee, "salary_slip")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  } else if (!canManagePayroll(profile)) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  let query = supabase.from("salary_slips").select(SLIP_SELECT).order("issued_on", { ascending: false }).limit(200);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  if (searchParams.get("period_id")) query = query.eq("payroll_period_id", searchParams.get("period_id"));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const scoped = (data ?? []).filter((record) => canViewPayrollRecord(profile, targetFromPayrollRecord(record), "salary_slip"));
  return NextResponse.json({ data: scoped });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePayroll(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const lines = normalizeSalarySlipLines(body.lines);
  const payload = normalizeSalarySlipPayload(body);
  const { data, error } = await supabase.from("salary_slips").insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (lines.length > 0) {
    const { error: linesError } = await supabase
      .from("salary_slip_lines")
      .insert(lines.map((line) => ({ ...line, salary_slip_id: data.id })));
    if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePayroll(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const action = String(body.action ?? "update");
  const { data: existing, error: existingError } = await supabase.from("salary_slips").select("id, status").eq("id", body.id).single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const requestedStatus = normalizeWorkflowStatus(body.status, SALARY_SLIP_STATES);
  if (typeof body.status === "string" && !requestedStatus) {
    return NextResponse.json({ error: "Invalid salary slip status" }, { status: 422 });
  }
  const patch = slipPatch(action, { ...body, status: requestedStatus ?? body.status }, user.id) as Record<string, unknown>;
  const transitionError = invalidTransition((existing as any).status, patch.status, SALARY_SLIP_WORKFLOW, SALARY_SLIP_TRANSITIONS);
  if (transitionError) return NextResponse.json({ error: transitionError }, { status: 422 });

  const { data, error } = await supabase
    .from("salary_slips")
    .update(patch)
    .eq("id", body.id)
    .select(SLIP_SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
