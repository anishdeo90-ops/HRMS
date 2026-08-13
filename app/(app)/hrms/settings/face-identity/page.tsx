"use client";

import { useMemo, useState } from "react";
import { ScanFace, ShieldAlert, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  SelectFilter,
  StatCard,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import SettingsPage from "@/components/hrms/settings-page";
import { useHrmsData } from "@/lib/hrms/client-api";
import { EMPTY, fmtDate, initials } from "@/lib/hrms/format";
import type { Employee } from "@/lib/hrms/types";

/**
 * `docs/hrms/07-settings.md` — biometric enrolment for attendance capture.
 *
 * Face templates are a distinct category under the DPDP Act: they need explicit
 * consent, a stated retention period, and deletion on exit. The vault therefore
 * shows consent and retention as first-class columns rather than storing a
 * template quietly against the employee record.
 */

interface Enrolment {
  employee: Employee;
  enrolled: boolean;
  enrolled_on?: string;
  consent_given: boolean;
  device_count: number;
}

export default function FaceIdentityVaultPage() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [state, setState] = useState("");
  const [enrolments] = useHrmsData<Enrolment[]>("/api/hrms/settings/face-identities", []);
  const [options] = useHrmsData<{ branches: { name: string }[] }>("/api/hrms/options", { branches: [] });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrolments.filter((r) => {
      if (branch && r.employee.branch !== branch) return false;
      if (state === "enrolled" && !r.enrolled) return false;
      if (state === "not_enrolled" && r.enrolled) return false;
      if (state === "no_consent" && r.consent_given) return false;
      if (!q) return true;
      return [r.employee.name, r.employee.employee_code].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [enrolments, search, branch, state]);

  const stats = {
    enrolled: enrolments.filter((r) => r.enrolled).length,
    pending: enrolments.filter((r) => !r.enrolled).length,
    noConsent: enrolments.filter((r) => !r.consent_given).length,
  };

  const columns: Column<Enrolment>[] = [
    {
      key: "employee",
      header: "Employee",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
            {initials(r.employee.name)}
          </span>
          <div>
            <p className="font-medium text-gray-900">{r.employee.name}</p>
            <p className="text-xs text-gray-500">{r.employee.employee_code}</p>
          </div>
        </div>
      ),
    },
    { key: "branch", header: "Branch", render: (r) => r.employee.branch ?? EMPTY },
    { key: "location", header: "Work Location", render: (r) => r.employee.work_location ?? EMPTY },
    {
      key: "enrolled",
      header: "Enrolment",
      render: (r) =>
        r.enrolled ? (
          <Badge tone="bg-green-100 text-green-700">Enrolled</Badge>
        ) : (
          <Badge tone="bg-amber-100 text-amber-800">Not enrolled</Badge>
        ),
    },
    { key: "on", header: "Enrolled On", render: (r) => fmtDate(r.enrolled_on) },
    {
      key: "consent",
      header: "Consent",
      render: (r) =>
        r.consent_given ? (
          <Badge tone="bg-green-100 text-green-700">Given</Badge>
        ) : (
          <Badge tone="bg-red-100 text-red-700">Missing</Badge>
        ),
    },
    {
      key: "devices",
      header: "Devices",
      align: "right",
      render: (r) => (r.device_count ? r.device_count : EMPTY),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          {r.enrolled ? (
            <Button
              variant="ghost"
              icon={Trash2}
              disabled
            >
              Delete Template
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={ScanFace}
              disabled
              title={!r.consent_given ? "Consent must be recorded before enrolment" : undefined}
            >
              Enrol
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <SettingsPage
      title="Face Identity Vault"
      description="Biometric templates used to match attendance punches back to an employee."
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <ShieldAlert size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Biometric data is a separate consent category</p>
            <p className="mt-0.5 text-xs">
              Face templates need explicit consent, a stated retention period and deletion on exit.
              Templates are stored encrypted, never leave the vault, and every read is logged.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Enrolled" value={stats.enrolled} icon={ScanFace} tint="bg-green-50 text-green-600" />
          <StatCard label="Not Enrolled" value={stats.pending} tint="bg-amber-50 text-amber-600" />
          <StatCard label="Consent Missing" value={stats.noConsent} tint="bg-red-50 text-red-600" />
        </div>

        <Card title="Enrolment" bodyClassName="p-4">
          <Toolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search employee or code"
            onReset={() => {
              setSearch("");
              setBranch("");
              setState("");
            }}
            onExport={() => {}}
          >
            <SelectFilter
              label="All Branches"
              value={branch}
              onChange={setBranch}
              options={options.branches.map((b) => ({ value: b.name, label: b.name }))}
            />
            <SelectFilter
              label="All States"
              value={state}
              onChange={setState}
              options={[
                { value: "enrolled", label: "Enrolled" },
                { value: "not_enrolled", label: "Not enrolled" },
                { value: "no_consent", label: "Consent missing" },
              ]}
            />
          </Toolbar>

          <DataTable
            columns={columns}
            rows={rows}
            getKey={(r) => r.employee.id}
            empty="No employees match these filters"
            dense
          />
        </Card>

        <Card title="Retention">
          <ul className="space-y-2.5 text-sm text-gray-600">
            <li>Templates are deleted automatically 30 days after an employee&apos;s last working day.</li>
            <li>An employee may withdraw consent at any time; the template is deleted the same day.</li>
            <li>Attendance already recorded is unaffected — punches keep their timestamps, not the biometric.</li>
          </ul>
        </Card>
      </div>
    </SettingsPage>
  );
}
