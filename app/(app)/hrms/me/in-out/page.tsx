"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Clock, Pencil } from "lucide-react";
import { CorrectionModal } from "@/components/hrms/attendance-correction-modal";
import { Badge, Button, Card, DataTable, StatCard, SubTabs, Toolbar, type Column } from "@/components/hrms/ui";
import { hrmsMutation, useHrmsApi } from "@/lib/hrms/api-client";
import { EMPTY, fmtDate, fmtDuration, fmtTime } from "@/lib/hrms/format";
import { dayLabel, dayShortLabel, dayTone } from "@/lib/hrms/status";
import type { AttendanceDay, AttendancePunch } from "@/lib/hrms/types";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateWithDay(iso: string) {
  const d = new Date(iso);
  return `${fmtDate(iso)}-${WEEKDAY[d.getDay()]}`;
}

export default function MyInOutPage() {
  const [view, setView] = useState<"register" | "punches">("register");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [status, setStatus] = useState("");
  const [correction, setCorrection] = useState<AttendanceDay | null>(null);
  const { data, reload } = useHrmsApi<{ rows: AttendanceDay[] }>(
    `/api/hrms/attendance?scope=me&month=${month}`,
    { rows: [] }
  );

  const rows = useMemo(
    () => data.rows.filter((r) => !status || r.day_status === status),
    [data.rows, status]
  );

  const summary = useMemo(() => ({
    present: rows.filter((r) => ["present", "wfh", "on_duty"].includes(r.day_status)).length,
    halfDays: rows.filter((r) => r.day_status === "half_day").length,
    absent: rows.filter((r) => r.day_status === "absent").length,
    leave: rows.filter((r) => r.day_status === "on_leave").length,
    payable: rows.reduce((sum, r) => sum + Number(r.payable_fraction), 0),
    extra: rows.reduce((sum, r) => sum + (r.extra_minutes ?? 0), 0),
  }), [rows]);

  async function punch(direction: "in" | "out") {
    await hrmsMutation("/api/hrms/attendance/punches", "POST", { direction });
    toast.success(`Punched ${direction}`);
    reload();
  }

  const registerColumns: Column<AttendanceDay>[] = [
    { key: "date", header: "Date", render: (r) => <span className="font-medium text-gray-900">{dateWithDay(r.work_date)}</span> },
    { key: "shift", header: "Shift", render: (r) => r.shift_name ?? EMPTY },
    { key: "in", header: "In-Time", render: (r) => fmtTime(r.first_in) },
    { key: "out", header: "Out-Time", render: (r) => fmtTime(r.last_out) },
    { key: "duration", header: "Duration", render: (r) => fmtDuration(r.worked_minutes) },
    { key: "extra", header: "Extra Hours", render: (r) => (r.extra_minutes ? fmtDuration(r.extra_minutes) : EMPTY) },
    { key: "status", header: "Status", render: (r) => <Badge tone={dayTone(r.day_status)} title={dayLabel(r.day_status)}>{dayShortLabel(r.day_status)}</Badge> },
    { key: "payable", header: "Payable", align: "right", render: (r) => r.payable_fraction },
    { key: "remarks", header: "Remarks", render: (r) => r.penalty_reason ?? (r.is_regularized ? "Regularized" : EMPTY) },
    { key: "action", header: "Action", align: "right", render: (r) => <Button icon={Pencil} onClick={() => setCorrection(r)}>Apply Approval</Button> },
  ];

  const punchRows = rows.flatMap((r) => (r.punches ?? []).map((p) => ({ ...p, work_date: r.work_date })));
  const punchColumns: Column<AttendancePunch & { work_date: string }>[] = [
    { key: "date", header: "Date", render: (r) => dateWithDay(r.work_date) },
    { key: "time", header: "Punch Time", render: (r) => fmtTime(r.punched_at) },
    { key: "direction", header: "Direction", render: (r) => <Badge>{r.direction}</Badge> },
    { key: "source", header: "Source", render: (r) => <span className="uppercase">{r.source}</span> },
    { key: "location", header: "Location", render: (r) => r.location ?? EMPTY },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Present" value={summary.present} icon={Clock} />
        <StatCard label="Half Days" value={summary.halfDays} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Absent" value={summary.absent} tint="bg-red-50 text-red-600" />
        <StatCard label="On Leave" value={summary.leave} tint="bg-blue-50 text-blue-600" />
        <StatCard label="Payable Days" value={summary.payable} tint="bg-green-50 text-green-600" />
        <StatCard label="Extra Hours" value={fmtDuration(summary.extra)} tint="bg-gray-100 text-graphite" />
      </div>

      <Card
        title="My In Out"
        bodyClassName="p-4"
        actions={<><Button onClick={() => punch("in")}>Punch In</Button><Button onClick={() => punch("out")}>Punch Out</Button></>}
      >
        <SubTabs
          tabs={[{ key: "register", label: "Manual In-Out" }, { key: "punches", label: "Multiple Punches", count: punchRows.length }]}
          value={view}
          onChange={setView}
        />
        <Toolbar onReset={() => setStatus("")} onExport={() => {}}>
          <input type="month" aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700" />
          <select aria-label="Day status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700">
            <option value="">All statuses</option>
            {["present", "half_day", "absent", "on_leave", "weekly_off", "holiday", "wfh", "on_duty"].map((s) => <option key={s} value={s}>{dayLabel(s)}</option>)}
          </select>
        </Toolbar>
        {view === "register" ? (
          <DataTable columns={registerColumns} rows={rows} getKey={(r) => r.id} empty="No attendance rows for this month" dense />
        ) : (
          <DataTable columns={punchColumns} rows={punchRows} getKey={(r) => r.id} empty="No punches recorded" dense />
        )}
      </Card>
      <CorrectionModal row={correction} onClose={() => setCorrection(null)} onSaved={reload} />
    </div>
  );
}
