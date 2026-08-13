"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CalendarOff, Plus } from "lucide-react";
import { Badge, Button, Card, DataTable, Toolbar, type Column } from "@/components/hrms/ui";
import { hrmsMutation, useHrmsApi } from "@/lib/hrms/api-client";
import { EMPTY, fmtDate, fmtDays } from "@/lib/hrms/format";
import { requestTone, titleCase } from "@/lib/hrms/status";
import type { ApprovalRequest, LeaveBalance, RequestType } from "@/lib/hrms/types";

const REQUEST_ACTIONS: { type: RequestType; label: string }[] = [
  { type: "regularization", label: "Leave Cancellation" },
  { type: "on_duty", label: "On-duty Regularization" },
  { type: "comp_off", label: "C-OFF Application" },
  { type: "wfh", label: "WFH Application" },
  { type: "week_off_swap", label: "Week-off Application" },
  { type: "early_in_out", label: "Early In/Out" },
];

export default function MyLeavesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const { data, reload } = useHrmsApi<{ leave_balances: LeaveBalance[]; requests: ApprovalRequest[] }>(
    "/api/hrms/leaves",
    { leave_balances: [], requests: [] }
  );

  const rows = useMemo(() => data.requests.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (typeFilter && r.request_type !== typeFilter) return false;
    const q = search.trim().toLowerCase();
    return !q || [r.request_code, r.subject, r.reason].some((f) => String(f ?? "").toLowerCase().includes(q));
  }), [data.requests, search, statusFilter, typeFilter]);

  async function cancel(id: string) {
    await hrmsMutation(`/api/hrms/leaves/${id}`, "PATCH", { status: "cancelled" });
    toast.success("Request cancelled");
    reload();
  }

  async function submitShort(type: RequestType, label: string) {
    await hrmsMutation("/api/hrms/attendance/regularizations", "POST", {
      request_type: type,
      subject: label,
      from_date: new Date().toISOString().slice(0, 10),
      to_date: new Date().toISOString().slice(0, 10),
      days: 1,
      reason: label,
    });
    toast.success(`${label} submitted`);
    reload();
  }

  const columns: Column<ApprovalRequest>[] = [
    { key: "code", header: "Request", render: (r) => <div><p className="font-medium text-gray-900">{r.request_code}</p><p className="text-xs text-gray-500">{titleCase(r.request_type)}</p></div> },
    { key: "applied", header: "Application Date", render: (r) => fmtDate(r.applied_at) },
    { key: "subject", header: "Leave", render: (r) => r.subject },
    { key: "from", header: "From Date", render: (r) => fmtDate(r.from_date) },
    { key: "to", header: "To Date", render: (r) => fmtDate(r.to_date) },
    { key: "period", header: "Period", render: (r) => fmtDays(r.days) },
    { key: "reason", header: "Reason", render: (r) => <span className="block max-w-[220px] truncate">{r.reason ?? EMPTY}</span> },
    { key: "manager", header: "Manager", render: (r) => r.steps[0]?.approver_name ?? EMPTY },
    { key: "status", header: "Status", render: (r) => <Badge tone={requestTone(r.status)}>{r.status}</Badge> },
    { key: "acted", header: "Approval Date", render: (r) => fmtDate(r.steps.find((s) => s.acted_at)?.acted_at) },
    { key: "actions", header: "Actions", align: "right", render: (r) => r.status === "pending" ? <Button variant="ghost" onClick={() => cancel(r.id)}>Cancel</Button> : <span className="text-gray-300">{EMPTY}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.leave_balances.map((b) => (
          <div key={b.leave_type_id} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{b.leave_type}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{b.balance}</p>
            <p className="mt-0.5 text-xs text-gray-500">{b.accrued + b.opening} accrued · {b.used} used</p>
          </div>
        ))}
      </div>
      <Card title="My Requests" bodyClassName="p-4" actions={<Link href="/hrms/me/leaves/add"><Button icon={Plus} variant="primary">Add Leave</Button></Link>}>
        <div className="mb-4 flex flex-wrap gap-2">
          {REQUEST_ACTIONS.map((a) => <Button key={a.type} onClick={() => submitShort(a.type, a.label)}>{a.label}</Button>)}
        </div>
        <Toolbar search={search} onSearch={setSearch} placeholder="Search by code, leave or reason" onReset={() => { setSearch(""); setStatusFilter(""); setTypeFilter(""); }} onExport={() => {}}>
          <select aria-label="Request type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700">
            <option value="">All types</option>
            {["leave", "regularization", "on_duty", "comp_off", "wfh", "week_off_swap", "early_in_out"].map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
          </select>
          <select aria-label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm capitalize text-gray-700">
            <option value="">All statuses</option>
            {["pending", "approved", "rejected", "cancelled"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </select>
        </Toolbar>
        <DataTable columns={columns} rows={rows} getKey={(r) => r.id} empty={<div className="px-6 py-12 text-center"><CalendarOff size={22} className="mx-auto mb-2 text-gray-300" /><p className="text-sm font-medium text-gray-700">No requests match these filters</p></div>} dense />
      </Card>
    </div>
  );
}
