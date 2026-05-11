import { NextRequest, NextResponse } from "next/server";
import { normalizeEncashmentPayload } from "@/lib/hrms/leave";
import { canRequestLeaveEncashment, canViewLeave } from "@/lib/hrms/leave-authorization";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const { employee, error: employeeError } = await resolveLeaveTargetEmployee(supabase, user.id, searchParams.get("employee_id"));
  if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });
  if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!canViewLeave(profile, employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { data, error } = await supabase.from("leave_encashments").select("*").eq("employee_id", employee.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { employee, error: employeeError } = await resolveLeaveTargetEmployee(supabase, user.id, typeof body.employee_id === "string" ? body.employee_id : null);
  if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });
  if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!canRequestLeaveEncashment(profile, employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const payload = normalizeEncashmentPayload({ ...body, employee_id: employee.id });
  const { data, error } = await supabase.from("leave_encashments").insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
