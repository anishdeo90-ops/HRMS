import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const migrations = readdirSync("supabase/migrations").sort();
const source = migrations.map((name) => readFileSync(join("supabase/migrations", name), "utf8")).join("\n");
const marker = "create or replace function public.hrms_create_approval_request(payload jsonb)";
const start = source.toLowerCase().lastIndexOf(marker);
assert(start >= 0, "missing hrms_create_approval_request migration");

const latest = source.slice(start, source.toLowerCase().indexOf("create or replace function", start + marker.length));

assert(!latest.includes("case when v_manager_id is null then 'admin' else 'manager' end"), "approval routing still creates null admin approver steps");
assert(latest.includes("v_approver_id"), "approval routing must resolve a concrete approver employee");
assert(latest.includes("p.role = 'hr_manager'"), "approval routing must fall back to an HR manager employee");
assert(latest.includes("v_hr_manager_id"), "approval routing must resolve HR manager separately");
assert(latest.includes("insert into hrms.approval_steps"), "approval routing must create approval step rows");
assert(latest.includes("v_approver_source as approver_source, v_approver_id as approver_id"), "approval routing must create manager/HOD step");
assert(latest.includes("select 'admin', v_hr_manager_id"), "approval routing must also create HR manager step");
assert(latest.includes("where approver_id is not null"), "approval routing must avoid null approver steps");
