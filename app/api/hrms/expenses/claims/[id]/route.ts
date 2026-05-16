import { NextRequest, NextResponse } from "next/server";
import { canApproveExpenseRecord, canManageExpenses, canViewExpenseRecord } from "@/lib/hrms/expense-authorization";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { normalizeExpenseClaimPayload } from "@/lib/hrms/expenses";
import type { GeneratedKey } from "@/lib/generated/workflows";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const CLAIM_SELECT = [
  "*",
  "employee:employees!expense_claims_employee_id_fkey(id, profile_id, department_id, reporting_manager_id)",
  "items:expense_claim_items(*)",
].join(",");

const EXPENSE_CLAIM_WORKFLOW = "workflow.expense_claim.status" satisfies GeneratedKey;
const EMPLOYEE_ADVANCE_WORKFLOW = "workflow.employee_advance.status" satisfies GeneratedKey;
const EXPENSE_CLAIM_STATES = ["draft", "submitted", "approved", "rejected", "cancelled", "paid"] as const;
const EXPENSE_CLAIM_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "rejected", "cancelled"],
  approved: ["paid"],
  rejected: [],
  cancelled: [],
  paid: [],
};
const EMPLOYEE_ADVANCE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "rejected", "cancelled"],
  approved: ["settled"],
  rejected: [],
  cancelled: [],
  settled: [],
};

function targetFromRecord(record: any) {
  return {
    employee_id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_id: record.employee?.reporting_manager_id,
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

function decisionPatch(action: string, body: any, userId: string) {
  const settlementPatch = settlementFields(body);
  if (action === "approve") return { status: "approved", approver_employee_id: body.approver_employee_id ?? null, decided_at: new Date().toISOString(), approver_comment: body.decision_notes ?? body.approver_comment ?? null, updated_by: userId, ...settlementPatch };
  if (action === "reject") return { status: "rejected", approver_employee_id: body.approver_employee_id ?? null, decided_at: new Date().toISOString(), approver_comment: body.decision_notes ?? body.approver_comment ?? null, updated_by: userId };
  if (action === "cancel") return { status: "cancelled", updated_by: userId };
  if (action === "paid") return { status: "paid", paid_at: new Date().toISOString(), updated_by: userId, ...settlementPatch };
  const normalized = normalizeExpenseClaimPayload(body);
  if (typeof body.status !== "string") delete normalized.status;
  return { ...normalized, ...settlementPatch, updated_by: userId };
}

function settlementFields(body: any) {
  const patch: Record<string, unknown> = {};
  if (typeof body.settlement_advance_id === "string" && body.settlement_advance_id.trim()) {
    patch.settlement_advance_id = body.settlement_advance_id.trim();
  }
  const settlementAmount = Number(body.settlement_amount);
  if (Number.isFinite(settlementAmount) && settlementAmount > 0) patch.settlement_amount = Number(settlementAmount.toFixed(2));
  if (typeof body.settlement_note === "string") patch.settlement_note = body.settlement_note.trim() || null;
  return patch;
}

async function settleLinkedAdvance(supabase: Awaited<ReturnType<typeof createClient>>, claim: any, userId: string) {
  if (!claim.settlement_advance_id || !claim.settlement_amount) return { error: null };

  const { data: advance, error: advanceError } = await supabase
    .from("employee_advances")
    .select("id, employee_id, requested_amount, approved_amount, settled_amount, outstanding_amount, status")
    .eq("id", claim.settlement_advance_id)
    .eq("employee_id", claim.employee_id)
    .single();
  if (advanceError) return { error: advanceError };

  const settlementAmount = Number(claim.settlement_amount);
  const outstandingAmount = Number(advance.outstanding_amount ?? Math.max(Number(advance.approved_amount ?? advance.requested_amount ?? 0) - Number(advance.settled_amount ?? 0), 0));
  if (!Number.isFinite(settlementAmount) || settlementAmount <= 0) return { error: new Error("Settlement amount must be greater than zero") };
  if (settlementAmount > Number(claim.total_amount ?? 0)) return { error: new Error("Settlement amount cannot exceed claim total") };
  if (settlementAmount > outstandingAmount) return { error: new Error("Settlement amount cannot exceed advance outstanding amount") };

  const nextOutstanding = Number(Math.max(outstandingAmount - settlementAmount, 0).toFixed(2));
  const nextSettled = Number((Number(advance.settled_amount ?? 0) + settlementAmount).toFixed(2));
  const nextStatus = nextOutstanding === 0 ? "settled" : advance.status;
  const transitionError = invalidTransition((advance as any).status, nextStatus, EMPLOYEE_ADVANCE_WORKFLOW, EMPLOYEE_ADVANCE_TRANSITIONS);
  if (transitionError) return { error: new Error(transitionError) };
  const { error } = await supabase
    .from("employee_advances")
    .update({
      settled_amount: nextSettled,
      outstanding_amount: nextOutstanding,
      status: nextStatus,
      settled_at: nextOutstanding === 0 ? new Date().toISOString() : null,
      settled_by: nextOutstanding === 0 ? userId : null,
      updated_by: userId,
    })
    .eq("id", advance.id);
  return { error };
}

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("expense_claims").select(CLAIM_SELECT).eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const target = targetFromRecord(data);
  if (!canViewExpenseRecord(profile, target) && !canApproveExpenseRecord(profile, target, "expense_claim") && !canManageExpenses(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = String(body.action ?? "update");
  const { data: existing, error: existingError } = await supabase.from("expense_claims").select(CLAIM_SELECT).eq("id", id).single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const target = targetFromRecord(existing);
  if (["approve", "reject"].includes(action) && !canApproveExpenseRecord(profile, target, "expense_claim")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (action === "paid" && !canManageExpenses(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  if (action === "cancel" && !canViewExpenseRecord(profile, target) && !canApproveExpenseRecord(profile, target, "expense_claim")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (action === "update" && !canViewExpenseRecord(profile, target)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const requestedStatus = normalizeWorkflowStatus(body.status, EXPENSE_CLAIM_STATES);
  if (typeof body.status === "string" && !requestedStatus) {
    return NextResponse.json({ error: "Invalid expense claim status" }, { status: 422 });
  }
  const patch = decisionPatch(action, { ...body, status: requestedStatus ?? body.status }, user.id) as Record<string, unknown>;
  const transitionError = invalidTransition((existing as any).status, patch.status, EXPENSE_CLAIM_WORKFLOW, EXPENSE_CLAIM_TRANSITIONS);
  if (transitionError) return NextResponse.json({ error: transitionError }, { status: 422 });

  const { data, error } = await supabase.from("expense_claims").update(patch).eq("id", id).select(CLAIM_SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (action === "paid") {
    const { error: settlementError } = await settleLinkedAdvance(supabase, data, user.id);
    if (settlementError) return NextResponse.json({ error: settlementError.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}
