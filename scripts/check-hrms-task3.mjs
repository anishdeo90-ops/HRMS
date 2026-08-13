import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const owned = [
  "app/(app)/hrms/settings",
  "app/(app)/hrms/performance",
  "app/(app)/hrms/me/ranking/page.tsx",
];

for (const path of owned) {
  const text = existsSync(path)
    ? statSync(path).isDirectory()
      ? readdirSync(path, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
        .map((entry) => readFileSync(join(entry.parentPath, entry.name), "utf8"))
        .join("\n")
      : readFileSync(path, "utf8")
    : readFileSync(path, "utf8");
  assert(!/DEMO_|demo-data/.test(text), `${path} still imports demo HRMS data`);
}

const requiredRoutes = [
  "app/api/hrms/settings/company-profile/route.ts",
  "app/api/hrms/settings/system-settings/route.ts",
  "app/api/hrms/settings/policies/route.ts",
  "app/api/hrms/settings/permissions/route.ts",
  "app/api/hrms/settings/email-templates/route.ts",
  "app/api/hrms/settings/cron-jobs/route.ts",
  "app/api/hrms/settings/leave-types/route.ts",
  "app/api/hrms/settings/holidays/route.ts",
  "app/api/hrms/settings/achievements/route.ts",
  "app/api/hrms/settings/activity-logs/route.ts",
  "app/api/hrms/settings/face-identities/route.ts",
  "app/api/hrms/settings/shifts/route.ts",
  "app/api/hrms/settings/roster/route.ts",
  "app/api/hrms/settings/general/route.ts",
  "app/api/hrms/performance/route.ts",
  "app/api/hrms/performance/goals/route.ts",
  "app/api/hrms/performance/kra/route.ts",
  "app/api/hrms/performance/appraisals/route.ts",
  "app/api/hrms/performance/cycles/route.ts",
  "app/api/hrms/performance/templates/route.ts",
];

for (const route of requiredRoutes) {
  assert(existsSync(route), `missing route: ${route}`);
}

const migrations = readdirSync("supabase/migrations")
  .filter((name) => name.endsWith(".sql"))
  .map((name) => readFileSync(join("supabase/migrations", name), "utf8").toLowerCase())
  .join("\n");

for (const needle of [
  "create table if not exists hrms.role_permissions",
  "create table if not exists hrms.announcement_categories",
  "create table if not exists hrms.expense_types",
  "create table if not exists hrms.ranking_snapshots",
  "public.entity_events",
  "hrms_has_permission",
  "hrms_settings_resource",
  "hrms_performance_resource",
]) {
  assert(migrations.includes(needle), `migration missing: ${needle}`);
}

assert(!migrations.includes("security definer"), "do not use SECURITY DEFINER");
assert(!migrations.includes("auth.role()"), "use TO authenticated, not auth.role()");
