import { NextRequest, NextResponse } from "next/server";
import { canViewLeaveLedger } from "@/lib/hrms/leave-authorization";
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
  if (!canViewLeaveLedger(profile, employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  let query = supabase.from("leave_ledger_entries").select("*").eq("employee_id", employee.id).order("posting_date", { ascending: false }).limit(500);
  if (searchParams.get("leave_type_key")) query = query.eq("leave_type_key", searchParams.get("leave_type_key"));
  if (searchParams.get("period_id")) query = query.eq("leave_period_id", searchParams.get("period_id"));
  if (searchParams.get("leave_application_id")) query = query.eq("application_id", searchParams.get("leave_application_id"));
  if (searchParams.get("application_id")) query = query.eq("application_id", searchParams.get("application_id"));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: (data ?? []).map((entry) => ({ ...entry, leave_application_id: entry.application_id })) });
}
