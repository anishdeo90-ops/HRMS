import { NextRequest, NextResponse } from "next/server";
import { calculateOvertimeMinutes } from "@/lib/hrms/attendance";
import { canApproveOvertime, canManageOvertime, canViewAttendance } from "@/lib/hrms/attendance-authorization";
import type { HrmsProfile } from "@/lib/hrms/authorization";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };
const OVERTIME_DETAIL_SELECT = [
  "id",
  "employ" + "ee_id",
  "attendance_day_id",
  "overtime_date",
  "start_time",
  "end_time",
  "overtime_minutes",
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

type OvertimeRecord = {
  id: string;
  employee_id: string;
  attendance_day_id?: string | null;
  overtime_date: string;
  start_time?: string | null;
  end_time?: string | null;
  overtime_minutes: number;
  status: string;
  employee?: {
    profile_id?: string | null;
    department_id?: string | null;
    reporting_manager?: { profile_id?: string | null } | null;
  } | null;
};

function decisionPatch(action: string, body: Record<string, unknown>, userId: string, existing: OvertimeRecord) {
  if (action === "approve") {
    return { status: "approved", approver_comment: body.approver_comment ?? null, decided_at: new Date().toISOString(), updated_by: userId };
  }
  if (action === "reject") {
    return { status: "rejected", approver_comment: body.approver_comment ?? null, decided_at: new Date().toISOString(), updated_by: userId };
  }
  if (action === "cancel") {
    return { status: "cancelled", updated_by: userId };
  }
  const hasTimeChange = body.start_time !== undefined || body.end_time !== undefined || body.overtime_minutes !== undefined;
  const startTime = body.start_time !== undefined ? body.start_time : existing.start_time;
  const endTime = body.end_time !== undefined ? body.end_time : existing.end_time;
  const overtimeMinutes = typeof body.overtime_minutes === "number" && body.overtime_minutes > 0
    ? Math.floor(body.overtime_minutes)
    : hasTimeChange
      ? calculateOvertimeMinutes(startTime as string | null, endTime as string | null)
      : existing.overtime_minutes;

  return {
    ...(body.attendance_day_id !== undefined ? { attendance_day_id: body.attendance_day_id } : {}),
    ...(body.overtime_date !== undefined ? { overtime_date: body.overtime_date } : {}),
    ...(body.start_time !== undefined ? { start_time: body.start_time } : {}),
    ...(body.end_time !== undefined ? { end_time: body.end_time } : {}),
    overtime_minutes: overtimeMinutes,
    ...(body.reason !== undefined ? { reason: body.reason } : {}),
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
    .from("overtime_records")
    .select(OVERTIME_DETAIL_SELECT)
    .eq("id", id)
    .single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const record = existing as unknown as OvertimeRecord;
  const target = {
    id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_profile_id: record.employee?.reporting_manager?.profile_id,
  };

  if (["approve", "reject"].includes(action) && (!canApproveOvertime(profile, target) || record.status !== "submitted")) {
    return NextResponse.json({ error: record.status === "submitted" ? "Insufficient permissions" : "Only submitted overtime can be decided" }, { status: record.status === "submitted" ? 403 : 400 });
  }
  if (action === "cancel" && record.status !== "submitted" && record.status !== "draft") {
    return NextResponse.json({ error: "Only draft or submitted overtime can be cancelled" }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject" && action !== "cancel" && !canViewAttendance(profile, target) && !canManageOvertime(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const payload = decisionPatch(action, body, user.id, record);
  if ("overtime_minutes" in payload && Number(payload.overtime_minutes) <= 0) {
    return NextResponse.json({ error: "overtime_minutes must be positive" }, { status: 400 });
  }
  const nextAttendanceDayId = "attendance_day_id" in payload ? payload.attendance_day_id : record.attendance_day_id;
  const nextOvertimeDate = "overtime_date" in payload ? payload.overtime_date : record.overtime_date;
  if (nextAttendanceDayId) {
    const { data: day, error: dayError } = await supabase
      .from("attendance_days")
      .select("id")
      .eq("id", nextAttendanceDayId)
      .eq("employee_id", record.employee_id)
      .eq("attendance_date", nextOvertimeDate)
      .maybeSingle();
    if (dayError) return NextResponse.json({ error: dayError.message }, { status: 500 });
    if (!day) return NextResponse.json({ error: "Attendance day does not match overtime." }, { status: 400 });
  }
  const { data, error } = await supabase.from("overtime_records").update(payload).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
