import { createAdminClient } from "@/lib/supabase/server";

type Admin = Awaited<ReturnType<typeof createAdminClient>>;
type Id = string | null | undefined;

function clean(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] ?? "Employee",
    last_name: parts.slice(1).join(" ") || parts[0] || "Employee",
    full_name: parts.join(" ") || "Employee",
  };
}

function code(prefix: string, id: string) {
  return `${prefix}-${id.replace(/-/g, "").toUpperCase()}`;
}

async function actorOrg(supabase: Admin, actorProfileId: string) {
  const { data: member } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("profile_id", actorProfileId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return member?.org_id as string | undefined;
}

async function ensureMaster(supabase: Admin, table: "branches" | "departments" | "designations", orgId: string, name: Id) {
  const value = clean(name);
  if (!value) return null;
  const existing = await supabase.schema("hrms").from(table).select("id").eq("org_id", orgId).eq("name", value).maybeSingle();
  if (existing.data?.id) return existing.data.id as string;
  const inserted = await supabase.schema("hrms").from(table).insert({ org_id: orgId, name: value, is_active: true }).select("id").single();
  if (inserted.error) throw inserted.error;
  return inserted.data.id as string;
}

async function ensureAssignment(
  supabase: Admin,
  orgId: string,
  employeeId: string,
  fields: {
    branch_id?: Id;
    department_id?: Id;
    designation_id?: Id;
    reporting_manager_id?: Id;
    effective_from?: Id;
  }
) {
  const row = {
    org_id: orgId,
    employee_id: employeeId,
    branch_id: fields.branch_id ?? null,
    department_id: fields.department_id ?? null,
    designation_id: fields.designation_id ?? null,
    reporting_manager_id: fields.reporting_manager_id ?? null,
    effective_from: fields.effective_from ?? new Date().toISOString().slice(0, 10),
    is_primary: true,
    effective_to: null,
  };
  const current = await supabase
    .schema("hrms")
    .from("employee_assignments")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("is_primary", true)
    .is("effective_to", null)
    .maybeSingle();
  const saved = current.data?.id
    ? await supabase.schema("hrms").from("employee_assignments").update(row).eq("id", current.data.id).select("id").single()
    : await supabase.schema("hrms").from("employee_assignments").insert(row).select("id").single();
  if (saved.error) throw saved.error;
}

export async function ensureHrmsEmployeeForProfile(profileId: string, actorProfileId = profileId) {
  const supabase = await createAdminClient();
  const orgId = await actorOrg(supabase, actorProfileId);
  if (!orgId) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,name,email,role,department,is_active")
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw error;
  if (!profile?.email) return null;

  await supabase.from("org_members").upsert({
    org_id: orgId,
    profile_id: profile.id,
    role_key: profile.role ?? "employee",
    is_active: profile.is_active !== false,
  }, { onConflict: "org_id,profile_id" });

  const names = splitName(clean(profile.name) ?? profile.email.split("@")[0]);
  const designationId = await ensureMaster(supabase, "designations", orgId, String(profile.role ?? "employee").replace(/_/g, " "));
  const departmentId = await ensureMaster(supabase, "departments", orgId, profile.department);
  const employee = await upsertEmployee(supabase, orgId, {
    profile_id: profile.id,
    employee_code: code("USR", profile.id),
    ...names,
    work_email: profile.email.toLowerCase(),
    status: profile.is_active === false ? "separated" : "active",
    custom_fields: { source: "ats_profile", role: profile.role ?? null },
    created_by: actorProfileId,
  });
  await ensureAssignment(supabase, orgId, employee.id, { designation_id: designationId, department_id: departmentId });
  return employee;
}

export async function ensureHrmsEmployeeForJoinedCandidate(candidateId: string, actorProfileId: string) {
  const supabase = await createAdminClient();
  const orgId = await actorOrg(supabase, actorProfileId);
  if (!orgId) return null;

  const { data: candidate, error } = await supabase.from("candidates").select("*").eq("id", candidateId).maybeSingle();
  if (error) throw error;
  if (!candidate) return null;
  const joined = ["joined", "active employee"].includes(String(candidate.final_status ?? "").toLowerCase()) || candidate.doj_actual || candidate.doj;
  if (!joined) return null;

  const [designationMaster, siteMaster, job] = await Promise.all([
    candidate.designation_id ? supabase.from("masters").select("name").eq("id", candidate.designation_id).maybeSingle() : null,
    candidate.site_id ? supabase.from("masters").select("name").eq("id", candidate.site_id).maybeSingle() : null,
    candidate.job_id ? supabase.from("jobs").select("title,department,designation_id,site_id").eq("id", candidate.job_id).maybeSingle() : null,
  ]);
  const [jobDesignation, jobSite, manager] = await Promise.all([
    job?.data?.designation_id ? supabase.from("masters").select("name").eq("id", job.data.designation_id).maybeSingle() : null,
    job?.data?.site_id ? supabase.from("masters").select("name").eq("id", job.data.site_id).maybeSingle() : null,
    candidate.hr_id ? ensureHrmsEmployeeForProfile(candidate.hr_id, actorProfileId) : null,
  ]);

  const names = splitName(clean(candidate.name) ?? "Joined Candidate");
  const workEmail = (clean(candidate.email) ?? `candidate-${candidate.id}@ats.local`).toLowerCase();
  const designationId = await ensureMaster(supabase, "designations", orgId, designationMaster?.data?.name ?? jobDesignation?.data?.name ?? candidate.current_designation ?? job?.data?.title);
  const branchId = await ensureMaster(supabase, "branches", orgId, siteMaster?.data?.name ?? jobSite?.data?.name);
  const departmentId = await ensureMaster(supabase, "departments", orgId, job?.data?.department);
  const employee = await upsertEmployee(supabase, orgId, {
    source_candidate_id: candidate.id,
    employee_code: clean(candidate.staffingo_emp_id) ?? code("ATS", candidate.id),
    ...names,
    work_email: workEmail,
    mobile: clean(candidate.mobile),
    date_of_joining: candidate.doj_actual ?? candidate.doj ?? new Date().toISOString().slice(0, 10),
    status: "active",
    custom_fields: {
      source: "ats_candidate",
      ats_candidate_id: candidate.id,
      ats_job_id: candidate.job_id ?? null,
      current_designation: candidate.current_designation ?? null,
      current_location: candidate.current_location ?? null,
      offered_salary: candidate.offered_salary ?? null,
    },
    created_by: actorProfileId,
  });

  await ensureAssignment(supabase, orgId, employee.id, {
    branch_id: branchId,
    department_id: departmentId,
    designation_id: designationId,
    reporting_manager_id: manager?.id ?? null,
    effective_from: candidate.doj_actual ?? candidate.doj,
  });
  await supabase.from("entity_links").upsert({
    org_id: orgId,
    source_product: "ats",
    source_entity_type: "candidate",
    source_entity_id: candidate.id,
    target_product: "hrms",
    target_entity_type: "employee",
    target_entity_id: employee.id,
    link_type: "converted_to_employee",
    metadata: { final_status: candidate.final_status ?? null },
    created_by: actorProfileId,
  }, { onConflict: "org_id,source_product,source_entity_type,source_entity_id,target_product,target_entity_type,target_entity_id,link_type" });
  await supabase.from("entity_events").insert({
    org_id: orgId,
    product_key: "hrms",
    entity_type: "employee",
    entity_id: employee.id,
    event_type: "employee.synced_from_ats",
    summary: "Employee synced from joined ATS candidate",
    metadata: { candidate_id: candidate.id },
    actor_profile_id: actorProfileId,
  });
  return employee;
}

async function upsertEmployee(supabase: Admin, orgId: string, row: Record<string, unknown>) {
  const existing = row.source_candidate_id
    ? await supabase.schema("hrms").from("employees").select("id").eq("org_id", orgId).eq("source_candidate_id", row.source_candidate_id).maybeSingle()
    : await supabase.schema("hrms").from("employees").select("id").eq("org_id", orgId).eq("profile_id", row.profile_id).maybeSingle();
  const fallback = !existing.data?.id && row.work_email
    ? await supabase.schema("hrms").from("employees").select("id").eq("org_id", orgId).eq("work_email", row.work_email).maybeSingle()
    : null;
  const id = existing.data?.id ?? fallback?.data?.id;
  const updates = { ...row };
  delete updates.employee_code;
  const saved = id
    ? await supabase.schema("hrms").from("employees").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select("id").single()
    : await supabase.schema("hrms").from("employees").insert({ org_id: orgId, ...row }).select("id").single();
  if (saved.error) throw saved.error;
  return saved.data as { id: string };
}
