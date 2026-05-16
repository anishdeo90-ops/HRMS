import { ROUTE_KEYS } from "@/lib/generated/routes";
import type { Role } from "@/lib/types";

type ProfileLike = {
  role?: Role | string | null;
  is_active?: boolean | null;
};

type PeopleRoute = {
  key: (typeof ROUTE_KEYS)[number];
  href: string;
  label: string;
};

type TimeRoute = PeopleRoute;
const PHASE4_FINANCE_ROUTE_KEYS = [
  "route.finance.expenses",
  "route.finance.expense_claims",
  "route.finance.advances",
  "route.finance.travel",
  "route.finance.vehicles",
] as const;

type FinanceRouteKey = (typeof PHASE4_FINANCE_ROUTE_KEYS)[number];
type FinanceRoute = {
  key: FinanceRouteKey;
  href: string;
  label: string;
};

const PEOPLE_ROUTE_ROLES = new Set(["admin", "hr_manager", "hr_user"]);
const TIME_ATTENDANCE_ROUTE_ROLES = new Set([
  "admin",
  "hr_manager",
  "hr_user",
  "employee",
  "hod",
]);
const TIME_SHIFT_ROUTE_ROLES = new Set([
  "admin",
  "hr_manager",
  "hr_user",
  "employee",
  "hod",
]);
const TIME_APPROVAL_ROUTE_ROLES = new Set([
  "admin",
  "hr_manager",
  "hod",
]);
const FINANCE_SELF_SERVICE_ROUTE_ROLES = new Set([
  "admin",
  "hr_manager",
  "hr_user",
  "finance_manager",
  "employee",
  "expense_approver",
]);
const FINANCE_APPROVAL_ROUTE_ROLES = new Set([
  "admin",
  "hr_manager",
  "finance_manager",
  "expense_approver",
]);
const FINANCE_VEHICLE_ROUTE_ROLES = new Set([
  "admin",
  "hr_manager",
  "hr_user",
  "finance_manager",
  "employee",
]);

export const PEOPLE_ROUTE_ACCESS = {
  employees: {
    key: "route.people.employees",
    href: "/people/employees",
    label: "Employees",
  },
  organization: {
    key: "route.people.organization",
    href: "/people/organization",
    label: "Organization",
  },
} satisfies Record<string, PeopleRoute>;

export const TIME_ROUTE_ACCESS = {
  attendance: {
    key: "route.time.attendance",
    href: "/time/attendance",
    label: "Attendance",
  },
  shifts: {
    key: "route.time.shifts",
    href: "/time/shifts",
    label: "Shifts",
  },
  approvals: {
    key: "route.time.approvals",
    href: "/time/approvals",
    label: "Time Approvals",
  },
} satisfies Record<string, TimeRoute>;

export const FINANCE_ROUTE_ACCESS = {
  overview: {
    key: "route.finance.expenses",
    href: "/expenses",
    label: "Overview",
  },
  claims: {
    key: "route.finance.expense_claims",
    href: "/expenses/claims",
    label: "Claims",
  },
  advances: {
    key: "route.finance.advances",
    href: "/expenses/advances",
    label: "Advances",
  },
  travel: {
    key: "route.finance.travel",
    href: "/travel",
    label: "Travel",
  },
  vehicles: {
    key: "route.finance.vehicles",
    href: "/vehicles",
    label: "Vehicles",
  },
} satisfies Record<string, FinanceRoute>;

export function canViewPeopleRoutes(profile: ProfileLike | null | undefined) {
  if (!profile || profile.is_active === false) return false;
  return PEOPLE_ROUTE_ROLES.has(profile.role ?? "");
}

export function getVisiblePeopleRoutes(profile: ProfileLike | null | undefined) {
  if (!canViewPeopleRoutes(profile)) return [];
  return [PEOPLE_ROUTE_ACCESS.employees, PEOPLE_ROUTE_ACCESS.organization];
}

export function getVisibleTimeRoutes(profile: ProfileLike | null | undefined) {
  if (!profile || profile.is_active === false) return [];

  const role = profile.role ?? "";
  return [
    ...(TIME_ATTENDANCE_ROUTE_ROLES.has(role) ? [TIME_ROUTE_ACCESS.attendance] : []),
    ...(TIME_SHIFT_ROUTE_ROLES.has(role) ? [TIME_ROUTE_ACCESS.shifts] : []),
    ...(TIME_APPROVAL_ROUTE_ROLES.has(role) ? [TIME_ROUTE_ACCESS.approvals] : []),
  ];
}

export function getVisibleFinanceRoutes(profile: ProfileLike | null | undefined) {
  if (!profile || profile.is_active === false) return [];

  const role = profile.role ?? "";
  return [
    ...(FINANCE_SELF_SERVICE_ROUTE_ROLES.has(role) ? [FINANCE_ROUTE_ACCESS.overview] : []),
    ...(FINANCE_SELF_SERVICE_ROUTE_ROLES.has(role) ? [FINANCE_ROUTE_ACCESS.claims] : []),
    ...(FINANCE_APPROVAL_ROUTE_ROLES.has(role) || role === "employee" || role === "hr_user"
      ? [FINANCE_ROUTE_ACCESS.advances]
      : []),
    ...(FINANCE_APPROVAL_ROUTE_ROLES.has(role) || role === "employee" || role === "hr_user"
      ? [FINANCE_ROUTE_ACCESS.travel]
      : []),
    ...(FINANCE_VEHICLE_ROUTE_ROLES.has(role) ? [FINANCE_ROUTE_ACCESS.vehicles] : []),
  ];
}
