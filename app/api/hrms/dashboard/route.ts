import { NextResponse } from "next/server";
import { hrmsContext, status } from "@/lib/hrms/api-server";

export async function GET() {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;

  const [employees, jobs, onboarding, announcements] = await Promise.all([
    ctx.supabase.from("hrms_employee_directory").select("*"),
    ctx.supabase.from("hrms_job_openings").select("*"),
    ctx.supabase.from("hrms_onboarding_view").select("*"),
    ctx.supabase.schema("hrms").from("announcements").select("*, category:announcement_categories(name)").eq("org_id", ctx.orgId).order("published_at", { ascending: false }).limit(5),
  ]);
  const error = employees.error ?? jobs.error ?? onboarding.error ?? announcements.error;
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });

  const staff = employees.data ?? [];
  const activeJobs = (jobs.data ?? []).filter((j) => j.status !== "Closed");
  const year = new Date().getFullYear();
  const upcoming = (date?: string) => date ? `${year}-${date.slice(5, 10)}` : "";

  return NextResponse.json({
    data: {
      me: staff[0] ?? null,
      employees: staff,
      jobs: jobs.data ?? [],
      onboarding: onboarding.data ?? [],
      announcements: (announcements.data ?? []).map((a) => ({ ...a, category: a.category?.name ?? "General" })),
      dashboard: {
        headcount: staff.filter((e) => e.status !== "separated").length,
        headcount_change: 0,
        attrition_percent: 0,
        pending_approvals: (onboarding.data ?? []).filter((c) => c.status === "pending_approval").length,
        documents_pending: (onboarding.data ?? []).filter((c) => ["documents_pending","documents_submitted"].includes(c.status)).length,
        probation_ending: 0,
        present_today: 0,
        absent_today: 0,
        on_leave_today: 0,
        open_positions: activeJobs.reduce((sum, j) => sum + (j.openings ?? 0), 0),
        new_this_week: activeJobs.filter((j) => new Date(j.created_at).getTime() > Date.now() - 7 * 86400000).length,
        on_hold: (jobs.data ?? []).filter((j) => j.status === "On Hold").length,
        headcount_by_department: Object.entries(staff.reduce((acc: Record<string, number>, e) => {
          const key = e.department ?? "Unassigned";
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {})).map(([name, value]) => ({ name, value })),
        birthdays: staff.filter((e) => e.date_of_birth).map((e) => ({ id: e.id, name: e.name, department: e.department, date: upcoming(e.date_of_birth) })).slice(0, 5),
        anniversaries: staff.filter((e) => e.date_of_joining).map((e) => ({ id: e.id, name: e.name, years: Math.max(1, year - Number(e.date_of_joining.slice(0, 4))), date: upcoming(e.date_of_joining) })).slice(0, 5),
      },
    },
  });
}
