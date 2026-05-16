import { NextRequest, NextResponse } from "next/server";
import { canManageAutomation, canViewAutomation } from "@/lib/hrms/reports-authorization";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { normalizeAutomationRulePayload } from "@/lib/hrms/automation";
import { createClient } from "@/lib/supabase/server";

const AUTOMATION_RULE_SELECT = "*";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewAutomation(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  let query = supabase.from("hrms_automation_rules").select(AUTOMATION_RULE_SELECT).order("created_at", { ascending: false }).limit(200);
  if (searchParams.get("status")) query = query.eq("status", searchParams.get("status"));
  if (searchParams.get("category")) query = query.eq("category", searchParams.get("category"));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageAutomation(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const payload = normalizeAutomationRulePayload(await req.json());
  if (!payload.key || !payload.name) return NextResponse.json({ error: "key and name required" }, { status: 400 });

  const { data, error } = await supabase
    .from("hrms_automation_rules")
    .insert({ ...payload, created_by: user.id })
    .select(AUTOMATION_RULE_SELECT)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
