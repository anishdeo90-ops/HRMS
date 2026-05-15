import { NextRequest, NextResponse } from "next/server";
import { buildLedgerEntry, buildLedgerReversalEntry, normalizeLeaveApplicationPayload } from "@/lib/hrms/leave";
import { canApproveLeave, canRequestLeave, canViewLeave } from "@/lib/hrms/leave-authorization";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };
type LeaveApplicationWithEmployee = {
  id: string;
  employee_id: string;
  leave_type_key: string;
  leave_period_id: string | null;
  status: string;
  total_days: number | string;
  employee?: {
    profile_id?: string | null;
    department_id?: string | null;
    reporting_manager?: { profile_id?: string | null } | null;
  } | null;
};

const APPLICATION_SELECT = [
  "*",
  "employee:employees(id, profile_id, department_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id))",
].join(",");

function targetFromRecord(record: any) {
  return {
    id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_profile_id: record.employee?.reporting_manager?.profile_id,
  };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = String(body.action ?? "update");
  const { data: existing, error: existingError } = await supabase.from("leave_applications").select(APPLICATION_SELECT).eq("id", id).single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const application = existing as unknown as LeaveApplicationWithEmployee;
  const target = targetFromRecord(application);

  if (["approve", "reject"].includes(action) && (!canApproveLeave(profile, target) || application.status !== "submitted")) {
    return NextResponse.json({ error: application.status === "submitted" ? "Insufficient permissions" : "Only submitted leave can be decided" }, { status: application.status === "submitted" ? 403 : 400 });
  }
  if (action === "cancel" && !canRequestLeave(profile, target) && !canApproveLeave(profile, target)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (action === "update" && !canViewLeave(profile, target)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const patch = action === "approve"
    ? { status: "approved", approver_comment: body.approver_comment ?? null, approver_employee_id: target.id, decided_at: new Date().toISOString(), updated_by: user.id }
    : action === "reject"
      ? { status: "rejected", approver_comment: body.approver_comment ?? null, approver_employee_id: target.id, decided_at: new Date().toISOString(), updated_by: user.id }
      : action === "cancel"
        ? { status: "cancelled", updated_by: user.id }
        : { ...normalizeLeaveApplicationPayload(body), updated_by: user.id };

  const { data, error } = await supabase.from("leave_applications").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (action === "approve") {
    const entry = buildLedgerEntry({
      employee_id: application.employee_id,
      leave_type_key: application.leave_type_key,
      leave_period_id: application.leave_period_id,
      application_id: application.id,
      source_type: "leave_application",
      source_id: application.id,
      source_action: "approve",
      days_delta: -Number(application.total_days),
      entry_type: "application",
    });
    const { error: ledgerError } = await supabase.from("leave_ledger_entries").insert({ ...entry, created_by: user.id });
    if (ledgerError) return NextResponse.json({ error: ledgerError.message }, { status: 500 });
  }

  if (action === "cancel" && application.status === "approved") {
    const { data: originalEntry } = await supabase
      .from("leave_ledger_entries")
      .select("*")
      .eq("source_type", "leave_application")
      .eq("source_id", application.id)
      .eq("source_action", "approve")
      .maybeSingle();
    if (originalEntry) {
      const reversal = buildLedgerReversalEntry(originalEntry as any, "cancel");
      const { error: reversalError } = await supabase.from("leave_ledger_entries").insert({ ...reversal, created_by: user.id });
      if (reversalError) return NextResponse.json({ error: reversalError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ data });
}
