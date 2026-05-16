import { NextResponse } from "next/server";
import { canViewLifecycle } from "@/app/api/hrms/lifecycle/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const OVERVIEW_TABLES = [
  "employee_onboardings",
  "employee_separations",
  "employee_promotions",
  "employee_transfers",
  "employee_grievances",
  "training_events",
  "daily_work_summaries",
] as const;

export async function GET() {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewLifecycle(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const results = await Promise.all(OVERVIEW_TABLES.map((table) => supabase.from(table).select("*", { count: "exact", head: true })));
  const error = results.find((result) => result.error)?.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: Object.fromEntries(OVERVIEW_TABLES.map((table, index) => [table, results[index].count ?? 0])),
  });
}
