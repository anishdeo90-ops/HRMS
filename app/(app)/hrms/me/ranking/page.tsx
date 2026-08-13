"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { Badge, Card, DataTable, StatCard, Toolbar, type Column } from "@/components/hrms/ui";
import { useHrmsData } from "@/lib/hrms/client-api";
import { EMPTY, fmtAggregate, fmtPercent } from "@/lib/hrms/format";

interface MyRankingRow {
  id: string;
  employee_code: string;
  employee_name: string;
  quarter: string;
  rank: number;
  cohort_size: number;
  scores: Record<string, number>;
  overall_percentage: number;
  overall_score: number;
}

const RANKING_CRITERIA = [
  { key: "delivery", label: "Delivery", weightage: 25 },
  { key: "quality", label: "Quality", weightage: 25 },
  { key: "ownership", label: "Ownership", weightage: 25 },
];

/**
 * `docs/hrms/04-me.md §4`.
 *
 * The criteria columns are generated from the template, not hard-coded — the
 * reference's eight fixed columns are one template rendered wide, and a ninth
 * criterion must be a config row rather than a migration.
 */
export default function MyRankingPage() {
  const [quarter, setQuarter] = useState("");
  const [ranking] = useHrmsData<MyRankingRow[]>("/api/hrms/performance/ranking", []);

  const rows = ranking.filter((r) => !quarter || r.quarter === quarter);
  const latest = ranking[0];

  const columns: Column<MyRankingRow>[] = [
    { key: "code", header: "Employee Code", render: (r) => r.employee_code },
    {
      key: "name",
      header: "Employee Name",
      render: (r) => <span className="font-medium text-gray-900">{r.employee_name}</span>,
    },
    { key: "quarter", header: "Quarter", render: (r) => r.quarter },
    {
      key: "rank",
      header: "Rank",
      align: "center",
      render: (r) => (
        <Badge tone={r.rank === 1 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}>
          {r.rank} of {r.cohort_size}
        </Badge>
      ),
    },
    ...RANKING_CRITERIA.map<Column<MyRankingRow>>((c) => ({
      key: c.key,
      header: c.label,
      align: "center",
      render: (r) => (
        <span title={`Weightage ${c.weightage}%`}>
          {r.scores[c.key] != null ? `${r.scores[c.key]} / 5` : EMPTY}
        </span>
      ),
    })),
    {
      key: "pct",
      header: "Overall Percentage",
      align: "right",
      render: (r) => <span className="font-semibold text-gray-900">{fmtPercent(r.overall_percentage)}</span>,
    },
    {
      key: "score",
      header: "Overall Score",
      align: "right",
      render: (r) => fmtAggregate(r.overall_score, " / 5"),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Current Rank"
          value={latest ? `${latest.rank} of ${latest.cohort_size}` : EMPTY}
          hint={latest?.quarter}
          icon={Trophy}
          tint="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Overall Score"
          value={latest ? fmtAggregate(latest.overall_score, " / 5") : EMPTY}
        />
        <StatCard
          label="Overall Percentage"
          value={latest ? fmtPercent(latest.overall_percentage) : EMPTY}
        />
        <StatCard label="Quarters Rated" value={ranking.length} />
      </div>

      <Card title="Your Ranking" subtitle="Rated quarterly against your department cohort" bodyClassName="p-4">
        <Toolbar onReset={() => setQuarter("")} onExport={() => {}}>
          <select
            aria-label="Quarter"
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700"
          >
            <option value="">All quarters</option>
            {ranking.map((r) => (
              <option key={r.id} value={r.quarter}>
                {r.quarter}
              </option>
            ))}
          </select>
        </Toolbar>

        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.id}
          empty="You have not been rated yet"
          dense
        />

        <p className="mt-3 text-xs text-gray-500">
          Criteria and weightages come from the appraisal template assigned to your designation.
          See{" "}
          <span className="font-medium text-gray-700">Performance Review → Appraisal Templates</span>.
        </p>
      </Card>
    </div>
  );
}
