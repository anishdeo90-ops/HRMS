import { NextRequest, NextResponse } from "next/server";
import { LIFECYCLE_RESOURCES, createLifecycleResource, listLifecycleResource } from "@/app/api/hrms/lifecycle/_resources";
import { canManageLifecycleRecord, targetFromLifecycleRecord } from "@/app/api/hrms/lifecycle/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import type { GeneratedKey } from "@/lib/generated/workflows";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const BOARDING_ACTIVITY_WORKFLOW = "workflow.lifecycle.boarding_activity_status" satisfies GeneratedKey;
const ONBOARDING_WORKFLOW = "workflow.lifecycle.onboarding_status" satisfies GeneratedKey;
const BOARDING_ACTIVITY_STATES = ["pending", "in_progress", "completed", "skipped", "cancelled"] as const;
const BOARDING_ACTIVITY_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["in_progress", "skipped"],
  in_progress: ["completed"],
  completed: [],
  skipped: [],
  cancelled: [],
};
const ONBOARDING_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["active", "cancelled"],
  active: ["completed"],
  completed: [],
  cancelled: [],
};

export async function GET(req: NextRequest) {
  return listLifecycleResource(req, LIFECYCLE_RESOURCES.onboardingActivities);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return createLifecycleResource(req, LIFECYCLE_RESOURCES.onboardingActivities, { onboarding_id: id });
}

async function completeOnboardingIfActivitiesDone(supabase: Awaited<ReturnType<typeof createClient>>, onboardingId: string, userId: string) {
  const { data: activities, error: activitiesError } = await supabase
    .from("employee_boarding_activities")
    .select("id, status")
    .eq("onboarding_id", onboardingId);
  if (activitiesError) return { error: activitiesError };
  if (!activities?.length || activities.some((activity) => activity.status !== "completed")) return { error: null };

  const { data: onboarding, error: onboardingError } = await supabase
    .from("employee_onboardings")
    .select("id, employee_id, status")
    .eq("id", onboardingId)
    .single();
  if (onboardingError) return { error: onboardingError };
  const transitionError = invalidTransition((onboarding as any).status, "completed", ONBOARDING_WORKFLOW, ONBOARDING_TRANSITIONS);
  if (transitionError) return { error: new Error(transitionError) };

  const { data: completedOnboarding, error: updateError } = await supabase
    .from("employee_onboardings")
    .update({ status: "completed", completed_at: new Date().toISOString(), updated_by: userId })
    .eq("id", onboardingId)
    .select("id, employee_id")
    .single();
  if (updateError) return { error: updateError };

  const { error: employeeError } = await supabase
    .from("employees")
    .update({ employment_status: "active", updated_by: userId })
    .eq("id", completedOnboarding.employee_id);
  return { error: employeeError };
}

function normalizeWorkflowStatus(value: unknown, allowed: readonly string[]) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.includes(normalized) ? normalized : null;
}

function invalidTransition(currentStatus: string, nextStatus: unknown, workflowKey: GeneratedKey, transitions: Record<string, readonly string[]>) {
  if (typeof nextStatus !== "string" || nextStatus === currentStatus) return null;
  if (transitions[currentStatus]?.includes(nextStatus)) return null;
  return `Invalid status transition for ${workflowKey}: ${currentStatus} -> ${nextStatus}`;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (typeof body.id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: onboarding, error: onboardingError } = await supabase
    .from("employee_onboardings")
    .select("*,employee:employees!employee_onboardings_employee_id_fkey(id, profile_id, department_id, reporting_manager_id)")
    .eq("id", id)
    .single();
  if (onboardingError) return NextResponse.json({ error: onboardingError.message }, { status: 500 });
  if (!canManageLifecycleRecord(profile, "onboarding_activity", targetFromLifecycleRecord(onboarding))) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const patch: Record<string, unknown> = { updated_by: user.id };
  for (const field of ["title", "description", "due_date", "assigned_to_employee_id"]) {
    if (body[field] !== undefined) patch[field] = body[field];
  }
  if (typeof body.status === "string") {
    const { data: existingActivity, error: activityError } = await supabase
      .from("employee_boarding_activities")
      .select("id, status")
      .eq("id", body.id)
      .eq("onboarding_id", id)
      .single();
    if (activityError) return NextResponse.json({ error: activityError.message }, { status: 500 });
    const requestedStatus = normalizeWorkflowStatus(body.status, BOARDING_ACTIVITY_STATES);
    if (!requestedStatus) return NextResponse.json({ error: "Invalid boarding activity status" }, { status: 422 });
    const transitionError = invalidTransition((existingActivity as any).status, requestedStatus, BOARDING_ACTIVITY_WORKFLOW, BOARDING_ACTIVITY_TRANSITIONS);
    if (transitionError) return NextResponse.json({ error: transitionError }, { status: 422 });
    patch.status = requestedStatus;
    if (requestedStatus === "completed") patch.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("employee_boarding_activities")
    .update(patch)
    .eq("id", body.id)
    .eq("onboarding_id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data.status === "completed") {
    const { error: completionError } = await completeOnboardingIfActivitiesDone(supabase, id, user.id);
    if (completionError) return NextResponse.json({ error: completionError.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
