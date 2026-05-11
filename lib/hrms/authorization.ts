import type { Role } from "@/lib/types";

export type HrmsProfile = {
  id?: string | null;
  role?: Role | string | null;
  is_active?: boolean | null;
};

export type EmployeeAccessTarget = {
  id?: string | null;
  profile_id?: string | null;
  reporting_manager_id?: string | null;
};

const EMPLOYEE_CORE_MANAGERS = new Set(["admin", "hr_manager"]);
const BASIC_EMPLOYEE_EDITORS = new Set(["admin", "hr_manager", "hr_user"]);
const ORGANIZATION_MANAGERS = new Set(["admin", "hr_manager", "hr_user"]);
const DOCUMENT_MANAGERS = new Set(["admin", "hr_manager", "hr_user"]);

function activeRole(profile: HrmsProfile | null | undefined) {
  if (!profile || profile.is_active === false) return "";
  return profile.role ?? "";
}

export function canManageEmployeeCore(profile: HrmsProfile | null | undefined) {
  return EMPLOYEE_CORE_MANAGERS.has(activeRole(profile));
}

export function canUpdateEmployeeBasic(profile: HrmsProfile | null | undefined) {
  return BASIC_EMPLOYEE_EDITORS.has(activeRole(profile));
}

export function canManageOrganization(profile: HrmsProfile | null | undefined) {
  return ORGANIZATION_MANAGERS.has(activeRole(profile));
}

export function canManageDepartmentApprovers(profile: HrmsProfile | null | undefined) {
  return ORGANIZATION_MANAGERS.has(activeRole(profile));
}

export function canManageEmployeeDocuments(profile: HrmsProfile | null | undefined) {
  return DOCUMENT_MANAGERS.has(activeRole(profile));
}

export function canWriteEmployee(profile: HrmsProfile | null | undefined) {
  return canManageEmployeeCore(profile) || canUpdateEmployeeBasic(profile);
}

export function canViewEmployee(profile: HrmsProfile | null | undefined, employee: EmployeeAccessTarget | null | undefined) {
  const role = activeRole(profile);
  if (!role || !employee) return false;
  if (BASIC_EMPLOYEE_EDITORS.has(role)) return true;
  if (role === "employee") return Boolean(profile?.id && employee.profile_id === profile.id);
  return false;
}

export const HRMS_PERMISSION_KEYS = {
  employeeManage: "permission.employee.manage",
  employeeUpdateBasic: "permission.employee.update_basic",
  employeeView: "permission.employee.view",
  organizationManage: "permission.organization.manage",
  documentsManage: "permission.documents.manage",
  documentsView: "permission.documents.view",
  departmentApproversManage: "permission.department_approvers.manage",
} as const;
