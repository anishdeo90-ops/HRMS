import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const joined = (candidate) =>
  !candidate.is_deleted &&
  (["joined", "active employee"].includes(String(candidate.final_status ?? "").toLowerCase()) ||
    candidate.doj_actual ||
    candidate.doj);

const [{ data: candidates, error: candidateError }, { data: employees, error: employeeError }, { data: profiles, error: profileError }] =
  await Promise.all([
    supabase.from("candidates").select("id,final_status,doj,doj_actual,is_deleted"),
    supabase.schema("hrms").from("employees").select("id,profile_id,source_candidate_id"),
    supabase.from("profiles").select("id,email"),
  ]);

if (candidateError) throw candidateError;
if (employeeError) throw employeeError;
if (profileError) throw profileError;

const employeeCandidateIds = new Set((employees ?? []).map((employee) => employee.source_candidate_id).filter(Boolean));
const employeeProfileIds = new Set((employees ?? []).map((employee) => employee.profile_id).filter(Boolean));
const joinedCandidates = (candidates ?? []).filter(joined);
const profilesWithEmail = (profiles ?? []).filter((profile) => profile.email);
const missingCandidates = joinedCandidates.filter((candidate) => !employeeCandidateIds.has(candidate.id));
const missingProfiles = profilesWithEmail.filter((profile) => !employeeProfileIds.has(profile.id));

assert.equal(missingCandidates.length, 0, `joined candidates missing HRMS employees: ${missingCandidates.map((c) => c.id).join(", ")}`);
assert.equal(missingProfiles.length, 0, `profiles missing HRMS employees: ${missingProfiles.map((p) => p.id).join(", ")}`);

console.log(`Verified ${joinedCandidates.length} joined candidates and ${profilesWithEmail.length} profiles in HRMS.`);
