import { NextRequest, NextResponse } from "next/server";
import { event, hrmsContext, link, status } from "@/lib/hrms/api-server";

export async function POST(req: NextRequest) {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const body = await req.json();
  if (!body?.name || !body?.mobile) return NextResponse.json({ error: "name and mobile are required" }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from("candidates")
    .insert({
      name: body.name,
      email: body.email ?? null,
      mobile: body.mobile,
      job_id: body.job_id || null,
      referred_by: ctx.user.id,
      created_by: ctx.user.id,
      hr_id: ctx.user.id,
      application_date: new Date().toISOString().slice(0, 10),
      final_status: "New",
      remarks: body.notes ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });

  await event(ctx.supabase, { org_id: ctx.orgId, product_key: "ats", entity_type: "candidate", entity_id: data.id, event_type: "candidate.referred", summary: "Candidate referred from HRMS", actor_profile_id: ctx.user.id });
  if (body.job_id) await link(ctx.supabase, { org_id: ctx.orgId, source_product: "hrms", source_entity_type: "employee", source_entity_id: ctx.user.id, target_product: "ats", target_entity_type: "candidate", target_entity_id: data.id, link_type: "referral", metadata: { job_id: body.job_id } });
  return NextResponse.json({ data }, { status: 201 });
}
