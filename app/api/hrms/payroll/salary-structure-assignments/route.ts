import { NextRequest, NextResponse } from "next/server";
import { canManageSalaryStructures, canViewPayrollRecord, targetFromPayrollRecord } from "@/app/api/hrms/payroll/_shared";
import { normalizeSalaryStructureAssignmentPayload } from "@/lib/hrms/payroll";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const ASSIGNMENT_SELECT = [
  "*",
  "employee:employees!salary_structure_assignments_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)",
  "structure:salary_structures(*)",
].join(",");

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
    if (!canViewPayrollRecord(profile, employee, "salary_structure")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  } else if (!canManageSalaryStructures(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let query = supabase.from("salary_structure_assignments").select(ASSIGNMENT_SELECT).order("effective_from", { ascending: false }).limit(200);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const scoped = canManageSalaryStructures(profile)
    ? data
    : (data ?? []).filter((record) => canViewPayrollRecord(profile, targetFromPayrollRecord(record), "salary_structure"));
  return NextResponse.json({ data: scoped });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageSalaryStructures(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const payload = normalizeSalaryStructureAssignmentPayload(body);
  const { data, error } = await supabase
    .from("salary_structure_assignments")
    .insert({ ...payload, created_by: user.id })
    .select(ASSIGNMENT_SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
