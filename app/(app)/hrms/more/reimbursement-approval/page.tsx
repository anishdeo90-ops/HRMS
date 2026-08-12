"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Check, Receipt, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  StatCard,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_EXPENSE_CLAIMS } from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, fmtMoney } from "@/lib/hrms/format";
import { requestTone, titleCase } from "@/lib/hrms/status";
import type { ExpenseClaim } from "@/lib/hrms/types";

/**
 * `docs/hrms/15-more-module.md §3`.
 *
 * The reference carried `RM Status`, `Admin Status` and `Final Status` — the
 * approval chain denormalised into one column per approver, so a third step
 * would change every query, export and filter.
 *
 * Here the chain is rows in `approval_steps` and the final status is derived:
 * rejected if any step rejected, approved when the last step approves, pending
 * otherwise. Adding a Business Head step is a config row.
 */
export default function ReimbursementApprovalPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_EXPENSE_CLAIMS.filter((c) => {
      if (status && c.status !== status) return false;
      if (!q) return true;
      return [c.claim_code, c.employee_name, c.employee_code].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, status]);

  const stats = useMemo(
    () => ({
      pending: DEMO_EXPENSE_CLAIMS.filter((c) => c.status === "pending").length,
      pendingValue: DEMO_EXPENSE_CLAIMS.filter((c) => c.status === "pending").reduce(
        (s, c) => s + c.total_amount_paise,
        0
      ),
      approvedValue: DEMO_EXPENSE_CLAIMS.filter((c) => c.status === "approved").reduce(
        (s, c) => s + c.total_amount_paise,
        0
      ),
      missingReceipts: DEMO_EXPENSE_CLAIMS.filter((c) =>
        c.lines.some((l) => !l.has_receipt)
      ).length,
    }),
    []
  );

  const columns: Column<ExpenseClaim>[] = [
    {
      key: "code",
      header: "Claim Code",
      render: (c) => <span className="font-medium text-gray-900">{c.claim_code}</span>,
    },
    { key: "date", header: "Date", render: (c) => fmtDate(c.claim_date) },
    { key: "empcode", header: "Employee Code", render: (c) => c.employee_code },
    { key: "employee", header: "Employee Name", render: (c) => c.employee_name },
    { key: "lines", header: "Lines", align: "center", render: (c) => c.lines.length },
    {
      key: "receipts",
      header: "Receipts",
      align: "center",
      render: (c) =>
        c.lines.every((l) => l.has_receipt) ? (
          <Badge tone="bg-green-100 text-green-700">Complete</Badge>
        ) : (
          <Badge tone="bg-red-100 text-red-700">
            {c.lines.filter((l) => !l.has_receipt).length} missing
          </Badge>
        ),
    },
    {
      key: "total",
      header: "Total Amount",
      align: "right",
      // Derived from the lines, never typed — otherwise finance reconciles by hand.
      render: (c) => <span className="font-semibold text-gray-900">{fmtMoney(c.total_amount_paise)}</span>,
    },
    {
      key: "chain",
      header: "Approval Chain",
      render: (c) => (
        <div className="flex items-center gap-1.5">
          {c.steps.map((s) => (
            <span
              key={s.sequence}
              title={`${titleCase(s.approver_source)} ${s.approver_name ?? ""}: ${s.status}`}
              className={`h-2 w-7 rounded-full ${
                s.status === "approved"
                  ? "bg-green-400"
                  : s.status === "rejected"
                    ? "bg-red-400"
                    : "bg-amber-300"
              }`}
            />
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Final Status",
      render: (c) => <Badge tone={requestTone(c.status)}>{c.status}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
            {expanded === c.id ? "Hide" : "Lines"}
          </Button>
          {c.status === "pending" && (
            <>
              <Button variant="success" icon={Check} onClick={() => toast.success(`${c.claim_code} approved`)}>
                Approve
              </Button>
              <Button variant="danger" icon={X} onClick={() => toast.success(`${c.claim_code} rejected`)}>
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const openClaim = DEMO_EXPENSE_CLAIMS.find((c) => c.id === expanded);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Awaiting Approval" value={stats.pending} icon={Receipt} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Pending Value" value={fmtMoney(stats.pendingValue)} />
        <StatCard label="Approved Value" value={fmtMoney(stats.approvedValue)} tint="bg-green-50 text-green-600" />
        <StatCard label="Missing Receipts" value={stats.missingReceipts} tint="bg-red-50 text-red-600" />
      </div>

      <Card
        title="Claim Approval Records"
        subtitle="Approved claims become a payroll reimbursement line and lock on payment"
        bodyClassName="p-4"
      >
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search claim code or employee"
          onReset={() => {
            setSearch("");
            setStatus("pending");
          }}
          onExport={() => {}}
        >
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
          <div className="ml-auto flex gap-2">
            <Button
              variant="success"
              icon={Check}
              disabled={selected.length === 0}
              onClick={() => {
                toast.success(`${selected.length} claims approved`);
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
                toast.success(`${selected.length} claims rejected`);
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
          getKey={(c) => c.id}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          empty="No claims in this queue"
          dense
        />

        {openClaim && (
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
            <p className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {openClaim.claim_code} — {openClaim.employee_name}
            </p>
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Sr.No</th>
                  <th className="px-4 py-2 text-left font-semibold">Expense Date</th>
                  <th className="px-4 py-2 text-left font-semibold">Expense Type</th>
                  <th className="px-4 py-2 text-left font-semibold">Description</th>
                  <th className="px-4 py-2 text-center font-semibold">Receipt</th>
                  <th className="px-4 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {openClaim.lines.map((l, i) => (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2">{fmtDate(l.expense_date)}</td>
                    <td className="px-4 py-2">{l.expense_type}</td>
                    <td className="px-4 py-2 text-gray-600">{l.description ?? EMPTY}</td>
                    <td className="px-4 py-2 text-center">
                      {l.has_receipt ? (
                        <Badge tone="bg-green-100 text-green-700">Attached</Badge>
                      ) : (
                        <Badge tone="bg-red-100 text-red-700">Missing</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">{fmtMoney(l.amount_paise)}</td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={5} className="px-4 py-2 text-right text-xs font-semibold uppercase text-gray-500">
                    Total
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-gray-900">
                    {fmtMoney(openClaim.total_amount_paise)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
