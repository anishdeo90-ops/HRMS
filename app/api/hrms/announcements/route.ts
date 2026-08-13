import { NextRequest, NextResponse } from "next/server";
import { event, hrmsContext, status } from "@/lib/hrms/api-server";

export async function GET() {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const { data, error } = await ctx.supabase.schema("hrms").from("announcements").select("*, category:announcement_categories(name)").eq("org_id", ctx.orgId).order("published_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  return NextResponse.json({ data: (data ?? []).map((a) => ({ ...a, category: a.category?.name ?? "General" })) });
}

export async function POST(req: NextRequest) {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const body = await req.json();
  const { data: category } = await ctx.supabase.schema("hrms").from("announcement_categories").select("id").eq("org_id", ctx.orgId).eq("name", body.category).maybeSingle();
  const { data, error } = await ctx.supabase.schema("hrms").from("announcements").insert({ ...body, category_id: category?.id ?? null, org_id: ctx.orgId, created_by: ctx.user.id, updated_by: ctx.user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  await event(ctx.supabase, { org_id: ctx.orgId, entity_type: "announcement", entity_id: data.id, event_type: "announcement.published", summary: "Announcement published", actor_profile_id: ctx.user.id });
  return NextResponse.json({ data }, { status: 201 });
}
