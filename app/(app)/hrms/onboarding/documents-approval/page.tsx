"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Check, FileCheck2, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Modal,
  StatCard,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_DOCUMENT_TYPES, DEMO_ONBOARDING_CASES } from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate } from "@/lib/hrms/format";
import { CASE_TONE, titleCase } from "@/lib/hrms/status";
import type { OnboardingCase } from "@/lib/hrms/types";

/** `docs/hrms/14-onboarding.md §6` — verifying what the candidate uploaded. */
export default function DocumentsApprovalPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<OnboardingCase | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_ONBOARDING_CASES.filter((c) => {
      if (!["documents_pending", "documents_submitted"].includes(c.status)) return false;
      if (!q) return true;
      return [c.candidate_name, c.case_code].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [search]);

  const columns: Column<OnboardingCase>[] = [
    { key: "code", header: "Case Code", render: (c) => <span className="font-medium text-gray-900">{c.case_code}</span> },
    { key: "candidate", header: "Candidate", render: (c) => c.candidate_name },
    { key: "designation", header: "Designation", render: (c) => c.designation ?? EMPTY },
    { key: "doj", header: "Date of Joining", render: (c) => fmtDate(c.proposed_doj) },
    {
      key: "progress",
      header: "Documents Received",
      render: (c) => {
        const received = c.documents_received ?? 0;
        const required = c.documents_required ?? 0;
        const pct = required ? Math.round((received / required) * 100) : 0;
        return (
          <div className="flex w-40 items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : "bg-amber-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-12 text-right text-xs text-gray-600">
              {received} / {required}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <Badge tone={CASE_TONE[c.status]}>{titleCase(c.status)}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (c) => (
        <Button variant="ghost" onClick={() => setOpen(c)}>
          Review Documents
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Ready to Verify"
          value={DEMO_ONBOARDING_CASES.filter((c) => c.status === "documents_submitted").length}
          icon={FileCheck2}
          tint="bg-brand-50 text-brand-600"
        />
        <StatCard
          label="Still Collecting"
          value={DEMO_ONBOARDING_CASES.filter((c) => c.status === "documents_pending").length}
          tint="bg-amber-50 text-amber-600"
        />
        <StatCard label="Document Types" value={DEMO_DOCUMENT_TYPES.filter((d) => d.is_active).length} />
      </div>

      <Card
        title="Documents Approval"
        subtitle="A joining is not complete until every mandatory document is verified"
        bodyClassName="p-4"
      >
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search candidate or case code"
          onReset={() => setSearch("")}
          onExport={() => {}}
        />
        <DataTable columns={columns} rows={rows} getKey={(c) => c.id} empty="No documents waiting" dense />
      </Card>

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title="Review Documents"
        subtitle={open ? `${open.candidate_name} — ${open.case_code}` : ""}
        width="max-w-3xl"
        footer={
          <>
            <Button onClick={() => setOpen(null)}>Close</Button>
            <Button
              variant="success"
              icon={Check}
              onClick={() => {
                toast.success("All documents verified");
                setOpen(null);
              }}
            >
              Verify All
            </Button>
          </>
        }
      >
        {open && (
          <ul className="divide-y divide-gray-100">
            {DEMO_DOCUMENT_TYPES.filter((d) => d.is_active).map((d, i) => {
              const received = i < (open.documents_received ?? 0);
              return (
                <li key={d.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {d.name}
                      {d.is_mandatory && <span className="ml-1.5 text-brand-600">*</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {d.category}
                      {d.requires_expiry ? " · expiry required" : ""}
                    </p>
                  </div>
                  {received ? (
                    <>
                      <Badge tone="bg-blue-100 text-blue-700">Uploaded</Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="success"
                          icon={Check}
                          onClick={() => toast.success(`${d.name} verified`)}
                        >
                          Verify
                        </Button>
                        <Button
                          variant="danger"
                          icon={X}
                          onClick={() => toast.success(`${d.name} sent back`)}
                        >
                          Reject
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Badge tone="bg-amber-100 text-amber-800">Not uploaded</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </div>
  );
}
