import { NextRequest, NextResponse } from "next/server";
import { canApproveExpenseRecord, canCreateExpenseRecord, canManageExpenses, canViewExpenseRecord } from "@/lib/hrms/expense-authorization";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { normalizeVehicleServicePayload } from "@/lib/hrms/expenses";
import { createClient } from "@/lib/supabase/server";

const SERVICE_SELECT = [
  "*",
  "employee:employees!vehicle_services_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)",
].join(",");

function targetFromRecord(record: any) {
  return {
    employee_id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_id: record.employee?.reporting_manager_id,
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
    if (!canViewExpenseRecord(profile, employee) && !canApproveExpenseRecord(profile, employee, "vehicle_service")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
  } else if (!canManageExpenses(profile)) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  let query = supabase.from("vehicle_services").select(SERVICE_SELECT).order("created_at", { ascending: false }).limit(200);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const scoped = (data ?? []).filter((record) => {
    const target = targetFromRecord(record);
    return canViewExpenseRecord(profile, target) || canApproveExpenseRecord(profile, target, "vehicle_service") || canManageExpenses(profile);
  });
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
  if (!canCreateExpenseRecord(profile, employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const payload = normalizeVehicleServicePayload({ ...body, employee_id: employee.id });
  const { data, error } = await supabase.from("vehicle_services").insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
