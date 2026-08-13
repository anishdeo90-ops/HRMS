"use client";

import { useState } from "react";
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
  const { data } = useHrmsApi<{ branches: LookupItem[]; departments: LookupItem[] }>("/api/hrms/team-reports", { branches: [], departments: [] });

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        {GROUPS.map((group) => (
          <Card key={group.title} title={group.title} bodyClassName="p-0">
            <ul className="divide-y divide-gray-100">{group.reports.map((report) => <li key={report.key}><button type="button" onClick={() => setOpen(report)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-brand-50/50"><span className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${group.tint}`}><group.icon size={15} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-gray-900">{report.name}</span><span className="block truncate text-xs text-gray-500">{report.source}</span></span><ChevronRight size={15} className="flex-shrink-0 text-gray-300" /></button></li>)}</ul>
          </Card>
        ))}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""} subtitle={`Reads from ${open?.source ?? ""}`} footer={<><Button onClick={() => setOpen(null)}>Cancel</Button><Button variant="primary" disabled>Run Report</Button></>}>
        <FormGrid columns={2}>
          <FormField label="From Date" required><Input type="date" defaultValue={todayISO()} /></FormField>
          <FormField label="To Date" required><Input type="date" defaultValue={todayISO()} /></FormField>
          <FormField label="Branch"><Select defaultValue=""><option value="">All branches</option>{data.branches.map((b) => <option key={b.id}>{b.name}</option>)}</Select></FormField>
          <FormField label="Department"><Select defaultValue=""><option value="">All departments</option>{data.departments.map((d) => <option key={d.id}>{d.name}</option>)}</Select></FormField>
          <FormField label="Format" span><Select defaultValue="xlsx"><option value="xlsx">Excel (.xlsx)</option><option value="csv">CSV</option></Select></FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}
