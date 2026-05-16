import { NextRequest, NextResponse } from "next/server";
import { buildLedgerEntry, buildLedgerReversalEntry, normalizeLeaveApplicationPayload } from "@/lib/hrms/leave";
import { canApproveLeave, canRequestLeave, canViewLeave } from "@/lib/hrms/leave-authorization";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import type { GeneratedKey } from "@/lib/generated/workflows";
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

const LEAVE_APPLICATION_WORKFLOW = "workflow.leave.application" satisfies GeneratedKey;
const LEAVE_APPLICATION_STATES = ["draft", "submitted", "approved", "rejected", "cancelled"] as const;
const LEAVE_APPLICATION_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "rejected", "cancelled"],
  approved: ["cancelled"],
  rejected: [],
  cancelled: [],
};

function targetFromRecord(record: any) {
  return {
    id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_profile_id: record.employee?.reporting_manager?.profile_id,
  };
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

  const requestedStatus = normalizeWorkflowStatus(body.status, LEAVE_APPLICATION_STATES);
  if (typeof body.status === "string" && !requestedStatus) {
    return NextResponse.json({ error: "Invalid leave application status" }, { status: 422 });
  }

  const patch = action === "approve"
    ? { status: "approved", approver_comment: body.approver_comment ?? null, approver_employee_id: target.id, decided_at: new Date().toISOString(), updated_by: user.id }
    : action === "reject"
      ? { status: "rejected", approver_comment: body.approver_comment ?? null, approver_employee_id: target.id, decided_at: new Date().toISOString(), updated_by: user.id }
      : action === "cancel"
        ? { status: "cancelled", updated_by: user.id }
        : { ...normalizeLeaveApplicationPayload(body), status: requestedStatus ?? undefined, updated_by: user.id };
  if (patch.status === undefined) delete patch.status;

  const transitionError = invalidTransition(application.status, patch.status, LEAVE_APPLICATION_WORKFLOW, LEAVE_APPLICATION_TRANSITIONS);
  if (transitionError) return NextResponse.json({ error: transitionError }, { status: 422 });

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
