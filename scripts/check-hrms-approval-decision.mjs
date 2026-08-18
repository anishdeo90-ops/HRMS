import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const migration = readdirSync("supabase/migrations").find((name) =>
  name.endsWith("_hrms_fix_approval_decision_params.sql")
);
assert(migration, "missing approval decision fix migration");

const sql = readFileSync(join("supabase/migrations", migration), "utf8");
assert(sql.includes("create or replace function public.hrms_decide_approval"), "migration must replace approval RPC");
assert(sql.includes("s.request_id = hrms_decide_approval.request_id"), "approval step update must qualify request_id column");
assert(sql.includes("hrms_decide_approval.decision"), "approval RPC must qualify decision parameter");
assert(sql.includes("hrms_decide_approval.comment"), "approval RPC must qualify comment parameter");
assert(!sql.toLowerCase().includes("security definer"), "do not bypass RLS with SECURITY DEFINER");

const page = readFileSync("app/(app)/hrms/team/approvals/page.tsx", "utf8");
assert(page.includes("{selected.length > 0 &&"), "bulk approve/reject buttons should render only after row selection");
