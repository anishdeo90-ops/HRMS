"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Handshake, UserCheck } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  StatCard,
  SubTabs,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_ONBOARDING_CASES } from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, fmtLacs, todayISO } from "@/lib/hrms/format";
import { CASE_TONE, titleCase } from "@/lib/hrms/status";
import type { OnboardingCase } from "@/lib/hrms/types";

/**
 * `docs/hrms/14-onboarding.md §7` — the handover point.
 *
 * Marking someone joined is what converts the onboarding case into a live
 * employee, writes the `entity_links` row back to the ATS candidate, and starts
 * their attendance register.
 */
export default function NewJoineesPage() {
  const [view, setView] = useState<"upcoming" | "joined">("upcoming");
  const [search, setSearch] = useState("");

  const today = todayISO();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_ONBOARDING_CASES.filter((c) => {
      if (view === "joined" && c.status !== "joined") return false;
      if (
        view === "upcoming" &&
        (c.status === "joined" || c.status === "offer_declined" || c.status === "rejected")
      )
        return false;
      if (!q) return true;
      return [c.candidate_name, c.case_code, c.designation].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [view, search]);

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
    { key: "salary", header: "Annual CTC", align: "right", render: (c) => fmtLacs(c.offered_annual_salary_paise) },
    { key: "proposed", header: "Proposed DOJ", render: (c) => fmtDate(c.proposed_doj) },
    { key: "actual", header: "Actual DOJ", render: (c) => fmtDate(c.actual_doj) },
    {
      key: "docs",
      header: "Documents",
      align: "center",
      render: (c) =>
        c.documents_received === c.documents_required ? (
          <Badge tone="bg-green-100 text-green-700">Complete</Badge>
        ) : (
          <Badge tone="bg-amber-100 text-amber-800">
            {c.documents_received ?? 0} / {c.documents_required ?? 0}
          </Badge>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <Badge tone={CASE_TONE[c.status]}>{titleCase(c.status)}</Badge>,
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
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (c) =>
        c.status === "joined" ? (
          <span className="text-gray-300">{EMPTY}</span>
        ) : (
          <Button
            variant="primary"
            icon={UserCheck}
            disabled={c.documents_received !== c.documents_required}
            title={
              c.documents_received !== c.documents_required
                ? "Documents must be complete before joining"
                : undefined
            }
            onClick={() => toast.success(`${c.candidate_name} converted to an employee`)}
          >
            Mark Joined
          </Button>
        ),
    },
  ];

  const joiningThisWeek = DEMO_ONBOARDING_CASES.filter(
    (c) =>
      c.proposed_doj &&
      !c.actual_doj &&
      c.proposed_doj >= today &&
      c.proposed_doj <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  ).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Joining This Week"
          value={joiningThisWeek}
          icon={UserCheck}
          tint="bg-brand-50 text-brand-600"
        />
        <StatCard
          label="Joined To Date"
          value={DEMO_ONBOARDING_CASES.filter((c) => c.status === "joined").length}
          tint="bg-green-50 text-green-600"
        />
        <StatCard
          label="Offers Declined"
          value={DEMO_ONBOARDING_CASES.filter((c) => c.status === "offer_declined").length}
          tint="bg-red-50 text-red-600"
        />
      </div>

      <Card
        title="New Joinees"
        subtitle="Marking someone joined creates the employee and links it back to the ATS candidate"
        bodyClassName="p-4"
      >
        <SubTabs
          tabs={[
            { key: "upcoming", label: "Upcoming", count: rows.length },
            {
              key: "joined",
              label: "Joined",
              count: DEMO_ONBOARDING_CASES.filter((c) => c.status === "joined").length,
            },
          ]}
          value={view}
          onChange={setView}
        />
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search candidate, code or designation"
          onReset={() => setSearch("")}
          onExport={() => {}}
        />
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(c) => c.id}
          empty={view === "joined" ? "Nobody has joined yet" : "No upcoming joinees"}
          dense
        />
      </Card>
    </div>
  );
}
