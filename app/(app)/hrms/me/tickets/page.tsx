"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { Badge, Button, Card, DataTable, FormField, FormGrid, Input, Modal, Select, Textarea, Toolbar, type Column } from "@/components/hrms/ui";
import { hrmsMutation, useHrmsApi } from "@/lib/hrms/api-client";
import { EMPTY, fmtDate } from "@/lib/hrms/format";
import { priorityTone, titleCase } from "@/lib/hrms/status";
import type { Employee, LookupItem, Ticket } from "@/lib/hrms/types";

const STATUS_TONE: Record<Ticket["status"], string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

const EMPTY_FORM = { subject: "", category: "", priority: "medium", description: "" };

export default function MyTicketsPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { data, reload } = useHrmsApi<{ tickets: Ticket[]; categories: LookupItem[]; me: Employee | null }>("/api/hrms/tickets", { tickets: [], categories: [], me: null });

  const mine = useMemo(() => data.tickets.filter((t) => t.raised_by_id === data.me?.id), [data.tickets, data.me?.id]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mine.filter((t) => !q || [t.ticket_code, t.subject, t.category].some((f) => String(f ?? "").toLowerCase().includes(q)));
  }, [mine, search]);

  async function submit() {
    if (!form.subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    await hrmsMutation("/api/hrms/tickets", "POST", form);
    toast.success("Ticket raised");
    setForm(EMPTY_FORM);
    setAddOpen(false);
    reload();
  }

  const columns: Column<Ticket>[] = [
    { key: "code", header: "Ticket", render: (t) => <span className="font-medium text-gray-900">{t.ticket_code}</span> },
    { key: "subject", header: "Subject", render: (t) => t.subject },
    { key: "category", header: "Category", render: (t) => t.category },
    { key: "priority", header: "Priority", render: (t) => <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge> },
    { key: "created", header: "Raised On", render: (t) => fmtDate(t.created_at) },
    { key: "resolved", header: "Resolved On", render: (t) => fmtDate(t.resolved_at) },
    { key: "assigned", header: "Assigned To", render: (t) => t.assigned_to ?? EMPTY },
    { key: "status", header: "Status", render: (t) => <Badge tone={STATUS_TONE[t.status]}>{titleCase(t.status)}</Badge> },
  ];

  return (
    <div className="space-y-5">
      <Card title="My Tickets" bodyClassName="p-4" actions={<Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>Raise Ticket</Button>}>
        <Toolbar search={search} onSearch={setSearch} placeholder="Search my tickets" onReset={() => setSearch("")} onExport={() => {}} />
        <DataTable columns={columns} rows={rows} getKey={(t) => t.id} empty="No tickets raised yet" dense />
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Raise Ticket" footer={<><Button onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" onClick={submit}>Submit</Button></>}>
        <FormGrid columns={2}>
          <FormField label="Subject" required span><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></FormField>
          <FormField label="Category"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">HR</option>{data.categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</Select></FormField>
          <FormField label="Priority" required><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}</Select></FormField>
          <FormField label="Description" span><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}
