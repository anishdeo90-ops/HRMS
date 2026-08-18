import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const page = readFileSync("app/(app)/hrms/me/leaves/add/page.tsx", "utf8");

for (const type of ["leave", "regularization", "on_duty", "comp_off", "wfh", "week_off_swap", "early_in_out"]) {
  assert(page.includes(`value: "${type}"`), `apply form missing request type: ${type}`);
}

assert(page.includes("Request Type"), "apply form must expose a request type dropdown");
assert(page.includes('requestType === "leave"'), "leave subtype/balance validation must only apply to leave requests");
assert(page.includes("selectedType?.annual_quota_days != null"), "unlimited leave types must not be blocked by zero balance");
assert(page.includes('/api/hrms/attendance/regularizations'), "non-leave requests must use generic approval API");
assert(page.includes('/api/hrms/leaves'), "leave requests must keep using leave API");
