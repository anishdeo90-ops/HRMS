import { NextRequest, NextResponse } from "next/server";
import { canManageLifecycleRecord, canViewLifecycleRecord, normalizeDailySummaryPayload, targetFromLifecycleRecord } from "@/app/api/hrms/lifecycle/_shared";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const SUMMARY_SELECT = "*,employee:employees!daily_work_summaries_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const { employee, error: targetError } = await resolveLeaveTargetEmployee(supabase, user.id, searchParams.get("employee_id"));
  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 });
  if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!canViewLifecycleRecord(profile, employee, "daily_summary")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  let query = supabase.from("daily_work_summaries").select(SUMMARY_SELECT).eq("employee_id", employee.id).order("summary_date", { ascending: false }).limit(200);
  if (searchParams.get("from")) query = query.gte("summary_date", searchParams.get("from"));
  if (searchParams.get("to")) query = query.lte("summary_date", searchParams.get("to"));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: ((data ?? []) as any[]).filter((record) => canViewLifecycleRecord(profile, targetFromLifecycleRecord(record), "daily_summary")) });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, typeof body.employee_id === "string" ? body.employee_id : null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!canManageLifecycleRecord(profile, "daily_summary", employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const payload = normalizeDailySummaryPayload({ ...body, employee_id: employee.id });
  const { data, error: insertError } = await supabase.from("daily_work_summaries").insert({ ...payload, created_by: user.id }).select(SUMMARY_SELECT).single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
