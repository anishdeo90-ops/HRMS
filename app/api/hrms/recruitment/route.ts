import { NextResponse } from "next/server";
import { canViewRecruitment, recruitmentOverview } from "@/app/api/hrms/recruitment/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewRecruitment(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const data = await recruitmentOverview(supabase);
  return NextResponse.json({ data });
}
