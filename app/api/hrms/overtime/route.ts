import { NextRequest, NextResponse } from "next/server";
import { calculateOvertimeMinutes } from "@/lib/hrms/attendance";
import { canApproveOvertime, canManageOvertime, canViewAttendance } from "@/lib/hrms/attendance-authorization";
import type { HrmsProfile } from "@/lib/hrms/authorization";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const OVERTIME_SELECT = [
  "*",
  "employ" + "ee:employees!overtime_records_employee_id_fkey(name,employee_code)",
  "attendance_day:attendance_days(attendance_date,status)",
  "approver:employees!overtime_records_approver_employee_id_fkey(name,employee_code)",
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

function normalizeOvertimePayload(body: Record<string, unknown>) {
  return {
    employee_id: body.employee_id,
    attendance_day_id: body.attendance_day_id ?? null,
    overtime_date: body.overtime_date,
    start_time: body.start_time ?? null,
    end_time: body.end_time ?? null,
    overtime_minutes: typeof body.overtime_minutes === "number" && body.overtime_minutes > 0
      ? Math.floor(body.overtime_minutes)
      : calculateOvertimeMinutes(body.start_time as string | null, body.end_time as string | null),
    reason: body.reason ?? null,
    status: "submitted",
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewAttendance(profile, { profile_id: user.id }) && !canApproveOvertime(profile) && !canManageOvertime(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  let query = supabase
    .from("overtime_records")
    .select(OVERTIME_SELECT)
    .order("created_at", { ascending: false });

  if (searchParams.get("employee_id")) query = query.eq("employee_id", searchParams.get("employee_id"));
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  if (searchParams.get("from")) query = query.gte("overtime_date", searchParams.get("from"));
  if (searchParams.get("to")) query = query.lte("overtime_date", searchParams.get("to"));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewAttendance(profile, { profile_id: user.id }) && !canManageOvertime(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const payload = normalizeOvertimePayload(await req.json());
  if (!payload.overtime_minutes || payload.overtime_minutes <= 0) {
    return NextResponse.json({ error: "overtime_minutes must be positive" }, { status: 400 });
  }
  if (payload.attendance_day_id) {
    const { data: day, error: dayError } = await supabase
      .from("attendance_days")
      .select("id")
      .eq("id", payload.attendance_day_id)
      .eq("employee_id", payload.employee_id)
      .eq("attendance_date", payload.overtime_date)
      .maybeSingle();
    if (dayError) return NextResponse.json({ error: dayError.message }, { status: 500 });
    if (!day) return NextResponse.json({ error: "Attendance day does not match overtime." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("overtime_records")
    .insert({ ...payload, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
