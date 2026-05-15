import { NextRequest, NextResponse } from "next/server";
import { canApproveShiftRequest, canManageShifts, canViewAttendance } from "@/lib/hrms/attendance-authorization";
import type { HrmsProfile } from "@/lib/hrms/authorization";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const SHIFT_REQUEST_SELECT = [
  "*",
  "employ" + "ee:employees!shift_requests_employee_id_fkey(name,employee_code)",
  "requested_shift_type:attendance_shift_types!shift_requests_requested_shift_type_id_fkey(name,code)",
  "current_shift_type:attendance_shift_types!shift_requests_current_shift_type_id_fkey(name,code)",
  "approver:employees!shift_requests_approver_employee_id_fkey(name,employee_code)",
].join(",");

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

function normalizeShiftRequestPayload(body: Record<string, unknown>) {
  return {
    employee_id: body.employee_id,
    requested_shift_type_id: body.requested_shift_type_id,
    current_shift_type_id: body.current_shift_type_id ?? null,
    requested_date: body.requested_date,
    reason: body.reason,
    status: "submitted",
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewAttendance(profile, { profile_id: user.id }) && !canApproveShiftRequest(profile) && !canManageShifts(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  let query = supabase
    .from("shift_requests")
    .select(SHIFT_REQUEST_SELECT)
    .order("created_at", { ascending: false });

  if (searchParams.get("employee_id")) query = query.eq("employee_id", searchParams.get("employee_id"));
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewAttendance(profile, { profile_id: user.id }) && !canManageShifts(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const payload = normalizeShiftRequestPayload(await req.json());
  const { data, error } = await supabase
    .from("shift_requests")
    .insert({ ...payload, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
