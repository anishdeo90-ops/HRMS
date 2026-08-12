"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  SelectFilter,
  StatCard,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_APPROVAL_REQUESTS, DEMO_DEPARTMENTS, DEMO_MY_ATTENDANCE } from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, fmtDuration, fmtTime } from "@/lib/hrms/format";
import { dayLabel, dayTone, requestTone, titleCase } from "@/lib/hrms/status";
import type { ApprovalRequest } from "@/lib/hrms/types";

/**
 * `docs/hrms/06-approvals.md §5` — the admin side of attendance correction.
 *
 * The reference carried both `Status` and `Approved` as separate columns here,
 * the same duplication defect as WeekOff Approval. There is one status.
 *
 * Approving a regularization rewrites the attendance day, which cascades into
 * `payable_fraction` — so the original and corrected values are both shown
 * before anyone acts.
 */
export default function AdminRegularizationPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [department, setDepartment] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_APPROVAL_REQUESTS.filter((r) => {
      if (r.request_type !== "regularization" && r.request_type !== "early_in_out") return false;
      if (status && r.status !== status) return false;
      if (department && r.department !== department) return false;
      if (!q) return true;
      return [r.employee_name, r.employee_code, r.reason].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, status, department]);

  const counts = useMemo(() => {
    const regs = DEMO_APPROVAL_REQUESTS.filter(
      (r) => r.request_type === "regularization" || r.request_type === "early_in_out"
    );
    return {
      pending: regs.filter((r) => r.status === "pending").length,
      approved: regs.filter((r) => r.status === "approved").length,
      rejected: regs.filter((r) => r.status === "rejected").length,
      thisMonth: DEMO_MY_ATTENDANCE.filter((d) => d.is_regularized).length,
    };
  }, []);

  const columns: Column<ApprovalRequest>[] = [
    { key: "code", header: "Request", render: (r) => <span className="font-medium text-gray-900">{r.request_code}</span> },
    { key: "empcode", header: "Employee Code", render: (r) => r.employee_code },
    { key: "name", header: "Employee Name", render: (r) => r.employee_name },
    { key: "department", header: "Department", render: (r) => r.department ?? EMPTY },
    { key: "type", header: "Type", render: (r) => titleCase(r.request_type) },
    { key: "date", header: "Attendance Date", render: (r) => fmtDate(r.from_date) },
    { key: "applied", header: "Application Date", render: (r) => fmtDate(r.applied_at) },
    {
      key: "original",
      header: "Recorded",
      render: () => (
        <span className="text-xs text-gray-500">
          {fmtTime(null)} — {fmtTime(null)}
        </span>
      ),
    },
    {
      key: "requested",
      header: "Requested",
      render: (r) => (
        <span className="text-xs font-medium text-gray-800">
          {r.request_type === "early_in_out" ? "16:00 out" : "09:30 — 18:30"}
        </span>
      ),
    },
    {
      key: "impact",
      header: "Payable Impact",
      render: (r) => (
        <span className="text-xs text-gray-600">
          {r.status === "approved" ? "0 → 1" : "0 → 1 if approved"}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (r) => (
        <span className="block max-w-[220px] truncate" title={r.reason}>
          {r.reason ?? EMPTY}
        </span>
      ),
    },
    { key: "manager", header: "Manager", render: (r) => r.steps[0]?.approver_name ?? EMPTY },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge tone={requestTone(r.status)}>{r.status}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) =>
        r.status === "pending" ? (
          <div className="flex justify-end gap-1">
            <Button variant="success" icon={Check} onClick={() => toast.success(`${r.request_code} approved`)}>
              Approve
            </Button>
            <Button variant="danger" icon={X} onClick={() => toast.success(`${r.request_code} rejected`)}>
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-gray-300">{EMPTY}</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending" value={counts.pending} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Approved" value={counts.approved} tint="bg-green-50 text-green-600" />
        <StatCard label="Rejected" value={counts.rejected} tint="bg-red-50 text-red-600" />
        <StatCard label="Days Regularized" value={counts.thisMonth} />
      </div>

      <Card
        title="Admin Regularization"
        subtitle="Approving rewrites the attendance day, which recomputes its payable fraction"
        bodyClassName="p-4"
      >
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search employee, code or reason"
          onReset={() => {
            setSearch("");
            setStatus("pending");
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
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700"
          >
            <option value="">All statuses</option>
            {["pending", "approved", "rejected", "cancelled"].map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        </Toolbar>

        <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="text-xs font-medium text-gray-500">
            {selected.length > 0 ? `${selected.length} selected` : "Select rows to act in bulk"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="success"
              icon={Check}
              disabled={selected.length === 0}
              onClick={() => {
                toast.success(`${selected.length} regularizations approved`);
                setSelected([]);
              }}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              icon={X}
              disabled={selected.length === 0}
              onClick={() => {
                toast.success(`${selected.length} regularizations rejected`);
                setSelected([]);
              }}
            >
              Reject
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.id}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          empty="No regularization requests"
          dense
        />

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Recently corrected days
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_MY_ATTENDANCE.filter((d) => d.is_regularized || d.penalty_reason)
              .slice(0, 6)
              .map((d) => (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs"
                >
                  <span className="font-medium text-gray-700">{fmtDate(d.work_date)}</span>
                  <Badge tone={dayTone(d.day_status)}>{dayLabel(d.day_status)}</Badge>
                  <span className="text-gray-400">{fmtDuration(d.worked_minutes)}</span>
                </span>
              ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
