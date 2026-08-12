"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Mail, Plus } from "lucide-react";
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
  Textarea,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_EMPLOYEES, DEMO_SEPARATIONS } from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, todayISO } from "@/lib/hrms/format";
import { requestTone, titleCase } from "@/lib/hrms/status";
import type { Separation } from "@/lib/hrms/types";

/** `docs/hrms/05-employee-record.md §7` — the exit workflow, and a Payroll seam. */
export default function SeparationPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_SEPARATIONS.filter((s) => {
      if (status && s.status !== status) return false;
      if (!q) return true;
      return [s.employee_name, s.employee_code, s.reason].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, status]);

  const summary = useMemo(() => {
    const today = todayISO();
    return {
      inNotice: DEMO_SEPARATIONS.filter((s) => s.last_working_date >= today && s.status === "approved").length,
      pending: DEMO_SEPARATIONS.filter((s) => s.status === "pending").length,
      clearancePending: DEMO_SEPARATIONS.filter((s) => (s.clearance_pending?.length ?? 0) > 0).length,
      exitInterviewPending: DEMO_SEPARATIONS.filter((s) => !s.exit_interview_done).length,
    };
  }, []);

  const columns: Column<Separation>[] = [
    { key: "code", header: "Employee Code", render: (s) => s.employee_code },
    {
      key: "name",
      header: "Employee Name",
      render: (s) => <span className="font-medium text-gray-900">{s.employee_name}</span>,
    },
    { key: "designation", header: "Designation", render: (s) => s.designation ?? EMPTY },
    { key: "department", header: "Department", render: (s) => s.department ?? EMPTY },
    { key: "type", header: "Separation Type", render: (s) => titleCase(s.separation_type) },
    { key: "resigned", header: "Resignation Date", render: (s) => fmtDate(s.resignation_date) },
    { key: "notice", header: "Notice Period", render: (s) => `${s.notice_days} days` },
    { key: "lwd", header: "Last Working Date", render: (s) => fmtDate(s.last_working_date) },
    {
      key: "clearance",
      header: "Clearance",
      render: (s) =>
        (s.clearance_pending?.length ?? 0) === 0 ? (
          <Badge tone="bg-green-100 text-green-700">All clear</Badge>
        ) : (
          <Badge tone="bg-amber-100 text-amber-800">
            {s.clearance_pending!.length} pending
          </Badge>
        ),
    },
    {
      key: "exit",
      header: "Exit Interview",
      align: "center",
      render: (s) =>
        s.exit_interview_done ? (
          <Badge tone="bg-green-100 text-green-700">Done</Badge>
        ) : (
          <Badge tone="bg-gray-100 text-gray-500">Pending</Badge>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <Badge tone={requestTone(s.status)}>{s.status}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (s) => (
        <Button variant="ghost" onClick={() => router.push(`/hrms/team/directory/${s.employee_id}`)}>
          Open Record
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="In Notice Period" value={summary.inNotice} tint="bg-orange-50 text-orange-600" />
        <StatCard label="Pending Approval" value={summary.pending} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Clearance Pending" value={summary.clearancePending} tint="bg-red-50 text-red-600" />
        <StatCard label="Exit Interview Pending" value={summary.exitInterviewPending} />
      </div>

      <Card
        title="Separation"
        subtitle="Final settlement is a Payroll consumer of this list"
        bodyClassName="p-4"
        actions={
          <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
            Initiate Separation
          </Button>
        }
      >
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search employee, code or reason"
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

        <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <span className="text-xs font-medium text-gray-500">
            {selected.length > 0 ? `${selected.length} selected` : "Select rows for bulk actions"}
          </span>
          <Button
            className="ml-auto"
            icon={Mail}
            disabled={selected.length === 0}
            onClick={() => toast.success(`Exit formalities email sent to ${selected.length}`)}
          >
            Send Exit Formalities Email
          </Button>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          getKey={(s) => s.id}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          empty="No separations recorded"
          dense
        />
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Initiate Separation"
        subtitle="Raises a separation request in the same approval engine as every other request"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Separation request raised");
                setAddOpen(false);
              }}
            >
              Submit
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Employee" required>
            <Select defaultValue="">
              <option value="">Select an employee</option>
              {DEMO_EMPLOYEES.filter((e) => e.status !== "separated").map((e) => (
                <option key={e.id}>
                  {e.employee_code} — {e.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Separation Type" required>
            <Select defaultValue="resignation">
              {["resignation", "termination", "retirement", "absconding"].map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Resignation Date" required>
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          <FormField label="Notice Period" required hint="Defaults from the employment type">
            <Input type="number" min={0} defaultValue={60} />
          </FormField>
          <FormField label="Last Working Date" hint="Derived from the resignation date plus notice">
            <Input type="date" disabled />
          </FormField>
          <FormField label="Reason" required span>
            <Textarea placeholder="Reason for separation" />
          </FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}
