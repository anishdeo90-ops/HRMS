import { NextRequest, NextResponse } from "next/server";
import { canManagePerformanceRecord, canViewPerformance, canViewPerformanceRecord, normalizePerformanceKraPayload, targetFromPerformanceRecord } from "@/app/api/hrms/performance/_shared";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const KRA_SELECT = "*,employee:employees!performance_kras_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id),goal:performance_goals(*)";

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
    if (!canViewPerformanceRecord(profile, employee, "kra")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  } else if (!canViewPerformance(profile)) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id || !canViewPerformanceRecord(profile, employee, "kra")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let query = supabase.from("performance_kras").select(KRA_SELECT).order("created_at", { ascending: false }).limit(200);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (searchParams.get("goal_id")) query = query.eq("goal_id", searchParams.get("goal_id"));
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const records = (data ?? []) as any[];
  return NextResponse.json({ data: records
    .filter((record) => canViewPerformanceRecord(profile, targetFromPerformanceRecord(record), "kra"))
    .map((record) => ({
      ...record,
      goal_title: record.goal?.title,
      category: record.goal?.goal_type,
      expected_outcome: record.target_value,
      actual_value: record.achieved_value,
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
  if (!canManagePerformanceRecord(profile, "kra", employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const payload = normalizePerformanceKraPayload({ ...body, employee_id: employee.id });
  const { data, error: insertError } = await supabase.from("performance_kras").insert({ ...payload, created_by: user.id }).select(KRA_SELECT).single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
