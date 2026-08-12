import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  UserCircle,
  Users,
  Target,
  UserPlus,
  CalendarDays,
  LayoutGrid,
  Settings,
} from "lucide-react";
import type { Role } from "@/lib/types";

/**
 * HRMS navigation — `docs/hrms/00-navigation-map.md §2`.
 *
 * The reference product shows the same pages twice: in a left rail flyout and in
 * a horizontal tab strip inside the module. We keep both, driven by this one
 * table, so they can never drift apart.
 *
 * Survey, Learning and Organization Tree are deliberately absent — out of scope,
 * decided 2026-08-10.
 */

export interface HrmsTab {
  href: string;
  label: string;
  /** Absent means everyone. */
  roles?: Role[];
}

export interface HrmsModule {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
  tabs: HrmsTab[];
}

export const HRMS_NAV: HrmsModule[] = [
  {
    href: "/hrms",
    label: "Dashboard",
    icon: LayoutDashboard,
    tabs: [],
  },
  {
    href: "/hrms/me",
    label: "Me",
    icon: UserCircle,
    tabs: [
      { href: "/hrms/me/in-out", label: "My In-Out" },
      { href: "/hrms/me/leaves", label: "Leaves" },
      { href: "/hrms/me/ranking", label: "Ranking" },
      { href: "/hrms/me/reimbursement", label: "Bill Reimbursement" },
    ],
  },
  {
    href: "/hrms/team",
    label: "Team",
    icon: Users,
    roles: ["admin", "hr_manager", "hod"],
    tabs: [
      { href: "/hrms/team/directory", label: "Employee Directory" },
      { href: "/hrms/team/in-out", label: "Employee-In-Out" },
      { href: "/hrms/team/separation", label: "Separation" },
      { href: "/hrms/team/reports", label: "Reports" },
      { href: "/hrms/team/tickets", label: "Tickets" },
      { href: "/hrms/team/approvals", label: "Admin Approvals" },
      { href: "/hrms/team/pending-tasks", label: "Pending Tasks" },
      { href: "/hrms/team/regularization", label: "Admin-Regularization" },
    ],
  },
  {
    href: "/hrms/performance",
    label: "Performance Review",
    icon: Target,
    tabs: [
      { href: "/hrms/performance/dashboard", label: "Dashboard" },
      { href: "/hrms/performance/goals", label: "Goals" },
      { href: "/hrms/performance/kra", label: "KRA" },
      { href: "/hrms/performance/appraisals", label: "Appraisals" },
      { href: "/hrms/performance/reports", label: "Reports", roles: ["admin", "hr_manager", "hod"] },
      { href: "/hrms/performance/cycles", label: "Performance Cycles", roles: ["admin", "hr_manager"] },
      { href: "/hrms/performance/templates", label: "Appraisal Templates", roles: ["admin", "hr_manager"] },
    ],
  },
  {
    href: "/hrms/onboarding",
    label: "Onboarding",
    icon: UserPlus,
    roles: ["admin", "hr_manager"],
    tabs: [
      { href: "/hrms/onboarding/candidate-approval", label: "Candidate Approval" },
      { href: "/hrms/onboarding/approval-list", label: "Candidate Approval List" },
      { href: "/hrms/onboarding/initiation", label: "Onboarding Initiation" },
      { href: "/hrms/onboarding/documents-approval", label: "Documents Approval" },
      { href: "/hrms/onboarding/new-joinees", label: "New Joinees" },
      { href: "/hrms/onboarding/document-master", label: "Document Master" },
      { href: "/hrms/onboarding/form-master", label: "Onboarding Form Master" },
    ],
  },
  {
    href: "/hrms/calendar",
    label: "Calendar",
    icon: CalendarDays,
    tabs: [],
  },
  {
    href: "/hrms/more",
    label: "More",
    icon: LayoutGrid,
    tabs: [
      { href: "/hrms/more/job-openings", label: "Job Opening" },
      { href: "/hrms/more/inventory", label: "Inventory" },
      { href: "/hrms/more/announcements", label: "Announcements" },
      {
        href: "/hrms/more/reimbursement-approval",
        label: "Bill Reimbursement Approval",
        roles: ["admin", "hr_manager"],
      },
    ],
  },
  {
    href: "/hrms/settings",
    label: "Settings",
    icon: Settings,
    roles: ["admin", "hr_manager"],
    tabs: [],
  },
];

export function visibleFor<T extends { roles?: Role[] }>(items: T[], role: Role): T[] {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}

/** Longest-prefix match, so `/hrms/team/directory` resolves to Team, not Dashboard. */
export function moduleForPathname(pathname: string): HrmsModule | undefined {
  return [...HRMS_NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((m) => pathname === m.href || pathname.startsWith(m.href + "/"));
}

export function isTabActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
