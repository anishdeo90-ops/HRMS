import { NextRequest, NextResponse } from "next/server";
import { canManageAutomation, canViewAutomation } from "@/lib/hrms/reports-authorization";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { normalizeAutomationExecutionPayload } from "@/lib/hrms/automation";
import { createClient } from "@/lib/supabase/server";

const EXECUTION_SELECT = "*,rule:hrms_automation_rules(*)";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewAutomation(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  let query = supabase.from("hrms_automation_execution_logs").select(EXECUTION_SELECT).order("created_at", { ascending: false }).limit(200);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  if (searchParams.get("rule_key")) query = query.eq("rule_key", searchParams.get("rule_key"));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageAutomation(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const payload = normalizeAutomationExecutionPayload(await req.json());
  if (!payload.automation_rule_id && !payload.rule_key) return NextResponse.json({ error: "automation_rule_id or rule_key required" }, { status: 400 });

  const { data, error } = await supabase
    .from("hrms_automation_execution_logs")
    .insert({ ...payload, created_by: user.id })
    .select(EXECUTION_SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
