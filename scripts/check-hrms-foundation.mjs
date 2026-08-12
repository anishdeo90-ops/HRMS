import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const dir = "supabase/migrations";
const file = readdirSync(dir).find((name) => name.endsWith("_hrms_foundation.sql"));
assert(file, "missing HRMS foundation migration");

const sql = readFileSync(join(dir, file), "utf8").toLowerCase();

for (const needle of [
  "create schema if not exists hrms",
  "create table if not exists public.organizations",
  "create table if not exists public.org_members",
  "create table if not exists public.organization_products",
  "create table if not exists hrms.employees",
  "create table if not exists hrms.employee_assignments",
  "create table if not exists public.entity_links",
  "create table if not exists public.entity_events",
  "create or replace view public.hrms_employee_directory",
  "with (security_invoker = true)",
  "grant select on public.hrms_employee_directory to authenticated",
  "create or replace function public.hrms_master_rows",
  "create or replace function public.hrms_save_master",
  "create or replace function public.hrms_set_master_active",
  "grant execute on function public.hrms_master_rows(text) to authenticated",
  "to authenticated",
]) {
  assert(sql.includes(needle), `migration missing: ${needle}`);
}

assert(!sql.includes("auth.role()"), "use TO authenticated, not auth.role()");
assert(!sql.includes("m.org_id = org_id"), "RLS org_id must qualify the protected table");
assert(!sql.includes("security definer"), "do not bypass RLS with SECURITY DEFINER");
assert(sql.includes("enable row level security"), "RLS must be enabled");
