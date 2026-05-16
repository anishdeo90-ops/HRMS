import type { Role } from "@/lib/types";
import type { ReportCategory, ReportDefinition } from "@/lib/hrms/reports";

export type ReportsProfile = {
  id?: string | null;
  employee_id?: string | null;
  role?: Role | string | null;
  is_active?: boolean | null;
  permissions?: readonly string[] | null;
};

export type ReportsPermissionKey = (typeof REPORTS_PERMISSION_KEYS)[keyof typeof REPORTS_PERMISSION_KEYS];

export const REPORTS_PERMISSION_KEYS = {
  view: "permission.reports.view",
  manage: "permission.reports.manage",
  dashboardsView: "permission.dashboards.view",
  dashboardsManage: "permission.dashboards.manage",
  automationView: "permission.automation.view",
  automationManage: "permission.automation.manage",
  notificationRulesManage: "permission.notification_rules.manage",
  leaveReportsView: "permission.leave.reports.view",
  payrollReportsView: "permission.payroll_reports.view",
  performanceReportsView: "permission.performance.reports.view",
  lifecycleReportsView: "permission.lifecycle.reports.view",
  expensesManage: "permission.expenses.manage",
  advancesManage: "permission.employee_advances.manage",
} as const;

const REPORTS_MANAGERS = new Set(["admin", "hr_manager"]);
const REPORTS_VIEWERS = new Set(["admin", "hr_manager"]);
const PAYROLL_REPORT_ROLES = new Set(["admin", "hr_manager", "payroll_manager"]);
const FINANCE_REPORT_ROLES = new Set(["admin", "hr_manager", "payroll_manager", "finance_manager"]);
const DASHBOARD_ROLES = new Set(["admin", "hr_manager", "payroll_manager"]);
const PAYROLL_SAFE_CATEGORIES = new Set<ReportCategory>(["finance", "payroll"]);

function activeRole(profile: ReportsProfile | null | undefined) {
  if (!profile || profile.is_active === false) return "";
  return profile.role ?? "";
}

function hasCapability(profile: ReportsProfile | null | undefined, permission: string) {
  if (!profile || profile.is_active === false) return false;
  return Boolean(profile.permissions?.includes(permission));
}

function categoryPermission(category: ReportCategory) {
  if (category === "leave") return REPORTS_PERMISSION_KEYS.leaveReportsView;
  if (category === "payroll") return REPORTS_PERMISSION_KEYS.payrollReportsView;
  if (category === "lifecycle") return REPORTS_PERMISSION_KEYS.lifecycleReportsView;
  if (category === "finance") return REPORTS_PERMISSION_KEYS.expensesManage;
  return REPORTS_PERMISSION_KEYS.view;
}

export function canManageReports(profile: ReportsProfile | null | undefined) {
  return REPORTS_MANAGERS.has(activeRole(profile))
    || hasCapability(profile, REPORTS_PERMISSION_KEYS.manage);
}

export function canViewReports(profile: ReportsProfile | null | undefined) {
  return REPORTS_VIEWERS.has(activeRole(profile))
    || hasCapability(profile, REPORTS_PERMISSION_KEYS.view)
    || canManageReports(profile)
    || canViewPayrollReports(profile)
    || canViewFinanceReports(profile);
}

export function canViewPayrollReports(profile: ReportsProfile | null | undefined) {
  return PAYROLL_REPORT_ROLES.has(activeRole(profile))
    || hasCapability(profile, REPORTS_PERMISSION_KEYS.payrollReportsView);
}

export function canViewFinanceReports(profile: ReportsProfile | null | undefined) {
  return FINANCE_REPORT_ROLES.has(activeRole(profile))
    || hasCapability(profile, REPORTS_PERMISSION_KEYS.expensesManage)
    || hasCapability(profile, REPORTS_PERMISSION_KEYS.advancesManage);
}

export function canViewReportCategory(profile: ReportsProfile | null | undefined, category: ReportCategory) {
  if (!profile || profile.is_active === false) return false;
  if (canManageReports(profile)) return true;
  if (activeRole(profile) === "payroll_manager") return PAYROLL_SAFE_CATEGORIES.has(category);
  if (category === "payroll") return canViewPayrollReports(profile);
  if (category === "finance") return canViewFinanceReports(profile);
  return REPORTS_VIEWERS.has(activeRole(profile))
    || hasCapability(profile, REPORTS_PERMISSION_KEYS.view)
    || hasCapability(profile, categoryPermission(category));
}

export function canViewReport(profile: ReportsProfile | null | undefined, report: ReportDefinition | ReportCategory | null | undefined) {
  if (!report) return false;
  const category = typeof report === "string" ? report : report.category;
  if (!canViewReportCategory(profile, category)) return false;
  if (typeof report !== "string" && report.permission) {
    return canManageReports(profile)
      || activeRole(profile) === "admin"
      || activeRole(profile) === "hr_manager"
      || hasCapability(profile, report.permission)
      || (category === "payroll" && canViewPayrollReports(profile))
      || (category === "finance" && canViewFinanceReports(profile));
  }
  return true;
}

export function canRunReport(profile: ReportsProfile | null | undefined, report: ReportDefinition | null | undefined) {
  return canViewReport(profile, report);
}

export function canViewDashboards(profile: ReportsProfile | null | undefined) {
  return DASHBOARD_ROLES.has(activeRole(profile))
    || hasCapability(profile, REPORTS_PERMISSION_KEYS.dashboardsView)
    || canManageReports(profile);
}

export function canManageDashboards(profile: ReportsProfile | null | undefined) {
  return REPORTS_MANAGERS.has(activeRole(profile))
    || hasCapability(profile, REPORTS_PERMISSION_KEYS.dashboardsManage);
}

export function canViewAutomation(profile: ReportsProfile | null | undefined) {
  return REPORTS_MANAGERS.has(activeRole(profile))
    || hasCapability(profile, REPORTS_PERMISSION_KEYS.automationView)
    || canManageAutomation(profile);
}

export function canManageAutomation(profile: ReportsProfile | null | undefined) {
  return REPORTS_MANAGERS.has(activeRole(profile))
    || hasCapability(profile, REPORTS_PERMISSION_KEYS.automationManage);
}

export function canManageNotificationRules(profile: ReportsProfile | null | undefined) {
  return canManageAutomation(profile)
    || hasCapability(profile, REPORTS_PERMISSION_KEYS.notificationRulesManage);
}
