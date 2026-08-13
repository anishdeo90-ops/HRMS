"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Upload } from "lucide-react";
import { Badge, Button, Card, DataTable, FormField, FormGrid, Input, Modal, Select, SelectFilter, StatCard, Textarea, Toolbar, type Column } from "@/components/hrms/ui";
import { hrmsMutation, useHrmsApi } from "@/lib/hrms/api-client";
import { EMPTY, fmtDate, fmtDuration, fmtTime, todayISO } from "@/lib/hrms/format";
import { dayLabel, dayTone } from "@/lib/hrms/status";
import type { AttendanceDay, Employee, LookupItem } from "@/lib/hrms/types";

export default function TeamInOutPage() {
  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const { data, reload } = useHrmsApi<{ rows: AttendanceDay[]; employees: Employee[]; departments: LookupItem[] }>(
    `/api/hrms/attendance?scope=team&work_date=${date}`,
    { rows: [], employees: [], departments: [] }
  );
  const [manual, setManual] = useState({ employee_id: "", work_date: todayISO(), first_in: "09:30", last_out: "18:30", reason: "" });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (status && r.day_status !== status) return false;
      if (department && !data.employees.find((e) => e.id === r.employee_id && e.department === department)) return false;
      return !q || [r.employee_name, r.employee_code].some((f) => String(f ?? "").toLowerCase().includes(q));
    });
  }, [data, search, department, status]);

  const summary = {
    present: rows.filter((r) => ["present", "wfh", "on_duty"].includes(r.day_status)).length,
    half: rows.filter((r) => r.day_status === "half_day").length,
    absent: rows.filter((r) => r.day_status === "absent").length,
    leave: rows.filter((r) => r.day_status === "on_leave").length,
  };

  async function saveManual() {
    await hrmsMutation("/api/hrms/attendance/manual", "POST", manual);
    toast.success("Manual attendance recorded");
    setManualOpen(false);
    reload();
  }

  const columns: Column<AttendanceDay>[] = [
    { key: "code", header: "Employee Code", render: (r) => r.employee_code ?? EMPTY },
    { key: "name", header: "Employee Name", render: (r) => <span className="font-medium text-gray-900">{r.employee_name ?? EMPTY}</span> },
    { key: "date", header: "Work Date", render: (r) => fmtDate(r.work_date) },
    { key: "shift", header: "Shift", render: (r) => r.shift_name ?? EMPTY },
    { key: "in", header: "In Time", render: (r) => fmtTime(r.first_in) },
    { key: "out", header: "Out Time", render: (r) => fmtTime(r.last_out) },
    { key: "duration", header: "Duration", render: (r) => fmtDuration(r.worked_minutes) },
    { key: "overtime", header: "Overtime", render: (r) => r.extra_minutes ? fmtDuration(r.extra_minutes) : EMPTY },
    { key: "status", header: "Day Status", render: (r) => <Badge tone={dayTone(r.day_status)}>{dayLabel(r.day_status)}</Badge> },
    { key: "payable", header: "Payable", align: "right", render: (r) => r.payable_fraction },
    { key: "comments", header: "Comments", render: (r) => r.penalty_reason ?? EMPTY },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Present" value={summary.present} tint="bg-green-50 text-green-600" />
        <StatCard label="Half Day" value={summary.half} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Absent" value={summary.absent} tint="bg-red-50 text-red-600" />
        <StatCard label="On Leave" value={summary.leave} tint="bg-blue-50 text-blue-600" />
      </div>
      <Card title="Employees In-Out" bodyClassName="p-4" actions={<div className="flex gap-2"><Button icon={Upload} disabled>Import</Button><Button icon={Plus} variant="primary" onClick={() => setManualOpen(true)}>Add Manual In-Out</Button></div>}>
        <Toolbar search={search} onSearch={setSearch} placeholder="Search employee or code" onReset={() => { setSearch(""); setDepartment(""); setStatus(""); setDate(todayISO()); }} onExport={() => {}}>
          <input type="date" aria-label="Work date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700" />
          <SelectFilter label="All Departments" value={department} onChange={setDepartment} options={data.departments.map((d) => ({ value: d.name, label: d.name }))} />
          <SelectFilter label="All Statuses" value={status} onChange={setStatus} options={["present", "half_day", "absent", "on_leave", "weekly_off", "holiday", "wfh", "on_duty"].map((s) => ({ value: s, label: dayLabel(s) }))} />
        </Toolbar>
        {selected.length > 0 && <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Void rows is disabled until void semantics are in the API.</div>}
        <DataTable columns={columns} rows={rows} getKey={(r) => r.id} selectable selected={selected} onSelectedChange={setSelected} empty="No attendance rows for this date" dense />
      </Card>
      <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Add Manual In-Out" footer={<><Button onClick={() => setManualOpen(false)}>Cancel</Button><Button variant="primary" onClick={saveManual}>Save</Button></>}>
        <FormGrid columns={2}>
          <FormField label="Employee" required><Select value={manual.employee_id} onChange={(e) => setManual({ ...manual, employee_id: e.target.value })}><option value="">Select an employee</option>{data.employees.map((e) => <option key={e.id} value={e.id}>{e.employee_code} - {e.name}</option>)}</Select></FormField>
          <FormField label="Work Date" required><Input type="date" value={manual.work_date} onChange={(e) => setManual({ ...manual, work_date: e.target.value })} /></FormField>
          <FormField label="In Time" required><Input type="time" value={manual.first_in} onChange={(e) => setManual({ ...manual, first_in: e.target.value })} /></FormField>
          <FormField label="Out Time" required><Input type="time" value={manual.last_out} onChange={(e) => setManual({ ...manual, last_out: e.target.value })} /></FormField>
          <FormField label="Reason" required span><Textarea value={manual.reason} onChange={(e) => setManual({ ...manual, reason: e.target.value })} /></FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}
