"use client";

import { useMemo, useState } from "react";
import { Handshake } from "lucide-react";
import {
  Badge,
  Card,
  DataTable,
  SelectFilter,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_ONBOARDING_CASES } from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, fmtLacs } from "@/lib/hrms/format";
import { CASE_TONE, titleCase } from "@/lib/hrms/status";
import type { OnboardingCase } from "@/lib/hrms/types";

/**
 * `docs/hrms/14-onboarding.md §4` — every case, whatever its state.
 *
 * `offer_declined` is the second ATS crossing: the decline reason goes back to
 * the recruiter so the candidate can be reopened rather than silently lost.
 */

export default function CandidateApprovalListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_ONBOARDING_CASES.filter((c) => {
      if (status && c.status !== status) return false;
      if (!q) return true;
      return [c.candidate_name, c.case_code, c.designation, c.email].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, status]);

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
    { key: "mobile", header: "Mobile", render: (c) => c.mobile ?? EMPTY },
    { key: "designation", header: "Designation", render: (c) => c.designation ?? EMPTY },
    { key: "department", header: "Department", render: (c) => c.department ?? EMPTY },
    { key: "branch", header: "Branch", render: (c) => c.branch ?? EMPTY },
    {
      key: "offered",
      header: "Offered Salary",
      align: "right",
      render: (c) => fmtLacs(c.offered_annual_salary_paise),
    },
    { key: "proposed", header: "Proposed DOJ", render: (c) => fmtDate(c.proposed_doj) },
    { key: "actual", header: "Actual DOJ", render: (c) => fmtDate(c.actual_doj) },
    {
      key: "docs",
      header: "Documents",
      align: "center",
      render: (c) =>
        c.documents_required ? (
          <span
            className={
              c.documents_received === c.documents_required ? "text-green-600" : "text-gray-600"
            }
          >
            {c.documents_received ?? 0} / {c.documents_required}
          </span>
        ) : (
          EMPTY
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <Badge tone={CASE_TONE[c.status]}>{titleCase(c.status)}</Badge>,
    },
    {
      key: "reason",
      header: "Decline Reason",
      render: (c) =>
        c.decline_reason ? (
          <span className="block max-w-[220px] truncate text-xs text-red-600" title={c.decline_reason}>
            {c.decline_reason}
          </span>
        ) : (
          EMPTY
        ),
    },
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
  ];

  return (
    <Card
      title="Candidate Approval List"
      subtitle="Every onboarding case and where it currently sits"
      bodyClassName="p-4"
    >
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search candidate, code, email or designation"
        onReset={() => {
          setSearch("");
          setStatus("");
        }}
        onExport={() => {}}
      >
        <SelectFilter
          label="All Statuses"
          value={status}
          onChange={setStatus}
          options={Object.keys(CASE_TONE).map((s) => ({ value: s, label: titleCase(s) }))}
        />
      </Toolbar>

      <DataTable columns={columns} rows={rows} getKey={(c) => c.id} empty="No onboarding cases" dense />
    </Card>
  );
}
