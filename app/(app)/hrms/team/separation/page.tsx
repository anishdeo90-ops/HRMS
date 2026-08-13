"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Mail, Plus } from "lucide-react";
import { Badge, Button, Card, DataTable, FormField, FormGrid, Input, Modal, Select, StatCard, Textarea, Toolbar, type Column } from "@/components/hrms/ui";
import { hrmsMutation, useHrmsApi } from "@/lib/hrms/api-client";
import { EMPTY, fmtDate, todayISO } from "@/lib/hrms/format";
import { requestTone, titleCase } from "@/lib/hrms/status";
import type { Employee, Separation } from "@/lib/hrms/types";

export default function SeparationPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const { data, reload } = useHrmsApi<{ separations: Separation[]; employees: Employee[] }>("/api/hrms/separations", { separations: [], employees: [] });
  const [form, setForm] = useState({ employee_id: "", separation_type: "resignation", resignation_date: todayISO(), notice_days: "60", reason: "" });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.separations.filter((s) => {
      if (status && s.status !== status) return false;
      return !q || [s.employee_name, s.employee_code, s.reason].some((f) => String(f ?? "").toLowerCase().includes(q));
    });
  }, [data.separations, search, status]);
  const today = todayISO();
  const summary = {
    inNotice: data.separations.filter((s) => s.last_working_date >= today && s.status === "approved").length,
    pending: data.separations.filter((s) => s.status === "pending").length,
    clearancePending: data.separations.filter((s) => (s.clearance_pending?.length ?? 0) > 0).length,
    exitInterviewPending: data.separations.filter((s) => !s.exit_interview_done).length,
  };

  async function submit() {
    const lwd = new Date(form.resignation_date);
    lwd.setDate(lwd.getDate() + Number(form.notice_days || 0));
    await hrmsMutation("/api/hrms/separations", "POST", { ...form, notice_days: Number(form.notice_days), last_working_date: lwd.toISOString().slice(0, 10) });
    toast.success("Separation request raised");
    setAddOpen(false);
    reload();
  }

  const columns: Column<Separation>[] = [
    { key: "code", header: "Employee Code", render: (s) => s.employee_code },
    { key: "name", header: "Employee Name", render: (s) => <span className="font-medium text-gray-900">{s.employee_name}</span> },
    { key: "designation", header: "Designation", render: (s) => s.designation ?? EMPTY },
    { key: "department", header: "Department", render: (s) => s.department ?? EMPTY },
    { key: "type", header: "Separation Type", render: (s) => titleCase(s.separation_type) },
    { key: "resigned", header: "Resignation Date", render: (s) => fmtDate(s.resignation_date) },
    { key: "notice", header: "Notice Period", render: (s) => `${s.notice_days} days` },
    { key: "lwd", header: "Last Working Date", render: (s) => fmtDate(s.last_working_date) },
    { key: "status", header: "Status", render: (s) => <Badge tone={requestTone(s.status)}>{s.status}</Badge> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="In Notice Period" value={summary.inNotice} tint="bg-orange-50 text-orange-600" /><StatCard label="Pending Approval" value={summary.pending} tint="bg-amber-50 text-amber-600" /><StatCard label="Clearance Pending" value={summary.clearancePending} tint="bg-red-50 text-red-600" /><StatCard label="Exit Interview Pending" value={summary.exitInterviewPending} /></div>
      <Card title="Separation" bodyClassName="p-4" actions={<Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>Initiate Separation</Button>}>
        <Toolbar search={search} onSearch={setSearch} placeholder="Search employee, code or reason" onReset={() => { setSearch(""); setStatus(""); }} onExport={() => {}}>
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700"><option value="">All statuses</option>{["pending", "approved", "rejected", "cancelled"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>
        </Toolbar>
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"><span className="text-xs font-medium text-gray-500">{selected.length ? `${selected.length} selected` : "Select rows for bulk actions"}</span><Button className="ml-auto" icon={Mail} disabled title="Email workflow is not part of Task 1 API">Send Exit Formalities Email</Button></div>
        <DataTable columns={columns} rows={rows} getKey={(s) => s.id} selectable selected={selected} onSelectedChange={setSelected} empty="No separations recorded" dense />
      </Card>
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Initiate Separation" footer={<><Button onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" onClick={submit}>Submit</Button></>}>
        <FormGrid columns={2}>
          <FormField label="Employee" required><Select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}><option value="">Select an employee</option>{data.employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} - {e.name}</option>)}</Select></FormField>
          <FormField label="Separation Type" required><Select value={form.separation_type} onChange={(e) => setForm({ ...form, separation_type: e.target.value })}>{["resignation", "termination", "retirement", "absconding"].map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}</Select></FormField>
          <FormField label="Resignation Date" required><Input type="date" value={form.resignation_date} onChange={(e) => setForm({ ...form, resignation_date: e.target.value })} /></FormField>
          <FormField label="Notice Period" required><Input type="number" min={0} value={form.notice_days} onChange={(e) => setForm({ ...form, notice_days: e.target.value })} /></FormField>
          <FormField label="Reason" required span><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}
