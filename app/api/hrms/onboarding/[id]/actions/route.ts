import { NextRequest, NextResponse } from "next/server";
import { event, hrmsContext, link, status } from "@/lib/hrms/api-server";
import { ensureHrmsEmployeeForJoinedCandidate } from "@/lib/hrms/ats-employee-sync";

const NEXT_STATUS: Record<string, string> = {
  approve: "approved",
  reject: "rejected",
  initiate: "documents_pending",
  submit_documents: "documents_submitted",
  send_offer: "offer_sent",
  decline: "offer_declined",
  join: "joined",
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;

  const body = await req.json();
  const action = String(body?.action ?? "");
  const next = NEXT_STATUS[action];
  if (!next) return NextResponse.json({ error: "unknown action" }, { status: 400 });

  const patch: Record<string, unknown> = {
    status: next,
    updated_by: ctx.user.id,
    updated_at: new Date().toISOString(),
  };
  if (action === "join") patch.actual_doj = body.actual_doj ?? new Date().toISOString().slice(0, 10);
  if (action === "decline" || action === "reject") patch.decline_reason = body.reason ?? null;

  const { data, error } = await ctx.supabase
    .schema("hrms").from("onboarding_cases")
    .update(patch)
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });

  await event(ctx.supabase, {
    org_id: ctx.orgId,
    entity_type: "onboarding_case",
    entity_id: data.id,
    event_type: `onboarding.${action}`,
    summary: `Onboarding ${action}`,
    actor_profile_id: ctx.user.id,
    metadata: { status: next, reason: body.reason ?? null },
  });

  if (action === "join" && data.ats_candidate_id) {
    await ctx.supabase.from("candidates").update({
      final_status: "Joined",
      doj_actual: patch.actual_doj,
      updated_by: ctx.user.id,
    }).eq("id", data.ats_candidate_id);
    const employee = await ensureHrmsEmployeeForJoinedCandidate(data.ats_candidate_id, ctx.user.id);
    if (employee?.id) {
      await link(ctx.supabase, {
        org_id: ctx.orgId,
        source_product: "hrms",
        source_entity_type: "onboarding_case",
        source_entity_id: data.id,
        target_product: "hrms",
        target_entity_type: "employee",
        target_entity_id: employee.id,
        link_type: "created_employee",
      });
      await link(ctx.supabase, {
        org_id: ctx.orgId,
        source_product: "ats",
        source_entity_type: "candidate",
        source_entity_id: data.ats_candidate_id,
        target_product: "hrms",
        target_entity_type: "employee",
        target_entity_id: employee.id,
        link_type: "converted_to_employee",
      });
    }
  }

  return NextResponse.json({ data });
}
