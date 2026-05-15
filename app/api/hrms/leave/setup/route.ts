import { NextRequest, NextResponse } from "next/server";
import { normalizeLeavePolicyPayload, normalizeLeaveTypePayload } from "@/lib/hrms/leave";
import { canManageLeaveBalances, canManageLeaveSetup, canViewLeave } from "@/lib/hrms/leave-authorization";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const RESOURCE_TABLES = {
  types: "leave_types",
  periods: "leave_periods",
  policies: "leave_policies",
  policy_details: "leave_policy_details",
  policy_assignments: "leave_policy_assignments",
  allocations: "leave_allocations",
  holidays: "holiday_lists",
  holiday_dates: "holiday_list_dates",
  block_lists: "leave_block_lists",
  block_dates: "leave_block_list_dates",
} as const;

type LeaveSetupResource = keyof typeof RESOURCE_TABLES;

const BASIC_FIELDS = [
  "company_id",
  "branch_id",
  "department_id",
  "name",
  "code",
  "from_date",
  "to_date",
  "effective_from",
  "effective_to",
  "is_active",
  "policy_id",
  "leave_type_key",
  "employee_id",
  "leave_period_id",
  "allocated_days",
  "carried_forward_days",
  "expired_days",
  "source",
  "status",
  "holiday_list_id",
  "holiday_date",
  "description",
  "is_optional",
  "block_list_id",
  "block_date",
  "reason",
] as const;

function unsupportedResource(resource: unknown) {
  return NextResponse.json({ error: `Unsupported resource: ${String(resource ?? "")}` }, { status: 400 });
}

function pickFields(body: Record<string, unknown>, fields: readonly string[]) {
  return Object.fromEntries(fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
}

function normalizeResourcePayload(resource: LeaveSetupResource, body: Record<string, unknown>) {
  if (resource === "types") return normalizeLeaveTypePayload(body);
  if (resource === "policies") return normalizeLeavePolicyPayload(body);
  return pickFields(body, BASIC_FIELDS);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const resource = (searchParams.get("resource") ?? "types") as LeaveSetupResource;
  const table = RESOURCE_TABLES[resource];
  if (!table) return unsupportedResource(resource);

  if (!canManageLeaveSetup(profile) && !canManageLeaveBalances(profile) && resource !== "types") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const employeeId = searchParams.get("employee_id");
  if (employeeId && ["policy_assignments", "allocations"].includes(resource)) {
    const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, employeeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!canViewLeave(profile, employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let query = supabase.from(table).select("*");
  if (employeeId && ["policy_assignments", "allocations"].includes(resource)) query = query.eq("employee_id", employeeId);
  if (searchParams.get("company_id") && ["periods", "policies", "holidays", "block_lists"].includes(resource)) query = query.eq("company_id", searchParams.get("company_id"));
  const { data, error } = await query.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const resource = body.resource as LeaveSetupResource;
  const table = RESOURCE_TABLES[resource];
  if (!table) return unsupportedResource(resource);
  if (["allocations", "policy_assignments"].includes(resource) ? !canManageLeaveBalances(profile) : !canManageLeaveSetup(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const payload = normalizeResourcePayload(resource, body);
  const { data, error } = await supabase.from(table).insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const resource = body.resource as LeaveSetupResource;
  const table = RESOURCE_TABLES[resource];
  if (!table) return unsupportedResource(resource);
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (["allocations", "policy_assignments"].includes(resource) ? !canManageLeaveBalances(profile) : !canManageLeaveSetup(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const payload = normalizeResourcePayload(resource, body);
  const { data, error } = await supabase.from(table).update(payload).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
