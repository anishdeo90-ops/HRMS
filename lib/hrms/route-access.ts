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
