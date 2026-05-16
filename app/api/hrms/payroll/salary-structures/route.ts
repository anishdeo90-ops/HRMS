import { NextRequest, NextResponse } from "next/server";
import { canManagePayroll, canViewPayrollRecord, normalizeSalaryStructureDetails, normalizeSalaryStructurePayload, targetFromPayrollRecord } from "@/app/api/hrms/payroll/_shared";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const STRUCTURE_SELECT = [
  "*",
  "details:salary_structure_details(*)",
].join(",");

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

    let assignmentQuery = supabase
      .from("salary_structure_assignments")
      .select(ASSIGNMENT_SELECT)
      .eq("employee_id", employee.id)
      .order("effective_from", { ascending: false });
    if (searchParams.get("status")) assignmentQuery = assignmentQuery.eq("status", searchParams.get("status"));
    const { data, error: assignmentError } = await assignmentQuery;
    if (assignmentError) return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (!canManagePayroll(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  let query = supabase.from("salary_structures").select(STRUCTURE_SELECT).order("created_at", { ascending: false }).limit(200);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManagePayroll(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const details = normalizeSalaryStructureDetails(body.details);
  const payload = normalizeSalaryStructurePayload(body);
  const { data, error } = await supabase.from("salary_structures").insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (details.length > 0) {
    const { error: detailsError } = await supabase
      .from("salary_structure_details")
      .insert(details.map((detail) => ({ ...detail, salary_structure_id: data.id })));
    if (detailsError) return NextResponse.json({ error: detailsError.message }, { status: 500 });
  }

  if (typeof body.employee_id === "string") {
    const { data: assignment, error: assignmentError } = await supabase
      .from("salary_structure_assignments")
      .insert({
        employee_id: body.employee_id,
        salary_structure_id: data.id,
        effective_from: body.effective_from ?? null,
        effective_to: body.effective_to ?? null,
        status: body.status ?? "draft",
        created_by: user.id,
      })
      .select(ASSIGNMENT_SELECT)
      .single();
    if (assignmentError) return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    if (!canViewPayrollRecord(profile, targetFromPayrollRecord(assignment), "salary_structure")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    return NextResponse.json({ data: assignment }, { status: 201 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
