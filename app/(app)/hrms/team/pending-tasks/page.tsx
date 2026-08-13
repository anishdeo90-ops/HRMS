"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Card, EmptyState, StatCard } from "@/components/hrms/ui";
import { useHrmsApi } from "@/lib/hrms/api-client";

interface TaskGroup {
  label: string;
  count: number;
  href: string;
  hint: string;
}

export default function PendingTasksPage() {
  const { data } = useHrmsApi<{ pending_tasks: TaskGroup[] }>("/api/hrms/approvals", { pending_tasks: [] });
  const total = data.pending_tasks.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Total Pending" value={total} icon={ClipboardList} />
        <StatCard label="Approval Requests" value={total} tint="bg-amber-50 text-amber-600" href="/hrms/team/approvals" />
      </div>
      <Card title="Pending Tasks" bodyClassName="p-0">
        {data.pending_tasks.length === 0 ? (
          <EmptyState title="Nothing pending" hint="Every queue is clear." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.pending_tasks.map((g) => (
              <li key={g.label}>
                <Link href={g.href} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-brand-50/50">
                  <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-600">{g.count}</span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-gray-900">{g.label}</span><span className="block text-xs text-gray-500">{g.hint}</span></span>
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
