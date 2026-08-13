import { NextRequest, NextResponse } from "next/server";
import { event, hrmsContext, link, status } from "@/lib/hrms/api-server";

export async function GET() {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;

  const { data, error } = await ctx.supabase
    .from("hrms_onboarding_view")
    .select("*")
    .order("proposed_doj", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;

  const body = await req.json();
  if (!body?.candidate_id) return NextResponse.json({ error: "candidate_id is required" }, { status: 400 });

  const { count } = await ctx.supabase
    .schema("hrms").from("onboarding_cases")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ctx.orgId);

  const row = {
    org_id: ctx.orgId,
    case_code: body.case_code ?? `ONB-${String((count ?? 0) + 1).padStart(4, "0")}`,
    ats_candidate_id: body.candidate_id,
    ats_job_id: body.job_id ?? null,
    status: body.status ?? "pending_approval",
    proposed_doj: body.proposed_doj ?? null,
    created_by: ctx.user.id,
    updated_by: ctx.user.id,
  };

  const { data, error } = await ctx.supabase
    .schema("hrms").from("onboarding_cases")
    .upsert(row, { onConflict: "org_id,ats_candidate_id" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });

  await event(ctx.supabase, {
    org_id: ctx.orgId,
    entity_type: "onboarding_case",
    entity_id: data.id,
    event_type: "onboarding.case_saved",
    summary: "Onboarding case saved",
    actor_profile_id: ctx.user.id,
    metadata: { ats_candidate_id: body.candidate_id, ats_job_id: body.job_id ?? null },
  });
  await link(ctx.supabase, {
    org_id: ctx.orgId,
    source_product: "ats",
    source_entity_type: "candidate",
    source_entity_id: body.candidate_id,
    target_product: "hrms",
    target_entity_type: "onboarding_case",
    target_entity_id: data.id,
    link_type: "converted_to_onboarding",
  });
  if (body.job_id) {
    await link(ctx.supabase, {
      org_id: ctx.orgId,
      source_product: "ats",
      source_entity_type: "job",
      source_entity_id: body.job_id,
      target_product: "hrms",
      target_entity_type: "onboarding_case",
      target_entity_id: data.id,
      link_type: "hiring_for",
    });
  }

  return NextResponse.json({ data }, { status: 201 });
}
