import { NextRequest, NextResponse } from "next/server";
import { canWriteEmployee, type HrmsProfile } from "@/lib/hrms/authorization";
import { stripEmployeeReadOnlyFields } from "@/lib/hrms/employee-core";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

async function currentProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("id, role, is_active").eq("id", user.id).single();
  return { user, profile: profile as HrmsProfile | null };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("employees")
    .select("*, company:hr_companies(*), branch:hr_branches(*), department:hr_departments(*), grade:hr_grades(*), employment_type:hr_employment_types(*), profile:profiles!employees_profile_id_fkey(name, email)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteEmployee(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const payload = stripEmployeeReadOnlyFields(await req.json());
  const { data, error } = await supabase
    .from("employees")
    .update({ ...payload, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
