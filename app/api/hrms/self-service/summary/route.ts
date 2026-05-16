import { NextResponse } from "next/server";
import { currentHrmsProfile, resolveLeaveTargetEmployee } from "@/lib/hrms/employee-access";
import { canUseSelfService, canViewSelfServiceProfile } from "@/lib/hrms/self-service-authorization";
import { createAdminClient, createClient } from "@/lib/supabase/server";

function startOfWindow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

async function exactCount(query: any) {
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export async function GET() {
  const supabase = await createClient();
  const { user, profile } = await currentHrmsProfile(supabase);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employee, error } = await resolveLeaveTargetEmployee(supabase, user.id, null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!employee?.id) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!canUseSelfService(profile, employee)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const admin = await createAdminClient();
  const employeeSelect = canViewSelfServiceProfile(profile, employee)
    ? "id, employee_code, name, joining_date, work_email, mobile, employment_status, department:hr_departments(name), branch:hr_branches(name), grade:hr_grades(name), reporting_manager:employees!employees_reporting_manager_id_fkey(name)"
    : "id, employee_code, name";
  const { data: employeeProfileData } = await admin.from("employees").select(employeeSelect).eq("id", employee.id).single();
  const employeeProfile = employeeProfileData as any;
  const since = startOfWindow(30);

  const [
    attendanceDays,
    pendingLeave,
    openClaims,
    salarySlips,
    unreadNotifications,
  ] = await Promise.all([
    exactCount(admin.from("attendance_days").select("id", { count: "exact", head: true }).eq("employee_id", employee.id).gte("attendance_date", since)),
    exactCount(admin.from("leave_applications").select("id", { count: "exact", head: true }).eq("employee_id", employee.id).in("status", ["draft", "submitted", "pending", "approved"])),
    exactCount(admin.from("expense_claims").select("id", { count: "exact", head: true }).eq("employee_id", employee.id).in("status", ["draft", "submitted", "approved", "unpaid"])),
    exactCount(admin.from("salary_slips").select("id", { count: "exact", head: true }).eq("employee_id", employee.id).in("status", ["issued", "published"])),
    exactCount(admin.from("employee_notifications").select("id", { count: "exact", head: true }).eq("employee_id", employee.id).eq("status", "unread")),
  ]);

  return NextResponse.json({
    data: {
      employee: employeeProfile,
      cards: [
        { key: "profile", label: "Profile", value: employeeProfile?.employment_status ?? "active", href: "/self-service", tone: "slate" },
        { key: "attendance", label: "Attendance Days", value: attendanceDays, href: "/time/attendance", tone: "blue" },
        { key: "leave", label: "Leave Requests", value: pendingLeave, href: "/time/leave", tone: "emerald" },
        { key: "expenses", label: "Expense Claims", value: openClaims, href: "/expenses/claims", tone: "amber" },
        { key: "salary_slips", label: "Salary Slips", value: salarySlips, href: "/payroll/salary-slips", tone: "violet" },
        { key: "notifications", label: "Unread Notifications", value: unreadNotifications, href: "/self-service/notifications", tone: "rose" },
      ],
      links: [
        { label: "Tax and benefits", href: "/payroll/tax-benefits" },
        { label: "Performance goals", href: "/performance/goals" },
        { label: "Onboarding", href: "/lifecycle/onboarding" },
        { label: "Grievances", href: "/grievances" },
        { label: "Training", href: "/training" },
      ],
    },
  });
}
