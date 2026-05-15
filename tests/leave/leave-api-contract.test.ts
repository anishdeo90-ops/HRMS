import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readRoute(path: string) {
  const fullPath = join(repoRoot, path);
  assert.equal(existsSync(fullPath), true, `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

describe("Leave API route source contract", () => {
  it("adds setup, balances, application, approval, ledger, compensatory, and encashment routes", () => {
    const routes = [
      "app/api/hrms/leave/setup/route.ts",
      "app/api/hrms/leave/balances/route.ts",
      "app/api/hrms/leave/applications/route.ts",
      "app/api/hrms/leave/applications/[id]/route.ts",
      "app/api/hrms/leave/approvals/route.ts",
      "app/api/hrms/leave/ledger/route.ts",
      "app/api/hrms/leave/compensatory/route.ts",
      "app/api/hrms/leave/encashments/route.ts",
    ];

    for (const route of routes) readRoute(route);
  });

  it("resolves target employee scope before employee-scoped leave reads", () => {
    for (const route of [
      "app/api/hrms/leave/balances/route.ts",
      "app/api/hrms/leave/applications/route.ts",
      "app/api/hrms/leave/ledger/route.ts",
      "app/api/hrms/leave/compensatory/route.ts",
      "app/api/hrms/leave/encashments/route.ts",
    ]) {
      const source = readRoute(route);
      assert.match(source, /resolveLeaveTargetEmployee/, `${route} should resolve scoped employee locally`);
      assert.match(source, /canViewLeave|canRequestLeave|canViewLeaveLedger|canRequestCompensatoryLeave|canRequestLeaveEncashment/, `${route} should use leave authorization helpers`);
      assert.doesNotMatch(source, /admin\.from\("leave_(applications|ledger_entries|allocations|encashments)"/, `${route} should not broad-read leave data through admin client`);
    }
  });

  it("keeps ledger public API read-only and append behavior in decision routes", () => {
    const ledgerRoute = readRoute("app/api/hrms/leave/ledger/route.ts");
    assert.match(ledgerRoute, /export async function GET/);
    assert.doesNotMatch(ledgerRoute, /export async function (POST|PATCH|DELETE)/);
    assert.doesNotMatch(ledgerRoute, /\.update\(/);
    assert.doesNotMatch(ledgerRoute, /\.delete\(/);

    const decisionRoute = readRoute("app/api/hrms/leave/applications/[id]/route.ts");
    assert.match(decisionRoute, /buildLedgerEntry/);
    assert.match(decisionRoute, /buildLedgerReversalEntry/);
    assert.match(decisionRoute, /leave_ledger_entries/);
  });
});
