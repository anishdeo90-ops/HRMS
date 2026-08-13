import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function status(error: { code?: string }) {
  if (error.code === "42501") return 403;
  if (error.code === "22023") return 400;
  return 500;
}

async function authed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? supabase : null;
}

export async function GET(_req: NextRequest, { params }: { params: { type: string } }) {
  const supabase = await authed();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (params.type === "announcement-category" || params.type === "expense-type") {
    const table = params.type === "announcement-category" ? "announcement_categories" : "expense_types";
    const { data, error } = await supabase.schema("hrms").from(table).select("id,name,is_active").order("name");
    if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
    return NextResponse.json({ data: data ?? [] });
  }

  const resource = ["announcement-category", "expense-type"].includes(params.type)
    ? params.type
    : null;
  const { data, error } = resource
    ? await supabase.rpc("hrms_settings_resource", { resource_key: resource })
    : await supabase.rpc("hrms_master_rows", { master_slug: params.type });
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: { type: string } }) {
  const supabase = await authed();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (params.type === "announcement-category" || params.type === "expense-type") {
    const { data: member } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    const table = params.type === "announcement-category" ? "announcement_categories" : "expense_types";
    const { data, error } = await supabase.schema("hrms").from(table).insert({
      org_id: member?.org_id,
      name: body.name,
      is_active: body.is_active ?? true,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
    return NextResponse.json({ data });
  }

  const resource = ["announcement-category", "expense-type"].includes(params.type)
    ? params.type
    : null;
  const { data, error } = resource
    ? await supabase.rpc("hrms_save_settings_resource", { resource_key: resource, payload: body })
    : await supabase.rpc("hrms_save_master", {
        master_slug: params.type,
        payload: body,
      });
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });

  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: { type: string } }) {
  const supabase = await authed();
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body?.id || typeof body.is_active !== "boolean") {
    return NextResponse.json({ error: "id and is_active are required" }, { status: 400 });
  }

  const resource = ["announcement-category", "expense-type"].includes(params.type)
    ? params.type
    : null;
  const { data, error } = resource
    ? await supabase.rpc("hrms_save_settings_resource", {
        resource_key: resource,
        payload: { id: body.id, is_active: body.is_active },
      })
    : await supabase.rpc("hrms_set_master_active", {
        master_slug: params.type,
        row_id: body.id,
        active: body.is_active,
      });
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });

  return NextResponse.json({ data });
}
