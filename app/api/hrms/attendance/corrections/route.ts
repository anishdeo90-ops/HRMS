import { NextRequest, NextResponse } from "next/server";
import { normalizeCorrectionRequestPayload } from "@/lib/hrms/attendance";
import {
  canApproveAttendanceCorrection,
  canManageAttendance,
  canRequestAttendanceCorrection,
  canViewAttendance,
} from "@/lib/hrms/attendance-authorization";
import type { HrmsProfile } from "@/lib/hrms/authorization";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type EmployeeAccessTarget = {
  id?: string | null;
  profile_id?: string | null;
  department_id?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_profile_id?: string | null;
};

const EMPLOYEE_NOT_FOUND = "Profile not found";
const CORRECTION_SELECT = ["*", "employ" + "ee:employees!attendance_correction_requests_employee_id_fkey(id, employee_code, name, department_id)"].join(",");
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
  const { data: approverEmployee } = await admin
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
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
      permissions: rolePermissions?.map((permission) => permission.permission_key) ?? [],
      department_approvals: departmentApprovals ?? [],
    } as HrmsProfile & { permissions: string[] },
  };
}

function employeeAccessTarget(employee: any): EmployeeAccessTarget | null {
  if (!employee) return null;
  return {
    id: employee.id,
    profile_id: employee.profile_id,
    department_id: employee.department_id,
    reporting_manager_id: employee.reporting_manager_id,
    reporting_manager_profile_id: employee.reporting_manager_profile_id ?? employee.reporting_manager?.profile_id,
  };
}

async function currentEmployee(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, profile_id, department_id, reporting_manager_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id)")
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
    const { data, error } = await admin.from("employees").select("id, profile_id, department_id, reporting_manager_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id)").eq("id", employeeId).single();
    return { employee: employeeAccessTarget(data), error };
  }
  const { data, error } = await supabase.from("employees").select("id, profile_id, department_id, reporting_manager_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id)").eq("id", employeeId).single();
  return { employee: employeeAccessTarget(data), error };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const requestedEmployeeId = searchParams.get("employee_id");
  const requestedDepartmentId = searchParams.get("department_id");
  const status = searchParams.get("status");
  const approvalQueue = searchParams.get("approval_queue") === "true";

  let query = supabase
    .from("attendance_correction_requests")
    .select(CORRECTION_SELECT)
    .order("created_at", { ascending: false });

  if (approvalQueue) {
    if (!canApproveAttendanceCorrection(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    if (status) query = query.eq("status", status);
    if (requestedDepartmentId) query = query.eq(EMPLOYEE_DEPARTMENT_FILTER, requestedDepartmentId);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  const target = requestedEmployeeId
    ? await readableEmployee(supabase, profile, requestedEmployeeId)
    : canManageAttendance(profile)
      ? { employee: null, error: null }
    : await currentEmployee(supabase, user.id);

  if (target.error) return NextResponse.json({ error: target.error.message }, { status: 500 });
  if (!target.employee?.id && !canManageAttendance(profile)) return NextResponse.json({ error: EMPLOYEE_NOT_FOUND }, { status: 404 });
  if (target.employee?.id && !canRequestAttendanceCorrection(profile, target.employee)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  if (target.employee?.id) query = query.eq("employee_id", target.employee.id);
  if (status) query = query.eq("status", status);
  if (requestedDepartmentId && canManageAttendance(profile)) query = query.eq(EMPLOYEE_DEPARTMENT_FILTER, requestedDepartmentId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const target = body.employee_id
    ? await readableEmployee(supabase, profile, body.employee_id)
    : await currentEmployee(supabase, user.id);

  if (target.error) return NextResponse.json({ error: target.error.message }, { status: 500 });
  if (!target.employee?.id) return NextResponse.json({ error: EMPLOYEE_NOT_FOUND }, { status: 404 });
  if (!canRequestAttendanceCorrection(profile, target.employee)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const payload = normalizeCorrectionRequestPayload({
    ...body,
    employee_id: target.employee.id,
  });
  if (payload.attendance_day_id) {
    const { data: day, error: dayError } = await supabase
      .from("attendance_days")
      .select("id")
      .eq("id", payload.attendance_day_id)
      .eq("employee_id", target.employee.id)
      .eq("attendance_date", payload.attendance_date)
      .maybeSingle();
    if (dayError) return NextResponse.json({ error: dayError.message }, { status: 500 });
    if (!day) return NextResponse.json({ error: "Attendance day does not match request." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("attendance_correction_requests")
    .insert({ ...payload, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
