import { NextRequest, NextResponse } from "next/server";
import type { LifecycleRecordScope } from "@/app/api/hrms/lifecycle/_shared";
import {
  canManageLifecycleRecord,
  canViewLifecycle,
  canViewLifecycleRecord,
  canViewTraining,
  normalizeBoardingActivityPayload,
  normalizeDailyWorkSummaryPayload,
  normalizeExitInterviewPayload,
  normalizeGrievancePayload,
  normalizeGrievanceTypePayload,
  normalizeOnboardingPayload,
  normalizeOnboardingTemplatePayload,
  normalizePromotionPayload,
  normalizeSeparationPayload,
  normalizeSeparationTemplatePayload,
  normalizeTrainingEventPayload,
  normalizeTrainingFeedbackPayload,
  normalizeTrainingProgramPayload,
  normalizeTransferPayload,
  targetFromLifecycleRecord,
} from "@/app/api/hrms/lifecycle/_shared";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

type LifecycleResource = {
  table: string;
  select: string;
  scope: LifecycleRecordScope;
  normalize: (input: Record<string, unknown>) => Record<string, unknown>;
  publicList?: boolean;
};

const EMPLOYEE_SELECT = "id, employee_code, name, profile_id, department_id, reporting_manager_id";

export const LIFECYCLE_RESOURCES = {
  onboardingTemplates: {
    table: "employee_onboarding_templates",
    select: "*",
    scope: "onboarding_template",
    normalize: normalizeOnboardingTemplatePayload,
  },
  onboardings: {
    table: "employee_onboardings",
    select: `*,employee:employees!employee_onboardings_employee_id_fkey(${EMPLOYEE_SELECT}),assignee:employees!employee_onboardings_assigned_to_employee_id_fkey(id, employee_code, name, profile_id)`,
    scope: "onboarding",
    normalize: normalizeOnboardingPayload,
  },
  onboardingActivities: {
    table: "employee_boarding_activities",
    select: `*,assignee:employees!employee_boarding_activities_assigned_to_employee_id_fkey(id, employee_code, name, profile_id)`,
    scope: "onboarding_activity",
    normalize: normalizeBoardingActivityPayload,
  },
  separationTemplates: {
    table: "employee_separation_templates",
    select: "*",
    scope: "separation_template",
    normalize: normalizeSeparationTemplatePayload,
  },
  separations: {
    table: "employee_separations",
    select: `*,employee:employees!employee_separations_employee_id_fkey(${EMPLOYEE_SELECT}),manager:employees!employee_separations_manager_employee_id_fkey(id, employee_code, name, profile_id)`,
    scope: "separation",
    normalize: normalizeSeparationPayload,
  },
  exitInterviews: {
    table: "exit_interviews",
    select: `*,employee:employees!exit_interviews_employee_id_fkey(${EMPLOYEE_SELECT}),interviewer:employees!exit_interviews_interviewer_employee_id_fkey(id, employee_code, name, profile_id)`,
    scope: "exit_interview",
    normalize: normalizeExitInterviewPayload,
  },
  promotions: {
    table: "employee_promotions",
    select: `*,employee:employees!employee_promotions_employee_id_fkey(${EMPLOYEE_SELECT})`,
    scope: "promotion",
    normalize: normalizePromotionPayload,
  },
  transfers: {
    table: "employee_transfers",
    select: `*,employee:employees!employee_transfers_employee_id_fkey(${EMPLOYEE_SELECT}),manager:employees!employee_transfers_to_manager_id_fkey(id, employee_code, name, profile_id)`,
    scope: "transfer",
    normalize: normalizeTransferPayload,
  },
  grievanceTypes: {
    table: "grievance_types",
    select: "*",
    scope: "grievance_type",
    normalize: normalizeGrievanceTypePayload,
  },
  grievances: {
    table: "employee_grievances",
    select: `*,employee:employees!employee_grievances_employee_id_fkey(${EMPLOYEE_SELECT}),assignee:employees!employee_grievances_assigned_to_employee_id_fkey(id, employee_code, name, profile_id),type:grievance_types(*)`,
    scope: "grievance",
    normalize: normalizeGrievancePayload,
  },
  trainingPrograms: {
    table: "training_programs",
    select: "*",
    scope: "training_program",
    normalize: normalizeTrainingProgramPayload,
    publicList: true,
  },
  trainingEvents: {
    table: "training_events",
    select: `*,program:training_programs(*),trainer:employees!training_events_trainer_employee_id_fkey(id, employee_code, name, profile_id)`,
    scope: "training_event",
    normalize: normalizeTrainingEventPayload,
    publicList: true,
  },
  trainingFeedback: {
    table: "training_feedback",
    select: `*,employee:employees!training_feedback_employee_id_fkey(${EMPLOYEE_SELECT}),event:training_events(*)`,
    scope: "training_feedback",
    normalize: normalizeTrainingFeedbackPayload,
  },
  dailySummaries: {
    table: "daily_work_summaries",
    select: `*,employee:employees!daily_work_summaries_employee_id_fkey(${EMPLOYEE_SELECT}),reviewer:employees!daily_work_summaries_reviewed_by_employee_id_fkey(id, employee_code, name, profile_id)`,
    scope: "daily_summary",
    normalize: normalizeDailyWorkSummaryPayload,
  },
} satisfies Record<string, LifecycleResource>;

function applyCommonFilters(query: any, searchParams: URLSearchParams) {
  for (const field of ["status", "employee_id", "program_id", "event_id", "onboarding_id", "separation_id", "grievance_type_id"]) {
    const value = searchParams.get(field);
    if (value) query = query.eq(field, value);
  }
  return query;
}

function isTrainingScope(scope: LifecycleRecordScope) {
  return scope === "training_program" || scope === "training_event" || scope === "training_feedback";
}

function canListResource(profile: unknown, resource: LifecycleResource) {
  if (resource.publicList && isTrainingScope(resource.scope)) return canViewTraining(profile as any);
  return canViewLifecycle(profile as any);
}

export async function listLifecycleResource(req: NextRequest, resource: LifecycleResource) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");
  if (employeeId) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, employeeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!canViewLifecycleRecord(profile, employee, resource.scope)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  } else if (!canListResource(profile, resource)) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id || !canViewLifecycleRecord(profile, employee, resource.scope)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let query = supabase.from(resource.table).select(resource.select).order("created_at", { ascending: false }).limit(200);
  query = applyCommonFilters(query, searchParams);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const records = (data ?? []) as any[];
  return NextResponse.json({
    data: records.filter((record) => canViewLifecycleRecord(profile, targetFromLifecycleRecord(record), resource.scope)),
  });
}

export async function createLifecycleResource(req: NextRequest, resource: LifecycleResource, fixedFields: Record<string, unknown> = {}) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = { ...(await req.json()), ...fixedFields };
  let target = null;
  if ("employee_id" in body || resource.scope === "grievance" || resource.scope === "training_feedback" || resource.scope === "daily_summary") {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, typeof body.employee_id === "string" ? body.employee_id : null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    target = employee;
    body.employee_id = employee.id;
  }

  if (!canManageLifecycleRecord(profile, resource.scope, target)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const payload = resource.normalize(body);
  const { data, error } = await supabase.from(resource.table).insert({ ...payload, created_by: user.id }).select(resource.select).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
