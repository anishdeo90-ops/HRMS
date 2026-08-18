import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const migration = readdirSync("supabase/migrations").find((name) =>
  name.endsWith("_hrms_page_wiring.sql")
);
assert(migration, "missing HRMS page wiring migration");

const sql = readFileSync(join("supabase/migrations", migration), "utf8").toLowerCase();
for (const needle of [
  "create table if not exists hrms.attendance_days",
  "create table if not exists hrms.attendance_punches",
  "create table if not exists hrms.leave_types",
  "create table if not exists hrms.leave_requests",
  "create table if not exists hrms.approval_requests",
  "create table if not exists hrms.approval_steps",
  "create table if not exists hrms.tickets",
  "create table if not exists hrms.separations",
  "public.entity_events",
  "public.entity_links",
  "to authenticated",
]) {
  assert(sql.includes(needle), `migration missing: ${needle}`);
}

for (const needle of [
  "join ctx on ctx.org_id = t.org_id",
  "raised_by_id",
  "'ticket.created'",
  "public.entity_events",
]) {
  assert(sql.includes(needle), `ticket audit wiring missing: ${needle}`);
}

assert(!sql.includes("ctx.employee_id = t.raised_by_id"), "team tickets must stay org-wide, not only mine");

assert(!sql.includes("security definer"), "do not bypass RLS with SECURITY DEFINER");
assert(!sql.includes("auth.role()"), "use TO authenticated, not auth.role()");

for (const route of [
  "app/api/hrms/me/route.ts",
  "app/api/hrms/attendance/route.ts",
  "app/api/hrms/attendance/punches/route.ts",
  "app/api/hrms/attendance/manual/route.ts",
  "app/api/hrms/attendance/regularizations/route.ts",
  "app/api/hrms/leaves/route.ts",
  "app/api/hrms/leaves/[id]/route.ts",
  "app/api/hrms/approvals/route.ts",
  "app/api/hrms/approvals/[id]/route.ts",
  "app/api/hrms/tickets/route.ts",
  "app/api/hrms/separations/route.ts",
]) {
  assert(existsSync(route), `missing route: ${route}`);
}

for (const path of [
  "app/(app)/hrms/me/in-out/page.tsx",
  "app/(app)/hrms/me/leaves/page.tsx",
  "app/(app)/hrms/me/leaves/add/page.tsx",
  "app/(app)/hrms/me/tickets/page.tsx",
  "app/(app)/hrms/team/in-out/page.tsx",
  "app/(app)/hrms/team/regularization/page.tsx",
  "app/(app)/hrms/team/approvals/page.tsx",
  "app/(app)/hrms/team/pending-tasks/page.tsx",
  "app/(app)/hrms/team/separation/page.tsx",
  "app/(app)/hrms/team/tickets/page.tsx",
  "app/(app)/hrms/team/reports/page.tsx",
]) {
  const source = readFileSync(path, "utf8");
  assert(!/DEMO_|demo-data/.test(source), `${path} still imports runtime demo data`);
  assert(/\/api\/hrms\//.test(source), `${path} is not wired to HRMS API`);
}

{
  const source = readFileSync("app/(app)/hrms/team/directory/[id]/page.tsx", "utf8");
  assert(!source.includes('useHrmsData<Separation[]>("/api/hrms/separations"'), "directory detail must unwrap hrms_separations().separations");
  assert(source.includes("Array.isArray(separationData)"), "directory detail must tolerate older separation array payloads");
  assert(!source.includes('useHrmsData<Ticket[]>("/api/hrms/tickets"'), "directory detail must unwrap hrms_tickets().tickets");
}

{
  const nav = readFileSync("lib/hrms/nav.ts", "utf8");
  assert(nav.includes('/hrms/me/tickets'), "Me navigation must include tickets");
}
