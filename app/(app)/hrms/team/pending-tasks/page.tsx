"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, EmptyState, StatCard } from "@/components/hrms/ui";
import {
  DEMO_APPROVAL_REQUESTS,
  DEMO_EMPLOYEE_DOCUMENTS,
  DEMO_EXPENSE_CLAIMS,
  DEMO_ONBOARDING_CASES,
  DEMO_SEPARATIONS,
  DEMO_TICKETS,
} from "@/lib/hrms/demo-data";
import { titleCase } from "@/lib/hrms/status";

/**
 * `docs/hrms/06-approvals.md §4` — the aggregate task counter.
 *
 * Because every request type lives in one engine, this page is a `group by
 * request_type` over `approval_requests` plus a handful of module counts, not a
 * hand-maintained list that drifts each time a request type is added.
 */

interface TaskGroup {
  label: string;
  count: number;
  href: string;
  hint: string;
  icon?: LucideIcon;
}

export default function PendingTasksPage() {
  const approvalGroups = useMemo<TaskGroup[]>(() => {
    const byType: Record<string, number> = {};
    for (const r of DEMO_APPROVAL_REQUESTS) {
      if (r.status !== "pending") continue;
      byType[r.request_type] = (byType[r.request_type] ?? 0) + 1;
    }
    return Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        label: `${titleCase(type)} requests`,
        count,
        href: "/hrms/team/approvals",
        hint: "Waiting on an approval step",
      }));
  }, []);

  const otherGroups = useMemo<TaskGroup[]>(
    () => [
      {
        label: "Candidate offers to approve",
        count: DEMO_ONBOARDING_CASES.filter((c) => c.status === "pending_approval").length,
        href: "/hrms/onboarding/candidate-approval",
        hint: "Offer raised, awaiting sign-off",
      },
      {
        label: "Onboarding documents to verify",
        count: DEMO_ONBOARDING_CASES.filter((c) => c.status === "documents_submitted").length,
        href: "/hrms/onboarding/documents-approval",
        hint: "All documents received, not yet checked",
      },
      {
        label: "Reimbursement claims to approve",
        count: DEMO_EXPENSE_CLAIMS.filter((c) => c.status === "pending").length,
        href: "/hrms/more/reimbursement-approval",
        hint: "Approved claims become a payroll line",
      },
      {
        label: "Separations awaiting approval",
        count: DEMO_SEPARATIONS.filter((s) => s.status === "pending").length,
        href: "/hrms/team/separation",
        hint: "Blocks the final settlement until cleared",
      },
      {
        label: "Open helpdesk tickets",
        count: DEMO_TICKETS.filter((t) => t.status === "open" || t.status === "in_progress").length,
        href: "/hrms/team/tickets",
        hint: "Assigned to HR or unassigned",
      },
      {
        label: "Employee documents pending",
        count: DEMO_EMPLOYEE_DOCUMENTS.filter((d) => d.status === "pending").length,
        href: "/hrms/team/directory",
        hint: "Mandatory documents not yet uploaded",
      },
    ],
    []
  );

  const groups = [...approvalGroups, ...otherGroups].filter((g) => g.count > 0);
  const total = groups.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Pending" value={total} icon={ClipboardList} />
        <StatCard
          label="Approval Requests"
          value={approvalGroups.reduce((s, g) => s + g.count, 0)}
          tint="bg-amber-50 text-amber-600"
          href="/hrms/team/approvals"
        />
        <StatCard
          label="Other Tasks"
          value={otherGroups.reduce((s, g) => s + g.count, 0)}
          tint="bg-gray-100 text-graphite"
        />
      </div>

      <Card
        title="Pending Tasks"
        subtitle="Everything waiting on you, grouped by what it is"
        bodyClassName="p-0"
      >
        {groups.length === 0 ? (
          <EmptyState title="Nothing pending" hint="Every queue is clear." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {groups.map((g) => (
              <li key={g.label}>
                <Link
                  href={g.href}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-brand-50/50"
                >
                  <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-600">
                    {g.count}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">{g.label}</span>
                    <span className="block text-xs text-gray-500">{g.hint}</span>
                  </span>
                  <ArrowRight size={15} className="flex-shrink-0 text-gray-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
