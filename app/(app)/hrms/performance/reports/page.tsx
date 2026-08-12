"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  SelectFilter,
  SubTabs,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_DEPARTMENTS, DEMO_RANKING, DEMO_RANKING_CRITERIA } from "@/lib/hrms/demo-data";
import { EMPTY, fmtAggregate } from "@/lib/hrms/format";
import type { RankingEntry } from "@/lib/hrms/types";

/**
 * `docs/hrms/02-team.md §4` — Employee Ranking and Team Ranking.
 *
 * Team Ranking carries four narrative fields the employee's own view does not:
 * Employee Feedback, Appraisers Remarks, Areas of Improvement and Next Level Up
 * Scope. Whether the employee sees the appraiser's remarks is a policy decision,
 * so it is a visibility flag rather than a hidden column — the default here is
 * that remarks are shared, because hiding them is the more surprising stance.
 */

interface TeamRankRow extends RankingEntry {
  quarter: string;
  employee_feedback?: string;
  appraiser_remarks?: string;
  areas_of_improvement?: string;
  next_level_scope?: string;
}

const NARRATIVE: Record<string, Partial<TeamRankRow>> = {
  "e-3": {
    employee_feedback: "Rollout took longer than planned because two branches lacked biometric hardware.",
    appraiser_remarks: "Held the compliance line through a difficult audit. Exceptional judgement.",
    areas_of_improvement: "Delegate more of the payroll reconciliation work.",
    next_level_scope: "Ready for Head of HR within two cycles.",
  },
  "e-13": {
    employee_feedback: "Shipped tagging ahead of schedule; sprint scope slipped twice.",
    appraiser_remarks: "Strongest engineer on the team. Reviews raise everyone's quality.",
    areas_of_improvement: "Estimate more conservatively at sprint planning.",
    next_level_scope: "Senior Engineer at the next cycle.",
  },
  "e-4": {
    employee_feedback: "Placement target within reach; time-to-fill still above the goal.",
    appraiser_remarks: "Reliable under load. Client feedback consistently positive.",
    areas_of_improvement: "Sourcing pipeline depth for niche roles.",
    next_level_scope: "Team Lead in 2-3 cycles.",
  },
};

export default function PerformanceReportsPage() {
  const [view, setView] = useState<"employee" | "team">("employee");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");

  const rows = useMemo<TeamRankRow[]>(() => {
    const q = search.trim().toLowerCase();
    return DEMO_RANKING.map((r) => ({
      ...r,
      quarter: "Q2 FY 2026-27",
      ...NARRATIVE[r.employee_id],
    })).filter((r) => {
      if (department && r.department !== department) return false;
      if (!q) return true;
      return [r.employee_name, r.employee_code].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, department]);

  const baseColumns: Column<TeamRankRow>[] = [
    {
      key: "rank",
      header: "Rank",
      align: "center",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
              r.rank <= 3 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"
            }`}
          >
            {r.rank}
          </span>
          {r.change != null && r.change !== 0 && (
            <span className={r.change > 0 ? "text-green-600" : "text-red-500"}>
              {r.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            </span>
          )}
        </span>
      ),
    },
    { key: "code", header: "Employee Code", render: (r) => r.employee_code },
    {
      key: "name",
      header: "Employee Name",
      render: (r) => <span className="font-medium text-gray-900">{r.employee_name}</span>,
    },
    { key: "department", header: "Department", render: (r) => r.department ?? EMPTY },
    { key: "quarter", header: "Quarter", render: (r) => r.quarter },
    ...DEMO_RANKING_CRITERIA.slice(0, 4).map<Column<TeamRankRow>>((c) => ({
      key: c.key,
      header: c.label,
      align: "center",
      render: () => fmtAggregate(4, " / 5"),
    })),
    {
      key: "attendance",
      header: "Attendance Score",
      align: "right",
      render: (r) => fmtAggregate(r.attendance_score),
    },
    { key: "goal", header: "Goal Score", align: "right", render: (r) => fmtAggregate(r.goal_score) },
    {
      key: "overall",
      header: "Overall Score",
      align: "right",
      render: (r) => <span className="font-semibold text-gray-900">{r.total_score}</span>,
    },
  ];

  const narrativeColumns: Column<TeamRankRow>[] = [
    {
      key: "feedback",
      header: "Employee Feedback",
      render: (r) => (
        <span className="block max-w-[240px] truncate" title={r.employee_feedback}>
          {r.employee_feedback ?? EMPTY}
        </span>
      ),
    },
    {
      key: "remarks",
      header: "Appraiser's Remarks",
      render: (r) => (
        <span className="block max-w-[240px] truncate" title={r.appraiser_remarks}>
          {r.appraiser_remarks ?? EMPTY}
        </span>
      ),
    },
    {
      key: "improve",
      header: "Areas of Improvement",
      render: (r) => (
        <span className="block max-w-[240px] truncate" title={r.areas_of_improvement}>
          {r.areas_of_improvement ?? EMPTY}
        </span>
      ),
    },
    {
      key: "scope",
      header: "Next Level Up Scope",
      render: (r) => (
        <span className="block max-w-[240px] truncate" title={r.next_level_scope}>
          {r.next_level_scope ?? EMPTY}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <Button variant="ghost" onClick={() => toast.success(`${r.employee_name}'s rank opened`)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Card
      title={view === "employee" ? "Employee Ranking" : "Team Rank"}
      subtitle="Criteria and weightages come from the appraisal template, not fixed columns"
      bodyClassName="p-4"
      actions={
        view === "team" ? (
          <Button icon={Plus} variant="primary" onClick={() => toast.success("Add Team Rank opened")}>
            Add Team Rank
          </Button>
        ) : undefined
      }
    >
      <SubTabs
        tabs={[
          { key: "employee", label: "Employee Ranking", count: rows.length },
          { key: "team", label: "Team Ranking", count: rows.length },
        ]}
        value={view}
        onChange={setView}
      />

      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search employee or code"
        onReset={() => {
          setSearch("");
          setDepartment("");
        }}
        onExport={() => {}}
      >
        <SelectFilter
          label="All Departments"
          value={department}
          onChange={setDepartment}
          options={DEMO_DEPARTMENTS.map((d) => ({ value: d.name, label: d.name }))}
        />
      </Toolbar>

      <DataTable
        columns={view === "team" ? [...baseColumns, ...narrativeColumns] : baseColumns}
        rows={rows}
        getKey={(r) => r.employee_id}
        empty="Nobody has been ranked yet"
        dense
      />

      {view === "team" && (
        <p className="mt-3 text-xs text-gray-500">
          Appraiser remarks are visible to the employee on their own Ranking page. Change that
          under <span className="font-medium text-gray-700">Settings → Policy Setup</span>.
        </p>
      )}
    </Card>
  );
}
