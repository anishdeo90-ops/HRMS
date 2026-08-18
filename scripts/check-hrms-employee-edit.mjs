import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const page = readFileSync("app/(app)/hrms/team/directory/[id]/page.tsx", "utf8");
const route = readFileSync("app/api/hrms/employees/[id]/route.ts", "utf8");

assert(route.includes("export async function PATCH"), "employee detail API must support PATCH");
assert(page.includes("Edit Employee"), "employee detail page must expose an edit action");
assert(page.includes("method: \"PATCH\""), "employee edit form must call PATCH");
assert(page.includes("/api/hrms/options"), "employee edit form must use HRMS options for assignment fields");
