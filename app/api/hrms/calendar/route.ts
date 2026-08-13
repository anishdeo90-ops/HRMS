import { NextResponse } from "next/server";
import { hrmsContext, status } from "@/lib/hrms/api-server";

export async function GET() {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;

  const [holidays, employees, onboarding] = await Promise.all([
    ctx.supabase.schema("hrms").from("holidays").select("*").eq("org_id", ctx.orgId).eq("is_active", true),
    ctx.supabase.from("hrms_employee_directory").select("id,name,department,date_of_birth,date_of_joining").neq("status", "separated"),
    ctx.supabase.from("hrms_onboarding_view").select("candidate_name,designation,proposed_doj,actual_doj,status"),
  ]);
  const error = holidays.error ?? employees.error ?? onboarding.error;
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });

  const year = new Date().getFullYear();
  const events = [
    ...(holidays.data ?? []).map((h) => ({ date: h.holiday_date, kind: "holiday", label: h.name, detail: h.applies_to })),
    ...(employees.data ?? []).flatMap((e) => [
      e.date_of_birth ? { date: `${year}-${e.date_of_birth.slice(5, 10)}`, kind: "birthday", label: e.name, detail: e.department } : null,
      e.date_of_joining ? { date: `${year}-${e.date_of_joining.slice(5, 10)}`, kind: "anniversary", label: e.name, detail: e.department } : null,
    ].filter(Boolean)),
    ...(onboarding.data ?? [])
      .filter((c) => c.proposed_doj && !["offer_declined", "rejected"].includes(c.status))
      .map((c) => ({ date: c.actual_doj ?? c.proposed_doj, kind: "joinee", label: c.candidate_name, detail: c.designation })),
  ];

  return NextResponse.json({ data: events });
}
