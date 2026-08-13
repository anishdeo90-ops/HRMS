"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Lock, Plus } from "lucide-react";
import { Badge, Button, Card, EmptyState, Toggle } from "@/components/hrms/ui";
import SettingsPage from "@/components/hrms/settings-page";
import { saveHrmsData, useHrmsData } from "@/lib/hrms/client-api";
import type { RoleDefinition } from "@/lib/hrms/types";

/**
 * `docs/hrms/07-settings.md §4`.
 *
 * Permissions are granted to roles, and a role is assigned to people — never
 * granted to a person directly, because per-person grants are what nobody can
 * audit two years later.
 *
 * System roles cannot be edited into something they are not; a tenant that needs
 * different rules clones one.
 */

const PERMISSION_GROUPS: { group: string; permissions: { key: string; label: string; hint?: string }[] }[] = [
  {
    group: "Employee Data",
    permissions: [
      { key: "employee.read", label: "View all employees" },
      { key: "employee.read.team", label: "View direct reports only" },
      { key: "employee.write", label: "Create and edit employees" },
      { key: "employee.read.pii", label: "View banking and identity fields", hint: "Reads are logged" },
    ],
  },
  {
    group: "Approvals",
    permissions: [
      { key: "approval.act", label: "Act on any request" },
      { key: "approval.act.team", label: "Act on direct reports' requests" },
      { key: "approval.delegate", label: "Delegate approvals" },
    ],
  },
  {
    group: "Attendance & Leave",
    permissions: [
      { key: "attendance.write", label: "Record manual attendance", hint: "Every write is attributed and reasoned" },
      { key: "attendance.void", label: "Void attendance rows" },
      { key: "leave.adjust", label: "Post leave ledger adjustments" },
    ],
  },
  {
    group: "Onboarding & Exit",
    permissions: [
      { key: "onboarding.manage", label: "Approve offers and initiate onboarding" },
      { key: "separation.manage", label: "Process separations and clearance" },
    ],
  },
  {
    group: "Administration",
    permissions: [
      { key: "settings.manage", label: "Change organisation settings" },
      { key: "role.manage", label: "Create roles and grant permissions" },
      { key: "report.payroll", label: "Run payroll-facing reports" },
    ],
  },
];

export default function PermissionManagementPage() {
  const [roles, reload] = useHrmsData<RoleDefinition[]>("/api/hrms/settings/permissions", []);
  const [selectedRole, setSelectedRole] = useState("");
  const role = roles.find((r) => r.id === (selectedRole || roles[0]?.id));
  const [grants, setGrants] = useState<Record<string, boolean>>({});

  function pick(roleId: string) {
    const next = roles.find((r) => r.id === roleId);
    setSelectedRole(roleId);
    setGrants(Object.fromEntries((next?.permissions ?? []).map((p) => [p, true])));
  }

  const isSuperRole = role?.permissions.includes("*");
  useEffect(() => {
    if (role) setGrants(Object.fromEntries(role.permissions.map((p) => [p, true])));
  }, [role?.id]);

  return (
    <SettingsPage
      title="Permission Management"
      description="Roles carry permissions; people carry roles. Nothing is granted to an individual."
      actions={
        <Button icon={Plus} variant="primary" disabled>
          Add Role
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card title="Roles" bodyClassName="p-0">
          <ul className="divide-y divide-gray-100">
            {roles.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => pick(r.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                    selectedRole === r.id ? "bg-brand-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                      {r.name}
                      {r.is_system && <Lock size={11} className="text-gray-400" />}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{r.description}</p>
                  </div>
                  <span className="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600">
                    {r.member_count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title={role ? `${role.name} permissions` : "Permissions"}
          subtitle={
            isSuperRole
              ? "This role has full access and cannot be narrowed"
              : role?.is_system
                ? "A system role. Clone it to change what it may do."
                : undefined
          }
          bodyClassName="p-0"
          actions={
            role && !role.is_system ? (
              <Button
                variant="primary"
                onClick={async () => {
                  await saveHrmsData("/api/hrms/settings/permissions", {
                    role_key: role.id,
                    permissions: Object.keys(grants).filter((key) => grants[key]),
                  });
                  await reload();
                  toast.success("Permissions saved");
                }}
              >
                Save
              </Button>
            ) : (
              <Button disabled>Clone Role</Button>
            )
          }
        >
          {!role ? (
            <EmptyState title="Pick a role" />
          ) : isSuperRole ? (
            <div className="px-5 py-8 text-center">
              <Badge tone="bg-brand-100 text-brand-700">Full access</Badge>
              <p className="mt-3 text-sm text-gray-600">
                Administrators can do everything. Narrowing this role would leave the organisation
                without anyone able to restore it.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.group} className="px-5 py-4">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
                    {group.group}
                  </h3>
                  <ul className="space-y-3">
                    {group.permissions.map((p) => (
                      <li key={p.key} className="flex items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900">{p.label}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-gray-400">{p.key}</p>
                          {p.hint && <p className="mt-0.5 text-xs text-gray-500">{p.hint}</p>}
                        </div>
                        <Toggle
                          checked={!!grants[p.key]}
                          disabled={role.is_system}
                          onChange={(v) => setGrants((prev) => ({ ...prev, [p.key]: v }))}
                          label={p.label}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </SettingsPage>
  );
}
