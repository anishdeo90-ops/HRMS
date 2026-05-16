import type { Role } from "@/lib/types";

export const NavSection = {
  NONE: "NONE",
  RECRUITING: "RECRUITING",
  PEOPLE: "PEOPLE",
  TIME: "TIME",
  FINANCE: "FINANCE",
  PAYROLL: "PAYROLL",
  PERFORMANCE: "PERFORMANCE",
  LIFECYCLE: "LIFECYCLE",
  SELF_SERVICE: "SELF_SERVICE",
  REPORTS: "REPORTS",
} as const;

export type NavSection = (typeof NavSection)[keyof typeof NavSection];

export type NavIconName =
  | "dashboard"
  | "activity"
  | "users"
  | "briefcase"
  | "clipboard"
  | "fileText"
  | "building"
  | "userCog"
  | "clock"
  | "calendar"
  | "checkSquare"
  | "wallet"
  | "receipt"
  | "landmark"
  | "plane"
  | "car"
  | "badgeDollar"
  | "target"
  | "gitBranch"
  | "userRound"
  | "barChart"
  | "bell"
  | "workflow";

export type NavItem = {
  label: string;
  href: string;
  icon: NavIconName;
  roles: readonly Role[];
  section: NavSection;
  enabled: boolean;
  badge?: string;
};

export const NAV_SECTION_HEADERS = [
  { section: NavSection.PEOPLE, label: "People" },
  { section: NavSection.TIME, label: "Time" },
  { section: NavSection.FINANCE, label: "Finance" },
  { section: NavSection.PAYROLL, label: "Payroll" },
  { section: NavSection.PERFORMANCE, label: "Performance" },
  { section: NavSection.LIFECYCLE, label: "Lifecycle" },
  { section: NavSection.SELF_SERVICE, label: "Self Service" },
  { section: NavSection.REPORTS, label: "Reports" },
] as const;

export const SECTION_LABELS: Record<NavSection, string> = {
  [NavSection.NONE]: "",
  [NavSection.RECRUITING]: "Recruiting",
  [NavSection.PEOPLE]: "People",
  [NavSection.TIME]: "Time",
  [NavSection.FINANCE]: "Finance",
  [NavSection.PAYROLL]: "Payroll",
  [NavSection.PERFORMANCE]: "Performance",
  [NavSection.LIFECYCLE]: "Lifecycle",
  [NavSection.SELF_SERVICE]: "Self Service",
  [NavSection.REPORTS]: "Reports",
};

export const SECTION_ORDER: readonly NavSection[] = [
  NavSection.NONE,
  NavSection.RECRUITING,
  NavSection.PEOPLE,
  NavSection.TIME,
  NavSection.FINANCE,
  NavSection.PAYROLL,
  NavSection.PERFORMANCE,
  NavSection.LIFECYCLE,
  NavSection.SELF_SERVICE,
  NavSection.REPORTS,
];

export const NAV_CONFIG: readonly NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", section: NavSection.NONE, roles: ["admin", "hr_manager", "hr_user", "payroll_manager", "recruiter", "hod", "leave_approver", "expense_approver", "interviewer", "employee"], enabled: true },
  { label: "My Activity", href: "/my-activity", icon: "activity", section: NavSection.NONE, roles: ["admin", "hr_manager", "hr_user", "recruiter", "interviewer", "employee"], enabled: true },

  { label: "Candidates", href: "/candidates", icon: "users", section: NavSection.RECRUITING, roles: ["admin", "hr_manager", "hr_user", "recruiter"], enabled: true },
  { label: "Jobs", href: "/jobs", icon: "briefcase", section: NavSection.RECRUITING, roles: ["admin", "hr_manager", "hr_user", "recruiter", "hod"], enabled: true },
  { label: "HOD Portal", href: "/hod-portal", icon: "clipboard", section: NavSection.RECRUITING, roles: ["admin", "hr_manager", "hod"], enabled: true },
  { label: "JDs & Forms", href: "/jds", icon: "fileText", section: NavSection.RECRUITING, roles: ["admin", "hr_manager", "hr_user", "recruiter"], enabled: true },
  { label: "Recruitment", href: "/recruitment", icon: "briefcase", section: NavSection.RECRUITING, roles: ["admin", "hr_manager", "hr_user", "recruiter"], enabled: true },
  { label: "Appointments", href: "/recruitment/appointments", icon: "fileText", section: NavSection.RECRUITING, roles: ["admin", "hr_manager", "hr_user", "recruiter"], enabled: true },
  { label: "Interviews", href: "/interviews", icon: "activity", section: NavSection.RECRUITING, roles: ["admin", "hr_manager", "hr_user", "recruiter", "interviewer"], enabled: false },

  { label: "Employees", href: "/people/employees", icon: "userCog", section: NavSection.PEOPLE, roles: ["admin", "hr_manager", "hr_user", "payroll_manager"], enabled: true },
  { label: "Organization", href: "/people/organization", icon: "building", section: NavSection.PEOPLE, roles: ["admin", "hr_manager", "hr_user", "payroll_manager"], enabled: true },
  { label: "HR Setup", href: "/people/setup", icon: "userCog", section: NavSection.PEOPLE, roles: ["admin", "hr_manager", "hr_user"], enabled: false },

  { label: "Attendance", href: "/time/attendance", icon: "clock", section: NavSection.TIME, roles: ["admin", "hr_manager", "hr_user", "employee", "hod", "leave_approver"], enabled: true },
  { label: "Shifts", href: "/time/shifts", icon: "calendar", section: NavSection.TIME, roles: ["admin", "hr_manager", "hr_user", "employee", "hod", "leave_approver"], enabled: true },
  { label: "Time Approvals", href: "/time/approvals", icon: "checkSquare", section: NavSection.TIME, roles: ["admin", "hr_manager", "hod", "leave_approver"], enabled: true },
  { label: "Leaves", href: "/time/leave", icon: "calendar", section: NavSection.TIME, roles: ["admin", "hr_manager", "hr_user", "employee", "hod", "leave_approver"], enabled: false },

  { label: "Overview", href: "/expenses", icon: "wallet", section: NavSection.FINANCE, roles: ["admin", "hr_manager", "hr_user", "expense_approver", "employee"], enabled: true },
  { label: "Claims", href: "/expenses/claims", icon: "receipt", section: NavSection.FINANCE, roles: ["admin", "hr_manager", "hr_user", "expense_approver", "employee"], enabled: true },
  { label: "Advances", href: "/expenses/advances", icon: "landmark", section: NavSection.FINANCE, roles: ["admin", "hr_manager", "hr_user", "expense_approver", "employee"], enabled: true },
  { label: "Travel", href: "/travel", icon: "plane", section: NavSection.FINANCE, roles: ["admin", "hr_manager", "hr_user", "expense_approver", "employee"], enabled: true },
  { label: "Vehicles", href: "/vehicles", icon: "car", section: NavSection.FINANCE, roles: ["admin", "hr_manager", "hr_user", "expense_approver", "employee"], enabled: true },

  { label: "Overview", href: "/payroll", icon: "badgeDollar", section: NavSection.PAYROLL, roles: ["admin", "hr_manager", "payroll_manager"], enabled: true },
  { label: "Salary Structures", href: "/payroll/salary-structures", icon: "badgeDollar", section: NavSection.PAYROLL, roles: ["admin", "hr_manager", "payroll_manager"], enabled: true },
  { label: "Payroll Runs", href: "/payroll/runs", icon: "workflow", section: NavSection.PAYROLL, roles: ["admin", "hr_manager", "payroll_manager"], enabled: true },
  { label: "Salary Slips", href: "/payroll/salary-slips", icon: "receipt", section: NavSection.PAYROLL, roles: ["admin", "hr_manager", "payroll_manager", "employee"], enabled: true },
  { label: "Tax & Benefits", href: "/payroll/tax-benefits", icon: "landmark", section: NavSection.PAYROLL, roles: ["admin", "hr_manager", "payroll_manager", "employee"], enabled: true },

  { label: "Overview", href: "/performance", icon: "barChart", section: NavSection.PERFORMANCE, roles: ["admin", "hr_manager", "hr_user", "employee", "hod"], enabled: true },
  { label: "Goals", href: "/performance/goals", icon: "target", section: NavSection.PERFORMANCE, roles: ["admin", "hr_manager", "hr_user", "employee", "hod"], enabled: true },
  { label: "Appraisals", href: "/performance/appraisals", icon: "clipboard", section: NavSection.PERFORMANCE, roles: ["admin", "hr_manager", "hr_user", "employee", "hod"], enabled: true },
  { label: "Feedback", href: "/performance/feedback", icon: "activity", section: NavSection.PERFORMANCE, roles: ["admin", "hr_manager", "hr_user", "employee", "hod"], enabled: true },

  { label: "Overview", href: "/lifecycle", icon: "workflow", section: NavSection.LIFECYCLE, roles: ["admin", "hr_manager", "hr_user", "employee", "hod"], enabled: true },
  { label: "Onboarding", href: "/lifecycle/onboarding", icon: "userRound", section: NavSection.LIFECYCLE, roles: ["admin", "hr_manager", "hr_user", "employee", "hod"], enabled: true },
  { label: "Separation", href: "/lifecycle/separation", icon: "gitBranch", section: NavSection.LIFECYCLE, roles: ["admin", "hr_manager", "hr_user", "employee", "hod"], enabled: true },
  { label: "Promotions", href: "/lifecycle/promotions", icon: "target", section: NavSection.LIFECYCLE, roles: ["admin", "hr_manager", "hr_user", "hod"], enabled: true },
  { label: "Transfers", href: "/lifecycle/transfers", icon: "building", section: NavSection.LIFECYCLE, roles: ["admin", "hr_manager", "hr_user", "hod"], enabled: true },
  { label: "Grievances", href: "/grievances", icon: "clipboard", section: NavSection.LIFECYCLE, roles: ["admin", "hr_manager", "hr_user", "employee", "hod"], enabled: true },
  { label: "Training", href: "/training", icon: "fileText", section: NavSection.LIFECYCLE, roles: ["admin", "hr_manager", "hr_user", "employee", "hod"], enabled: true },

  { label: "Self Service", href: "/self-service", icon: "userRound", section: NavSection.SELF_SERVICE, roles: ["employee"], enabled: true },
  { label: "Notifications", href: "/self-service/notifications", icon: "bell", section: NavSection.SELF_SERVICE, roles: ["employee"], enabled: true },

  { label: "Reports", href: "/reports", icon: "barChart", section: NavSection.REPORTS, roles: ["admin", "hr_manager", "hr_user", "finance_manager", "payroll_manager"], enabled: true },
  { label: "Dashboards", href: "/reports/dashboards", icon: "barChart", section: NavSection.REPORTS, roles: ["admin", "hr_manager", "hr_user", "finance_manager", "payroll_manager"], enabled: true },
] as const;

export function getNavForRole(role: Role): NavItem[] {
  return NAV_CONFIG.filter((item) => item.enabled && item.roles.includes(role));
}

export function getSectionsForRole(role: Role): NavSection[] {
  const items = getNavForRole(role);
  return SECTION_ORDER.filter((section) => items.some((item) => item.section === section));
}

export function canViewSettings(role: Role): boolean {
  return role === "admin" || role === "hr_manager";
}
