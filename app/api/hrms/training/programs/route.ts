import { NextRequest, NextResponse } from "next/server";
import { canManageLifecycleRecord, canViewLifecycleRecord, normalizeTrainingProgramPayload } from "@/app/api/hrms/lifecycle/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewLifecycleRecord(profile, null, "training_program")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  let query = supabase.from("training_programs").select("*").order("created_at", { ascending: false }).limit(200);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageLifecycleRecord(profile, "training_program")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const payload = normalizeTrainingProgramPayload(await req.json());
  const { data, error } = await supabase.from("training_programs").insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
