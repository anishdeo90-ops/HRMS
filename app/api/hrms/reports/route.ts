import { NextRequest, NextResponse } from "next/server";
import {
  canRunReport,
  canViewReports,
  executeHrmsReport,
  normalizeReportRunPayload,
  resolveReportDefinition,
  visibleReportCatalog,
} from "@/app/api/hrms/reports/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewReports(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  return NextResponse.json({ data: visibleReportCatalog(profile) });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = normalizeReportRunPayload(await req.json());
  const definition = resolveReportDefinition(typeof payload.report_key === "string" ? payload.report_key : undefined);
  if (!definition) return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  if (!canRunReport(profile, definition)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  try {
    const result = await executeHrmsReport(supabase, definition, payload.parameters as Record<string, unknown>);
    const responseData = {
      ...result,
      rows: result.data,
      generated_at: new Date().toISOString(),
    };
    await supabase.from("hrms_report_runs").insert({
      ...payload,
      requested_by: user.id,
      status: "completed",
      row_count: Array.isArray(responseData.rows) ? responseData.rows.length : 0,
      completed_at: responseData.generated_at,
    });
    return NextResponse.json({ data: responseData });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Report execution failed" }, { status: 500 });
  }
}
