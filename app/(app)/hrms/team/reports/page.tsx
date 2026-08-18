"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { CalendarClock, ChevronRight, FileSpreadsheet, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, Card, FormField, FormGrid, Input, Modal, Select } from "@/components/hrms/ui";
import { useHrmsApi } from "@/lib/hrms/api-client";
import { todayISO } from "@/lib/hrms/format";
import type { LookupItem } from "@/lib/hrms/types";

interface ReportDef {
  key: string;
  name: string;
  source: string;
}

const GROUPS: { title: string; icon: LucideIcon; tint: string; reports: ReportDef[] }[] = [
  { title: "Employee Reports", icon: Users, tint: "bg-brand-50 text-brand-600", reports: [{ key: "left", name: "Employee Left Reports", source: "employees + separation events" }, { key: "joining", name: "Employee Joining Reports", source: "employee_assignments period start" }] },
  { title: "Leave Reports", icon: CalendarClock, tint: "bg-gray-100 text-graphite", reports: [{ key: "leave_approval", name: "Leave Approval", source: "approval_requests where type = leave" }, { key: "leave_balance", name: "Leave Balance", source: "leave_requests + leave_types" }] },
  { title: "Attendance Reports", icon: FileSpreadsheet, tint: "bg-brand-50/60 text-brand-500", reports: [{ key: "register", name: "Attendance Register", source: "attendance_days" }, { key: "monthly", name: "Monthly Register", source: "attendance_days" }, { key: "in_out", name: "In - Out Register", source: "attendance_punches joined to attendance_days" }, { key: "regularization", name: "Attendance Regularization", source: "approval_requests where type = regularization" }, { key: "punch_rejection", name: "Punch Rejection Report", source: "attendance_punches where is_rejected" }] },
];

export default function TeamReportsPage() {
  const [open, setOpen] = useState<ReportDef | null>(null);
  const [running, setRunning] = useState(false);
  const [filters, setFilters] = useState({ from_date: todayISO(), to_date: todayISO(), branch: "", department: "", format: "xlsx" });
  const { data } = useHrmsApi<{ branches: LookupItem[]; departments: LookupItem[] }>("/api/hrms/team-reports", { branches: [], departments: [] });

  async function runReport() {
    if (!open) return;
    setRunning(true);
    try {
      const res = await fetch("/api/hrms/team-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ report: open.key, ...filters }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Report failed");
      const rows = json.data.rows as Record<string, unknown>[];
      const sheet = XLSX.utils.json_to_sheet(rows);
      if (filters.format === "csv") {
        const url = URL.createObjectURL(new Blob([XLSX.utils.sheet_to_csv(sheet)], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = json.data.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, "Report");
        XLSX.writeFile(book, json.data.filename);
      }
      setOpen(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        {GROUPS.map((group) => (
          <Card key={group.title} title={group.title} bodyClassName="p-0">
            <ul className="divide-y divide-gray-100">{group.reports.map((report) => <li key={report.key}><button type="button" onClick={() => setOpen(report)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-brand-50/50"><span className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${group.tint}`}><group.icon size={15} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-gray-900">{report.name}</span><span className="block truncate text-xs text-gray-500">{report.source}</span></span><ChevronRight size={15} className="flex-shrink-0 text-gray-300" /></button></li>)}</ul>
          </Card>
        ))}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""} subtitle={`Reads from ${open?.source ?? ""}`} footer={<><Button onClick={() => setOpen(null)}>Cancel</Button><Button variant="primary" onClick={runReport} disabled={running}>{running ? "Running..." : "Run Report"}</Button></>}>
        <FormGrid columns={2}>
          <FormField label="From Date" required><Input type="date" value={filters.from_date} onChange={(e) => setFilters((f) => ({ ...f, from_date: e.target.value }))} /></FormField>
          <FormField label="To Date" required><Input type="date" value={filters.to_date} onChange={(e) => setFilters((f) => ({ ...f, to_date: e.target.value }))} /></FormField>
          <FormField label="Branch"><Select value={filters.branch} onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))}><option value="">All branches</option>{data.branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}</Select></FormField>
          <FormField label="Department"><Select value={filters.department} onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}><option value="">All departments</option>{data.departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</Select></FormField>
          <FormField label="Format" span><Select value={filters.format} onChange={(e) => setFilters((f) => ({ ...f, format: e.target.value }))}><option value="xlsx">Excel (.xlsx)</option><option value="csv">CSV</option></Select></FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}
