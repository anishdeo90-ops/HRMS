"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Badge, Button, Card, DataTable, SelectFilter, StatCard, Toolbar, type Column } from "@/components/hrms/ui";
import { hrmsMutation, useHrmsApi } from "@/lib/hrms/api-client";
import { EMPTY, fmtDate } from "@/lib/hrms/format";
import { requestTone, titleCase } from "@/lib/hrms/status";
import type { ApprovalRequest, LookupItem } from "@/lib/hrms/types";

export default function AdminRegularizationPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [department, setDepartment] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const { data, reload } = useHrmsApi<{ requests: ApprovalRequest[]; departments: LookupItem[] }>("/api/hrms/approvals", { requests: [], departments: [] });
  const regs = data.requests.filter((r) => r.request_type === "regularization" || r.request_type === "early_in_out");
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return regs.filter((r) => {
      if (status && r.status !== status) return false;
      if (department && r.department !== department) return false;
      return !q || [r.employee_name, r.employee_code, r.reason].some((f) => String(f ?? "").toLowerCase().includes(q));
    });
  }, [regs, search, status, department]);
  const counts = { pending: regs.filter((r) => r.status === "pending").length, approved: regs.filter((r) => r.status === "approved").length, rejected: regs.filter((r) => r.status === "rejected").length };

  async function act(ids: string[], decision: "approved" | "rejected") {
    await Promise.all(ids.map((id) => hrmsMutation(`/api/hrms/approvals/${id}`, "PATCH", { decision })));
    setSelected([]);
    reload();
  }

  const columns: Column<ApprovalRequest>[] = [
    { key: "code", header: "Request", render: (r) => <span className="font-medium text-gray-900">{r.request_code}</span> },
    { key: "empcode", header: "Employee Code", render: (r) => r.employee_code },
    { key: "name", header: "Employee Name", render: (r) => r.employee_name },
    { key: "department", header: "Department", render: (r) => r.department ?? EMPTY },
    { key: "type", header: "Type", render: (r) => titleCase(r.request_type) },
    { key: "date", header: "Attendance Date", render: (r) => fmtDate(r.from_date) },
    { key: "applied", header: "Application Date", render: (r) => fmtDate(r.applied_at) },
    { key: "reason", header: "Reason", render: (r) => <span className="block max-w-[220px] truncate">{r.reason ?? EMPTY}</span> },
    { key: "manager", header: "Manager", render: (r) => r.steps[0]?.approver_name ?? EMPTY },
    { key: "status", header: "Status", render: (r) => <Badge tone={requestTone(r.status)}>{r.status}</Badge> },
    { key: "actions", header: "Actions", align: "right", render: (r) => r.status === "pending" ? <div className="flex justify-end gap-1"><Button variant="success" icon={Check} onClick={() => act([r.id], "approved")}>Approve</Button><Button variant="danger" icon={X} onClick={() => act([r.id], "rejected")}>Reject</Button></div> : <span className="text-gray-300">{EMPTY}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3"><StatCard label="Pending" value={counts.pending} tint="bg-amber-50 text-amber-600" /><StatCard label="Approved" value={counts.approved} tint="bg-green-50 text-green-600" /><StatCard label="Rejected" value={counts.rejected} tint="bg-red-50 text-red-600" /></div>
      <Card title="Admin Regularization" bodyClassName="p-4">
        <Toolbar search={search} onSearch={setSearch} placeholder="Search employee, code or reason" onReset={() => { setSearch(""); setStatus("pending"); setDepartment(""); }} onExport={() => {}}>
          <SelectFilter label="All Departments" value={department} onChange={setDepartment} options={data.departments.map((d) => ({ value: d.name, label: d.name }))} />
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700"><option value="">All statuses</option>{["pending", "approved", "rejected", "cancelled"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>
        </Toolbar>
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"><span className="text-xs font-medium text-gray-500">{selected.length ? `${selected.length} selected` : "Select rows to act in bulk"}</span><div className="ml-auto flex gap-2"><Button variant="success" icon={Check} disabled={!selected.length} onClick={() => act(selected, "approved")}>Approve</Button><Button variant="danger" icon={X} disabled={!selected.length} onClick={() => act(selected, "rejected")}>Reject</Button></div></div>
        <DataTable columns={columns} rows={rows} getKey={(r) => r.id} selectable selected={selected} onSelectedChange={setSelected} empty="No regularization requests" dense />
      </Card>
    </div>
  );
}
