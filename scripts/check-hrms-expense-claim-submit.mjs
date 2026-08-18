import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const migration = readdirSync("supabase/migrations").find((name) =>
  name.endsWith("_hrms_employee_expense_claim_submit.sql")
);
assert(migration, "missing employee expense claim submit migration");

const sql = readFileSync(join("supabase/migrations", migration), "utf8").toLowerCase();
assert(sql.includes("hrms_expense_claims_insert_member"), "missing own claim insert policy");
assert(sql.includes("hrms_expense_claim_lines_insert_member"), "missing own claim line insert policy");
assert(sql.includes("for insert to authenticated"), "policies must be authenticated-only inserts");
assert(sql.includes("e.profile_id = (select auth.uid())"), "claim insert must be scoped to the caller's employee row");
assert(sql.includes("c.created_by = (select auth.uid())"), "line insert must be scoped to the caller's claim");
assert(!sql.includes("security definer"), "do not bypass RLS with SECURITY DEFINER");

const page = readFileSync("app/(app)/hrms/me/reimbursement/add/page.tsx", "utf8");
assert(page.includes("Expense name is required"), "form must explain why submit is disabled");
assert(page.includes("claimHint"), "form must compute a submit-blocking reason");
assert(page.includes('type="file"'), "attachment control must use a native file input");
assert(page.includes("attachmentNames"), "line state must track selected attachment names");
assert(page.includes("has_receipt: l.attachmentNames.length > 0"), "submit must mark receipt presence from selected files");

const route = readFileSync("app/api/hrms/expenses/route.ts", "utf8");
assert(route.includes("expenseApproverProfileIds"), "expense route must resolve reimbursement approvers");
assert(route.includes("role\", \"hod\""), "HODs must receive reimbursement approval notifications");
assert(route.includes("isPayrollManager"), "payroll manager employees must receive reimbursement approval notifications");
assert(route.includes("expense_claim_submitted"), "expense submit must create a reimbursement notification");
assert(route.includes("canActOnExpense"), "expense approval must allow the reimbursement approver set to act");

const notificationsPage = readFileSync("app/(app)/notifications/page.tsx", "utf8");
assert(notificationsPage.includes('n.type === "expense_claim_submitted"'), "notification click must handle reimbursement claims");
assert(notificationsPage.includes('router.push("/hrms/more/reimbursement-approval")'), "reimbursement notification must open approval queue");
