import { NextRequest, NextResponse } from "next/server";
import {
  hasShiftAssignmentOverlap,
  normalizeRosterEntryPayload,
  normalizeShiftAssignmentPayload,
  normalizeShiftTypePayload,
  validateRosterDate,
} from "@/lib/hrms/attendance";
import { canManageShifts, canViewShifts } from "@/lib/hrms/attendance-authorization";
import type { HrmsProfile } from "@/lib/hrms/authorization";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const RESOURCE_TABLES = {
  shift_types: "attendance_shift_types",
  locations: "attendance_shift_locations",
  assignments: "employee_shift_assignments",
  roster: "shift_roster_entries",
} as const;

const LOCATION_FIELDS = ["name", "code", "company_id", "branch_id", "is_active"] as const;
const EMPLOYEE_SELECT = "employ" + "ee:employees(name,employee_code)";

type ShiftResource = keyof typeof RESOURCE_TABLES;

async function currentProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("id, role, is_active").eq("id", user.id).single();
  if (!profile?.role) return { user, profile: profile as HrmsProfile | null };
  const admin = await createAdminClient();
  const { data: rolePermissions } = await admin.from("role_permissions").select("permission_key").eq("role_key", `role.${profile.role}`);
  return { user, profile: { ...profile, permissions: rolePermissions?.map((row) => row.permission_key) ?? [] } as HrmsProfile & { permissions: string[] } };
}

function unsupportedResource(resource: unknown) {
  return NextResponse.json({ error: `Unsupported resource: ${String(resource ?? "")}` }, { status: 400 });
}

function pickFields(body: Record<string, unknown>, fields: readonly string[]) {
  return Object.fromEntries(fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
}

function normalizeLocationPayload(body: Record<string, unknown>) {
  return pickFields(body, LOCATION_FIELDS);
}

function normalizeResourcePayload(resource: ShiftResource, body: Record<string, unknown>) {
  if (resource === "shift_types") return normalizeShiftTypePayload(body);
  if (resource === "locations") return normalizeLocationPayload(body);
  if (resource === "assignments") return normalizeShiftAssignmentPayload(body);
  return normalizeRosterEntryPayload(body);
}

function selectForResource(resource: ShiftResource) {
  if (resource === "assignments") return ["*", EMPLOYEE_SELECT, "shift_type:attendance_shift_types(name,code)", "location:attendance_shift_locations(name,code)"].join(",");
  if (resource === "roster") return ["*", EMPLOYEE_SELECT, "shift_type:attendance_shift_types(name,code)", "location:attendance_shift_locations(name,code)"].join(",");
  if (resource === "locations") return ["*", "company:hr_companies(name,code)", "branch:hr_branches(name,code)"].join(",");
  return "*";
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewShifts(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const resource = (searchParams.get("resource") ?? "shift_types") as ShiftResource;
  const table = RESOURCE_TABLES[resource];
  if (!table) return unsupportedResource(resource);

  let query = supabase.from(table).select(selectForResource(resource));

  if (searchParams.get("employee_id") && ["assignments", "roster"].includes(resource)) {
    query = query.eq("employee_id", searchParams.get("employee_id"));
  }
  if (searchParams.get("from") && resource === "roster") query = query.gte("roster_date", searchParams.get("from"));
  if (searchParams.get("to") && resource === "roster") query = query.lte("roster_date", searchParams.get("to"));
  if (resource === "shift_types" || resource === "locations") query = query.order("name");
  if (resource === "assignments") query = query.order("effective_from", { ascending: false });
  if (resource === "roster") query = query.order("roster_date", { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageShifts(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const resource = body.resource as ShiftResource;
  const table = RESOURCE_TABLES[resource];
  if (!table) return unsupportedResource(resource);

  const payload = normalizeResourcePayload(resource, body);
  const validation = await validateResourcePayload(supabase, resource, payload);
  if (!validation.valid) return NextResponse.json({ error: validation.reason }, { status: 400 });
  const { data, error } = await supabase.from(table).insert({ ...payload, created_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageShifts(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const resource = body.resource as ShiftResource;
  const table = RESOURCE_TABLES[resource];
  if (!table) return unsupportedResource(resource);
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const payload = normalizeResourcePayload(resource, body);
  const { data: existing, error: existingError } = await supabase.from(table).select("*").eq("id", body.id).maybeSingle();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  const validation = await validateResourcePayload(supabase, resource, { ...existing, ...payload, id: body.id });
  if (!validation.valid) return NextResponse.json({ error: validation.reason }, { status: 400 });
  const { data, error } = await supabase.from(table).update(payload).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

async function validateResourcePayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  resource: ShiftResource,
  payload: Record<string, unknown>,
) {
  if (resource === "assignments" && payload.employee_id && payload.effective_from) {
    const { data, error } = await supabase
      .from("employee_shift_assignments")
      .select("id, employee_id, effective_from, effective_to, is_active")
      .eq("employee_id", payload.employee_id);
    if (error) return { valid: false, reason: error.message };
    if (hasShiftAssignmentOverlap(payload as any, data ?? [])) return { valid: false, reason: "Shift assignment overlaps an active assignment." };
  }

  if (resource === "roster" && payload.employee_id && payload.roster_date) {
    const { data, error } = await supabase
      .from("employee_shift_assignments")
      .select("effective_from, effective_to")
      .eq("employee_id", payload.employee_id)
      .eq("is_active", true)
      .lte("effective_from", payload.roster_date)
      .or(`effective_to.is.null,effective_to.gte.${payload.roster_date}`)
      .limit(1)
      .maybeSingle();
    if (error) return { valid: false, reason: error.message };
    if (!data) return { valid: false, reason: "Roster date requires an active shift assignment." };
    const validation = validateRosterDate(String(payload.roster_date), data);
    if (!validation.valid) return validation;
  }

  return { valid: true };
}
