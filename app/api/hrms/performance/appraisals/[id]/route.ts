import { NextRequest, NextResponse } from "next/server";
import { canManagePerformanceRecord, normalizeAppraisalGoalPayload, normalizeAppraisalPayload } from "@/app/api/hrms/performance/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import type { GeneratedKey } from "@/lib/generated/workflows";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const APPRAISAL_SELECT = "*,employee:employees!appraisals_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id),reviewer:employees!appraisals_reviewer_employee_id_fkey(id, employee_code, name, profile_id),goals:appraisal_goals(*)";

const APPRAISAL_WORKFLOW = "workflow.performance.appraisal_status" satisfies GeneratedKey;
const APPRAISAL_STATES = ["draft", "self_submitted", "manager_reviewed", "approved", "rejected", "closed", "cancelled"] as const;
const APPRAISAL_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["self_submitted", "cancelled"],
  self_submitted: ["manager_reviewed"],
  manager_reviewed: ["approved", "rejected"],
  approved: ["closed"],
  rejected: [],
  closed: [],
  cancelled: [],
};

function appraisalPatch(action: string, body: Record<string, unknown>, userId: string) {
  if (action === "submit_self") return { status: "self_submitted", submitted_at: new Date().toISOString(), updated_by: userId };
  if (action === "submit_manager") return { status: "manager_reviewed", reviewed_at: new Date().toISOString(), updated_by: userId };
  if (action === "calibrate") return { status: "approved", approved_at: new Date().toISOString(), updated_by: userId };
  if (action === "reject") return { status: "rejected", updated_by: userId };
  if (action === "complete") return { status: "closed", updated_by: userId };
  if (action === "cancel") return { status: "cancelled", updated_by: userId };
  const normalized = normalizeAppraisalPayload(body);
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
  if (!canManagePerformanceRecord(profile, "appraisal")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const action = String(body.action ?? "update");
  const { data: existing, error: existingError } = await supabase.from("appraisals").select("id, status").eq("id", id).single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const requestedStatus = normalizeWorkflowStatus(body.status, APPRAISAL_STATES);
  if (typeof body.status === "string" && !requestedStatus) {
    return NextResponse.json({ error: "Invalid appraisal status" }, { status: 422 });
  }
  const patch = appraisalPatch(action, { ...body, status: requestedStatus ?? body.status }, user.id) as Record<string, unknown>;
  const transitionError = invalidTransition((existing as any).status, patch.status, APPRAISAL_WORKFLOW, APPRAISAL_TRANSITIONS);
  if (transitionError) return NextResponse.json({ error: transitionError }, { status: 422 });

  if (Array.isArray(body.goals)) {
    for (const item of body.goals) {
      const goal = normalizeAppraisalGoalPayload({ ...(item as Record<string, unknown>), appraisal_id: id });
      if (goal.id) continue;
      await supabase.from("appraisal_goals").insert(goal);
    }
  }

  const { data, error } = await supabase.from("appraisals").update(patch).eq("id", id).select(APPRAISAL_SELECT).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
