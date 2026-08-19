import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const migrations = readdirSync("supabase/migrations")
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(join("supabase/migrations", name), "utf8").toLowerCase())
  .join("\n");

function latestFunction(name) {
  const marker = `create or replace function ${name}`.toLowerCase();
  const start = migrations.lastIndexOf(marker);
  assert(start >= 0, `missing function: ${name}`);
  const end = migrations.indexOf("\n$$;", start);
  assert(end >= 0, `unterminated function: ${name}`);
  return migrations.slice(start, end);
}

for (const needle of [
  "create or replace function public.hrms_performance_scope_employee_ids()",
  "add column if not exists department_id uuid",
  "add column if not exists designation_id uuid",
  "resource_key = 'employees'",
  "join public.hrms_performance_scope_employee_ids() scope",
  "hrms_performance_employee_in_scope",
]) {
  assert(migrations.includes(needle), `performance scope migration missing: ${needle}`);
}

const resourceFunction = latestFunction("public.hrms_performance_resource");
assert(!resourceFunction.includes("v_manager"), "performance resource still computes broad manager visibility");
assert(!resourceFunction.includes("or g.employee_id = v_me"), "goals still use self-or-manager filter");
assert(!resourceFunction.includes("or a.employee_id = v_me"), "appraisals still use self-or-manager filter");
assert(!resourceFunction.includes("or r.employee_id = v_me"), "ranking still uses self-or-manager filter");

assert(existsSync("app/api/hrms/performance/employees/route.ts"), "missing scoped performance employee route");

const goalsPage = readFileSync("app/(app)/hrms/performance/goals/page.tsx", "utf8");
assert(goalsPage.includes('/api/hrms/performance/employees'), "goals page must use scoped employee picker");
assert(!goalsPage.includes('/api/hrms/employees'), "goals page still uses broad HRMS employees endpoint");
assert(!goalsPage.includes('title: "New Goal"'), "goals form still submits hard-coded goal data");

const kraPage = readFileSync("app/(app)/hrms/performance/kra/page.tsx", "utf8");
assert(kraPage.includes('/api/hrms/performance/employees'), "KRA page must derive scoped departments/designations");
assert(!kraPage.includes('/api/hrms/options'), "KRA page still uses broad HRMS options endpoint");
assert(!kraPage.includes('kpi_name: "New KPI"'), "KRA form still submits hard-coded KPI data");
