"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { Badge, Button, Card, DataTable, StatCard, Toolbar, type Column } from "@/components/hrms/ui";
import { DEMO_EXPENSE_CLAIMS, DEMO_ME } from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, fmtMoney } from "@/lib/hrms/format";
import { requestTone, titleCase } from "@/lib/hrms/status";
import type { ExpenseClaim } from "@/lib/hrms/types";

/** `docs/hrms/04-me.md §5` — my own claims. The approver view lives under More. */
export default function MyReimbursementPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const mine = useMemo(
    () => DEMO_EXPENSE_CLAIMS.filter((c) => c.employee_id === DEMO_ME.id),
    []
  );

  const rows = useMemo(
    () =>
      mine.filter((c) => {
        if (status && c.status !== status) return false;
        const q = search.trim().toLowerCase();
        return !q || c.claim_code.toLowerCase().includes(q);
      }),
    [mine, search, status]
  );

  const totals = useMemo(
    () => ({
      claimed: mine.reduce((s, c) => s + c.total_amount_paise, 0),
      pending: mine.filter((c) => c.status === "pending").reduce((s, c) => s + c.total_amount_paise, 0),
      approved: mine.filter((c) => c.status === "approved").reduce((s, c) => s + c.total_amount_paise, 0),
    }),
    [mine]
  );

  const columns: Column<ExpenseClaim>[] = [
    {
      key: "code",
      header: "Claim Code",
      render: (c) => <span className="font-medium text-gray-900">{c.claim_code}</span>,
    },
    { key: "date", header: "Date", render: (c) => fmtDate(c.claim_date) },
    { key: "lines", header: "Line Items", align: "center", render: (c) => c.lines.length },
    {
      key: "total",
      header: "Total Amount",
      align: "right",
      render: (c) => <span className="font-semibold text-gray-900">{fmtMoney(c.total_amount_paise)}</span>,
    },
    {
      key: "status",
      header: "Final Status",
      render: (c) => <Badge tone={requestTone(c.status)}>{c.status}</Badge>,
    },
    {
      key: "chain",
      header: "Approval Chain",
      render: (c) => (
        <div className="flex items-center gap-1.5">
          {c.steps.map((s) => (
            <span
              key={s.sequence}
              title={`${titleCase(s.approver_source)}: ${s.approver_name ?? EMPTY} — ${s.status}`}
              className={`h-2 w-6 rounded-full ${
                s.status === "approved"
                  ? "bg-green-400"
                  : s.status === "rejected"
                    ? "bg-red-400"
                    : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (c) => (
        <Button variant="ghost" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
          {expanded === c.id ? "Hide lines" : "View lines"}
        </Button>
      ),
    },
  ];

  const openClaim = mine.find((c) => c.id === expanded);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Claimed" value={fmtMoney(totals.claimed)} icon={Receipt} />
        <StatCard label="Pending" value={fmtMoney(totals.pending)} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Approved" value={fmtMoney(totals.approved)} tint="bg-green-50 text-green-600" />
      </div>

      <Card
        title="Bill Reimbursement"
        subtitle="A claim totals its lines — the header amount is never typed"
        bodyClassName="p-4"
        actions={
          <Link href="/hrms/me/reimbursement/add">
            <Button icon={Plus} variant="primary">
              Add Reimbursement
            </Button>
          </Link>
        }
      >
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search by claim code"
          onReset={() => {
            setSearch("");
            setStatus("");
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

        <DataTable columns={columns} rows={rows} getKey={(c) => c.id} empty="No claims raised yet" dense />

        {openClaim && (
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
            <p className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {openClaim.claim_code} — expense details
            </p>
            <table className="w-full text-sm">
              <thead className="bg-white text-xs uppercase tracking-wide text-gray-500">
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
