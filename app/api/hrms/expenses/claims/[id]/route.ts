import { NextRequest, NextResponse } from "next/server";
import { canApproveExpenseRecord, canManageExpenses, canViewExpenseRecord } from "@/lib/hrms/expense-authorization";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { normalizeExpenseClaimPayload } from "@/lib/hrms/expenses";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const CLAIM_SELECT = [
  "*",
  "employee:employees(id, profile_id, department_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id))",
  "items:expense_claim_items(*)",
].join(",");

function targetFromRecord(record: any) {
  return {
    employee_id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_profile_id: record.employee?.reporting_manager?.profile_id,
  };
}

function decisionPatch(action: string, body: any, userId: string) {
  if (action === "approve") return { status: "approved", approved_by: userId, approved_at: new Date().toISOString(), decision_notes: body.decision_notes ?? null, updated_by: userId };
  if (action === "reject") return { status: "rejected", rejected_by: userId, rejected_at: new Date().toISOString(), decision_notes: body.decision_notes ?? null, updated_by: userId };
  if (action === "cancel") return { status: "cancelled", updated_by: userId };
  if (action === "paid") return { status: "paid", paid_by: userId, paid_at: new Date().toISOString(), updated_by: userId };
  return { ...normalizeExpenseClaimPayload(body), updated_by: userId };
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

  const { data, error } = await supabase.from("expense_claims").update(decisionPatch(action, body, user.id)).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
