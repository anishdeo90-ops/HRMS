import { NextResponse } from "next/server";
import { hrmsContext, status } from "@/lib/hrms/api-server";
import { dayShortLabel } from "@/lib/hrms/status";

export async function GET() {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;

  const year = new Date().getFullYear();
  const from = `${year}-01-01`;
  const to = `${year + 1}-01-01`;

  const [holidays, employees, onboarding, leaves, attendance, punches] = await Promise.all([
    ctx.supabase.schema("hrms").from("holidays").select("*").eq("org_id", ctx.orgId).eq("is_active", true),
    ctx.supabase.from("hrms_employee_directory").select("id,name,department,date_of_birth,date_of_joining").neq("status", "separated"),
    ctx.supabase.from("hrms_onboarding_view").select("candidate_name,designation,proposed_doj,actual_doj,status"),
    ctx.supabase.schema("hrms").from("leave_requests").select("employee_id,from_date,to_date,days").eq("org_id", ctx.orgId).eq("status", "approved").gte("to_date", from).lt("from_date", to),
    ctx.supabase.schema("hrms").from("attendance_days").select("id,employee_id,work_date,first_in,last_out,worked_minutes,day_status,payable_fraction").eq("org_id", ctx.orgId).gte("work_date", from).lt("work_date", to).order("work_date"),
    ctx.supabase.schema("hrms").from("attendance_punches").select("attendance_day_id,punched_at,direction,source").eq("org_id", ctx.orgId).gte("punched_at", `${from}T00:00:00`).lt("punched_at", `${to}T00:00:00`).order("punched_at"),
  ]);
  const error = holidays.error ?? employees.error ?? onboarding.error ?? leaves.error ?? attendance.error ?? punches.error;
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });

  const employeeById = new Map((employees.data ?? []).map((e) => [e.id, e]));
  const punchesByDay = new Map<string, typeof punches.data>();
  for (const punch of punches.data ?? []) {
    const key = punch.attendance_day_id;
    punchesByDay.set(key, [...(punchesByDay.get(key) ?? []), punch]);
  }

  const events = [
    ...(holidays.data ?? []).map((h) => ({ date: h.holiday_date, kind: "holiday", label: h.name, detail: h.applies_to })),
    ...(employees.data ?? []).flatMap((e) => [
      e.date_of_birth ? { date: `${year}-${e.date_of_birth.slice(5, 10)}`, kind: "birthday", label: e.name, detail: e.department } : null,
      e.date_of_joining ? { date: `${year}-${e.date_of_joining.slice(5, 10)}`, kind: "anniversary", label: e.name, detail: e.department } : null,
    ].filter(Boolean)),
    ...(onboarding.data ?? [])
      .filter((c) => c.proposed_doj && !["offer_declined", "rejected"].includes(c.status))
      .map((c) => ({ date: c.actual_doj ?? c.proposed_doj, kind: "joinee", label: c.candidate_name, detail: c.designation })),
    ...(leaves.data ?? []).map((leave) => {
      const employee = employeeById.get(leave.employee_id);
      return { date: leave.from_date, kind: "leave", label: employee?.name ?? "Employee", detail: `${leave.days} day approved leave` };
    }),
    ...(attendance.data ?? []).map((day) => {
      const employee = employeeById.get(day.employee_id);
      const dayPunches = punchesByDay.get(day.id) ?? [];
      const punchDetail = dayPunches.map((p) => `${p.direction} ${new Date(p.punched_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`).join(", ");
      return {
        id: day.id,
        date: day.work_date,
        kind: "attendance",
        label: `${employee?.name ?? "Employee"} ${dayShortLabel(day.day_status)}`,
        detail: punchDetail || `In ${day.first_in ? new Date(day.first_in).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"} / Out ${day.last_out ? new Date(day.last_out).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}`,
        employee_id: day.employee_id,
        first_in: day.first_in,
        last_out: day.last_out,
        day_status: day.day_status,
        worked_minutes: day.worked_minutes,
        payable_fraction: day.payable_fraction,
      };
    }),
  ];

  return NextResponse.json({ data: events });
}
