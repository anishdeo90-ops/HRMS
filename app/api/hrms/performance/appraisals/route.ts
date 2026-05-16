import { NextRequest, NextResponse } from "next/server";
import { canManagePerformanceRecord, canReviewTeamPerformance, canViewPerformance, canViewPerformanceRecord, normalizeAppraisalGoals, normalizeAppraisalPayload, targetFromPerformanceRecord } from "@/app/api/hrms/performance/_shared";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const APPRAISAL_SELECT = [
  "*",
  "employee:employees!appraisals_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)",
  "reviewer:employees!appraisals_reviewer_employee_id_fkey(id, employee_code, name, profile_id)",
  "cycle:appraisal_cycles(*)",
  "goals:appraisal_goals(*)",
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
    if (!canViewPerformanceRecord(profile, employee, "appraisal")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  } else if (!canViewPerformance(profile) && !canReviewTeamPerformance(profile)) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id || !canViewPerformanceRecord(profile, employee, "appraisal")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let query = supabase.from("appraisals").select(APPRAISAL_SELECT).order("created_at", { ascending: false }).limit(200);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (searchParams.get("cycle_id")) query = query.eq("cycle_id", searchParams.get("cycle_id"));
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const records = (data ?? []) as any[];
  return NextResponse.json({ data: records
    .filter((record) => canViewPerformanceRecord(profile, targetFromPerformanceRecord(record), "appraisal"))
    .map((record) => ({
      ...record,
      employee_name: record.employee?.name,
      reviewer_name: record.reviewer?.name,
      cycle_name: record.cycle?.name,
      total_score: record.final_score,
    })) });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, typeof body.employee_id === "string" ? body.employee_id : null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!canManagePerformanceRecord(profile, "appraisal", employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const goals = normalizeAppraisalGoals(body.goals);
  const payload = normalizeAppraisalPayload({ ...body, employee_id: employee.id });
  const { data, error: insertError } = await supabase.from("appraisals").insert({ ...payload, created_by: user.id }).select().single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  if (goals.length > 0) {
    const { error: goalsError } = await supabase.from("appraisal_goals").insert(goals.map((goal) => ({ ...goal, appraisal_id: data.id })));
    if (goalsError) return NextResponse.json({ error: goalsError.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
