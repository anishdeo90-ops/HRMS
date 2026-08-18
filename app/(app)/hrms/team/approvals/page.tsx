"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";
import { Badge, Button, Card, DataTable, SelectFilter, SubTabs, Toolbar, type Column } from "@/components/hrms/ui";
import { hrmsMutation, useHrmsApi } from "@/lib/hrms/api-client";
import { EMPTY, fmtDate, fmtDays } from "@/lib/hrms/format";
import { requestTone, titleCase } from "@/lib/hrms/status";
import type { ApprovalRequest, LookupItem, RequestType } from "@/lib/hrms/types";

const QUEUES: { key: RequestType | "all"; label: string; subjectHeader: string }[] = [
  { key: "all", label: "All Requests", subjectHeader: "Subject" },
  { key: "leave", label: "Leave Approval", subjectHeader: "Leave" },
  { key: "regularization", label: "Regularization", subjectHeader: "Correction" },
  { key: "on_duty", label: "On-duty Approval", subjectHeader: "On-duty" },
  { key: "comp_off", label: "C-OFF Approval", subjectHeader: "Extra Work" },
  { key: "wfh", label: "WFH Approval", subjectHeader: "Work From Home" },
  { key: "week_off_swap", label: "WeekOff Approval", subjectHeader: "Swap" },
  { key: "early_in_out", label: "Early In/Out Approval", subjectHeader: "Window Override" },
];

export default function AdminApprovalsPage() {
  const [queue, setQueue] = useState<RequestType | "all">("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [department, setDepartment] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const { data, reload } = useHrmsApi<{ requests: ApprovalRequest[]; departments: LookupItem[] }>("/api/hrms/approvals", { requests: [], departments: [] });
  const active = QUEUES.find((q) => q.key === queue)!;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.requests.filter((r) => {
      if (queue !== "all" && r.request_type !== queue) return false;
      if (status && r.status !== status) return false;
      if (department && r.department !== department) return false;
      return !q || [r.employee_name, r.employee_code, r.subject, r.reason, r.request_code].some((f) => String(f ?? "").toLowerCase().includes(q));
    });
  }, [data.requests, queue, search, status, department]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: 0 };
    for (const r of data.requests) {
      if (r.status !== "pending") continue;
      map.all += 1;
      map[r.request_type] = (map[r.request_type] ?? 0) + 1;
    }
    return map;
  }, [data.requests]);

  async function act(ids: string[], decision: "approved" | "rejected") {
    await Promise.all(ids.map((id) => hrmsMutation(`/api/hrms/approvals/${id}`, "PATCH", { decision })));
    toast.success(`${ids.length} ${ids.length === 1 ? "request" : "requests"} ${decision}`);
    setSelected([]);
    reload();
  }

  const columns: Column<ApprovalRequest>[] = [
    { key: "code", header: "Request", render: (r) => <div><p className="font-medium text-gray-900">{r.request_code}</p><p className="text-xs text-gray-500">{titleCase(r.request_type)}</p></div> },
    { key: "empcode", header: "Employee Code", render: (r) => r.employee_code },
    { key: "employee", header: "Employee Name", render: (r) => <span className="font-medium text-gray-900">{r.employee_name}</span> },
    { key: "department", header: "Department", render: (r) => r.department ?? EMPTY },
    { key: "manager", header: "Manager", render: (r) => r.steps[0]?.approver_name ?? EMPTY },
    { key: "applied", header: "Application Date", render: (r) => fmtDate(r.applied_at) },
    { key: "subject", header: active.subjectHeader, render: (r) => r.subject },
    { key: "from", header: "From Date", render: (r) => fmtDate(r.from_date) },
    { key: "to", header: "To Date", render: (r) => fmtDate(r.to_date) },
    { key: "period", header: "Period", render: (r) => fmtDays(r.days) },
    { key: "reason", header: "Reason", render: (r) => <span className="block max-w-[240px] truncate">{r.reason ?? EMPTY}</span> },
    { key: "approved", header: "Approval Date", render: (r) => fmtDate(r.steps.find((s) => s.acted_at)?.acted_at) },
    { key: "status", header: "Status", render: (r) => <Badge tone={requestTone(r.status)}>{r.status}</Badge> },
    { key: "actions", header: "Actions", align: "right", render: (r) => r.status === "pending" ? <div className="flex justify-end gap-1"><Button variant="success" icon={Check} onClick={() => act([r.id], "approved")}>Approve</Button><Button variant="danger" icon={X} onClick={() => act([r.id], "rejected")}>Reject</Button></div> : <span className="text-gray-300">{EMPTY}</span> },
  ];

  return (
    <Card title="Admin Approvals" bodyClassName="p-4">
      <SubTabs tabs={QUEUES.map((q) => ({ key: q.key, label: q.label, count: counts[q.key] ?? 0 }))} value={queue} onChange={(k) => { setQueue(k); setSelected([]); }} />
      <Toolbar search={search} onSearch={setSearch} placeholder="Search employee, code or reason" onReset={() => { setSearch(""); setStatus("pending"); setDepartment(""); }} onExport={() => {}}>
        <SelectFilter label="All Departments" value={department} onChange={setDepartment} options={data.departments.map((d) => ({ value: d.name, label: d.name }))} />
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700">
          <option value="">All statuses</option>{["pending", "approved", "rejected", "cancelled"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </select>
      </Toolbar>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <span className="text-xs font-medium text-gray-500">{selected.length > 0 ? `${selected.length} selected` : "Select rows to act in bulk"}</span>
        {selected.length > 0 && <div className="ml-auto flex gap-2"><Button variant="success" icon={Check} onClick={() => act(selected, "approved")}>Approve</Button><Button variant="danger" icon={X} onClick={() => act(selected, "rejected")}>Reject</Button></div>}
      </div>
      <DataTable columns={columns} rows={rows} getKey={(r) => r.id} selectable selected={selected} onSelectedChange={setSelected} empty="Nothing waiting in this queue" dense />
    </Card>
  );
}
