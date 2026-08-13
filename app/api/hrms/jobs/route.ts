import { NextResponse } from "next/server";
import { hrmsContext, status } from "@/lib/hrms/api-server";

export async function GET() {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;

  const { data, error } = await ctx.supabase
    .from("hrms_job_openings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  return NextResponse.json({ data: data ?? [] });
}
