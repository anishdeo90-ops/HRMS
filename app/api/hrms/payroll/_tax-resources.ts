import { NextRequest, NextResponse } from "next/server";
import type { PayrollRecordScope } from "@/app/api/hrms/payroll/_shared";
import {
  canManageTaxBenefits,
  canViewPayrollRecord,
  normalizeBenefitApplicationPayload,
  normalizeBenefitClaimPayload,
  normalizeTaxDeclarationPayload,
  normalizeTaxSlabPayload,
  targetFromPayrollRecord,
} from "@/app/api/hrms/payroll/_shared";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import type { GeneratedKey } from "@/lib/generated/workflows";
import { createClient } from "@/lib/supabase/server";

type TaxBenefitResource = {
  table: string;
  select: string;
  scope?: PayrollRecordScope;
  normalize: (input: Record<string, unknown>) => Record<string, unknown>;
  workflowKey?: GeneratedKey;
  workflowLabel?: string;
  states?: readonly string[];
  transitions?: Record<string, readonly string[]>;
  paid?: boolean;
};

const TAX_DECLARATION_STATES = ["draft", "submitted", "approved", "rejected", "cancelled"] as const;
const TAX_DECLARATION_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["submitted"],
  submitted: ["approved", "rejected"],
  approved: [],
  rejected: [],
  cancelled: [],
};
const BENEFIT_CLAIM_STATES = ["draft", "submitted", "approved", "rejected", "paid", "cancelled"] as const;
const BENEFIT_CLAIM_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["submitted"],
  submitted: ["approved", "rejected"],
  approved: ["paid"],
  rejected: [],
  paid: [],
  cancelled: [],
};

export const TAX_BENEFIT_RESOURCES = {
  taxDeclarations: {
    table: "employee_tax_exemption_declarations",
    select: "*,employee:employees!employee_tax_exemption_declarations_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)",
    scope: "tax_declaration",
    normalize: normalizeTaxDeclarationPayload,
    workflowKey: "workflow.payroll.tax_declaration_status",
    states: TAX_DECLARATION_STATES,
    transitions: TAX_DECLARATION_TRANSITIONS,
  },
  benefitApplications: {
    table: "employee_benefit_applications",
    select: "*,employee:employees!employee_benefit_applications_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)",
    scope: "benefit_application",
    normalize: normalizeBenefitApplicationPayload,
    workflowLabel: "employee_benefit_application.status",
    states: TAX_DECLARATION_STATES,
    transitions: TAX_DECLARATION_TRANSITIONS,
  },
  benefitClaims: {
    table: "employee_benefit_claims",
    select: "*,employee:employees!employee_benefit_claims_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)",
    scope: "benefit_claim",
    normalize: normalizeBenefitClaimPayload,
    workflowKey: "workflow.payroll.benefit_claim_status",
    states: BENEFIT_CLAIM_STATES,
    transitions: BENEFIT_CLAIM_TRANSITIONS,
    paid: true,
  },
  taxSlabs: {
    table: "income_tax_slabs",
    select: "*",
    normalize: normalizeTaxSlabPayload,
  },
} satisfies Record<string, TaxBenefitResource>;

function decisionPatch(action: string, userId: string, resource: TaxBenefitResource) {
  if (action === "approve") return { status: "approved", reviewed_by: userId, reviewed_at: new Date().toISOString(), updated_by: userId };
  if (action === "reject") return { status: "rejected", reviewed_by: userId, reviewed_at: new Date().toISOString(), updated_by: userId };
  if (action === "paid" && resource.paid) return { status: "paid", paid_at: new Date().toISOString(), updated_by: userId };
  if (action === "cancel") return { status: "cancelled", updated_by: userId };
  return null;
}

function normalizeWorkflowStatus(value: unknown, allowed: readonly string[]) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.includes(normalized) ? normalized : null;
}

function invalidTransition(currentStatus: string, nextStatus: unknown, workflowLabel: string | undefined, transitions: Record<string, readonly string[]> | undefined) {
  if (!workflowLabel || !transitions || typeof nextStatus !== "string" || nextStatus === currentStatus) return null;
  if (transitions[currentStatus]?.includes(nextStatus)) return null;
  return `Invalid status transition for ${workflowLabel}: ${currentStatus} -> ${nextStatus}`;
}

export async function listPayrollTaxResource(req: NextRequest, resource: TaxBenefitResource) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");
  if (resource.scope && employeeId) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, employeeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!canViewPayrollRecord(profile, employee, resource.scope)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  } else if (!canManageTaxBenefits(profile)) {
    const { employee, error } = resource.scope ? await resolveLeaveTargetEmployee(supabase, user.id, null) : { employee: null, error: null };
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!resource.scope || !employee?.id) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let query = supabase.from(resource.table).select(resource.select).order("created_at", { ascending: false }).limit(200);
  if (resource.scope && employeeId) query = query.eq("employee_id", employeeId);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  if (searchParams.get("tax_year")) query = query.eq("tax_year", searchParams.get("tax_year"));
  if (searchParams.get("fiscal_year")) query = query.eq("fiscal_year", searchParams.get("fiscal_year"));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const scoped = resource.scope
    ? (data ?? []).filter((record) => canViewPayrollRecord(profile, targetFromPayrollRecord(record), resource.scope!))
    : data;
  return NextResponse.json({ data: scoped });
}

export async function createPayrollTaxResource(req: NextRequest, resource: TaxBenefitResource) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (resource.scope) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, typeof body.employee_id === "string" ? body.employee_id : null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!canViewPayrollRecord(profile, employee, resource.scope)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    body.employee_id = employee.id;
  } else if (!canManageTaxBenefits(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const payload = resource.normalize(body);
  const { data, error } = await supabase.from(resource.table).insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function updatePayrollTaxResource(req: NextRequest, id: string, resource: TaxBenefitResource) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageTaxBenefits(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const action = String(body.action ?? "update");
  const { data: existing, error: existingError } = await supabase.from(resource.table).select("id, status").eq("id", id).single();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  const requestedStatus = resource.states ? normalizeWorkflowStatus(body.status, resource.states) : null;
  if (resource.states && typeof body.status === "string" && !requestedStatus) {
    return NextResponse.json({ error: "Invalid payroll tax benefit status" }, { status: 422 });
  }
  const normalized = resource.normalize({ ...body, status: requestedStatus ?? body.status }) as Record<string, unknown>;
  if (typeof body.status !== "string") delete normalized.status;
  const patch = (decisionPatch(action, user.id, resource) ?? { ...normalized, updated_by: user.id }) as Record<string, unknown>;
  const transitionError = invalidTransition((existing as any).status, patch.status, resource.workflowKey ?? resource.workflowLabel, resource.transitions);
  if (transitionError) return NextResponse.json({ error: transitionError }, { status: 422 });
  const { data, error } = await supabase.from(resource.table).update(patch).eq("id", id).select(resource.select).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
