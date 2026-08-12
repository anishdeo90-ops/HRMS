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

  const { data, error } = await supabase.rpc("hrms_master_rows", { master_slug: params.type });
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

  const { data, error } = await supabase.rpc("hrms_save_master", {
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

  const { data, error } = await supabase.rpc("hrms_set_master_active", {
    master_slug: params.type,
    row_id: body.id,
    active: body.is_active,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });

  return NextResponse.json({ data });
}
