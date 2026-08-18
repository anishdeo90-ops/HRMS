import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const page = readFileSync("app/(app)/hrms/team/reports/page.tsx", "utf8");
const route = readFileSync("app/api/hrms/team-reports/route.ts", "utf8");

assert(!page.includes("<Button variant=\"primary\" disabled>Run Report</Button>"), "Run Report is still hard-disabled");
assert(page.includes("fetch(\"/api/hrms/team-reports\""), "reports page must call the team reports API");
assert(page.includes("method: \"POST\""), "reports page must POST report filters");
assert(route.includes("export async function POST"), "team reports API must support downloads");

for (const key of ["left", "joining", "leave_approval", "leave_balance", "register", "monthly", "in_out", "regularization", "punch_rejection"]) {
  assert(route.includes(`"${key}"`), `missing report export: ${key}`);
}
