import { NextResponse } from "next/server";
import { canApproveCompensatoryLeave, canApproveLeave, canApproveLeaveEncashment } from "@/lib/hrms/leave-authorization";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

const APPLICATION_EMPLOYEE_EMBED = "employee:employees!leave_applications_employee_id_fkey(id, profile_id, department_id, reporting_manager_id)";
const COMPENSATORY_EMPLOYEE_EMBED = "employee:employees!compensatory_leave_requests_employee_id_fkey(id, profile_id, department_id, reporting_manager_id)";
const ENCASHMENT_EMPLOYEE_EMBED = "employee:employees!leave_encashments_employee_id_fkey(id, profile_id, department_id, reporting_manager_id)";

function target(record: any) {
  return {
    id: record.employee_id,
    profile_id: record.employee?.profile_id,
    department_id: record.employee?.department_id,
    reporting_manager_id: record.employee?.reporting_manager_id,
  };
}

export async function GET() {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [applications, compensatory, encashments] = await Promise.all([
    supabase.from("leave_applications").select(`*,${APPLICATION_EMPLOYEE_EMBED}`).eq("status", "submitted").limit(100),
    supabase.from("compensatory_leave_requests").select(`*,${COMPENSATORY_EMPLOYEE_EMBED}`).eq("status", "submitted").limit(100),
    supabase.from("leave_encashments").select(`*,${ENCASHMENT_EMPLOYEE_EMBED}`).eq("status", "submitted").limit(100),
  ]);

  if (applications.error) return NextResponse.json({ error: applications.error.message }, { status: 500 });
  if (compensatory.error) return NextResponse.json({ error: compensatory.error.message }, { status: 500 });
  if (encashments.error) return NextResponse.json({ error: encashments.error.message }, { status: 500 });

  return NextResponse.json({
    data: {
      applications: (applications.data ?? []).filter((record) => canApproveLeave(profile, target(record))),
      compensatory: (compensatory.data ?? []).filter((record) => canApproveCompensatoryLeave(profile, target(record))),
      encashments: (encashments.data ?? []).filter((record) => canApproveLeaveEncashment(profile, target(record))),
    },
  });
}
