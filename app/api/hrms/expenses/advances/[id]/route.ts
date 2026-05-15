import { NextRequest, NextResponse } from "next/server";
import { canApproveExpenseRecord, canManageExpenses, canViewExpenseRecord } from "@/lib/hrms/expense-authorization";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { normalizeAdvancePayload } from "@/lib/hrms/expenses";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const ADVANCE_SELECT = [
  "*",
  "employee:employees(id, profile_id, department_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id))",
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
  if (action === "settled") return { status: "settled", settled_by: userId, settled_at: new Date().toISOString(), settled_amount: body.settled_amount ?? null, updated_by: userId };
  return { ...normalizeAdvancePayload(body), updated_by: userId };
}

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("employee_advances").select(ADVANCE_SELECT).eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const target = targetFromRecord(data);
  if (!canViewExpenseRecord(profile, target) && !canApproveExpenseRecord(profile, target, "employee_advance") && !canManageExpenses(profile)) {
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
  const { data: existing, error: existingError } = await supabase.from("employee_advances").select(ADVANCE_SELECT).eq("id", id).single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const target = targetFromRecord(existing);

  if (["approve", "reject"].includes(action) && !canApproveExpenseRecord(profile, target, "employee_advance")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (action === "settled" && !canManageExpenses(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  if (action === "cancel" && !canViewExpenseRecord(profile, target) && !canApproveExpenseRecord(profile, target, "employee_advance")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (action === "update" && !canViewExpenseRecord(profile, target)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { data, error } = await supabase.from("employee_advances").update(decisionPatch(action, body, user.id)).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
