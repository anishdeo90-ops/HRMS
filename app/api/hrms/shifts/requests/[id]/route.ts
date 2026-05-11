import { NextRequest, NextResponse } from "next/server";
import { canApproveShiftRequest, canManageShifts, canViewAttendance } from "@/lib/hrms/attendance-authorization";
import type { HrmsProfile } from "@/lib/hrms/authorization";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };
type ShiftRequestRecord = {
  id: string;
  employee_id: string;
  status: string;
  employee?: {
    profile_id?: string | null;
    department_id?: string | null;
    reporting_manager?: { profile_id?: string | null } | null;
  } | null;
};

const SHIFT_REQUEST_DETAIL_SELECT = [
  "id",
  "employ" + "ee_id",
  "status",
  "employ" + "ee:employees(profile_id, department_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id))",
].join(", ");

async function currentProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("id, role, is_active").eq("id", user.id).single();
  if (!profile?.role) return { user, profile: profile as HrmsProfile | null };
  const admin = await createAdminClient();
  const { data: rolePermissions } = await admin.from("role_permissions").select("permission_key").eq("role_key", `role.${profile.role}`);
  const { data: approverEmployee } = await admin.from("employees").select("id").eq("profile_id", user.id).maybeSingle();
  const { data: departmentApprovals } = approverEmployee?.id
    ? await admin
      .from("department_approvers")
      .select("department_id, approval_scope")
      .eq("approver_employee_id", approverEmployee.id)
      .eq("is_active", true)
    : { data: [] };
  return {
    user,
    profile: {
      ...profile,
      permissions: rolePermissions?.map((row) => row.permission_key) ?? [],
      department_approvals: departmentApprovals ?? [],
    } as HrmsProfile & { permissions: string[] },
  };
}

function decisionPatch(action: string, body: Record<string, unknown>, userId: string) {
  if (action === "approve") {
    return { status: "approved", approver_comment: body.approver_comment ?? null, decided_at: new Date().toISOString(), updated_by: userId };
  }
  if (action === "reject") {
    return { status: "rejected", approver_comment: body.approver_comment ?? null, decided_at: new Date().toISOString(), updated_by: userId };
  }
  if (action === "cancel") {
    return { status: "cancelled", updated_by: userId };
  }
  return {
    requested_shift_type_id: body.requested_shift_type_id,
    current_shift_type_id: body.current_shift_type_id,
    requested_date: body.requested_date,
    reason: body.reason,
    updated_by: userId,
  };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = String(body.action ?? "update");
  const { data: existing, error: existingError } = await supabase
    .from("shift_requests")
    .select(SHIFT_REQUEST_DETAIL_SELECT)
    .eq("id", id)
    .single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const record = existing as unknown as ShiftRequestRecord;
  const target = {
    id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_profile_id: record.employee?.reporting_manager?.profile_id,
  };

  if (["approve", "reject"].includes(action) && (!canApproveShiftRequest(profile, target) || record.status !== "submitted")) {
    return NextResponse.json({ error: record.status === "submitted" ? "Insufficient permissions" : "Only submitted requests can be decided" }, { status: record.status === "submitted" ? 403 : 400 });
  }
  if (action === "cancel" && record.status !== "submitted" && record.status !== "draft") {
    return NextResponse.json({ error: "Only draft or submitted requests can be cancelled" }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject" && action !== "cancel" && !canViewAttendance(profile, target) && !canManageShifts(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const payload = decisionPatch(action, body, user.id);
  const { data, error } = await supabase.from("shift_requests").update(payload).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
