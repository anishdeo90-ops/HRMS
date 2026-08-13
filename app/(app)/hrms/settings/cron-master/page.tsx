"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Play } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  StatCard,
  Toggle,
  type Column,
} from "@/components/hrms/ui";
import SettingsPage from "@/components/hrms/settings-page";
import { saveHrmsData, useHrmsData } from "@/lib/hrms/client-api";
import { EMPTY, fmtDateTime } from "@/lib/hrms/format";
import type { CronJob } from "@/lib/hrms/types";

/**
 * `docs/hrms/12-advanced-settings-cron-holiday.md §4`.
 *
 * The attendance register is materialised by a job rather than derived on read,
 * which is why this screen exists at all — and why a failed run is an incident,
 * not a log line. Failures surface at the top instead of being buried in a
 * status column.
 */
export default function CronMasterPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    {}
  );
  const [jobs, reload] = useHrmsData<CronJob[]>("/api/hrms/settings/cron-jobs", []);

  const failing = jobs.filter((j) => j.last_status === "failed");

  const columns: Column<CronJob>[] = [
    {
      key: "name",
      header: "Job",
      render: (j) => (
        <div>
          <p className="font-medium text-gray-900">{j.name}</p>
          {j.description && <p className="max-w-[320px] text-xs text-gray-500">{j.description}</p>}
        </div>
      ),
    },
    { key: "schedule", header: "Schedule", render: (j) => j.schedule },
    { key: "last", header: "Last Run", render: (j) => fmtDateTime(j.last_run_at) },
    { key: "next", header: "Next Run", render: (j) => fmtDateTime(j.next_run_at) },
    {
      key: "status",
      header: "Last Status",
      render: (j) =>
        !j.last_status ? (
          <span className="text-gray-300">{EMPTY}</span>
        ) : (
          <Badge
            tone={
              j.last_status === "success"
                ? "bg-green-100 text-green-700"
                : j.last_status === "failed"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-800"
            }
          >
            {j.last_status}
          </Badge>
        ),
    },
    {
      key: "enabled",
      header: "Enabled",
      align: "center",
      render: (j) => (
        <Toggle
          checked={enabled[j.id] ?? j.is_enabled}
          onChange={async (v) => {
            setEnabled((prev) => ({ ...prev, [j.id]: v }));
            await saveHrmsData("/api/hrms/settings/cron-jobs", { id: j.id, is_enabled: v });
            await reload();
            toast.success(`${j.name} ${v ? "enabled" : "disabled"}`);
          }}
          label={j.name}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (j) => (
        <Button icon={Play} disabled>
          Run Now
        </Button>
      ),
    },
  ];

  return (
    <SettingsPage
      title="Cron Master"
      description="Scheduled jobs, their last run and whether it succeeded."
    >
      <div className="space-y-5">
        {failing.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {failing.length} {failing.length === 1 ? "job is" : "jobs are"} failing
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-red-700">
                {failing.map((j) => (
                  <li key={j.id}>
                    {j.name} — last attempted {fmtDateTime(j.last_run_at)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Jobs" value={jobs.length} />
          <StatCard
            label="Enabled"
            value={Object.values(enabled).filter(Boolean).length}
            tint="bg-green-50 text-green-600"
          />
          <StatCard label="Failing" value={failing.length} tint="bg-red-50 text-red-600" />
        </div>

        <Card title="Scheduled Jobs" bodyClassName="p-4">
          <DataTable columns={columns} rows={jobs} getKey={(j) => j.id} empty="No jobs configured" dense />
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            The attendance register job is load-bearing: if it does not run, days do not exist to
            be marked on, and absences cannot be counted. It should alert on failure rather than
            wait to be noticed here.
          </p>
        </Card>
      </div>
    </SettingsPage>
  );
}
