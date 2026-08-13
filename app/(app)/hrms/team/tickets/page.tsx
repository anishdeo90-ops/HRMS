"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { Badge, Button, Card, DataTable, FormField, FormGrid, Input, Modal, Select, SelectFilter, StatCard, SubTabs, Textarea, Toolbar, type Column } from "@/components/hrms/ui";
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

export default function TeamTicketsPage() {
  const [view, setView] = useState<"all" | "assigned" | "mine">("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "", priority: "medium", description: "" });
  const { data, reload } = useHrmsApi<{ tickets: Ticket[]; categories: LookupItem[]; me: Employee | null }>("/api/hrms/tickets", { tickets: [], categories: [], me: null });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.tickets.filter((t) => {
      if (view === "mine" && t.raised_by_id !== data.me?.id) return false;
      if (view === "assigned" && t.assigned_to !== data.me?.name) return false;
      if (category && t.category !== category) return false;
      if (status && t.status !== status) return false;
      return !q || [t.ticket_code, t.subject, t.raised_by].some((f) => String(f ?? "").toLowerCase().includes(q));
    });
  }, [data, view, search, category, status]);

  const counts = {
    open: data.tickets.filter((t) => t.status === "open").length,
    inProgress: data.tickets.filter((t) => t.status === "in_progress").length,
    resolved: data.tickets.filter((t) => t.status === "resolved").length,
    critical: data.tickets.filter((t) => t.priority === "critical" && t.status !== "closed").length,
  };

  async function submit() {
    await hrmsMutation("/api/hrms/tickets", "POST", form);
    toast.success("Ticket raised");
    setAddOpen(false);
    reload();
  }

  async function resolve(id: string) {
    await hrmsMutation("/api/hrms/tickets", "PATCH", { id, status: "resolved" });
    toast.success("Ticket resolved");
    reload();
  }

  const columns: Column<Ticket>[] = [
    { key: "code", header: "Ticket", render: (t) => <span className="font-medium text-gray-900">{t.ticket_code}</span> },
    { key: "subject", header: "Subject", render: (t) => t.subject },
    { key: "category", header: "Category", render: (t) => t.category },
    { key: "priority", header: "Priority", render: (t) => <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge> },
    { key: "raised_by", header: "Raised By", render: (t) => t.raised_by },
    { key: "assigned", header: "Assigned To", render: (t) => t.assigned_to ?? EMPTY },
    { key: "created", header: "Raised On", render: (t) => fmtDate(t.created_at) },
    { key: "resolved", header: "Resolved On", render: (t) => fmtDate(t.resolved_at) },
    { key: "status", header: "Status", render: (t) => <Badge tone={STATUS_TONE[t.status]}>{titleCase(t.status)}</Badge> },
    { key: "actions", header: "Actions", align: "right", render: (t) => t.status === "open" || t.status === "in_progress" ? <Button variant="ghost" onClick={() => resolve(t.id)}>Resolve</Button> : <span className="text-gray-300">{EMPTY}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="Open" value={counts.open} tint="bg-amber-50 text-amber-600" /><StatCard label="In Progress" value={counts.inProgress} tint="bg-blue-50 text-blue-600" /><StatCard label="Resolved" value={counts.resolved} tint="bg-green-50 text-green-600" /><StatCard label="Critical Open" value={counts.critical} tint="bg-red-50 text-red-600" /></div>
      <Card title="Tickets" bodyClassName="p-4" actions={<Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>Raise Ticket</Button>}>
        <SubTabs tabs={[{ key: "all", label: "All Tickets", count: data.tickets.length }, { key: "assigned", label: "Assigned to Me", count: data.tickets.filter((t) => t.assigned_to === data.me?.name).length }, { key: "mine", label: "Raised by Me", count: data.tickets.filter((t) => t.raised_by_id === data.me?.id).length }]} value={view} onChange={setView} />
        <Toolbar search={search} onSearch={setSearch} placeholder="Search ticket, subject or requester" onReset={() => { setSearch(""); setCategory(""); setStatus(""); }} onExport={() => {}}>
          <SelectFilter label="All Categories" value={category} onChange={setCategory} options={data.categories.map((c) => ({ value: c.name, label: c.name }))} />
          <SelectFilter label="All Statuses" value={status} onChange={setStatus} options={["open", "in_progress", "resolved", "closed"].map((s) => ({ value: s, label: titleCase(s) }))} />
        </Toolbar>
        <DataTable columns={columns} rows={rows} getKey={(t) => t.id} empty="No tickets found" dense />
      </Card>
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Raise Ticket" footer={<><Button onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" onClick={submit}>Submit</Button></>}>
        <FormGrid columns={2}>
          <FormField label="Subject" required span><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></FormField>
          <FormField label="Category" required><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Select</option>{data.categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</Select></FormField>
          <FormField label="Priority" required><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}</Select></FormField>
          <FormField label="Description" required span><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}
