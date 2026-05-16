import { NextRequest, NextResponse } from "next/server";
import {
  canRunReport,
  executeHrmsReport,
  normalizeReportFilters,
  resolveReportDefinition,
} from "@/app/api/hrms/reports/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest, { params }: { params: { key: string } }) {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const definition = resolveReportDefinition(decodeURIComponent(params.key));
  if (!definition) return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  if (!canRunReport(profile, definition)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const filters = normalizeReportFilters(Object.fromEntries(new URL(req.url).searchParams.entries()));
  try {
    const result = await executeHrmsReport(supabase, definition, filters);
    return NextResponse.json({
      data: {
        ...result,
        rows: result.data,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Report execution failed" }, { status: 500 });
  }
}
