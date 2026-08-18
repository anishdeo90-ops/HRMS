import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("hrms_employee_directory")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "42501" ? 403 : 500 });
  if (!data) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "hr_manager"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const employeePatch: Record<string, unknown> = {};
  const assignmentPatch: Record<string, unknown> = {};

  for (const [key, column] of [
    ["name", "full_name"],
    ["email", "work_email"],
    ["mobile", "mobile"],
    ["date_of_joining", "date_of_joining"],
    ["date_of_birth", "date_of_birth"],
    ["gender", "gender"],
    ["blood_group", "blood_group"],
    ["marital_status", "marital_status"],
    ["personal_email", "personal_email"],
    ["current_address", "current_address"],
    ["permanent_address", "permanent_address"],
    ["status", "status"],
  ]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) employeePatch[column] = body[key] || null;
  }

  for (const [key, column] of [
    ["branch_id", "branch_id"],
    ["department_id", "department_id"],
    ["designation_id", "designation_id"],
    ["employment_type_id", "employment_type_id"],
    ["reporting_manager_id", "reporting_manager_id"],
    ["shift_id", "shift_id"],
  ]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) assignmentPatch[column] = body[key] || null;
  }

  if (typeof employeePatch.full_name === "string") {
    const parts = employeePatch.full_name.trim().split(/\s+/);
    employeePatch.first_name = parts[0] || employeePatch.full_name;
    employeePatch.last_name = parts.slice(1).join(" ") || parts[0] || employeePatch.full_name;
  }
  if (typeof employeePatch.work_email === "string") employeePatch.work_email = employeePatch.work_email.toLowerCase();

  if (Object.keys(employeePatch).length > 0) {
    const { error } = await supabase.schema("hrms").from("employees").update(employeePatch).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === "42501" ? 403 : 500 });
  }

  if (Object.keys(assignmentPatch).length > 0) {
    const { data: current, error: currentError } = await supabase
      .schema("hrms")
      .from("employee_assignments")
      .select("id")
      .eq("employee_id", params.id)
      .eq("is_primary", true)
      .is("effective_to", null)
      .maybeSingle();
    if (currentError) return NextResponse.json({ error: currentError.message }, { status: currentError.code === "42501" ? 403 : 500 });

    let orgId = "";
    if (!current?.id) {
      const { data: employeeRow, error: employeeError } = await supabase.schema("hrms").from("employees").select("org_id").eq("id", params.id).maybeSingle();
      if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: employeeError.code === "42501" ? 403 : 500 });
      orgId = employeeRow?.org_id ?? "";
    }

    const saved = current?.id
      ? await supabase.schema("hrms").from("employee_assignments").update(assignmentPatch).eq("id", current.id)
      : await supabase.schema("hrms").from("employee_assignments").insert({ org_id: orgId, employee_id: params.id, effective_from: new Date().toISOString().slice(0, 10), ...assignmentPatch });
    if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: saved.error.code === "42501" ? 403 : 500 });
  }

  const { data, error } = await supabase.from("hrms_employee_directory").select("*").eq("id", params.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "42501" ? 403 : 500 });
  return NextResponse.json({ data });
}
