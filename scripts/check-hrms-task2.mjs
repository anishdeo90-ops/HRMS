import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const paths = [
  "app/(app)/hrms/page.tsx",
  "app/(app)/hrms/calendar/page.tsx",
  "app/(app)/hrms/onboarding",
  "app/(app)/hrms/more",
  "app/(app)/hrms/me/reimbursement",
];

function files(path) {
  if (!existsSync(path)) return [];
  const stat = readdirSync(path, { withFileTypes: true });
  return stat.flatMap((entry) => {
    const next = join(path, entry.name);
    return entry.isDirectory() ? files(next) : [next];
  });
}

for (const file of paths.flatMap((p) => (p.endsWith(".tsx") ? [p] : files(p)))) {
  if (!file.endsWith(".tsx")) continue;
  const text = readFileSync(file, "utf8");
  assert(!/DEMO_|demo-data/.test(text), `${file} still imports demo runtime data`);
}

for (const route of [
  "app/api/hrms/dashboard/route.ts",
  "app/api/hrms/onboarding/route.ts",
  "app/api/hrms/onboarding/[id]/actions/route.ts",
  "app/api/hrms/onboarding/documents/route.ts",
  "app/api/hrms/onboarding/forms/route.ts",
  "app/api/hrms/calendar/route.ts",
  "app/api/hrms/jobs/route.ts",
  "app/api/hrms/referrals/route.ts",
  "app/api/hrms/assets/route.ts",
  "app/api/hrms/announcements/route.ts",
  "app/api/hrms/expenses/route.ts",
]) {
  assert(existsSync(route), `missing ${route}`);
}

const apiSql = [
  "app/api/hrms/onboarding/route.ts",
  "app/api/hrms/onboarding/[id]/actions/route.ts",
  "app/api/hrms/onboarding/documents/route.ts",
  "app/api/hrms/onboarding/forms/route.ts",
  "app/api/hrms/referrals/route.ts",
  "app/api/hrms/assets/route.ts",
  "app/api/hrms/announcements/route.ts",
  "app/api/hrms/expenses/route.ts",
].map((route) => readFileSync(route, "utf8")).join("\n").toLowerCase();

const task2 = "20260813060000_hrms_task2_onboarding_more.sql";
assert(existsSync(join("supabase/migrations", task2)), "missing Task 2 HRMS migration");
const sql = readFileSync(join("supabase/migrations", task2), "utf8").toLowerCase();

assert(!sql.includes("create table if not exists hrms.jobs"), "HRMS must not own a jobs table");
assert(sql.includes("public.hrms_job_openings") && sql.includes("from public.jobs"), "jobs view must read ATS tables");
assert(apiSql.includes("event("), "mutations must write entity_events");
assert(apiSql.includes("link("), "cross-product mutations must write entity_links");
assert(!sql.includes("security definer"), "do not bypass RLS with SECURITY DEFINER");
assert(!sql.includes("auth.role()"), "use authenticated grants, not auth.role()");
