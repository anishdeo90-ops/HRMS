"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ExternalLink, Info, Plus, UserPlus } from "lucide-react";
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
  StatCard,
  SubTabs,
  Textarea,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { EMPTY, fmtDate, fmtLacs } from "@/lib/hrms/format";
import { priorityTone } from "@/lib/hrms/status";
import type { JobOpeningView } from "@/lib/hrms/types";
import { useApiData } from "@/lib/hrms/use-api-data";

/**
 * `docs/hrms/15-more-module.md §1`.
 *
 * HRMS owns no jobs table. The ATS requisition is the single source and this tab
 * is a read-only view of it, rendered in the HRMS shell — the reference had a
 * fourth copy of the same concept with no connection to the other three.
 *
 * `Refer Candidate` is the one place HRMS *writes into* recruiting (§1.2), and
 * the referral link must survive until the bonus is paid.
 */
export default function JobOpeningsPage() {
  const [view, setView] = useState<"mine" | "all">("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [referOpen, setReferOpen] = useState(false);
  const jobs = useApiData<JobOpeningView[]>("/api/hrms/jobs", []);
  const [referral, setReferral] = useState({ name: "", email: "", mobile: "", job_id: "", notes: "" });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (status && j.status !== status) return false;
      if (view === "mine" && j.created_by !== "Priya Nair") return false;
      if (!q) return true;
      return [j.job_title, j.created_by].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [jobs, search, status, view]);

  const stats = useMemo(
    () => ({
      active: jobs.filter((j) => j.status === "Open" || j.status === "In Progress").length,
      openings: jobs.filter((j) => j.status !== "Closed").reduce(
        (s, j) => s + j.openings,
        0
      ),
      onHold: jobs.filter((j) => j.status === "On Hold").length,
      closed: jobs.filter((j) => j.status === "Closed").length,
    }),
    [jobs]
  );

  async function submitReferral() {
    const res = await fetch("/api/hrms/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(referral),
    });
    if (!res.ok) return toast.error("Could not submit referral");
    toast.success("Candidate referred — the referral is linked to your record");
    setReferOpen(false);
    setReferral({ name: "", email: "", mobile: "", job_id: "", notes: "" });
  }

  const columns: Column<JobOpeningView>[] = [
    {
      key: "title",
      header: "Job Title",
      render: (j) => <span className="font-medium text-gray-900">{j.job_title}</span>,
    },
    { key: "exp", header: "Experience (Years)", render: (j) => j.experience_years ?? EMPTY },
    {
      key: "budget",
      header: "Budget (per annum)",
      align: "right",
      render: (j) => fmtLacs(j.budget_annual_paise),
    },
    { key: "openings", header: "No of Openings", align: "right", render: (j) => j.openings },
    {
      key: "priority",
      header: "Priority",
      render: (j) => <Badge tone={priorityTone(j.priority)}>{j.priority}</Badge>,
    },
    { key: "status", header: "Status", render: (j) => <Badge>{j.status}</Badge> },
    { key: "created_by", header: "Created By", render: (j) => j.created_by ?? EMPTY },
    { key: "created", header: "Created At", render: (j) => fmtDate(j.created_at) },
    { key: "progress", header: "In Progress Date", render: (j) => fmtDate(j.in_progress_at) },
    { key: "closed", header: "Closed Date", render: (j) => fmtDate(j.closed_at) },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (j) => (
        <Link
          href={`/jobs`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
          title={`Open ${j.job_title} in the ATS`}
        >
          Open in ATS <ExternalLink size={11} />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Requisitions" value={stats.active} tint="bg-brand-50 text-brand-600" />
        <StatCard label="Total Openings" value={stats.openings} />
        <StatCard label="On Hold" value={stats.onHold} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Closed" value={stats.closed} tint="bg-gray-100 text-graphite" />
      </div>

      <Card
        title="Job Opening"
        subtitle="A view of the ATS requisitions — HRMS keeps no second copy"
        bodyClassName="p-4"
        actions={
          <div className="flex items-center gap-2">
            <Button icon={UserPlus} onClick={() => setReferOpen(true)}>
              Refer Candidate
            </Button>
            <Link href="/jobs">
              <Button icon={Plus} variant="primary">
                Add Job
              </Button>
            </Link>
          </div>
        }
      >
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
          <Info size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
          <p className="text-xs text-gray-600">
            Lifecycle dates are derived from the requisition&apos;s recorded transitions, so
            reopening a job does not leave &ldquo;In Progress Date&rdquo; meaning two different
            things.
          </p>
        </div>

        <SubTabs
          tabs={[
            { key: "mine", label: "My Jobs", count: jobs.filter((j) => j.created_by === "Priya Nair").length },
            { key: "all", label: "All Jobs", count: jobs.length },
          ]}
          value={view}
          onChange={setView}
        />

        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search job title or creator"
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
            {["Open", "In Progress", "On Hold", "Closed"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Toolbar>

        <DataTable columns={columns} rows={rows} getKey={(j) => j.id} empty="No open requisitions" dense />
      </Card>

      <Modal
        open={referOpen}
        onClose={() => setReferOpen(false)}
        title="Refer Candidate"
        subtitle="Creates the candidate in the ATS and records you as the referrer"
        footer={
          <>
            <Button onClick={() => setReferOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={submitReferral}
            >
              Submit Referral
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Candidate Name" required>
            <Input placeholder="Full name" value={referral.name} onChange={(e) => setReferral((r) => ({ ...r, name: e.target.value }))} />
          </FormField>
          <FormField label="Email" required>
            <Input type="email" placeholder="name@example.com" value={referral.email} onChange={(e) => setReferral((r) => ({ ...r, email: e.target.value }))} />
          </FormField>
          <FormField label="Mobile" required>
            <Input type="tel" placeholder="10-digit mobile" value={referral.mobile} onChange={(e) => setReferral((r) => ({ ...r, mobile: e.target.value }))} />
          </FormField>
          <FormField label="Referring For" required>
            <Select value={referral.job_id} onChange={(e) => setReferral((r) => ({ ...r, job_id: e.target.value }))}>
              <option value="">Select a job</option>
              {jobs.filter((j) => j.status !== "Closed").map((j) => (
                <option key={j.id} value={j.id}>{j.job_title}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Resume" span hint="PDF or Word, up to 5 MB">
            <div className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
              Choose a file
            </div>
          </FormField>
          <FormField label="Why are you referring them?" span>
            <Textarea placeholder="Context helps the recruiter prioritise the profile" value={referral.notes} onChange={(e) => setReferral((r) => ({ ...r, notes: e.target.value }))} />
          </FormField>
        </FormGrid>
        <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
          The referral link is kept for the life of the hire, so a referral bonus stays payable
          months later without anyone reconstructing it from a spreadsheet.
        </p>
      </Modal>
    </div>
  );
}
