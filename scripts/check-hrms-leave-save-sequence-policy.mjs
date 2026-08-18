import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const migration = readdirSync("supabase/migrations").find((name) =>
  name.endsWith("_hrms_member_sequence_codes.sql")
);
assert(migration, "missing HRMS member sequence policy migration");

const sql = readFileSync(join("supabase/migrations", migration), "utf8").toLowerCase();
assert(sql.includes("public_sequences_insert_member"), "missing member insert policy for public.sequences");
assert(sql.includes("public_sequences_update_member"), "missing member update policy for public.sequences");
assert(sql.includes("for insert to authenticated"), "sequence insert policy must be authenticated-only");
assert(sql.includes("for update to authenticated"), "sequence update policy must be authenticated-only");
assert(sql.includes("public.org_members"), "sequence policies must be scoped to org membership");
assert(!sql.includes("security definer"), "do not bypass RLS with SECURITY DEFINER");
