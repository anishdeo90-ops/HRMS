import { NextRequest, NextResponse } from "next/server";
import { canManageEmployeeCore, canUpdateEmployeeBasic, type HrmsProfile } from "@/lib/hrms/authorization";
import { normalizeEmployeePayload } from "@/lib/hrms/employee-core";
import { createAdminClient, createClient } from "@/lib/supabase/server";

async function currentProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("id, role, is_active").eq("id", user.id).single();
  return { user, profile: profile as HrmsProfile | null };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canUpdateEmployeeBasic(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("include_inactive") === "true";
  const admin = await createAdminClient();

  let query = admin
    .from("employees")
    .select("*, company:hr_companies(name, code), branch:hr_branches(name, code), department:hr_departments(name, code), grade:hr_grades(name, code), employment_type:hr_employment_types(name, code), profile:profiles!employees_profile_id_fkey(name, email)")
    .order("name");

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageEmployeeCore(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const payload = normalizeEmployeePayload(await req.json());
  const { data, error } = await supabase
    .from("employees")
    .insert({ ...payload, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
