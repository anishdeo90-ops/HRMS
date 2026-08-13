"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Check, Handshake, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Field,
  FieldGrid,
  FormField,
  Modal,
  StatCard,
  Textarea,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { EMPTY, fmtDate, fmtLacs } from "@/lib/hrms/format";
import { titleCase } from "@/lib/hrms/status";
import type { OnboardingCase } from "@/lib/hrms/types";
import { useApiData } from "@/lib/hrms/use-api-data";

/**
 * `docs/hrms/14-onboarding.md §3` — the first ATS crossing.
 *
 * The offer carries `offered_annual_salary`; the requisition it was raised
 * against carries a budget. The reference connected neither, so nobody was told
 * when an offer exceeded its budget. Here the check runs before Approve is
 * enabled (`15-more-module.md §1.4`).
 */
export default function CandidateApprovalPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<OnboardingCase | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const cases = useApiData<OnboardingCase[]>("/api/hrms/onboarding", []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (c.status !== "pending_approval") return false;
      if (!q) return true;
      return [c.candidate_name, c.case_code, c.designation].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [cases, search]);

  const overBudget = (c: OnboardingCase) =>
    c.offered_annual_salary_paise != null &&
    c.budget_annual_paise != null &&
    c.offered_annual_salary_paise > c.budget_annual_paise;

  const columns: Column<OnboardingCase>[] = [
    { key: "code", header: "Case Code", render: (c) => <span className="font-medium text-gray-900">{c.case_code}</span> },
    {
      key: "candidate",
      header: "Candidate",
      render: (c) => (
        <div>
          <p className="font-medium text-gray-900">{c.candidate_name}</p>
          <p className="text-xs text-gray-500">{c.email}</p>
        </div>
      ),
    },
    { key: "designation", header: "Designation", render: (c) => c.designation ?? EMPTY },
    { key: "department", header: "Department", render: (c) => c.department ?? EMPTY },
    { key: "branch", header: "Branch", render: (c) => c.branch ?? EMPTY },
    {
      key: "offered",
      header: "Offered Annual Salary",
      align: "right",
      render: (c) => (
        <span className={overBudget(c) ? "font-semibold text-red-600" : "text-gray-700"}>
          {fmtLacs(c.offered_annual_salary_paise)}
        </span>
      ),
    },
    {
      key: "budget",
      header: "Requisition Budget",
      align: "right",
      render: (c) => fmtLacs(c.budget_annual_paise),
    },
    {
      key: "variance",
      header: "Variance",
      align: "right",
      render: (c) =>
        overBudget(c) ? (
          <Badge tone="bg-red-100 text-red-700">Over budget</Badge>
        ) : (
          <Badge tone="bg-green-100 text-green-700">Within budget</Badge>
        ),
    },
    { key: "doj", header: "Proposed DOJ", render: (c) => fmtDate(c.proposed_doj) },
    {
      key: "source",
      header: "ATS Candidate",
      render: (c) =>
        c.source_candidate_id ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-brand-600">
            <Handshake size={12} />
            {c.source_candidate_id}
          </span>
        ) : (
          EMPTY
        ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="success"
            icon={Check}
            onClick={() => {
              setOpen(c);
              setDecision("approve");
            }}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            icon={X}
            onClick={() => {
              setOpen(c);
              setDecision("reject");
            }}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  const flagged = cases.filter(
    (c) => c.status === "pending_approval" && overBudget(c)
  ).length;

  async function submitDecision() {
    if (!open || !decision) return;
    const res = await fetch(`/api/hrms/onboarding/${open.id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: decision, candidate_name: open.candidate_name, email: open.email, mobile: open.mobile }),
    });
    if (!res.ok) return toast.error("Could not update onboarding case");
    toast.success(decision === "approve" ? `${open.candidate_name}'s offer approved` : `${open.candidate_name}'s offer rejected`);
    setOpen(null);
    setDecision(null);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Awaiting Approval" value={rows.length} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Over Budget" value={flagged} tint="bg-red-50 text-red-600" />
        <StatCard
          label="From ATS"
          value={rows.filter((c) => c.source_candidate_id).length}
          tint="bg-brand-50 text-brand-600"
        />
      </div>

      <Card
        title="Candidate Approval"
        subtitle="Offer approval, checked against the requisition budget it was raised on"
        bodyClassName="p-4"
      >
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search candidate, case code or designation"
          onReset={() => setSearch("")}
          onExport={() => {}}
        />
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(c) => c.id}
          empty="No offers waiting for approval"
          dense
        />
      </Card>

      <Modal
        open={!!open}
        onClose={() => {
          setOpen(null);
          setDecision(null);
        }}
        title={decision === "approve" ? "Approve Offer" : "Reject Offer"}
        subtitle={open?.case_code}
        footer={
          <>
            <Button
              onClick={() => {
                setOpen(null);
                setDecision(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={decision === "approve" ? "success" : "danger"}
              onClick={submitDecision}
            >
              {decision === "approve" ? "Approve" : "Reject"}
            </Button>
          </>
        }
      >
        {open && (
          <div className="space-y-4">
            <FieldGrid columns={2}>
              <Field label="Candidate" value={open.candidate_name} />
              <Field label="Designation" value={open.designation} />
              <Field label="Offered Annual Salary" value={fmtLacs(open.offered_annual_salary_paise)} />
              <Field label="Requisition Budget" value={fmtLacs(open.budget_annual_paise)} />
              <Field label="Proposed Date of Joining" value={fmtDate(open.proposed_doj)} />
              <Field label="ATS Candidate" value={open.source_candidate_id} />
            </FieldGrid>

            {overBudget(open) && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-red-500" />
                <p className="text-sm text-red-700">
                  This offer is {fmtLacs((open.offered_annual_salary_paise ?? 0) - (open.budget_annual_paise ?? 0))}{" "}
                  above the budget the requisition was raised against. Approving it needs a
                  documented reason.
                </p>
              </div>
            )}

            <FormField
              label={decision === "reject" ? "Rejection Reason" : "Approval Note"}
              required={decision === "reject" || overBudget(open)}
              hint={
                decision === "reject"
                  ? "Written back to the ATS candidate so the recruiter knows why"
                  : undefined
              }
            >
              <Textarea
                placeholder={
                  decision === "reject"
                    ? "Why is this offer being rejected?"
                    : "Optional note for the record"
                }
              />
            </FormField>
          </div>
        )}
      </Modal>
    </div>
  );
}
