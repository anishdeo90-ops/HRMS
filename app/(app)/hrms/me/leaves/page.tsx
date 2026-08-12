"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CalendarOff, Paperclip, Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  FormField,
  FormGrid,
  Input,
  Modal,
  Select,
  Textarea,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_MY_LEAVE_BALANCES, DEMO_MY_REQUESTS } from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, fmtDays, todayISO } from "@/lib/hrms/format";
import { requestTone, titleCase } from "@/lib/hrms/status";
import type { ApprovalRequest, RequestType } from "@/lib/hrms/types";

/**
 * `docs/hrms/04-me.md §2`.
 *
 * The reference put six buttons here and built six workflows behind them. All
 * six have the same shape — submit, route to an approver, approve or reject —
 * so they are one `approval_requests` engine with a `request_type` discriminator
 * and one status vocabulary. This screen is that single inbox.
 */

const REQUEST_ACTIONS: { type: RequestType; label: string; hint: string }[] = [
  { type: "leave", label: "Leave Cancellation", hint: "Withdraw a leave that was already approved" },
  { type: "on_duty", label: "On-duty Regularization", hint: "Worked off-site or at a client location" },
  { type: "comp_off", label: "C-OFF Application", hint: "Compensatory off against extra hours worked" },
  { type: "wfh", label: "WFH Application", hint: "Work from home for one or more days" },
  { type: "week_off_swap", label: "Week-off Application", hint: "Change the assigned weekly off" },
  { type: "early_in_out", label: "Early In/Out", hint: "A one-day override of the shift punch window" },
];

export default function MyLeavesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [openRequest, setOpenRequest] = useState<(typeof REQUEST_ACTIONS)[number] | null>(null);

  const rows = useMemo(
    () =>
      DEMO_MY_REQUESTS.filter((r) => {
        if (statusFilter && r.status !== statusFilter) return false;
        if (typeFilter && r.request_type !== typeFilter) return false;
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [r.request_code, r.subject, r.reason].some((f) =>
          String(f ?? "").toLowerCase().includes(q)
        );
      }),
    [search, statusFilter, typeFilter]
  );

  const columns: Column<ApprovalRequest>[] = [
    {
      key: "code",
      header: "Request",
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.request_code}</p>
          <p className="text-xs text-gray-500">{titleCase(r.request_type)}</p>
        </div>
      ),
    },
    { key: "applied", header: "Application Date", render: (r) => fmtDate(r.applied_at) },
    { key: "subject", header: "Leave", render: (r) => r.subject },
    { key: "from", header: "From Date", render: (r) => fmtDate(r.from_date) },
    { key: "to", header: "To Date", render: (r) => fmtDate(r.to_date) },
    { key: "period", header: "Period", render: (r) => fmtDays(r.days) },
    {
      key: "reason",
      header: "Reason",
      render: (r) => (
        <span className="block max-w-[220px] truncate" title={r.reason}>
          {r.reason ?? EMPTY}
        </span>
      ),
    },
    {
      key: "attachments",
      header: "Attachments",
      align: "center",
      render: () => <span className="text-gray-300">{EMPTY}</span>,
    },
    {
      key: "manager",
      header: "Manager",
      render: (r) => r.steps[0]?.approver_name ?? EMPTY,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge tone={requestTone(r.status)}>{r.status}</Badge>,
    },
    {
      key: "acted",
      header: "Approval Date",
      render: (r) => fmtDate(r.steps.find((s) => s.acted_at)?.acted_at),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) =>
        r.status === "pending" ? (
          <Button variant="ghost" onClick={() => toast.success(`${r.request_code} cancelled`)}>
            Cancel
          </Button>
        ) : (
          <span className="text-gray-300">{EMPTY}</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DEMO_MY_LEAVE_BALANCES.map((b) => (
          <div key={b.leave_type_id} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{b.leave_type}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{b.balance}</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {b.accrued + b.opening} accrued · {b.used} used
            </p>
          </div>
        ))}
      </div>

      <Card
        title="My Requests"
        subtitle="Every request type shares one queue, one status vocabulary and one audit trail"
        bodyClassName="p-4"
        actions={
          <Link href="/hrms/me/leaves/add">
            <Button icon={Plus} variant="primary">
              Add Leave
            </Button>
          </Link>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {REQUEST_ACTIONS.map((a) => (
            <Button key={a.type} onClick={() => setOpenRequest(a)} title={a.hint}>
              {a.label}
            </Button>
          ))}
        </div>

        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search by code, leave or reason"
          onReset={() => {
            setSearch("");
            setStatusFilter("");
            setTypeFilter("");
          }}
          onExport={() => {}}
        >
          <select
            aria-label="Request type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700"
          >
            <option value="">All types</option>
            {["leave", "regularization", "on_duty", "comp_off", "wfh", "week_off_swap", "early_in_out"].map(
              (t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              )
            )}
          </select>
          <select
            aria-label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm capitalize text-gray-700"
          >
            <option value="">All statuses</option>
            {["pending", "approved", "rejected", "cancelled"].map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        </Toolbar>

        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.id}
          empty={
            <div className="px-6 py-12 text-center">
              <CalendarOff size={22} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">No requests match these filters</p>
            </div>
          }
          dense
        />
      </Card>

      {/* One form for the five short request types — they differ only in label. */}
      <Modal
        open={!!openRequest}
        onClose={() => setOpenRequest(null)}
        title={openRequest?.label ?? ""}
        subtitle={openRequest?.hint}
        footer={
          <>
            <Button onClick={() => setOpenRequest(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success(`${openRequest?.label} submitted for approval`);
                setOpenRequest(null);
              }}
            >
              Submit
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Application Date">
            <Input type="date" defaultValue={todayISO()} disabled />
          </FormField>
          <FormField label="Reporting Manager">
            <Input defaultValue="Anish Trivedi" disabled />
          </FormField>
          <FormField label="From Date" required>
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          <FormField label="To Date" required>
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          {openRequest?.type === "week_off_swap" && (
            <FormField label="Swap To" required>
              <Select defaultValue="">
                <option value="">Select a day</option>
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                  (d) => (
                    <option key={d}>{d}</option>
                  )
                )}
              </Select>
            </FormField>
          )}
          {openRequest?.type === "early_in_out" && (
            <FormField label="Requested Time" required hint="Overrides the shift punch window for this day only">
              <Input type="time" defaultValue="16:00" />
            </FormField>
          )}
          <FormField label="Reason" required span>
            <Textarea placeholder="Explain the request so the approver has context" />
          </FormField>
          <FormField label="Supporting Document" span hint="Optional. PDF or image, up to 5 MB.">
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
              <Paperclip size={14} />
              Choose a file
            </div>
          </FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}
