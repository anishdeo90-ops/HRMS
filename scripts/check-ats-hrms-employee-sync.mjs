import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

const helper = "lib/hrms/ats-employee-sync.ts";
assert(existsSync(helper), "missing shared ATS -> HRMS employee sync helper");

const candidates = readFileSync("app/api/candidates/[id]/route.ts", "utf8");
const offers = readFileSync("app/api/candidates/[id]/offers/route.ts", "utf8");
const onboarding = readFileSync("app/api/hrms/onboarding/[id]/actions/route.ts", "utf8");
const users = readFileSync("app/api/users/route.ts", "utf8");

for (const [name, source] of [
  ["candidate PATCH", candidates],
  ["offer PATCH", offers],
  ["onboarding join", onboarding],
]) {
  assert(source.includes("ensureHrmsEmployeeForJoinedCandidate"), `${name} must sync joined ATS candidates into HRMS`);
}

assert(users.includes("ensureHrmsEmployeeForProfile"), "user create/update must sync ATS users into HRMS employees");
assert(!onboarding.includes("joined-${data.id}@example.invalid"), "onboarding join must not create placeholder employee emails");
