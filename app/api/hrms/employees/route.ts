import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function errorStatus(error: { code?: string }) {
  return error.code === "42501" ? 403 : 500;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let query = supabase.from("hrms_employee_directory").select("*").order("name");

  const status = searchParams.get("status");
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: errorStatus(error) });

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body?.first_name?.trim() || !body?.last_name?.trim() || !body?.work_email?.trim()) {
    return NextResponse.json({ error: "first_name, last_name and work_email are required" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("hrms_create_employee", { payload: body });
  if (error) return NextResponse.json({ error: error.message }, { status: errorStatus(error) });

  return NextResponse.json({ data }, { status: 201 });
}
