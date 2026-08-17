import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const server = readFileSync("lib/supabase/server.ts", "utf8");
assert(server.includes('import { cache } from "react";'), "server auth helpers must use React request cache");
assert(server.includes("getAuthenticatedProfile = cache("), "missing cached authenticated profile helper");

for (const path of ["app/(app)/layout.tsx", "app/(app)/hrms/layout.tsx"]) {
  const source = readFileSync(path, "utf8");
  assert(source.includes("getAuthenticatedProfile"), `${path} must use the cached profile helper`);
  assert(!source.includes("auth.getUser("), `${path} must not repeat auth.getUser()`);
  assert(!source.includes('from("profiles")'), `${path} must not repeat profile lookup`);
}
