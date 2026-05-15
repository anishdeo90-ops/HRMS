import { NextRequest, NextResponse } from "next/server";
import { stripAttendanceReadOnlyFields } from "@/lib/hrms/attendance";
import {
  canApproveAttendanceCorrection,
  canManageAttendance,
  canRequestAttendanceCorrection,
  canViewAttendance,
} from "@/lib/hrms/attendance-authorization";
import type { HrmsProfile } from "@/lib/hrms/authorization";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

type EmployeeAccessTarget = {
  id?: string | null;
  profile_id?: string | null;
  department_id?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_profile_id?: string | null;
};

type CorrectionRecord = {
  id: string;
  employee_id: string;
  attendance_day_id?: string | null;
  attendance_date: string;
  status: string;
  employee?: EmployeeAccessTarget | null;
};

const REQUESTER_MUTABLE_STATUSES = new Set(["draft", "submitted"]);
const DECISION_ACTIONS = new Set(["approve", "reject"]);
const CORRECTION_DETAIL_SELECT = [
  "id",
  "employee_id",
  "attendance_day_id",
  "attendance_date",
  "status",
  "employ" + "ee:employees(id, profile_id, department_id, reporting_manager_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id))",
].join(",");

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
  const { data } = await supabase
    .from("employees")
    .select("id, profile_id, department_id, reporting_manager_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id)")
    .eq("profile_id", userId)
    .maybeSingle();
  return employeeAccessTarget(data);
}

function correctionEmployee(record: CorrectionRecord) {
  return employeeAccessTarget(record.employee) ?? { id: record.employee_id };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("attendance_correction_requests")
    .select(CORRECTION_DETAIL_SELECT)
    .eq("id", id)
    .single();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Correction request not found" }, { status: 404 });

  const record = existing as unknown as CorrectionRecord;
  const employee = correctionEmployee(record);
  const body = await req.json();
  const action = String(body.action ?? "update");

  if (DECISION_ACTIONS.has(action)) {
    if (!canApproveAttendanceCorrection(profile, employee)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    if (record.status !== "submitted") {
      return NextResponse.json({ error: "Only submitted corrections can be decided" }, { status: 400 });
    }

    const status = action === "approve" ? "approved" : "rejected";
    const patch = {
      status,
      approver_comment: body.approver_comment ?? body.comment ?? null,
      decided_at: new Date().toISOString(),
      updated_by: user.id,
    };

    const { data, error } = await supabase
      .from("attendance_correction_requests")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  const requesterCanEdit = canRequestAttendanceCorrection(profile, employee) && REQUESTER_MUTABLE_STATUSES.has(record.status);
  if (!requesterCanEdit && !canManageAttendance(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  if (action === "cancel") {
    if (!REQUESTER_MUTABLE_STATUSES.has(record.status)) {
      return NextResponse.json({ error: "Only draft or submitted corrections can be cancelled" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("attendance_correction_requests")
      .update({ status: "cancelled", updated_by: user.id })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  const currentEmployeeRow = await currentEmployee(supabase, user.id);
  const patch = stripAttendanceReadOnlyFields(body);
  delete patch.action;
  delete patch.approver_comment;
  delete patch.decided_at;

  if (!canManageAttendance(profile) && currentEmployeeRow?.id !== record.employee_id) {
    delete patch.employee_id;
  }

  const nextAttendanceDayId = patch.attendance_day_id ?? record.attendance_day_id;
  const nextEmployeeId = String(patch.employee_id ?? record.employee_id);
  const nextAttendanceDate = String(patch.attendance_date ?? record.attendance_date);

  if (nextAttendanceDayId) {
    const { data: day, error: dayError } = await supabase
      .from("attendance_days")
      .select("id")
      .eq("id", nextAttendanceDayId)
      .eq("employee_id", nextEmployeeId)
      .eq("attendance_date", nextAttendanceDate)
      .maybeSingle();
    if (dayError) return NextResponse.json({ error: dayError.message }, { status: 500 });
    if (!day) return NextResponse.json({ error: "Attendance day does not match request." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("attendance_correction_requests")
    .update({ ...patch, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
