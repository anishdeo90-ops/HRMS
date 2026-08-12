import type { LucideIcon } from "lucide-react";
import {
  Award,
  Banknote,
  Building,
  Building2,
  CalendarClock,
  CalendarRange,
  ClipboardList,
  Clock,
  FileBadge,
  FileText,
  Layers,
  Mail,
  Megaphone,
  Network,
  ScanFace,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sliders,
  Timer,
  UserCog,
  Users,
} from "lucide-react";

/**
 * The settings menu — `docs/hrms/00-navigation-map.md §4`.
 *
 * Two groups, exactly as the reference organises them. This list is the master
 * -data inventory, which is why it maps one-to-one onto the foundation tables.
 */

export interface SettingsItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const SETTINGS_GENERAL: SettingsItem[] = [
  { href: "/hrms/settings/company-profile", label: "Company Profile", description: "Legal entity, branding and the org handle", icon: Building2 },
  { href: "/hrms/settings/system-settings", label: "System Settings", description: "Date, currency, week start and number formats", icon: Settings2 },
  { href: "/hrms/settings/policy-setup", label: "Policy Setup", description: "Policy documents and who they apply to", icon: ScrollText },
  { href: "/hrms/settings/permissions", label: "Permission Management", description: "Roles and what each one may do", icon: ShieldCheck },
  { href: "/hrms/settings/email-master", label: "Email Master", description: "Templates fired by system events", icon: Mail },
  { href: "/hrms/onboarding/document-master", label: "Document Master", description: "The document catalogue used at onboarding", icon: FileBadge },
  { href: "/hrms/settings/cron-master", label: "Cron Master", description: "Scheduled jobs, their runs and failures", icon: Timer },
  { href: "/hrms/settings/leave-settings", label: "Leave Settings", description: "Leave types, quotas, accrual and carry-forward", icon: CalendarRange },
  { href: "/hrms/settings/holidays", label: "Holiday Calendar", description: "Public, regional and restricted holidays", icon: CalendarClock },
  { href: "/hrms/settings/achievements", label: "Achievements", description: "The recognition and badge catalogue", icon: Award },
  { href: "/hrms/settings/activity-logs", label: "Activity Logs", description: "Who did what, and when", icon: ClipboardList },
  { href: "/hrms/settings/face-identity", label: "Face Identity Vault", description: "Biometric enrolment for attendance capture", icon: ScanFace },
];

export const SETTINGS_ORG: SettingsItem[] = [
  { href: "/hrms/settings/masters/branch", label: "Branch", description: "Physical locations and offices", icon: Building },
  { href: "/hrms/settings/masters/business-unit", label: "Business Unit", description: "Owns departments; resolves the business head", icon: Network },
  { href: "/hrms/settings/masters/department", label: "Department", description: "Reports into a business unit", icon: Layers },
  { href: "/hrms/settings/masters/sub-department", label: "Sub-Department", description: "One level below department", icon: Layers },
  { href: "/hrms/settings/masters/designation", label: "Designation", description: "Job titles, and what KRAs attach to", icon: UserCog },
  { href: "/hrms/settings/masters/employment-type", label: "Employment Type", description: "Permanent, contract, intern, consultant", icon: FileText },
  { href: "/hrms/settings/masters/function-role", label: "Function Role", description: "What a person does, apart from their title", icon: Users },
  { href: "/hrms/settings/shifts", label: "Work Hours & Shifts", description: "Shift timings, grace, week-offs and penalties", icon: Clock },
  { href: "/hrms/settings/roster", label: "Roster", description: "Date-level shift assignment per employee", icon: CalendarRange },
  { href: "/hrms/settings/masters/announcement-category", label: "Announcement Category", description: "Lookup used by announcements", icon: Megaphone },
  { href: "/hrms/settings/masters/expense-type", label: "Expense Type", description: "Strict list behind reimbursement claims", icon: Banknote },
  { href: "/hrms/settings/general", label: "General Settings", description: "Attendance mode, regularization limits and approvals", icon: Sliders },
];
