"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
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
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_CYCLES } from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, todayISO } from "@/lib/hrms/format";
import { titleCase } from "@/lib/hrms/status";
import type { PerformanceCycle } from "@/lib/hrms/types";

/** `docs/hrms/13-performance-review.md §5` — cycles and their review windows. */

const CYCLE_TONE: Record<PerformanceCycle["status"], string> = {
  draft: "bg-gray-100 text-gray-500",
  active: "bg-green-100 text-green-700",
  closed: "bg-slate-200 text-slate-700",
};

export default function PerformanceCyclesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_CYCLES.filter((c) => {
      if (status && c.status !== status) return false;
      if (!q) return true;
      return [c.cycle_name, c.cycle_code].some((f) => String(f ?? "").toLowerCase().includes(q));
    });
  }, [search, status]);

  const columns: Column<PerformanceCycle>[] = [
    { key: "code", header: "Cycle Code", render: (c) => <span className="font-medium text-gray-900">{c.cycle_code}</span> },
    { key: "name", header: "Cycle Name", render: (c) => c.cycle_name },
    { key: "type", header: "Cycle Type", render: (c) => titleCase(c.cycle_type) },
    {
      key: "period",
      header: "Period",
      render: (c) => `${fmtDate(c.period_start)} — ${fmtDate(c.period_end)}`,
    },
    {
      key: "self",
      header: "Self Review",
      render: (c) =>
        c.self_review_start
          ? `${fmtDate(c.self_review_start)} — ${fmtDate(c.self_review_end)}`
          : EMPTY,
    },
    {
      key: "manager",
      header: "Manager Review",
      render: (c) =>
        c.manager_review_start
          ? `${fmtDate(c.manager_review_start)} — ${fmtDate(c.manager_review_end)}`
          : EMPTY,
    },
    {
      key: "participants",
      header: "Participants",
      align: "right",
      // `—` rather than 0 for a draft cycle nobody has been added to yet.
      render: (c) => (c.participants ? c.participants : EMPTY),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <Badge tone={CYCLE_TONE[c.status]}>{titleCase(c.status)}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-1">
          {c.status === "draft" && (
            <Button variant="success" onClick={() => toast.success(`${c.cycle_name} activated`)}>
              Activate
            </Button>
          )}
          <Button variant="ghost" onClick={() => toast.success(`${c.cycle_name} opened`)}>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card
      title="Performance Cycles"
      subtitle="Review windows sit inside the cycle period, so nobody reviews a period that has not closed"
      bodyClassName="p-4"
      actions={
        <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
          Add Cycle
        </Button>
      }
    >
      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search cycle name or code"
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
          {["draft", "active", "closed"].map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
      </Toolbar>

      <DataTable columns={columns} rows={rows} getKey={(c) => c.id} empty="No cycles defined" dense />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Create Performance Cycle"
        width="max-w-3xl"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Cycle created as a draft");
                setAddOpen(false);
              }}
            >
              Save as Draft
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Cycle Name" required>
            <Input placeholder="e.g. FY 2027-28 Annual" />
          </FormField>
          <FormField label="Cycle Code" hint="Auto-generated">
            <Input placeholder="Auto-generated" disabled />
          </FormField>
          <FormField label="Cycle Type" required>
            <Select defaultValue="annual">
              {["annual", "half_yearly", "quarterly", "probation"].map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Appraisal Template" required>
            <Select defaultValue="">
              <option value="">Select</option>
              <option>Annual Review — Individual Contributor</option>
              <option>Annual Review — People Manager</option>
              <option>Probation Confirmation</option>
              <option>Mid-Year Check-in</option>
            </Select>
          </FormField>
          <FormField label="Period Start" required>
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          <FormField label="Period End" required>
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          <FormField label="Self Review Start" required>
            <Input type="date" />
          </FormField>
          <FormField label="Self Review End" required>
            <Input type="date" />
          </FormField>
          <FormField label="Manager Review Start" required>
            <Input type="date" />
          </FormField>
          <FormField label="Manager Review End" required>
            <Input type="date" />
          </FormField>
        </FormGrid>
      </Modal>
    </Card>
  );
}
