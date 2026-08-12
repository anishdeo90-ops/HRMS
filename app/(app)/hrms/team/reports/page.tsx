"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { CalendarClock, ChevronRight, FileSpreadsheet, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Button,
  Card,
  FormField,
  FormGrid,
  Input,
  Modal,
  Select,
} from "@/components/hrms/ui";
import { DEMO_BRANCHES, DEMO_DEPARTMENTS } from "@/lib/hrms/demo-data";
import { todayISO } from "@/lib/hrms/format";

/**
 * `docs/hrms/02-team.md §3`.
 *
 * The Reports page is a launcher and nothing else — three groups, eleven
 * reports, no data of its own. Nine of the eleven are queries over tables the
 * spec already defines; the two penalty reports read
 * `attendance_day_penalties`, the one table this section adds.
 */

interface ReportDef {
  key: string;
  name: string;
  /** Where the report reads from — kept visible so the seam stays honest. */
  source: string;
}

const GROUPS: { title: string; icon: LucideIcon; tint: string; reports: ReportDef[] }[] = [
  {
    title: "Employee Reports",
    icon: Users,
    tint: "bg-brand-50 text-brand-600",
    reports: [
      { key: "left", name: "Employee Left Reports", source: "employees + separation events" },
      { key: "joining", name: "Employee Joining Reports", source: "employee_assignments period start" },
    ],
  },
  {
    title: "Leave Reports",
    icon: CalendarClock,
    tint: "bg-gray-100 text-graphite",
    reports: [
      { key: "leave_approval", name: "Leave Approval", source: "approval_requests where type = leave" },
      { key: "leave_balance", name: "Leave Balance", source: "sum(leave_ledger_entries.amount)" },
    ],
  },
  {
    title: "Attendance Reports",
    icon: FileSpreadsheet,
    tint: "bg-brand-50/60 text-brand-500",
    reports: [
      { key: "register", name: "Attendance Register", source: "attendance_days" },
      { key: "monthly", name: "Monthly Register", source: "attendance_days, pivoted by month" },
      { key: "in_out", name: "In - Out Register", source: "attendance_punches joined to attendance_days" },
      { key: "regularization", name: "Attendance Regularization", source: "approval_requests where type = regularization" },
      { key: "penalty_violation", name: "Penalty Violation Report", source: "attendance_day_penalties — one row per incident" },
      { key: "penalty_summary", name: "Penalty Summary Report", source: "attendance_day_penalties, aggregated per period" },
      { key: "punch_rejection", name: "Punch Rejection Report", source: "attendance_punches where is_rejected" },
    ],
  },
];

export default function TeamReportsPage() {
  const [open, setOpen] = useState<ReportDef | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        {GROUPS.map((group) => (
          <Card key={group.title} title={group.title} bodyClassName="p-0">
            <ul className="divide-y divide-gray-100">
              {group.reports.map((report) => (
                <li key={report.key}>
                  <button
                    type="button"
                    onClick={() => setOpen(report)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-brand-50/50"
                  >
                    <span className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${group.tint}`}>
                      <group.icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900">{report.name}</span>
                      <span className="block truncate text-xs text-gray-500">{report.source}</span>
                    </span>
                    <ChevronRight size={15} className="flex-shrink-0 text-gray-300" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.name ?? ""}
        subtitle={`Reads from ${open?.source ?? ""}`}
        footer={
          <>
            <Button onClick={() => setOpen(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success(`${open?.name} queued — you will be emailed when it is ready`);
                setOpen(null);
              }}
            >
              Run Report
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="From Date" required>
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          <FormField label="To Date" required>
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          <FormField label="Branch">
            <Select defaultValue="">
              <option value="">All branches</option>
              {DEMO_BRANCHES.map((b) => (
                <option key={b.id}>{b.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Department">
            <Select defaultValue="">
              <option value="">All departments</option>
              {DEMO_DEPARTMENTS.map((d) => (
                <option key={d.id}>{d.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Format" span>
            <Select defaultValue="xlsx">
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </Select>
          </FormField>
        </FormGrid>
        <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Attendance figures come from the stored <code>payable_fraction</code>, so this report
          returns the same number in December that the employee saw in August.
        </p>
      </Modal>
    </div>
  );
}
