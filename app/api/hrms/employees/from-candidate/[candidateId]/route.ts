import { NextRequest, NextResponse } from "next/server";
import { canManageEmployeeCore, type HrmsProfile } from "@/lib/hrms/authorization";
import { isJoinedCandidate, normalizeEmployeePayload } from "@/lib/hrms/employee-core";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ candidateId: string }> };

async function currentProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("id, role, is_active").eq("id", user.id).single();
  return { user, profile: profile as HrmsProfile | null };
}

export async function POST(req: NextRequest, { params }: Params) {
  const { candidateId } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageEmployeeCore(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select("id, name, email, mobile, final_status, doj_actual, doj")
    .eq("id", candidateId)
    .single();

  if (candidateError) return NextResponse.json({ error: candidateError.message }, { status: 500 });
  if (!isJoinedCandidate(candidate ?? null)) {
    return NextResponse.json({ error: "Candidate has not joined" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("employees")
    .select("id")
    .eq("joined_candidate_id", candidateId)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "Candidate already converted" }, { status: 409 });

  const body = await req.json();
  const payload = normalizeEmployeePayload({
    ...body,
    joined_candidate_id: candidateId,
    name: body.name ?? candidate?.name,
    work_email: body.work_email ?? candidate?.email,
    mobile: body.mobile ?? candidate?.mobile,
    joining_date: body.joining_date ?? candidate?.doj_actual ?? candidate?.doj,
  });

  const { data, error } = await supabase
    .from("employees")
    .insert({ ...payload, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
