"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  SelectFilter,
  StatCard,
  SubTabs,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { useHrmsData } from "@/lib/hrms/client-api";
import { EMPTY, fmtAggregate, fmtDate } from "@/lib/hrms/format";
import { titleCase } from "@/lib/hrms/status";
import type { Appraisal, PerformanceCycle } from "@/lib/hrms/types";

/** `docs/hrms/13-performance-review.md §4` — My, Team and HR appraisal views. */

const STAGE_TONE: Record<Appraisal["status"], string> = {
  not_started: "bg-gray-100 text-gray-500",
  self_review: "bg-amber-100 text-amber-800",
  manager_review: "bg-brand-100 text-brand-700",
  hr_review: "bg-slate-200 text-slate-700",
  completed: "bg-green-100 text-green-700",
};

export default function AppraisalsPage() {
  const [view, setView] = useState<"mine" | "team" | "hr">("mine");
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState("");
  const [status, setStatus] = useState("");
  const [appraisals] = useHrmsData<Appraisal[]>("/api/hrms/performance/appraisals", []);
  const [cycles] = useHrmsData<PerformanceCycle[]>("/api/hrms/performance/cycles", []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appraisals.filter((a) => {
      if (view === "hr" && a.status !== "hr_review" && a.status !== "completed") return false;
      if (cycle && a.cycle_name !== cycle) return false;
      if (status && a.status !== status) return false;
      if (!q) return true;
      return [a.employee_name, a.employee_code, a.cycle_name].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [appraisals, view, search, cycle, status]);

  const stats = useMemo(() => {
    const rated = appraisals.filter((a) => a.final_rating != null);
    return {
      total: appraisals.length,
      completed: appraisals.filter((a) => a.status === "completed").length,
      awaitingMe: appraisals.filter((a) => a.status === "manager_review").length,
      averageRating:
        rated.length === 0
          ? null
          : Math.round((rated.reduce((s, a) => s + (a.final_rating ?? 0), 0) / rated.length) * 10) / 10,
    };
  }, [appraisals]);

  const columns: Column<Appraisal>[] = [
    { key: "code", header: "Employee Code", render: (a) => a.employee_code },
    {
      key: "name",
      header: "Employee Name",
      render: (a) => <span className="font-medium text-gray-900">{a.employee_name}</span>,
    },
    { key: "designation", header: "Designation", render: (a) => a.designation ?? EMPTY },
    { key: "cycle", header: "Cycle", render: (a) => a.cycle_name },
    { key: "template", header: "Template", render: (a) => a.template_name ?? EMPTY },
    {
      key: "self",
      header: "Self Score",
      align: "center",
      render: (a) => fmtAggregate(a.self_score, " / 5"),
    },
    {
      key: "manager",
      header: "Manager Score",
      align: "center",
      render: (a) => fmtAggregate(a.manager_score, " / 5"),
    },
    {
      key: "final",
      header: "Final Rating",
      align: "center",
      render: (a) =>
        a.final_rating == null ? (
          <span className="text-gray-300">{EMPTY}</span>
        ) : (
          <Badge tone={a.final_rating >= 4 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}>
            {a.final_rating} / 5
          </Badge>
        ),
    },
    { key: "submitted", header: "Submitted On", render: (a) => fmtDate(a.submitted_at) },
    {
      key: "status",
      header: "Stage",
      render: (a) => <Badge tone={STAGE_TONE[a.status]}>{titleCase(a.status)}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (a) => (
        <Button variant="ghost" disabled>
          {a.status === "completed" ? "View" : "Review"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Appraisals" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} tint="bg-green-50 text-green-600" />
        <StatCard label="Awaiting Manager" value={stats.awaitingMe} tint="bg-amber-50 text-amber-600" />
        <StatCard
          label="Average Rating"
          value={fmtAggregate(stats.averageRating, " / 5")}
          tint="bg-brand-50 text-brand-600"
        />
      </div>

      <Card title="Appraisals" subtitle="One templated system — ranking and review are not two products" bodyClassName="p-4">
        <SubTabs
          tabs={[
            { key: "mine", label: "My Appraisal", count: appraisals.length },
            { key: "team", label: "Team Appraisal", count: appraisals.length },
            { key: "hr", label: "HR Appraisal", count: appraisals.filter((a) => a.status === "hr_review" || a.status === "completed").length },
          ]}
          value={view}
          onChange={setView}
        />

        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search employee or cycle"
          onReset={() => {
            setSearch("");
            setCycle("");
            setStatus("");
          }}
          onExport={() => {}}
        >
          <SelectFilter
            label="All Cycles"
            value={cycle}
            onChange={setCycle}
            options={cycles.map((c) => ({ value: c.cycle_name, label: c.cycle_name }))}
          />
          <SelectFilter
            label="All Stages"
            value={status}
            onChange={setStatus}
            options={["not_started", "self_review", "manager_review", "hr_review", "completed"].map(
              (s) => ({ value: s, label: titleCase(s) })
            )}
          />
        </Toolbar>

        <DataTable columns={columns} rows={rows} getKey={(a) => a.id} empty="No appraisals in this view" dense />
      </Card>
    </div>
  );
}
