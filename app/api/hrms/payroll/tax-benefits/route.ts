import { NextRequest, NextResponse } from "next/server";
import {
  canManagePayroll,
  canViewPayrollRecord,
  normalizeBenefitApplicationPayload,
  normalizeBenefitClaimPayload,
  normalizeGratuityRulePayload,
  normalizeTaxDeclarationPayload,
  normalizeTaxSlabPayload,
  targetFromPayrollRecord,
} from "@/app/api/hrms/payroll/_shared";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const RESOURCE_TABLES = {
  tax_declarations: "employee_tax_exemption_declarations",
  benefit_applications: "employee_benefit_applications",
  benefit_claims: "employee_benefit_claims",
  tax_slabs: "income_tax_slabs",
  gratuity_rules: "gratuity_rules",
} as const;

const EMPLOYEE_RESOURCE_SELECT = {
  tax_declarations: "*,employee:employees!employee_tax_exemption_declarations_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)",
  benefit_applications: "*,employee:employees!employee_benefit_applications_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)",
  benefit_claims: "*,employee:employees!employee_benefit_claims_employee_id_fkey(id, employee_code, name, profile_id, department_id, reporting_manager_id)",
} as const;

function normalizeResourcePayload(resource: string, body: Record<string, unknown>) {
  if (resource === "benefit_applications") return normalizeBenefitApplicationPayload(body);
  if (resource === "benefit_claims") return normalizeBenefitClaimPayload(body);
  if (resource === "tax_slabs") return normalizeTaxSlabPayload(body);
  if (resource === "gratuity_rules") return normalizeGratuityRulePayload(body);
  return normalizeTaxDeclarationPayload(body);
}

function resourceScope(resource: string) {
  if (resource === "benefit_applications") return "benefit_application";
  if (resource === "benefit_claims") return "benefit_claim";
  return "tax_declaration";
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource") ?? "tax_declarations";
  const table = RESOURCE_TABLES[resource as keyof typeof RESOURCE_TABLES];
  if (!table) return NextResponse.json({ error: "Unsupported payroll tax-benefits resource" }, { status: 400 });

  const employeeId = searchParams.get("employee_id");
  const employeeResource = resource in EMPLOYEE_RESOURCE_SELECT;
  if (employeeResource && employeeId) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, employeeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!canViewPayrollRecord(profile, employee, resourceScope(resource))) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  } else if (!canManagePayroll(profile)) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (employeeResource && !employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const select = EMPLOYEE_RESOURCE_SELECT[resource as keyof typeof EMPLOYEE_RESOURCE_SELECT] ?? "*";
  let query = supabase.from(table).select(select).order("created_at", { ascending: false }).limit(200);
  if (employeeResource && employeeId) query = query.eq("employee_id", employeeId);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  if (searchParams.get("tax_year")) query = query.eq("tax_year", searchParams.get("tax_year"));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const scoped = employeeResource ? (data ?? []).filter((record) => canViewPayrollRecord(profile, targetFromPayrollRecord(record), resourceScope(resource))) : data;
  return NextResponse.json({ data: scoped });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const resource = String(body.resource ?? "tax_declarations");
  const table = RESOURCE_TABLES[resource as keyof typeof RESOURCE_TABLES];
  if (!table) return NextResponse.json({ error: "Unsupported payroll tax-benefits resource" }, { status: 400 });

  const employeeResource = resource in EMPLOYEE_RESOURCE_SELECT;
  if (employeeResource) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, typeof body.employee_id === "string" ? body.employee_id : null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!canViewPayrollRecord(profile, employee, resourceScope(resource))) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    body.employee_id = employee.id;
  } else if (!canManagePayroll(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const payload = normalizeResourcePayload(resource, body);
  const { data, error } = await supabase.from(table).insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
