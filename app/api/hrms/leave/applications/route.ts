import { NextRequest, NextResponse } from "next/server";
import { normalizeLeaveApplicationPayload, validateLeaveDateRange, validateNoOverlappingLeaveApplication } from "@/lib/hrms/leave";
import { canApproveLeave, canManageLeaveBalances, canRequestLeave, canViewLeave } from "@/lib/hrms/leave-authorization";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const APPLICATION_SELECT = [
  "*",
  "employee:employees(id, employee_code, name, profile_id, department_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id))",
].join(",");

function toTarget(record: any) {
  return {
    id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_profile_id: record.employee?.reporting_manager?.profile_id,
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");
  if (employeeId) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, employeeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!canViewLeave(profile, employee) && !canApproveLeave(profile, employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  } else if (!canManageLeaveBalances(profile)) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  let query = supabase.from("leave_applications").select(APPLICATION_SELECT).order("created_at", { ascending: false }).limit(200);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const scoped = (data ?? []).filter((record) => canViewLeave(profile, toTarget(record)) || canApproveLeave(profile, toTarget(record)) || canManageLeaveBalances(profile));
  return NextResponse.json({ data: scoped });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { employee, error: employeeError } = await resolveLeaveTargetEmployee(supabase, user.id, typeof body.employee_id === "string" ? body.employee_id : null);
  if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });
  if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!canRequestLeave(profile, employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const payload = normalizeLeaveApplicationPayload({ ...body, employee_id: employee.id });
  const dateRange = validateLeaveDateRange(String(payload.from_date ?? ""), String(payload.to_date ?? ""));
  if (!dateRange.valid) return NextResponse.json({ error: dateRange.reason }, { status: 400 });

  const { data: existing, error: existingError } = await supabase
    .from("leave_applications")
    .select("id, employee_id, from_date, to_date, status")
    .eq("employee_id", employee.id);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const overlap = validateNoOverlappingLeaveApplication(payload as any, existing ?? []);
  if (!overlap.valid) return NextResponse.json({ error: overlap.reason }, { status: 400 });

  const { data, error } = await supabase.from("leave_applications").insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
