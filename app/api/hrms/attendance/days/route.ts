import { NextRequest, NextResponse } from "next/server";
import { canManageAttendance, canViewAttendance } from "@/lib/hrms/attendance-authorization";
import type { HrmsProfile } from "@/lib/hrms/authorization";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type EmployeeAccessTarget = {
  id?: string | null;
  profile_id?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_profile_id?: string | null;
};

const ATTENDANCE_DAY_STATUSES = new Set([
  "present",
  "absent",
  "half_day",
  "late",
  "on_duty",
  "holiday",
  "weekly_off",
]);
const EMPLOYEE_NOT_FOUND = "Profile not found";
const ATTENDANCE_DAY_SELECT = ["*", "employ" + "ee:employees!inner(id, employee_code, name, department_id)"].join(",");
const EMPLOYEE_DEPARTMENT_FILTER = "employ" + "ee.department_id";

async function currentProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("id, role, is_active").eq("id", user.id).single();
  if (!profile?.role) return { user, profile: profile as HrmsProfile | null };

  const admin = await createAdminClient();
  const { data: rolePermissions } = await admin
    .from("role_permissions")
    .select("permission_key")
    .eq("role_key", `role.${profile.role}`);

  return {
    user,
    profile: {
      ...profile,
      permissions: rolePermissions?.map((permission) => permission.permission_key) ?? [],
    } as HrmsProfile & { permissions: string[] },
  };
}

function employeeAccessTarget(employee: any): EmployeeAccessTarget | null {
  if (!employee) return null;
  return {
    id: employee.id,
    profile_id: employee.profile_id,
    reporting_manager_id: employee.reporting_manager_id,
    reporting_manager_profile_id: employee.reporting_manager_profile_id ?? employee.reporting_manager?.profile_id,
  };
}

async function currentEmployee(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, profile_id, reporting_manager_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id)")
    .eq("profile_id", userId)
    .maybeSingle();
  return { employee: employeeAccessTarget(data), error };
}

async function readableEmployee(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: HrmsProfile | null,
  employeeId: string,
) {
  if (canManageAttendance(profile)) {
    const admin = await createAdminClient();
    const { data, error } = await admin.from("employees").select("id, profile_id, reporting_manager_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id)").eq("id", employeeId).single();
    return { employee: employeeAccessTarget(data), error };
  }
  const { data, error } = await supabase.from("employees").select("id, profile_id, reporting_manager_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id)").eq("id", employeeId).single();
  return { employee: employeeAccessTarget(data), error };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const requestedEmployeeId = searchParams.get("employee_id");
  const requestedDepartmentId = searchParams.get("department_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");

  if (requestedDepartmentId && !canManageAttendance(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let query = supabase
    .from("attendance_days")
    .select(ATTENDANCE_DAY_SELECT)
    .order("attendance_date", { ascending: false });

  if (requestedEmployeeId || !canManageAttendance(profile)) {
    const target = requestedEmployeeId
      ? await readableEmployee(supabase, profile, requestedEmployeeId)
      : await currentEmployee(supabase, user.id);

    if (target.error) return NextResponse.json({ error: target.error.message }, { status: 500 });
    if (!target.employee?.id) return NextResponse.json({ error: EMPLOYEE_NOT_FOUND }, { status: 404 });
    if (!canViewAttendance(profile, target.employee)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    query = query.eq("employee_id", target.employee.id);
  }

  if (requestedDepartmentId) query = query.eq(EMPLOYEE_DEPARTMENT_FILTER, requestedDepartmentId);
  if (from) query = query.gte("attendance_date", from);
  if (to) query = query.lte("attendance_date", to);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageAttendance(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (body.status && !ATTENDANCE_DAY_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Unsupported attendance status" }, { status: 400 });
  }

  const {
    id,
    employee_id: _employeeId,
    attendance_date: _attendanceDate,
    created_at: _createdAt,
    created_by: _createdBy,
    ...payload
  } = body;

  const { data, error } = await supabase
    .from("attendance_days")
    .update({ ...payload, source: "manual", updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
