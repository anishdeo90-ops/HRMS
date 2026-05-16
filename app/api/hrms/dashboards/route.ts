import { NextResponse } from "next/server";
import { canViewDashboards, exactCount, visibleReportCatalog } from "@/app/api/hrms/reports/_shared";
import { currentHrmsProfile } from "@/lib/hrms/employee-access";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewDashboards(profile)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const [
    employees,
    attendanceDays,
    openLeave,
    unpaidClaims,
    payrollEntries,
    separations,
    unreadNotifications,
  ] = await Promise.all([
    exactCount(supabase.from("employees").select("id", { count: "exact", head: true }).eq("is_active", true)),
    exactCount(supabase.from("attendance_days").select("id", { count: "exact", head: true })),
    exactCount(supabase.from("leave_applications").select("id", { count: "exact", head: true }).in("status", ["submitted", "pending", "approved"])),
    exactCount(supabase.from("expense_claims").select("id", { count: "exact", head: true }).in("status", ["submitted", "approved", "unpaid"])),
    exactCount(supabase.from("payroll_entries").select("id", { count: "exact", head: true }).in("status", ["draft", "queued", "processed"])),
    exactCount(supabase.from("employee_separations").select("id", { count: "exact", head: true }).in("status", ["submitted", "hr_review", "approved"])),
    exactCount(supabase.from("employee_notifications").select("id", { count: "exact", head: true }).eq("status", "unread")),
  ]);

  return NextResponse.json({
    data: {
      cards: [
        { key: "employees", label: "Active Employees", value: employees, report_key: "report.hrms.employee_information" },
        { key: "attendance", label: "Attendance Days", value: attendanceDays, report_key: "report.hrms.monthly_attendance_sheet" },
        { key: "leave", label: "Open Leave", value: openLeave, report_key: "report.hrms.leave_ledger" },
        { key: "expenses", label: "Unpaid Claims", value: unpaidClaims, report_key: "report.hrms.unpaid_expense_claims" },
        { key: "payroll", label: "Payroll Entries", value: payrollEntries, report_key: "report.hrms.salary_register" },
        { key: "exits", label: "Open Exits", value: separations, report_key: "report.hrms.employee_exits" },
        { key: "notifications", label: "Unread Notifications", value: unreadNotifications, report_key: "report.hrms.birthdays_anniversaries" },
      ],
      reports: visibleReportCatalog(profile),
    },
  });
}
