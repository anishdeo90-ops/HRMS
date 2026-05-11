import { NextRequest, NextResponse } from "next/server";
import { canManageLeaveBalances, canViewLeave } from "@/lib/hrms/leave-authorization";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");
  const { employee, error: employeeError } = await resolveLeaveTargetEmployee(supabase, user.id, employeeId);
  if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });
  if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!canViewLeave(profile, employee) && !canManageLeaveBalances(profile)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let allocationsQuery = supabase
    .from("leave_allocations")
    .select("employee_id, leave_period_id, leave_type_key, allocated_days, carried_forward_days, expired_days")
    .eq("employee_id", employee.id);
  let ledgerQuery = supabase
    .from("leave_ledger_entries")
    .select("employee_id, leave_period_id, leave_type_key, days_delta")
    .eq("employee_id", employee.id);

  if (searchParams.get("leave_type_key")) {
    allocationsQuery = allocationsQuery.eq("leave_type_key", searchParams.get("leave_type_key"));
    ledgerQuery = ledgerQuery.eq("leave_type_key", searchParams.get("leave_type_key"));
  }
  if (searchParams.get("period_id")) {
    allocationsQuery = allocationsQuery.eq("leave_period_id", searchParams.get("period_id"));
    ledgerQuery = ledgerQuery.eq("leave_period_id", searchParams.get("period_id"));
  }

  const [{ data: allocations, error: allocationError }, { data: ledger, error: ledgerError }] = await Promise.all([allocationsQuery, ledgerQuery]);
  if (allocationError) return NextResponse.json({ error: allocationError.message }, { status: 500 });
  if (ledgerError) return NextResponse.json({ error: ledgerError.message }, { status: 500 });

  const balances = new Map<string, { employee_id: string; leave_period_id: string | null; leave_type_key: string; allocated: number; ledger_delta: number; balance: number }>();
  for (const allocation of allocations ?? []) {
    const key = `${allocation.employee_id}:${allocation.leave_period_id ?? ""}:${allocation.leave_type_key}`;
    const allocated = Number(allocation.allocated_days ?? 0) + Number(allocation.carried_forward_days ?? 0) - Number(allocation.expired_days ?? 0);
    balances.set(key, { employee_id: allocation.employee_id, leave_period_id: allocation.leave_period_id, leave_type_key: allocation.leave_type_key, allocated, ledger_delta: 0, balance: allocated });
  }
  for (const entry of ledger ?? []) {
    const key = `${entry.employee_id}:${entry.leave_period_id ?? ""}:${entry.leave_type_key}`;
    const current = balances.get(key) ?? { employee_id: entry.employee_id, leave_period_id: entry.leave_period_id, leave_type_key: entry.leave_type_key, allocated: 0, ledger_delta: 0, balance: 0 };
    current.ledger_delta += Number(entry.days_delta ?? 0);
    current.balance = current.allocated + current.ledger_delta;
    balances.set(key, current);
  }

  return NextResponse.json({ data: Array.from(balances.values()) });
}
