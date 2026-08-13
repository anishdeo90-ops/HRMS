import { NextRequest, NextResponse } from "next/server";
import { event, hrmsContext, status } from "@/lib/hrms/api-server";

export async function GET() {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const { data, error } = await ctx.supabase.schema("hrms").from("onboarding_forms").select("*").eq("org_id", ctx.orgId).order("form_name");
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const body = await req.json();
  const { data, error } = await ctx.supabase
    .schema("hrms").from("onboarding_forms")
    .insert({ ...body, org_id: ctx.orgId, created_by: ctx.user.id, updated_by: ctx.user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  await event(ctx.supabase, { org_id: ctx.orgId, entity_type: "onboarding_form", entity_id: data.id, event_type: "onboarding_form.created", summary: "Onboarding form created", actor_profile_id: ctx.user.id });
  return NextResponse.json({ data }, { status: 201 });
}
