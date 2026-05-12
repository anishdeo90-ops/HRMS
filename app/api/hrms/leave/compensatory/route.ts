import { NextRequest, NextResponse } from "next/server";
import { buildLedgerEntry, normalizeCompensatoryLeavePayload } from "@/lib/hrms/leave";
import { canApproveCompensatoryLeave, canManageLeaveBalances, canRequestCompensatoryLeave, canViewLeave } from "@/lib/hrms/leave-authorization";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const { employee, error: employeeError } = await resolveLeaveTargetEmployee(supabase, user.id, searchParams.get("employee_id"));
  if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });
  if (!employee?.id && !searchParams.get("employee_id") && canManageLeaveBalances(profile)) return NextResponse.json({ data: [] });
  if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!canViewLeave(profile, employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { data, error } = await supabase.from("compensatory_leave_requests").select("*").eq("employee_id", employee.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { employee, error: employeeError } = await resolveLeaveTargetEmployee(supabase, user.id, typeof body.employee_id === "string" ? body.employee_id : null);
  if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });
  if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!canRequestCompensatoryLeave(profile, employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const payload = normalizeCompensatoryLeavePayload({ ...body, employee_id: employee.id });
  const { data, error } = await supabase.from("compensatory_leave_requests").insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

const COMP_SELECT = "*,employee:employees!compensatory_leave_requests_employee_id_fkey(id, profile_id, department_id, reporting_manager_id)";

function target(record: any) {
  return {
    id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_id: record.employee?.reporting_manager_id,
  };
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const approverEmployeeId = (profile as { employee_id?: string | null } | null)?.employee_id ?? null;
  const id = typeof body.id === "string" ? body.id : "";
  const action = String(body.action ?? "");
  if (!id || !["approve", "reject", "cancel"].includes(action)) {
    return NextResponse.json({ error: "id and valid action are required" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase.from("compensatory_leave_requests").select(COMP_SELECT).eq("id", id).single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (existing.status !== "submitted") return NextResponse.json({ error: "Only submitted compensatory leave can be decided" }, { status: 400 });
  if (!canApproveCompensatoryLeave(profile, target(existing))) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  if (!approverEmployeeId) return NextResponse.json({ error: "Approver employee record not found" }, { status: 400 });

  const patch = {
    status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "cancelled",
    approver_employee_id: approverEmployeeId,
    approver_comment: body.approver_comment ?? null,
    decided_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("compensatory_leave_requests").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (action === "approve") {
    const entry = buildLedgerEntry({
      employee_id: existing.employee_id,
      leave_type_key: existing.leave_type_key,
      source_type: "compensatory_leave",
      source_id: existing.id,
      source_action: "approve",
      days_delta: Number(existing.requested_days),
      entry_type: "compensatory_credit",
      notes: existing.reason ?? null,
    });
    const { error: ledgerError } = await supabase.from("leave_ledger_entries").insert({ ...entry, created_by: user.id });
    if (ledgerError) return NextResponse.json({ error: ledgerError.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
