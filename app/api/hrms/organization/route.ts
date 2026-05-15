import { NextRequest, NextResponse } from "next/server";
import { canManageDepartmentApprovers, canManageOrganization, type HrmsProfile } from "@/lib/hrms/authorization";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const RESOURCE_TABLES = {
  companies: "hr_companies",
  branches: "hr_branches",
  departments: "hr_departments",
  grades: "hr_grades",
  employment_types: "hr_employment_types",
  department_approvers: "department_approvers",
} as const;

type OrganizationResource = keyof typeof RESOURCE_TABLES;

const REQUIRED_FIELDS: Record<OrganizationResource, string[]> = {
  companies: ["name", "code"],
  branches: ["company_id", "name", "code"],
  departments: ["company_id", "name", "code"],
  grades: ["name", "code"],
  employment_types: ["name", "code"],
  department_approvers: ["department_id", "approver_employee_id", "approval_scope"],
};

function unsupportedResource(resource: unknown) {
  return NextResponse.json({ error: `Unsupported resource: ${String(resource ?? "")}` }, { status: 400 });
}

async function currentProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  return { user, profile: profile as HrmsProfile | null };
}

function ensureFields(resource: OrganizationResource, body: Record<string, unknown>) {
  const missing = REQUIRED_FIELDS[resource].filter((field) => !body[field]);
  return missing.length ? `Missing required fields: ${missing.join(", ")}` : null;
}

function canWriteResource(profile: HrmsProfile | null, resource: OrganizationResource) {
  return resource === "department_approvers"
    ? canManageDepartmentApprovers(profile)
    : canManageOrganization(profile);
}

export async function GET() {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageOrganization(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const admin = await createAdminClient();

  const [
    companies,
    branches,
    departments,
    grades,
    employmentTypes,
    departmentApprovers,
    managerOptions,
  ] = await Promise.all([
    admin.from("hr_companies").select("*").order("name"),
    admin.from("hr_branches").select("*").order("name"),
    admin.from("hr_departments").select("*").order("name"),
    admin.from("hr_grades").select("*").order("sort_order").order("name"),
    admin.from("hr_employment_types").select("*").order("name"),
    admin.from("department_approvers").select("*, department:hr_departments(name), approver:employees(name, employee_code)").order("created_at", { ascending: false }),
    admin.from("employees").select("id, employee_code, name, department_id").eq("is_active", true).order("name"),
  ]);

  const error = [companies, branches, departments, grades, employmentTypes, departmentApprovers, managerOptions].find((result) => result.error)?.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: {
      companies: companies.data ?? [],
      branches: branches.data ?? [],
      departments: departments.data ?? [],
      grades: grades.data ?? [],
      employment_types: employmentTypes.data ?? [],
      department_approvers: departmentApprovers.data ?? [],
      manager_options: managerOptions.data ?? [],
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const resource = body.resource as OrganizationResource;
  const table = RESOURCE_TABLES[resource];
  if (!table) return unsupportedResource(resource);
  if (!canWriteResource(profile, resource)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const fieldError = ensureFields(resource, body);
  if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 });

  const { resource: _resource, id: _id, ...payload } = body;
  const { data, error } = await supabase
    .from(table)
    .insert({ ...payload, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const resource = body.resource as OrganizationResource;
  const table = RESOURCE_TABLES[resource];
  if (!table) return unsupportedResource(resource);
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!canWriteResource(profile, resource)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { resource: _resource, id, created_at: _createdAt, created_by: _createdBy, ...payload } = body;
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
