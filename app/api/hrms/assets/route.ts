import { NextRequest, NextResponse } from "next/server";
import { event, hrmsContext, link, status } from "@/lib/hrms/api-server";

export async function GET() {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const { data, error } = await ctx.supabase.schema("hrms").from("assets").select("*, asset_assignments(employee_id, allocated_on, returned_on, employee:employees(full_name))").eq("org_id", ctx.orgId).order("asset_code");
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  return NextResponse.json({ data: (data ?? []).map((a) => {
    const active = a.asset_assignments?.find((x: any) => !x.returned_on);
    return { ...a, allocated_to: active?.employee?.full_name, allocated_on: active?.allocated_on };
  }) });
}

export async function POST(req: NextRequest) {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const body = await req.json();
  if (body.action === "allocate") {
    const { data, error } = await ctx.supabase.schema("hrms").from("asset_assignments").insert({ org_id: ctx.orgId, asset_id: body.asset_id, employee_id: body.employee_id, allocated_on: body.allocated_on, condition: body.condition, created_by: ctx.user.id }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
    await ctx.supabase.schema("hrms").from("assets").update({ status: "allocated", updated_by: ctx.user.id }).eq("id", body.asset_id).eq("org_id", ctx.orgId);
    await event(ctx.supabase, { org_id: ctx.orgId, entity_type: "asset", entity_id: body.asset_id, event_type: "asset.allocated", summary: "Asset allocated", actor_profile_id: ctx.user.id, metadata: { employee_id: body.employee_id } });
    await link(ctx.supabase, { org_id: ctx.orgId, source_product: "hrms", source_entity_type: "asset", source_entity_id: body.asset_id, target_product: "hrms", target_entity_type: "employee", target_entity_id: body.employee_id, link_type: "allocated_to" });
    return NextResponse.json({ data }, { status: 201 });
  }
  const { data, error } = await ctx.supabase.schema("hrms").from("assets").insert({ ...body, org_id: ctx.orgId, created_by: ctx.user.id, updated_by: ctx.user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  await event(ctx.supabase, { org_id: ctx.orgId, entity_type: "asset", entity_id: data.id, event_type: "asset.created", summary: "Asset created", actor_profile_id: ctx.user.id });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const body = await req.json();
  const { error } = await ctx.supabase.schema("hrms").from("asset_assignments").update({ returned_on: body.returned_on ?? new Date().toISOString().slice(0, 10) }).eq("asset_id", body.asset_id).is("returned_on", null);
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  await ctx.supabase.schema("hrms").from("assets").update({ status: "in_stock", updated_by: ctx.user.id }).eq("id", body.asset_id).eq("org_id", ctx.orgId);
  await event(ctx.supabase, { org_id: ctx.orgId, entity_type: "asset", entity_id: body.asset_id, event_type: "asset.returned", summary: "Asset returned", actor_profile_id: ctx.user.id });
  return NextResponse.json({ ok: true });
}
