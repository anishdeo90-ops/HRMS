import { NextRequest, NextResponse } from "next/server";
import { canManageLifecycleRecord, canViewLifecycle, canViewLifecycleRecord, normalizeOnboardingPayload, targetFromLifecycleRecord } from "@/app/api/hrms/lifecycle/_shared";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import type { GeneratedKey } from "@/lib/generated/workflows";
import { createClient } from "@/lib/supabase/server";

const ONBOARDING_SELECT = "*,employee:employees!employee_onboardings_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id),activities:employee_boarding_activities(*)";

const ONBOARDING_WORKFLOW = "workflow.lifecycle.onboarding_status" satisfies GeneratedKey;
const ONBOARDING_STATES = ["draft", "active", "completed", "cancelled"] as const;
const ONBOARDING_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["active", "cancelled"],
  active: ["completed"],
  completed: [],
  cancelled: [],
};

function normalizeWorkflowStatus(value: unknown, allowed: readonly string[]) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "in_progress") return allowed.includes("active") ? "active" : null;
  return allowed.includes(normalized) ? normalized : null;
}

function invalidTransition(currentStatus: string, nextStatus: unknown, workflowKey: GeneratedKey, transitions: Record<string, readonly string[]>) {
  if (typeof nextStatus !== "string" || nextStatus === currentStatus) return null;
  if (transitions[currentStatus]?.includes(nextStatus)) return null;
  return `Invalid status transition for ${workflowKey}: ${currentStatus} -> ${nextStatus}`;
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
    if (!canViewLifecycleRecord(profile, employee, "onboarding")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  } else if (!canViewLifecycle(profile)) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id || !canViewLifecycleRecord(profile, employee, "onboarding")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let query = supabase.from("employee_onboardings").select(ONBOARDING_SELECT).order("created_at", { ascending: false }).limit(200);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: ((data ?? []) as any[]).filter((record) => canViewLifecycleRecord(profile, targetFromLifecycleRecord(record), "onboarding")) });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, typeof body.employee_id === "string" ? body.employee_id : null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!canManageLifecycleRecord(profile, "onboarding", employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const payload = normalizeOnboardingPayload({ ...body, employee_id: employee.id });
  const { data, error: insertError } = await supabase.from("employee_onboardings").insert({ ...payload, created_by: user.id }).select(ONBOARDING_SELECT).single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (typeof body.id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: existing, error: existingError } = await supabase.from("employee_onboardings").select(ONBOARDING_SELECT).eq("id", body.id).single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const target = targetFromLifecycleRecord(existing);
  if (!canManageLifecycleRecord(profile, "onboarding", target)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const patch: Record<string, unknown> = { updated_by: user.id };
  if (typeof body.status === "string") {
    const requestedStatus = normalizeWorkflowStatus(body.status, ONBOARDING_STATES);
    if (!requestedStatus) return NextResponse.json({ error: "Invalid onboarding status" }, { status: 422 });
    const transitionError = invalidTransition((existing as any).status, requestedStatus, ONBOARDING_WORKFLOW, ONBOARDING_TRANSITIONS);
    if (transitionError) return NextResponse.json({ error: transitionError }, { status: 422 });
    patch.status = requestedStatus;
    if (patch.status === "completed") patch.completed_at = new Date().toISOString();
  }
  for (const field of ["owner_employee_id", "start_date", "due_date", "notes"]) {
    if (body[field] !== undefined) patch[field] = body[field];
  }

  const { data, error } = await supabase.from("employee_onboardings").update(patch).eq("id", body.id).select(ONBOARDING_SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data.status === "completed") {
    const { error: employeeError } = await supabase
      .from("employees")
      .update({ employment_status: "active", updated_by: user.id })
      .eq("id", data.employee_id);
    if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}
