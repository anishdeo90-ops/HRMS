import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export function errorStatus(error: { code?: string }) {
  return error.code === "42501" ? 403 : 500;
}

export async function authed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { supabase, response: null };
}

export async function rpc(name: string, args?: Record<string, unknown>, status = 200) {
  const { supabase, response } = await authed();
  if (response) return response;
  const { data, error } = await supabase.rpc(name, args);
  if (error) return NextResponse.json({ error: error.message }, { status: errorStatus(error) });
  return NextResponse.json({ data }, { status });
}
