"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, Target, TrendingUp, Users } from "lucide-react";
import { Badge, Card, EmptyState, StatCard } from "@/components/hrms/ui";
import { useHrmsData } from "@/lib/hrms/client-api";
import { EMPTY, fmtAggregate, fmtDate, fmtPercent } from "@/lib/hrms/format";
import { CHART } from "@/lib/hrms/theme";
import { requestTone, titleCase } from "@/lib/hrms/status";
import type { Appraisal, Goal, PerformanceCycle, RankingEntry } from "@/lib/hrms/types";

/** `docs/hrms/13-performance-review.md §1`. */
export default function PerformanceDashboardPage() {
  const [data] = useHrmsData<{ cycles: PerformanceCycle[]; goals: Goal[]; appraisals: Appraisal[]; ranking: RankingEntry[] }>("/api/hrms/performance", { cycles: [], goals: [], appraisals: [], ranking: [] });
  const activeCycle = data.cycles.find((c) => c.status === "active");

  const stats = useMemo(() => {
    const completed = data.appraisals.filter((a) => a.status === "completed");
    const rated = completed.filter((a) => a.final_rating != null);
    return {
      goals: data.goals.length,
      goalsCompleted: data.goals.filter((g) => g.status === "completed").length,
      averageProgress: Math.round(
        data.goals.reduce((s, g) => s + g.progress_percent, 0) / (data.goals.length || 1)
      ),
      appraisalsDue: data.appraisals.filter((a) => a.status !== "completed").length,
      // `—` when nothing has been rated, never a fabricated 0.
      averageRating:
        rated.length === 0
          ? null
          : Math.round((rated.reduce((s, a) => s + (a.final_rating ?? 0), 0) / rated.length) * 10) / 10,
    };
  }, [data]);

  const statusBreakdown = useMemo(() => {
    const order = ["not_started", "self_review", "manager_review", "hr_review", "completed"];
    return order.map((status) => ({
      status: titleCase(status),
      count: data.appraisals.filter((a) => a.status === status).length,
    }));
  }, [data.appraisals]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Active Goals" value={stats.goals} icon={Target} href="/hrms/performance/goals" />
        <StatCard
          label="Goals Completed"
          value={stats.goalsCompleted}
          tint="bg-green-50 text-green-600"
        />
        <StatCard
          label="Average Progress"
          value={fmtPercent(stats.averageProgress)}
          icon={TrendingUp}
          tint="bg-gray-100 text-graphite"
        />
        <StatCard
          label="Appraisals Due"
          value={stats.appraisalsDue}
          icon={Users}
          tint="bg-amber-50 text-amber-600"
          href="/hrms/performance/appraisals"
        />
        <StatCard
          label="Average Rating"
          value={fmtAggregate(stats.averageRating, " / 5")}
          icon={Award}
          tint="bg-brand-50 text-brand-600"
        />
      </div>

      {activeCycle && (
        <Card title="Active Cycle" subtitle={activeCycle.cycle_code}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-gray-900">{activeCycle.cycle_name}</p>
              <p className="mt-0.5 text-sm text-gray-500">
                {fmtDate(activeCycle.period_start)} — {fmtDate(activeCycle.period_end)} ·{" "}
                {activeCycle.participants} participants
              </p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Self Review
                </dt>
                <dd className="text-sm text-gray-700">
                  {fmtDate(activeCycle.self_review_start)} — {fmtDate(activeCycle.self_review_end)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Manager Review
                </dt>
                <dd className="text-sm text-gray-700">
                  {fmtDate(activeCycle.manager_review_start)} —{" "}
                  {fmtDate(activeCycle.manager_review_end)}
                </dd>
              </div>
            </dl>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Appraisal Progress">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 10 }} stroke={CHART.axis} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke={CHART.axis} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill={CHART.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Top Performers"
          actions={
            <Link href="/hrms/performance/reports" className="text-xs font-medium text-brand-600 hover:underline">
              View all
            </Link>
          }
          bodyClassName="p-0"
        >
          {data.ranking.length === 0 ? (
            <EmptyState title="Nobody rated yet" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.ranking.slice(0, 5).map((r) => (
                <li key={r.employee_id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-amber-50 text-xs font-bold text-amber-700">
                    {r.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{r.employee_name}</p>
                    <p className="text-xs text-gray-500">{r.department ?? EMPTY}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{r.total_score}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Goals At Risk" subtitle="Below half progress with the cycle already running" bodyClassName="p-0">
        {data.goals.filter((g) => g.progress_percent < 50 && g.status !== "completed").length === 0 ? (
          <EmptyState title="No goals at risk" />
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.goals.filter((g) => g.progress_percent < 50 && g.status !== "completed").map((g) => (
              <li key={g.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{g.title}</p>
                    <p className="text-xs text-gray-500">
                      {g.employee_name} · due {fmtDate(g.due_date)}
                    </p>
                  </div>
                  <Badge tone={requestTone(g.status)}>{titleCase(g.status)}</Badge>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${g.progress_percent}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
