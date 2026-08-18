import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const clean = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};
const splitName = (name) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] ?? "Employee",
    last_name: parts.slice(1).join(" ") || parts[0] || "Employee",
    full_name: parts.join(" ") || "Employee",
  };
};
const code = (prefix, id) => `${prefix}-${id.replace(/-/g, "").toUpperCase()}`;
const isJoined = (candidate) =>
  ["joined", "active employee"].includes(String(candidate.final_status ?? "").toLowerCase()) ||
  candidate.doj_actual ||
  candidate.doj;

async function maybeSingle(query) {
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureMaster(table, orgId, name) {
  const value = clean(name);
  if (!value) return null;
  const existing = await maybeSingle(supabase.schema("hrms").from(table).select("id").eq("org_id", orgId).eq("name", value));
  if (existing?.id) return existing.id;
  const { data, error } = await supabase.schema("hrms").from(table).insert({ org_id: orgId, name: value, is_active: true }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function upsertEmployee(orgId, row) {
  const existing = row.source_candidate_id
    ? await maybeSingle(supabase.schema("hrms").from("employees").select("id").eq("org_id", orgId).eq("source_candidate_id", row.source_candidate_id))
    : await maybeSingle(supabase.schema("hrms").from("employees").select("id").eq("org_id", orgId).eq("profile_id", row.profile_id));
  const fallback = !existing?.id && row.work_email
    ? await maybeSingle(supabase.schema("hrms").from("employees").select("id").eq("org_id", orgId).eq("work_email", row.work_email))
    : null;
  const id = existing?.id ?? fallback?.id;
  const updates = { ...row };
  delete updates.employee_code;
  const saved = id
    ? await supabase.schema("hrms").from("employees").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select("id").single()
    : await supabase.schema("hrms").from("employees").insert({ org_id: orgId, ...row }).select("id").single();
  if (saved.error) throw saved.error;
  return saved.data;
}

async function ensureAssignment(orgId, employeeId, row) {
  const current = await maybeSingle(
    supabase.schema("hrms").from("employee_assignments").select("id").eq("employee_id", employeeId).eq("is_primary", true).is("effective_to", null)
  );
  const payload = {
    org_id: orgId,
    employee_id: employeeId,
    branch_id: row.branch_id ?? null,
    department_id: row.department_id ?? null,
    designation_id: row.designation_id ?? null,
    reporting_manager_id: row.reporting_manager_id ?? null,
    effective_from: row.effective_from ?? new Date().toISOString().slice(0, 10),
    is_primary: true,
    effective_to: null,
  };
  const saved = current?.id
    ? await supabase.schema("hrms").from("employee_assignments").update(payload).eq("id", current.id)
    : await supabase.schema("hrms").from("employee_assignments").insert(payload);
  if (saved.error) throw saved.error;
}

async function main() {
  const org = await maybeSingle(supabase.from("organizations").select("id").eq("slug", "hirerabbits"));
  if (!org?.id) throw new Error("HireRabbits organization not found");

  const { data: profiles, error: profileError } = await supabase.from("profiles").select("id,name,email,role,department,is_active");
  if (profileError) throw profileError;
  let profileCount = 0;
  for (const profile of profiles ?? []) {
    if (!profile.email) continue;
    await supabase.from("org_members").upsert({
      org_id: org.id,
      profile_id: profile.id,
      role_key: profile.role ?? "employee",
      is_active: profile.is_active !== false,
    }, { onConflict: "org_id,profile_id" });
    const names = splitName(clean(profile.name) ?? profile.email.split("@")[0]);
    const employee = await upsertEmployee(org.id, {
      profile_id: profile.id,
      employee_code: code("USR", profile.id),
      ...names,
      work_email: profile.email.toLowerCase(),
      status: profile.is_active === false ? "separated" : "active",
      custom_fields: { source: "ats_profile", role: profile.role ?? null },
      created_by: profile.id,
    });
    const designationId = await ensureMaster("designations", org.id, String(profile.role ?? "employee").replace(/_/g, " "));
    const departmentId = await ensureMaster("departments", org.id, profile.department);
    await ensureAssignment(org.id, employee.id, { designation_id: designationId, department_id: departmentId });
    profileCount += 1;
  }

  const { data: candidates, error: candidateError } = await supabase
    .from("candidates")
    .select("id,name,email,mobile,final_status,doj,doj_actual,staffingo_emp_id,current_designation,current_location,offered_salary,designation_id,site_id,job_id,hr_id,is_deleted");
  if (candidateError) throw candidateError;
  let candidateCount = 0;
  for (const candidate of (candidates ?? []).filter((c) => !c.is_deleted && isJoined(c))) {
    const [designation, site, job] = await Promise.all([
      candidate.designation_id ? maybeSingle(supabase.from("masters").select("name").eq("id", candidate.designation_id)) : null,
      candidate.site_id ? maybeSingle(supabase.from("masters").select("name").eq("id", candidate.site_id)) : null,
      candidate.job_id ? maybeSingle(supabase.from("jobs").select("title,department,designation_id,site_id").eq("id", candidate.job_id)) : null,
    ]);
    const [jobDesignation, jobSite, manager] = await Promise.all([
      job?.designation_id ? maybeSingle(supabase.from("masters").select("name").eq("id", job.designation_id)) : null,
      job?.site_id ? maybeSingle(supabase.from("masters").select("name").eq("id", job.site_id)) : null,
      candidate.hr_id ? maybeSingle(supabase.schema("hrms").from("employees").select("id").eq("profile_id", candidate.hr_id)) : null,
    ]);
    const names = splitName(clean(candidate.name) ?? "Joined Candidate");
    const employee = await upsertEmployee(org.id, {
      source_candidate_id: candidate.id,
      employee_code: clean(candidate.staffingo_emp_id) ?? code("ATS", candidate.id),
      ...names,
      work_email: (clean(candidate.email) ?? `candidate-${candidate.id}@ats.local`).toLowerCase(),
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
      created_by: candidate.hr_id ?? null,
    });
    await ensureAssignment(org.id, employee.id, {
      branch_id: await ensureMaster("branches", org.id, site?.name ?? jobSite?.name),
      department_id: await ensureMaster("departments", org.id, job?.department),
      designation_id: await ensureMaster("designations", org.id, designation?.name ?? jobDesignation?.name ?? candidate.current_designation ?? job?.title),
      reporting_manager_id: manager?.id ?? null,
      effective_from: candidate.doj_actual ?? candidate.doj,
    });
    await supabase.from("entity_links").upsert({
      org_id: org.id,
      source_product: "ats",
      source_entity_type: "candidate",
      source_entity_id: candidate.id,
      target_product: "hrms",
      target_entity_type: "employee",
      target_entity_id: employee.id,
      link_type: "converted_to_employee",
      metadata: { final_status: candidate.final_status ?? null },
      created_by: candidate.hr_id ?? null,
    }, { onConflict: "org_id,source_product,source_entity_type,source_entity_id,target_product,target_entity_type,target_entity_id,link_type" });
    candidateCount += 1;
  }

  console.log(`Backfilled ${profileCount} profiles and ${candidateCount} joined candidates.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
