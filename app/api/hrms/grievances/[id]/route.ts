import { NextRequest, NextResponse } from "next/server";
import { canManageLifecycleRecord, normalizeGrievancePayload, targetFromLifecycleRecord } from "@/app/api/hrms/lifecycle/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const GRIEVANCE_SELECT = "*,employee:employees!employee_grievances_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id),assignee:employees!employee_grievances_assigned_to_employee_id_fkey(id, employee_code, name, profile_id),type:grievance_types(*)";

function grievancePatch(action: string, body: Record<string, unknown>, userId: string) {
  if (action === "assign") return { assigned_to_employee_id: body.assigned_to_employee_id, status: "under_review", updated_by: userId };
  if (action === "resolve") return { status: "resolved", resolution_notes: body.resolution_notes, resolved_by: userId, resolved_at: new Date().toISOString(), updated_by: userId };
  if (action === "reject") return { status: "rejected", resolution_notes: body.resolution_notes, rejected_by: userId, rejected_at: new Date().toISOString(), updated_by: userId };
  if (action === "withdraw") return { status: "withdrawn", updated_by: userId };
  if (action === "archive") return { status: "archived", updated_by: userId };
  return { ...normalizeGrievancePayload(body), updated_by: userId };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing, error: existingError } = await supabase.from("employee_grievances").select(GRIEVANCE_SELECT).eq("id", id).single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (!canManageLifecycleRecord(profile, "grievance", targetFromLifecycleRecord(existing))) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const action = String(body.action ?? "update");
  const { data, error } = await supabase.from("employee_grievances").update(grievancePatch(action, body, user.id)).eq("id", id).select(GRIEVANCE_SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
