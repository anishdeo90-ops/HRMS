import type { HrmsProfile } from "@/lib/hrms/authorization";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type HrmsEmployeeTarget = {
  id?: string | null;
  profile_id?: string | null;
  department_id?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_profile_id?: string | null;
};

export function employeeAccessTarget(employee: any): HrmsEmployeeTarget | null {
  if (!employee) return null;
  return {
    id: employee.id,
    profile_id: employee.profile_id,
    department_id: employee.department_id,
    reporting_manager_id: employee.reporting_manager_id,
    reporting_manager_profile_id: employee.reporting_manager_profile_id ?? employee.reporting_manager?.profile_id,
  };
}

export async function currentHrmsProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase.from("profiles").select("id, role, is_active").eq("id", user.id).single();
  if (!profile?.role) return { user, profile: profile as HrmsProfile | null };

  const admin = await createAdminClient();
  const { data: rolePermissions } = await admin.from("role_permissions").select("permission_key").eq("role_key", `role.${profile.role}`);
  const { data: approverEmployee } = await admin.from("employees").select("id").eq("profile_id", user.id).maybeSingle();
  const { data: departmentApprovals } = approverEmployee?.id
    ? await admin
      .from("department_approvers")
      .select("department_id, approval_scope")
      .eq("approver_employee_id", approverEmployee.id)
      .eq("is_active", true)
    : { data: [] };

  return {
    user,
    profile: {
      ...profile,
      permissions: rolePermissions?.map((permission) => permission.permission_key) ?? [],
      department_approvals: departmentApprovals ?? [],
    } as HrmsProfile & { permissions: string[] },
  };
}

export async function resolveLeaveTargetEmployee(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  employeeId?: string | null,
) {
  let query = supabase
    .from("employees")
    .select("id, profile_id, department_id, reporting_manager_id, reporting_manager:employees!employees_reporting_manager_id_fkey(profile_id)");

  query = employeeId ? query.eq("id", employeeId) : query.eq("profile_id", userId);
  const { data, error } = await query.maybeSingle();
  return { employee: employeeAccessTarget(data), error };
}
