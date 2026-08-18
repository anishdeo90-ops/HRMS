import { NextRequest, NextResponse } from "next/server";
import { event, hrmsContext, link, status } from "@/lib/hrms/api-server";
import { createAdminClient } from "@/lib/supabase/server";

function isPayrollManager(row: { designation?: string | null; function_role?: string | null }) {
  const title = `${row.designation ?? ""} ${row.function_role ?? ""}`.toLowerCase();
  return title.includes("payroll") && title.includes("manager");
}

async function expenseApproverProfileIds(admin: Awaited<ReturnType<typeof createAdminClient>>, orgId: string) {
  const [{ data: hods }, { data: employees }, { data: fallback }] = await Promise.all([
    admin.from("profiles").select("id").eq("role", "hod").eq("is_active", true),
    admin.from("hrms_employee_rows").select("profile_id,designation,function_role,status").eq("org_id", orgId).not("profile_id", "is", null),
    admin.from("profiles").select("id").in("role", ["admin", "hr_manager"]).eq("is_active", true),
  ]);

  const ids = new Set<string>();
  (hods ?? []).forEach((p) => ids.add(p.id));
  (employees ?? [])
    .filter((e) => ["active", "probation", "on_leave"].includes(e.status ?? ""))
    .filter(isPayrollManager)
    .forEach((e) => e.profile_id && ids.add(e.profile_id));

  if (ids.size === 0) (fallback ?? []).forEach((p) => ids.add(p.id));
  return Array.from(ids);
}

async function canActOnExpense(admin: Awaited<ReturnType<typeof createAdminClient>>, orgId: string, profileId: string) {
  const { data: profile } = await admin.from("profiles").select("role").eq("id", profileId).maybeSingle();
  if (["admin", "hr_manager"].includes(profile?.role ?? "")) return true;
  return (await expenseApproverProfileIds(admin, orgId)).includes(profileId);
}

async function notifyExpenseApprovers(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  orgId: string,
  actorId: string,
  claim: { id: string; claim_code: string },
  employeeName: string,
) {
  const recipients = (await expenseApproverProfileIds(admin, orgId)).filter((id) => id !== actorId);
  if (!recipients.length) return;

  const { error } = await admin.from("notifications").insert(recipients.map((user_id) => ({
    user_id,
    type: "expense_claim_submitted",
    title: `Reimbursement claim ${claim.claim_code}`,
    body: `${employeeName} submitted a reimbursement claim for approval`,
    is_read: false,
  })));
  if (error) console.error("expense claim notification failed:", error.message);
}

export async function GET() {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const { data, error } = await ctx.supabase
    .schema("hrms").from("expense_claims")
    .select("*, employee:employees(employee_code, full_name), lines:expense_claim_lines(*, expense_type:expense_types(name))")
    .eq("org_id", ctx.orgId)
    .order("claim_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  return NextResponse.json({ data: (data ?? []).map((c) => ({
    ...c,
    employee_code: c.employee?.employee_code ?? "",
    employee_name: c.employee?.full_name ?? "Employee",
    total_amount_paise: (c.lines ?? []).reduce((s: number, l: any) => s + l.amount_paise, 0),
    steps: [{ sequence: 1, approver_source: "manager", status: c.status }],
    lines: (c.lines ?? []).map((l: any) => ({ ...l, expense_type: l.expense_type?.name ?? "Other" })),
  })) });
}

export async function POST(req: NextRequest) {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const body = await req.json();
  const { data: employee } = await ctx.supabase.schema("hrms").from("employees").select("id,full_name").eq("org_id", ctx.orgId).eq("profile_id", ctx.user.id).maybeSingle();
  const { count } = await ctx.supabase.schema("hrms").from("expense_claims").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId);
  const { data: claim, error } = await ctx.supabase.schema("hrms").from("expense_claims").insert({
    org_id: ctx.orgId,
    employee_id: body.employee_id ?? employee?.id ?? null,
    claim_code: body.claim_code ?? `EXP-${String((count ?? 0) + 1).padStart(4, "0")}`,
    notes: body.notes ?? null,
    created_by: ctx.user.id,
    updated_by: ctx.user.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });

  const lines = Array.isArray(body.lines) ? body.lines : [];
  if (lines.length) {
    const names = Array.from(new Set(lines.map((l: any) => l.expense_type || "Other")));
    const { data: types } = await ctx.supabase.schema("hrms").from("expense_types").select("id,name").eq("org_id", ctx.orgId).in("name", names);
    const byName = new Map((types ?? []).map((t) => [t.name, t.id]));
    const { error: lineError } = await ctx.supabase.schema("hrms").from("expense_claim_lines").insert(lines.map((l: any) => ({
      org_id: ctx.orgId,
      claim_id: claim.id,
      expense_type_id: byName.get(l.expense_type || "Other") ?? null,
      expense_date: l.expense_date,
      amount_paise: l.amount_paise,
      description: l.description ?? null,
      has_receipt: !!l.has_receipt,
    })));
    if (lineError) return NextResponse.json({ error: lineError.message }, { status: status(lineError) });
  }

  await event(ctx.supabase, { org_id: ctx.orgId, entity_type: "expense_claim", entity_id: claim.id, event_type: "expense_claim.created", summary: "Expense claim created", actor_profile_id: ctx.user.id });
  await link(ctx.supabase, { org_id: ctx.orgId, source_product: "hrms", source_entity_type: "expense_claim", source_entity_id: claim.id, target_product: "payroll", target_entity_type: "payable_fact", target_entity_id: claim.id, link_type: "payable_when_approved" });
  await notifyExpenseApprovers(await createAdminClient(), ctx.orgId, ctx.user.id, claim, employee?.full_name ?? "An employee");
  return NextResponse.json({ data: claim }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await hrmsContext();
  if (ctx.error) return ctx.error;
  const body = await req.json();
  if (!body?.id || !body?.status) return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  const admin = await createAdminClient();
  if (!(await canActOnExpense(admin, ctx.orgId, ctx.user.id))) {
    return NextResponse.json({ error: "Not allowed to approve reimbursement claims" }, { status: 403 });
  }

  const { data, error } = await admin.schema("hrms").from("expense_claims").update({ status: body.status, updated_by: ctx.user.id, updated_at: new Date().toISOString() }).eq("id", body.id).eq("org_id", ctx.orgId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: status(error) });
  await event(ctx.supabase, { org_id: ctx.orgId, entity_type: "expense_claim", entity_id: body.id, event_type: `expense_claim.${body.status}`, summary: `Expense claim ${body.status}`, actor_profile_id: ctx.user.id });
  return NextResponse.json({ data });
}
