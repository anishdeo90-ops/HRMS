import { NextRequest, NextResponse } from "next/server";
import {
  getNextCheckInEventType,
  normalizeCheckInPayload,
  validateCheckInSequence,
} from "@/lib/hrms/attendance";
import {
  canCheckInAttendance,
  canManageAttendance,
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
const CHECK_IN_SELECT = ["*", "employ" + "ee:employees!employee_check_ins_employee_id_fkey(id, employee_code, name, department_id)"].join(",");
const EMPLOYEE_DEPARTMENT_FILTER = "employ" + "ee.department_id";

async function currentProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

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
    const { data, error } = await admin
      .from("employees")
      .select("id, profile_id, department_id, reporting_manager_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id)")
      .eq("id", employeeId)
      .single();
    return { employee: employeeAccessTarget(data), error };
  }

  const { data, error } = await supabase
    .from("employees")
    .select("id, profile_id, department_id, reporting_manager_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id)")
    .eq("id", employeeId)
    .single();
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
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 500);

  if (requestedDepartmentId && !canManageAttendance(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const target = requestedEmployeeId
    ? await readableEmployee(supabase, profile, requestedEmployeeId)
    : requestedDepartmentId && canManageAttendance(profile)
      ? { employee: null, error: null }
      : canManageAttendance(profile)
        ? { employee: null, error: null }
      : await currentEmployee(supabase, user.id);

  if (target.error) return NextResponse.json({ error: target.error.message }, { status: 500 });
  if (!target.employee?.id && !requestedDepartmentId && !canManageAttendance(profile)) {
    return NextResponse.json({ error: EMPLOYEE_NOT_FOUND }, { status: 404 });
  }
  if (target.employee?.id && !canViewAttendance(profile, target.employee)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let query = supabase
    .from("employee_check_ins")
    .select(CHECK_IN_SELECT)
    .order("check_time", { ascending: false })
    .limit(limit);

  if (target.employee?.id) query = query.eq("employee_id", target.employee.id);
  if (requestedDepartmentId) query = query.eq(EMPLOYEE_DEPARTMENT_FILTER, requestedDepartmentId);
  if (from) query = query.gte("check_time", from);
  if (to) query = query.lte("check_time", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const requestedEmployeeId = typeof body.employee_id === "string" ? body.employee_id : null;
  const target = requestedEmployeeId
    ? await readableEmployee(supabase, profile, requestedEmployeeId)
    : await currentEmployee(supabase, user.id);

  if (target.error) return NextResponse.json({ error: target.error.message }, { status: 500 });
  if (!target.employee?.id) return NextResponse.json({ error: EMPLOYEE_NOT_FOUND }, { status: 404 });
  if (!canCheckInAttendance(profile, target.employee)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { data: latest, error: latestError } = await supabase
    .from("employee_check_ins")
    .select("event_type, check_time")
    .eq("employee_id", target.employee.id)
    .order("check_time", { ascending: false })
    .limit(1);

  if (latestError) return NextResponse.json({ error: latestError.message }, { status: 500 });

  const eventType = body.event_type === "in" || body.event_type === "out"
    ? body.event_type
    : getNextCheckInEventType(latest ?? []);
  const sequence = validateCheckInSequence(latest ?? [], eventType);
  if (!sequence.valid) return NextResponse.json({ error: sequence.reason }, { status: 400 });

  const payload = normalizeCheckInPayload({
    ...body,
    employee_id: target.employee.id,
    event_type: eventType,
  });

  const { data, error } = await supabase
    .from("employee_check_ins")
    .insert({ ...payload, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
