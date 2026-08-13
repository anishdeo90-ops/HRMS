import { NextRequest, NextResponse } from "next/server";
import { event, hrmsContext, status } from "@/lib/hrms/api-server";

export async function GET() {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const { data, error } = await ctx.supabase.schema("hrms").from("document_types").select("*").eq("org_id", ctx.orgId).order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const body = await req.json();
  const { data, error } = await ctx.supabase
    .schema("hrms").from("document_types")
    .insert({ ...body, org_id: ctx.orgId, created_by: ctx.user.id, updated_by: ctx.user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  await event(ctx.supabase, { org_id: ctx.orgId, entity_type: "document_type", entity_id: data.id, event_type: "document_type.created", summary: "Document type created", actor_profile_id: ctx.user.id });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const body = await req.json();
  const { id, onboarding_case_id, document_type_id, ...patch } = body;
  if (!id && (!onboarding_case_id || !document_type_id)) {
    return NextResponse.json({ error: "id or onboarding_case_id/document_type_id is required" }, { status: 400 });
  }

  if (!id) {
    const uploaded_at = patch.status && patch.status !== "pending" ? new Date().toISOString() : null;
    const existing = await ctx.supabase
      .schema("hrms").from("employee_documents")
      .select("id")
      .eq("org_id", ctx.orgId)
      .eq("onboarding_case_id", onboarding_case_id)
      .eq("document_type_id", document_type_id)
      .maybeSingle();
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: status(existing.error) });
    if (existing.data?.id) body.id = existing.data.id;
    else {
      const inserted = await ctx.supabase
        .schema("hrms").from("employee_documents")
        .insert({ org_id: ctx.orgId, onboarding_case_id, document_type_id, ...patch, uploaded_at, created_by: ctx.user.id, updated_by: ctx.user.id })
        .select()
        .single();
      if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: status(inserted.error) });
      await event(ctx.supabase, { org_id: ctx.orgId, entity_type: "employee_document", entity_id: inserted.data.id, event_type: "document.updated", summary: "Document updated", actor_profile_id: ctx.user.id, metadata: patch });
      return NextResponse.json({ data: inserted.data });
    }
  }

  const docId = body.id ?? id;
  const { data, error } = await ctx.supabase
    .schema("hrms").from("employee_documents")
    .update({ ...patch, updated_by: ctx.user.id, updated_at: new Date().toISOString() })
    .eq("id", docId)
    .eq("org_id", ctx.orgId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  await event(ctx.supabase, { org_id: ctx.orgId, entity_type: "employee_document", entity_id: docId, event_type: "document.updated", summary: "Document updated", actor_profile_id: ctx.user.id, metadata: patch });
  return NextResponse.json({ data });
}
