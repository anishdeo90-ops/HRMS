import { NextRequest, NextResponse } from "next/server";
import { canViewEmployee, canWriteEmployee, type HrmsProfile } from "@/lib/hrms/authorization";
import { stripEmployeeReadOnlyFields } from "@/lib/hrms/employee-core";
import type { GeneratedKey } from "@/lib/generated/workflows";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const EMPLOYEE_STATUS_WORKFLOW = "workflow.employee.status" satisfies GeneratedKey;
const EMPLOYEE_STATUS_STATES = ["draft", "active", "inactive", "exited"] as const;
const EMPLOYEE_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["active"],
  active: ["inactive", "exited"],
  inactive: ["active"],
  exited: [],
};

async function currentProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("id, role, is_active").eq("id", user.id).single();
  return { user, profile: profile as HrmsProfile | null };
}

function currentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return { start, end };
}

function normalizeWorkflowStatus(value: unknown, allowed: readonly string[]) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.includes(normalized) ? normalized : null;
}

function invalidTransition(currentStatus: string, nextStatus: unknown, workflowKey: GeneratedKey, transitions: Record<string, readonly string[]>) {
  if (typeof nextStatus !== "string" || nextStatus === currentStatus) return null;
  if (transitions[currentStatus]?.includes(nextStatus)) return null;
  return `Invalid status transition for ${workflowKey}: ${currentStatus} -> ${nextStatus}`;
}

function summarizeAttendance(days: any[] | null | undefined) {
  const rows = days ?? [];
  return {
    total_days: rows.length,
    present_days: rows.filter((day) => day.status === "present" || day.status === "late" || day.status === "on_duty").length,
    absent_days: rows.filter((day) => day.status === "absent").length,
    half_days: rows.filter((day) => day.status === "half_day").length,
    total_work_minutes: rows.reduce((total, day) => total + Number(day.total_work_minutes ?? 0), 0),
    by_status: rows.reduce((acc: Record<string, number>, day) => {
      const status = String(day.status ?? "unknown");
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

function summarizeLeave(allocations: any[] | null | undefined, ledger: any[] | null | undefined) {
  const balances = new Map<string, { employee_id: string; leave_period_id: string | null; leave_type_key: string; allocated: number; ledger_delta: number; balance: number }>();
  for (const allocation of allocations ?? []) {
    const key = `${allocation.employee_id}:${allocation.leave_period_id ?? ""}:${allocation.leave_type_key}`;
    const allocated = Number(allocation.allocated_days ?? 0) + Number(allocation.carried_forward_days ?? 0) - Number(allocation.expired_days ?? 0);
    balances.set(key, { employee_id: allocation.employee_id, leave_period_id: allocation.leave_period_id, leave_type_key: allocation.leave_type_key, allocated, ledger_delta: 0, balance: allocated });
  }
  for (const entry of ledger ?? []) {
    const key = `${entry.employee_id}:${entry.leave_period_id ?? ""}:${entry.leave_type_key}`;
    const current = balances.get(key) ?? { employee_id: entry.employee_id, leave_period_id: entry.leave_period_id, leave_type_key: entry.leave_type_key, allocated: 0, ledger_delta: 0, balance: 0 };
    current.ledger_delta += Number(entry.days_delta ?? 0);
    current.balance = current.allocated + current.ledger_delta;
    balances.set(key, current);
  }
  return Array.from(balances.values());
}

function lifecycleStage(onboardings: any[] | null | undefined, separations: any[] | null | undefined) {
  const latestSeparation = (separations ?? [])[0] ?? null;
  if (latestSeparation && !["cancelled", "rejected"].includes(latestSeparation.status)) {
    return { stage: latestSeparation.status === "approved" || latestSeparation.status === "exited" ? "exiting" : "separation_in_progress", separation: latestSeparation, onboarding: (onboardings ?? [])[0] ?? null };
  }
  const latestOnboarding = (onboardings ?? [])[0] ?? null;
  if (latestOnboarding && latestOnboarding.status !== "completed") return { stage: "onboarding", onboarding: latestOnboarding, separation: null };
  return { stage: latestOnboarding?.status === "completed" ? "active" : "not_started", onboarding: latestOnboarding, separation: null };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("employees")
    .select("*, company:hr_companies(*), branch:hr_branches(*), department:hr_departments(*), grade:hr_grades(*), employment_type:hr_employment_types(*), reporting_manager:employees!employees_reporting_manager_id_fkey(id, name, employee_code), profile:profiles(name, email)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!canViewEmployee(profile, data)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { start, end } = currentMonthRange();
  const [
    candidateResult,
    attendanceResult,
    leaveAllocationsResult,
    leaveLedgerResult,
    recentLeaveResult,
    salarySlipResult,
    appraisalsResult,
    performanceGoalsResult,
    onboardingsResult,
    separationsResult,
  ] = await Promise.all([
    data.joined_candidate_id
      ? supabase.from("candidates").select("id, name, email, mobile, final_status, doj_actual, doj").eq("id", data.joined_candidate_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("attendance_days").select("attendance_date, status, total_work_minutes").eq("employee_id", id).gte("attendance_date", start).lte("attendance_date", end),
    supabase.from("leave_allocations").select("employee_id, leave_period_id, leave_type_key, allocated_days, carried_forward_days, expired_days").eq("employee_id", id),
    supabase.from("leave_ledger_entries").select("employee_id, leave_period_id, leave_type_key, days_delta").eq("employee_id", id),
    supabase.from("leave_applications").select("*").eq("employee_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.from("salary_slips").select("*,lines:salary_slip_lines(*)").eq("employee_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("appraisals").select("*,cycle:appraisal_cycles(*),goals:appraisal_goals(*)").eq("employee_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.from("performance_goals").select("*").eq("employee_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("employee_onboardings").select("*,activities:employee_boarding_activities(*)").eq("employee_id", id).order("created_at", { ascending: false }).limit(3),
    supabase.from("employee_separations").select("*").eq("employee_id", id).order("created_at", { ascending: false }).limit(3),
  ]);

  const aggregateError = [
    candidateResult.error,
    attendanceResult.error,
    leaveAllocationsResult.error,
    leaveLedgerResult.error,
    recentLeaveResult.error,
    salarySlipResult.error,
    appraisalsResult.error,
    performanceGoalsResult.error,
    onboardingsResult.error,
    separationsResult.error,
  ].find(Boolean);
  if (aggregateError) return NextResponse.json({ error: aggregateError.message }, { status: 500 });

  return NextResponse.json({
    data: {
      ...data,
      source_candidate: candidateResult.data,
      attendance_summary: summarizeAttendance(attendanceResult.data),
      leave_summary: {
        balances: summarizeLeave(leaveAllocationsResult.data, leaveLedgerResult.data),
        recent_applications: recentLeaveResult.data ?? [],
      },
      latest_salary_slip: salarySlipResult.data,
      performance: {
        appraisals: appraisalsResult.data ?? [],
        goals: performanceGoalsResult.data ?? [],
      },
      lifecycle_stage: lifecycleStage(onboardingsResult.data, separationsResult.data),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteEmployee(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const payload = stripEmployeeReadOnlyFields(body);
  const requestedStatus = normalizeWorkflowStatus(body.employment_status, EMPLOYEE_STATUS_STATES);
  if (typeof body.employment_status === "string" && !requestedStatus) {
    return NextResponse.json({ error: "Invalid employee status" }, { status: 422 });
  }
  if (requestedStatus) {
    const { data: existing, error: existingError } = await supabase.from("employees").select("id, employment_status").eq("id", id).single();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    const transitionError = invalidTransition((existing as any).employment_status, requestedStatus, EMPLOYEE_STATUS_WORKFLOW, EMPLOYEE_STATUS_TRANSITIONS);
    if (transitionError) return NextResponse.json({ error: transitionError }, { status: 422 });
    payload.employment_status = requestedStatus;
  }
  const { data, error } = await supabase
    .from("employees")
    .update({ ...payload, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
