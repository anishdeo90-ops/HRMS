import { NextRequest, NextResponse } from "next/server";
import { isJoinedCandidate } from "@/lib/hrms/employee-core";
import {
  HRMS_RECRUITMENT_CONCEPTS,
  normalizeAppointmentLetterPayload,
  normalizeAppointmentTemplatePayload,
  normalizeCandidateHandoffPayload,
  normalizeRecruitmentFilters,
  recruitmentStageFromAtsStatus,
} from "@/lib/hrms/recruitment";
import {
  canCreateCandidateHandoff,
  canManageAppointments,
  canViewRecruitment,
} from "@/lib/hrms/recruitment-authorization";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

export {
  HRMS_RECRUITMENT_CONCEPTS,
  canCreateCandidateHandoff,
  canManageAppointments,
  canViewRecruitment,
  normalizeAppointmentLetterPayload,
  normalizeAppointmentTemplatePayload,
  normalizeCandidateHandoffPayload,
  normalizeRecruitmentFilters,
  recruitmentStageFromAtsStatus,
};

export const CANDIDATE_PIPELINE_SELECT = [
  "id",
  "sr_no",
  "name",
  "mobile",
  "email",
  "job_id",
  "hr_id",
  "hr_name",
  "created_by",
  "site_id",
  "site_name",
  "designation_id",
  "designation_name",
  "source_id",
  "source_name",
  "final_status",
  "application_date",
  "month",
  "is_deleted",
  "tel_int_done",
  "gf_sent",
  "gf_received",
  "shortlisted_hr",
  "pi_done",
  "shortlisted_mgmt",
  "appointed",
  "joined",
  "offered_not_joined",
].join(", ");

export const JOB_SELECT = `
  *,
  designation:masters!jobs_designation_id_fkey(id, name),
  site:masters!jobs_site_id_fkey(id, name),
  recruiters:job_recruiters(
    id, recruiter_id, assigned_at,
    profile:profiles!job_recruiters_recruiter_id_fkey(id, name, email, avatar_url)
  )
`;

export const INTERVIEW_SELECT = `
  *,
  candidate:candidates!interviews_candidate_id_fkey(id, name, mobile,
    designation:masters!candidates_designation_id_fkey(name)
  ),
  interviewer:profiles!interviews_interviewer_id_fkey(id, name)
`;

export const OFFER_SELECT = "*,candidate:candidates!candidate_offers_candidate_id_fkey(id, name, mobile, email, final_status)";

function filterValue(filters: Record<string, unknown>, key: string) {
  const value = filters[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function applyCommonFilters(query: any, filters: Record<string, unknown>) {
  for (const field of ["candidate_id", "job_id", "offer_id", "template_id", "status", "recruiter_id", "designation_id", "site_id"]) {
    const value = filterValue(filters, field);
    if (!value) continue;
    const column = field === "offer_id" ? "candidate_offer_id" : field;
    query = query.eq(column, value);
  }
  return query;
}

function applyDateFilters(query: any, filters: Record<string, unknown>, column: string) {
  const dateFrom = filterValue(filters, "date_from");
  const dateTo = filterValue(filters, "date_to");
  if (dateFrom) query = query.gte(column, dateFrom);
  if (dateTo) query = query.lte(column, dateTo);
  return query;
}

async function exactCount(query: any) {
  const { count } = await query;
  return count ?? 0;
}

export function withRecruitmentStage(row: Record<string, unknown>) {
  return {
    ...row,
    recruitment_stage: recruitmentStageFromAtsStatus(typeof row.final_status === "string" ? row.final_status : null),
  };
}

export async function recruitmentOverview(supabase: any) {
  const [applicants, jobs, interviews, offers, joined, handoffs] = await Promise.all([
    exactCount(supabase.from("v_pipeline_funnel").select("id", { count: "exact", head: true }).eq("is_deleted", false)),
    exactCount(supabase.from("jobs").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("status", "open")),
    exactCount(supabase.from("interviews").select("id", { count: "exact", head: true })),
    exactCount(supabase.from("candidate_offers").select("id", { count: "exact", head: true }).eq("is_deleted", false)),
    exactCount(supabase.from("v_pipeline_funnel").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("final_status", "Joined")),
    exactCount(supabase.from("recruitment_onboarding_handoffs").select("id", { count: "exact", head: true })),
  ]);

  return {
    concepts: HRMS_RECRUITMENT_CONCEPTS,
    totals: { applicants, open_jobs: jobs, interviews, offers, joined, handoffs },
  };
}

async function guardedRecruitmentClient() {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!canViewRecruitment(profile)) return { error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  return { supabase, user, profile };
}

export async function listRecruitmentApplicants(req: NextRequest) {
  const guarded = await guardedRecruitmentClient();
  if (guarded.error) return guarded.error;
  const filters = normalizeRecruitmentFilters(Object.fromEntries(new URL(req.url).searchParams));
  let query = guarded.supabase
    .from("v_pipeline_funnel")
    .select(CANDIDATE_PIPELINE_SELECT, { count: "exact" })
    .eq("is_deleted", false)
    .order("sr_no", { ascending: false })
    .limit(200);
  query = applyCommonFilters(query, filters);
  query = applyDateFilters(query, filters, "application_date");
  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return NextResponse.json({ data: rows.map(withRecruitmentStage), count });
}

export async function listRecruitmentJobs(req: NextRequest) {
  const guarded = await guardedRecruitmentClient();
  if (guarded.error) return guarded.error;
  const filters = normalizeRecruitmentFilters(Object.fromEntries(new URL(req.url).searchParams));
  let query = guarded.supabase.from("jobs").select(JOB_SELECT).eq("is_deleted", false).order("created_at", { ascending: false }).limit(200);
  query = applyCommonFilters(query, filters);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function listRecruitmentInterviews(req: NextRequest) {
  const guarded = await guardedRecruitmentClient();
  if (guarded.error) return guarded.error;
  const filters = normalizeRecruitmentFilters(Object.fromEntries(new URL(req.url).searchParams));
  let query = guarded.supabase.from("interviews").select(INTERVIEW_SELECT).order("scheduled_at", { ascending: true }).limit(200);
  query = applyCommonFilters(query, filters);
  query = applyDateFilters(query, filters, "scheduled_at");
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function listRecruitmentOffers(req: NextRequest) {
  const guarded = await guardedRecruitmentClient();
  if (guarded.error) return guarded.error;
  const filters = normalizeRecruitmentFilters(Object.fromEntries(new URL(req.url).searchParams));
  let query = guarded.supabase.from("candidate_offers").select(OFFER_SELECT).eq("is_deleted", false).order("created_at", { ascending: false }).limit(200);
  for (const field of ["candidate_id", "status"]) {
    const value = filterValue(filters, field);
    if (value) query = query.eq(field, value);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export { applyCommonFilters, applyDateFilters, guardedRecruitmentClient, isJoinedCandidate };
