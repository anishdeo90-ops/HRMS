"use client";

import { useMemo, useState } from "react";
import { Card, DataTable, SelectFilter, Toolbar, type Column } from "@/components/hrms/ui";
import SettingsPage from "@/components/hrms/settings-page";
import { useHrmsData } from "@/lib/hrms/client-api";
import { EMPTY, fmtDateTime } from "@/lib/hrms/format";
import { titleCase } from "@/lib/hrms/status";
import type { ActivityLogEntry } from "@/lib/hrms/types";

/**
 * `docs/hrms/07-settings.md` — the audit trail.
 *
 * Backed by the same append-only event store every module writes to, which is
 * why a PII read shows up here alongside a settings change: they are both
 * events, not module-specific logging.
 */
export default function ActivityLogsPage() {
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [activity] = useHrmsData<ActivityLogEntry[]>("/api/hrms/settings/activity-logs", []);

  const entities = useMemo(
    () => Array.from(new Set(activity.map((e) => e.entity_type))),
    [activity]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activity.filter((e) => {
      if (entity && e.entity_type !== entity) return false;
      if (!q) return true;
      return [e.actor_name, e.action, e.entity_label].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [activity, search, entity]);

  const columns: Column<ActivityLogEntry>[] = [
    { key: "when", header: "When", render: (e) => fmtDateTime(e.occurred_at) },
    {
      key: "actor",
      header: "Actor",
      render: (e) => <span className="font-medium text-gray-900">{e.actor_name}</span>,
    },
    { key: "action", header: "Action", render: (e) => e.action },
    {
      key: "entity",
      header: "Entity",
      render: (e) => (
        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{e.entity_type}</code>
      ),
    },
    { key: "label", header: "Record", render: (e) => e.entity_label ?? EMPTY },
    { key: "ip", header: "IP Address", render: (e) => e.ip_address ?? EMPTY },
  ];

  return (
    <SettingsPage
      title="Activity Logs"
      description="Every state change, read of a protected field and job run, in one append-only trail."
    >
      <Card title="Activity" bodyClassName="p-4">
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search actor, action or record"
          onReset={() => {
            setSearch("");
            setEntity("");
          }}
          onExport={() => {}}
        >
          <SelectFilter
            label="All Entities"
            value={entity}
            onChange={setEntity}
            options={entities.map((e) => ({ value: e, label: titleCase(e) }))}
          />
        </Toolbar>

        <DataTable columns={columns} rows={rows} getKey={(e) => e.id} empty="No activity recorded" dense />

        <p className="mt-3 text-xs text-gray-500">
          Entries are never edited or removed. A correction is a new entry, so the history of what
          the record used to say survives.
        </p>
      </Card>
    </SettingsPage>
  );
}
