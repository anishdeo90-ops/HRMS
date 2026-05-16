import { NextRequest, NextResponse } from "next/server";
import { canManagePerformanceRecord, normalizePerformanceGoalPayload } from "@/app/api/hrms/performance/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import type { GeneratedKey } from "@/lib/generated/workflows";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const GOAL_SELECT = "*,employee:employees!performance_goals_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)";

const GOAL_WORKFLOW = "workflow.performance.goal_status" satisfies GeneratedKey;
const GOAL_STATES = ["draft", "active", "submitted", "approved", "closed", "cancelled"] as const;
const GOAL_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["active", "cancelled"],
  active: ["submitted"],
  submitted: ["approved"],
  approved: ["closed"],
  closed: [],
  cancelled: [],
};

function goalPatch(action: string, body: Record<string, unknown>, userId: string) {
  if (action === "complete") return { status: "closed", updated_by: userId };
  if (action === "cancel") return { status: "cancelled", updated_by: userId };
  if (action === "archive") return { status: "closed", updated_by: userId };
  const normalized = normalizePerformanceGoalPayload(body);
  if (typeof body.status !== "string") delete normalized.status;
  return { ...normalized, updated_by: userId };
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
  if (!canManagePerformanceRecord(profile, "goal")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const action = String(body.action ?? "update");
  const { data: existing, error: existingError } = await supabase.from("performance_goals").select("id, status").eq("id", id).single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const requestedStatus = normalizeWorkflowStatus(body.status, GOAL_STATES);
  if (typeof body.status === "string" && !requestedStatus) {
    return NextResponse.json({ error: "Invalid performance goal status" }, { status: 422 });
  }
  const patch = goalPatch(action, { ...body, status: requestedStatus ?? body.status }, user.id) as Record<string, unknown>;
  const transitionError = invalidTransition((existing as any).status, patch.status, GOAL_WORKFLOW, GOAL_TRANSITIONS);
  if (transitionError) return NextResponse.json({ error: transitionError }, { status: 422 });

  const { data, error } = await supabase.from("performance_goals").update(patch).eq("id", id).select(GOAL_SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
