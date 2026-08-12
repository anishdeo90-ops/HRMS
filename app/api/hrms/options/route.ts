import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("hrms_options");
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "42501" ? 403 : 500 });

  return NextResponse.json({ data });
}
