import { NextRequest, NextResponse } from "next/server";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { normalizeNotificationPayload, notificationStatusPatch, selfServiceTargetFromEmployee } from "@/lib/hrms/self-service";
import {
  canAcknowledgeEmployeeNotification,
  canManageEmployeeNotifications,
  canViewEmployeeNotifications,
} from "@/lib/hrms/self-service-authorization";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const NOTIFICATION_SELECT = "*, employee:employees!employee_notifications_employee_id_fkey(id, name, profile_id)";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const requestedEmployeeId = searchParams.get("employee_id");
  const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, requestedEmployeeId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!canViewEmployeeNotifications(profile, employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const admin = await createAdminClient();
  let query = admin
    .from("employee_notifications")
    .select(NOTIFICATION_SELECT)
    .eq("employee_id", employee.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(100);

  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));

  const { data, error: queryError } = await query;
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageEmployeeNotifications(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const payload = normalizeNotificationPayload(await req.json());
  if (!payload.employee_id || !payload.title) return NextResponse.json({ error: "employee_id and title required" }, { status: 400 });

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("employee_notifications")
    .insert({ ...payload, created_by: user.id })
    .select(NOTIFICATION_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = await createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("employee_notifications")
    .select(NOTIFICATION_SELECT)
    .eq("id", body.id)
    .single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (!canAcknowledgeEmployeeNotification(profile, selfServiceTargetFromEmployee(existing))) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const patch = notificationStatusPatch(String(body.status ?? "read"));
  if (!patch) return NextResponse.json({ error: "Unsupported notification status" }, { status: 400 });

  const { data, error } = await admin
    .from("employee_notifications")
    .update(patch)
    .eq("id", body.id)
    .select(NOTIFICATION_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
