"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Upload } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  FormField,
  FormGrid,
  Input,
  Modal,
  SelectFilter,
  Select,
  StatCard,
  Textarea,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { DEMO_DEPARTMENTS, DEMO_EMPLOYEES, DEMO_TEAM_ATTENDANCE_TODAY } from "@/lib/hrms/demo-data";
import { EMPTY, fmtDate, fmtDuration, fmtTime, todayISO } from "@/lib/hrms/format";
import { dayLabel, dayTone } from "@/lib/hrms/status";
import type { AttendanceDay } from "@/lib/hrms/types";

/**
 * `docs/hrms/02-team.md §9` — the materialised day register for the whole team.
 *
 * Three corrections to the reference are visible on this screen:
 *  - the day's state is a first-class status column, not a free-text `Weekoff.`
 *    comment nobody can filter on (§9.3);
 *  - the column is the **business day**, not `In Date`, so a night shift is one
 *    row rather than two half-rows (§9.4);
 *  - durations are minutes internally and formatted at render, instead of the
 *    reference's hours-and-minutes mix (§9.5).
 *
 * A manual entry is attributed and reasoned rather than silently written, and
 * rows are voided rather than deleted (§9.6).
 */
export default function TeamInOutPage() {
  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [manualOpen, setManualOpen] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_TEAM_ATTENDANCE_TODAY.filter((r) => {
      if (status && r.day_status !== status) return false;
      if (department) {
        const emp = DEMO_EMPLOYEES.find((e) => e.id === r.employee_id);
        if (emp?.department !== department) return false;
      }
      if (!q) return true;
      return [r.employee_name, r.employee_code].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, department, status]);

  const summary = useMemo(() => {
    const all = DEMO_TEAM_ATTENDANCE_TODAY;
    return {
      present: all.filter((r) => ["present", "wfh", "on_duty"].includes(r.day_status)).length,
      half: all.filter((r) => r.day_status === "half_day").length,
      absent: all.filter((r) => r.day_status === "absent").length,
      leave: all.filter((r) => r.day_status === "on_leave").length,
    };
  }, []);

  const columns: Column<AttendanceDay>[] = [
    { key: "code", header: "Employee Code", render: (r) => r.employee_code ?? EMPTY },
    {
      key: "name",
      header: "Employee Name",
      render: (r) => <span className="font-medium text-gray-900">{r.employee_name ?? EMPTY}</span>,
    },
    { key: "date", header: "Work Date", render: (r) => fmtDate(r.work_date) },
    { key: "shift", header: "Shift", render: (r) => r.shift_name ?? EMPTY },
    { key: "in", header: "In Time", render: (r) => fmtTime(r.first_in) },
    { key: "out", header: "Out Time", render: (r) => fmtTime(r.last_out) },
    { key: "duration", header: "Duration", render: (r) => fmtDuration(r.worked_minutes) },
    {
      key: "overtime",
      header: "Overtime",
      render: (r) => (r.extra_minutes ? fmtDuration(r.extra_minutes) : EMPTY),
    },
    { key: "break", header: "Break", render: (r) => fmtDuration(r.worked_minutes ? 60 : null) },
    {
      key: "status",
      header: "Day Status",
      render: (r) => <Badge tone={dayTone(r.day_status)}>{dayLabel(r.day_status)}</Badge>,
    },
    {
      key: "payable",
      header: "Payable",
      align: "right",
      render: (r) => (
        <span
          className={r.payable_fraction === 1 ? "text-gray-700" : "font-semibold text-amber-700"}
          title="Stored, not recomputed — payroll reads this number"
        >
          {r.payable_fraction}
        </span>
      ),
    },
    {
      key: "comments",
      header: "Comments",
      render: (r) => (
        <span className="text-xs text-gray-500">{r.penalty_reason ?? EMPTY}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Present" value={summary.present} tint="bg-green-50 text-green-600" />
        <StatCard label="Half Day" value={summary.half} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Absent" value={summary.absent} tint="bg-red-50 text-red-600" />
        <StatCard label="On Leave" value={summary.leave} tint="bg-blue-50 text-blue-600" />
      </div>

      <Card
        title="Employees In-Out"
        subtitle="One row per employee per business day, whether or not they punched"
        bodyClassName="p-4"
        actions={
          <div className="flex items-center gap-2">
            <Button icon={Upload}>Import</Button>
            <Button icon={Plus} variant="primary" onClick={() => setManualOpen(true)}>
              Add Manual In-Out
            </Button>
          </div>
        }
      >
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search employee or code"
          onReset={() => {
            setSearch("");
            setDepartment("");
            setStatus("");
            setDate(todayISO());
          }}
          onExport={() => {}}
        >
          <input
            type="date"
            aria-label="Work date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700"
          />
          <SelectFilter
            label="All Departments"
            value={department}
            onChange={setDepartment}
            options={DEMO_DEPARTMENTS.map((d) => ({ value: d.name, label: d.name }))}
          />
          <SelectFilter
            label="All Statuses"
            value={status}
            onChange={setStatus}
            options={[
              "present", "half_day", "absent", "on_leave", "weekly_off", "holiday", "wfh", "on_duty",
            ].map((s) => ({ value: s, label: dayLabel(s) }))}
          />
        </Toolbar>

        {selected.length > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <span className="text-xs font-medium text-amber-800">{selected.length} selected</span>
            <Button
              className="ml-auto"
              onClick={() => toast.success(`${selected.length} rows voided with a reason recorded`)}
            >
              Void Rows
            </Button>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.id}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          empty="No attendance rows for this date"
          dense
        />
      </Card>

      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Add Manual In-Out"
        subtitle="Manual writes are attributed, reasoned and marked with their source"
        footer={
          <>
            <Button onClick={() => setManualOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Manual attendance recorded");
                setManualOpen(false);
              }}
            >
              Save
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
          <FormField label="Work Date" required hint="The business day this row accounts for">
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          <FormField label="In Time" required>
            <Input type="time" defaultValue="09:30" />
          </FormField>
          <FormField label="Out Time" required>
            <Input type="time" defaultValue="18:30" />
          </FormField>
          <FormField label="Reason" required span hint="Recorded against your name in the audit trail">
            <Textarea placeholder="Why is this entry being made manually?" />
          </FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}
