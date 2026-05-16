import { NextRequest, NextResponse } from "next/server";
import {
  applyCommonFilters,
  canManageAppointments,
  canViewRecruitment,
  normalizeAppointmentLetterPayload,
} from "@/app/api/hrms/recruitment/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const APPOINTMENT_SELECT = "*,candidate:candidates!recruitment_appointment_letters_candidate_id_fkey(id, name, mobile, email, final_status),offer:candidate_offers!recruitment_appointment_letters_candidate_offer_id_fkey(id, status, annual_ctc)";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewRecruitment(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const filters = Object.fromEntries(new URL(req.url).searchParams);
  let query = supabase.from("recruitment_appointment_letters").select(APPOINTMENT_SELECT).order("created_at", { ascending: false }).limit(200);
  query = applyCommonFilters(query, filters);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageAppointments(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const payload = normalizeAppointmentLetterPayload(await req.json());
  const { data, error } = await supabase
    .from("recruitment_appointment_letters")
    .insert({ ...payload, created_by: user.id, updated_by: user.id })
    .select(APPOINTMENT_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
