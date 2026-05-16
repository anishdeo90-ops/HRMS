import { NextRequest, NextResponse } from "next/server";
import { canManageLifecycleRecord, canViewLifecycleRecord, normalizeGrievanceTypePayload } from "@/app/api/hrms/lifecycle/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewLifecycleRecord(profile, null, "grievance_type")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const { data, error } = await supabase.from("grievance_types").select("*").eq("is_active", true).order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageLifecycleRecord(profile, "grievance_type")) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const payload = normalizeGrievanceTypePayload(await req.json());
  const { data, error } = await supabase.from("grievance_types").insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
