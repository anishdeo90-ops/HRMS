import { NextRequest, NextResponse } from "next/server";
import {
  applyCommonFilters,
  canCreateCandidateHandoff,
  canViewRecruitment,
  isJoinedCandidate,
  normalizeCandidateHandoffPayload,
} from "@/app/api/hrms/recruitment/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const HANDOFF_SELECT = "*,candidate:candidates!recruitment_onboarding_handoffs_candidate_id_fkey(id, name, email, mobile, final_status, doj_actual, doj),employee:employees!recruitment_onboarding_handoffs_employee_id_fkey(id, employee_code, name)";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewRecruitment(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const candidateId = searchParams.get("candidate_id");
  if (candidateId) {
    const [{ data: candidate, error: candidateError }, { data: employee }, { data: handoff, error: handoffError }] = await Promise.all([
      supabase.from("candidates").select("id, name, email, mobile, final_status, doj_actual, doj").eq("id", candidateId).single(),
      supabase.from("employees").select("id, employee_code, name, joined_candidate_id").eq("joined_candidate_id", candidateId).maybeSingle(),
      supabase.from("recruitment_onboarding_handoffs").select(HANDOFF_SELECT).eq("candidate_id", candidateId).maybeSingle(),
    ]);
    if (candidateError) return NextResponse.json({ error: candidateError.message }, { status: 500 });
    if (handoffError) return NextResponse.json({ error: handoffError.message }, { status: 500 });
    const joined = isJoinedCandidate(candidate ?? null);
    return NextResponse.json({
      data: {
        eligible: joined && !employee,
        reason: employee ? "already_converted" : joined ? "ready_for_onboarding" : "candidate_not_joined",
        candidate,
        employee,
        handoff,
      },
    });
  }

  let query = supabase.from("recruitment_onboarding_handoffs").select(HANDOFF_SELECT).order("created_at", { ascending: false }).limit(200);
  query = applyCommonFilters(query, Object.fromEntries(searchParams));
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateCandidateHandoff(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const payload = normalizeCandidateHandoffPayload(body);
  if (!payload.candidate_id) return NextResponse.json({ error: "candidate_id required" }, { status: 400 });

  const candidateId = String(payload.candidate_id);
  const [{ data: candidate, error: candidateError }, { data: employee }] = await Promise.all([
    supabase.from("candidates").select("id, name, email, mobile, final_status, doj_actual, doj").eq("id", candidateId).single(),
    supabase.from("employees").select("id").eq("joined_candidate_id", candidateId).maybeSingle(),
  ]);
  if (candidateError) return NextResponse.json({ error: candidateError.message }, { status: 500 });
  if (!isJoinedCandidate(candidate ?? null)) return NextResponse.json({ error: "Candidate has not joined" }, { status: 400 });
  if (employee) return NextResponse.json({ error: "Candidate already converted" }, { status: 409 });

  const { data, error } = await supabase
    .from("recruitment_onboarding_handoffs")
    .insert({ ...payload, requested_by: user.id, created_by: user.id, updated_by: user.id })
    .select(HANDOFF_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
