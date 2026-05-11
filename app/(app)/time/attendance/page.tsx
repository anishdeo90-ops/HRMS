"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock, RefreshCw, Send, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { getVisibleTimeRoutes } from "@/lib/hrms/route-access";

type EmployeeSummary = { id: string; employee_code?: string | null; name?: string | null };
type CheckInRow = {
  id: string;
  employee_id: string;
  event_type: "in" | "out";
  check_time: string;
  notes?: string | null;
  employee?: EmployeeSummary | null;
};
type DayRow = {
  id: string;
  attendance_date: string;
  status: AttendanceStatus;
  first_check_in?: string | null;
  last_check_out?: string | null;
  total_work_minutes?: number | null;
  remarks?: string | null;
  employee?: EmployeeSummary | null;
};
type CorrectionRow = {
  id: string;
  attendance_date: string;
  requested_status: AttendanceStatus;
  requested_check_in?: string | null;
  requested_check_out?: string | null;
  reason: string;
  status: RequestStatus;
  created_at: string;
  employee?: EmployeeSummary | null;
};
type AttendanceStatus = "present" | "absent" | "half_day" | "late" | "on_duty" | "holiday" | "weekly_off";
type RequestStatus = "draft" | "submitted" | "approved" | "rejected" | "cancelled";

const attendanceStatuses: AttendanceStatus[] = ["present", "absent", "half_day", "late", "on_duty", "holiday", "weekly_off"];
const requestStatuses: (RequestStatus | "all")[] = ["all", "submitted", "draft", "approved", "rejected", "cancelled"];

const statusStyles: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  half_day: "bg-amber-100 text-amber-700",
  late: "bg-orange-100 text-orange-700",
  on_duty: "bg-blue-100 text-blue-700",
  holiday: "bg-purple-100 text-purple-700",
  weekly_off: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function todayDate() {
  return dateInputValue(new Date());
}

function monthStart() {
  const now = new Date();
  return dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
}

function monthEnd() {
  const now = new Date();
  return dateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00`));
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

function employeeLabel(person?: EmployeeSummary | null) {
  if (!person) return "Current person";
  return person.employee_code ? `${person.employee_code} - ${person.name ?? "Person"}` : person.name ?? "Person";
}

function minutesLabel(minutes?: number | null) {
  if (!minutes) return "0h";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export default function AttendancePage() {
  const router = useRouter();
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [days, setDays] = useState<DayRow[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRow[]>([]);
  const [approvalCorrections, setApprovalCorrections] = useState<CorrectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isHr, setIsHr] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(monthEnd());
  const [dayStatus, setDayStatus] = useState<AttendanceStatus | "all">("all");
  const [requestStatus, setRequestStatus] = useState<RequestStatus | "all">("all");
  const [notes, setNotes] = useState("");
  const [form, setForm] = useState({
    attendance_date: todayDate(),
    requested_status: "present" as AttendanceStatus,
    requested_check_in: "",
    requested_check_out: "",
    reason: "",
    status: "submitted" as RequestStatus,
  });

  const latestCheckIn = checkIns[0];
  const isCheckedIn = latestCheckIn?.event_type === "in";
  const todayCheckIns = useMemo(() => checkIns.filter((row) => row.check_time?.slice(0, 10) === todayDate()), [checkIns]);
  const selectedDay = useMemo(() => days.find((row) => row.attendance_date === form.attendance_date), [days, form.attendance_date]);

  async function readJson<T>(res: Response, fallback: T): Promise<T> {
    const json = await res.json().catch(() => ({}));
    return json.data ?? fallback;
  }

  function params(includeEmployee = true) {
    const query = new URLSearchParams();
    if (includeEmployee && employeeId.trim()) query.set("employee_id", employeeId.trim());
    if (departmentId.trim()) query.set("department_id", departmentId.trim());
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    return query;
  }

  async function load() {
    setLoading(true);
    const checkParams = params();
    checkParams.set("limit", "80");
    if (to) checkParams.set("to", `${to}T23:59:59.999`);
    const dayParams = params();
    if (dayStatus !== "all") dayParams.set("status", dayStatus);
    const correctionParams = new URLSearchParams();
    if (employeeId.trim()) correctionParams.set("employee_id", employeeId.trim());
    if (requestStatus !== "all") correctionParams.set("status", requestStatus);

    const [checkRes, dayRes, correctionRes, approvalRes] = await Promise.all([
      fetch(`/api/hrms/attendance/check-ins?${checkParams.toString()}`),
      fetch(`/api/hrms/attendance/days?${dayParams.toString()}`),
      fetch(`/api/hrms/attendance/corrections?${correctionParams.toString()}`),
      fetch("/api/hrms/attendance/corrections?approval_queue=true&status=submitted"),
    ]);

    if (checkRes.ok) setCheckIns(await readJson<CheckInRow[]>(checkRes, []));
    else setCheckIns([]);
    if (dayRes.ok) setDays(await readJson<DayRow[]>(dayRes, []));
    else setDays([]);
    if (correctionRes.ok) setCorrections(await readJson<CorrectionRow[]>(correctionRes, []));
    else setCorrections([]);
    if (approvalRes.ok) {
      setIsHr(true);
      setApprovalCorrections(await readJson<CorrectionRow[]>(approvalRes, []));
    } else {
      setIsHr(false);
      setApprovalCorrections([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        const allowed = getVisibleTimeRoutes(json?.data).some((route) => route.href === "/time/attendance");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  async function markCheckIn() {
    setSaving(true);
    const body: Record<string, string> = { event_type: isCheckedIn ? "out" : "in", source: "web" };
    if (employeeId.trim()) body.employee_id = employeeId.trim();
    if (notes.trim()) body.notes = notes.trim();
    const res = await fetch("/api/hrms/attendance/check-ins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Check-in update failed");
      return;
    }
    toast.success(isCheckedIn ? "Checked out" : "Checked in");
    setNotes("");
    await load();
  }

  async function submitCorrection() {
    if (!form.attendance_date || !form.reason.trim()) {
      toast.error("Date and reason are required");
      return;
    }
    setSaving(true);
    const body: Record<string, string> = {
      attendance_date: form.attendance_date,
      requested_status: form.requested_status,
      reason: form.reason,
      status: form.status,
    };
    if (employeeId.trim()) body.employee_id = employeeId.trim();
    if (selectedDay?.id) body.attendance_day_id = selectedDay.id;
    if (form.requested_check_in) body.requested_check_in = `${form.attendance_date}T${form.requested_check_in}:00`;
    if (form.requested_check_out) body.requested_check_out = `${form.attendance_date}T${form.requested_check_out}:00`;

    const res = await fetch("/api/hrms/attendance/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Request failed");
      return;
    }
    toast.success("Correction requested");
    setForm({ ...form, requested_check_in: "", requested_check_out: "", reason: "", status: "submitted" });
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">Track current check-in status, day records and correction requests.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {isHr && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900"><ShieldCheck size={16} /> HR filters</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <input value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} placeholder="Person ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} placeholder="Department ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <select value={dayStatus} onChange={(event) => setDayStatus(event.target.value as AttendanceStatus | "all")} className="rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="all">All day statuses</option>
              {attendanceStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
            </select>
            <button onClick={() => void load()} className="rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700">Apply</button>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Current status</p>
                <h2 className="mt-1 text-lg font-bold text-gray-900">{isCheckedIn ? "Checked in" : "Checked out"}</h2>
                <p className="mt-1 text-xs text-gray-500">Last event {latestCheckIn ? `${label(latestCheckIn.event_type)} at ${formatTime(latestCheckIn.check_time)}` : "not available"}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isCheckedIn ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {isCheckedIn ? "Open" : "Closed"}
              </span>
            </div>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note" className="mt-4 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={saving} onClick={() => void markCheckIn()} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <CheckCircle2 size={15} /> {isCheckedIn ? "Check out" : "Check in"}
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Today&apos;s check-ins</h2>
              <Clock size={15} className="text-gray-400" />
            </div>
            <div className="mt-3 space-y-2">
              {todayCheckIns.length === 0 ? (
                <p className="py-5 text-center text-xs text-gray-400">No check-ins today.</p>
              ) : todayCheckIns.map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded border border-gray-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label(row.event_type)}</p>
                    <p className="text-xs text-gray-400">{employeeLabel(row.employee)}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">{formatTime(row.check_time)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Attendance days</h2>
                <p className="text-xs text-gray-500">{days.length} records in selected range</p>
              </div>
              <CalendarDays size={16} className="text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-4 xl:grid-cols-7">
              {loading ? (
                <div className="col-span-full py-8 text-center text-sm text-gray-400">Loading...</div>
              ) : days.length === 0 ? (
                <div className="col-span-full py-8 text-center text-sm text-gray-400">No attendance days found.</div>
              ) : days.map((day) => (
                <button key={day.id} onClick={() => setForm({ ...form, attendance_date: day.attendance_date, requested_status: day.status })} className="rounded-lg border border-gray-200 bg-white p-3 text-left hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-gray-900">{formatDate(day.attendance_date)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyles[day.status]}`}>{label(day.status)}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{formatTime(day.first_check_in)} - {formatTime(day.last_check_out)}</p>
                  <p className="mt-1 text-xs font-medium text-gray-700">{minutesLabel(day.total_work_minutes)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-bold text-gray-900">Correction request</h2>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <input type="date" value={form.attendance_date} onChange={(event) => setForm({ ...form, attendance_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
                <select value={form.requested_status} onChange={(event) => setForm({ ...form, requested_status: event.target.value as AttendanceStatus })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                  {attendanceStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="time" value={form.requested_check_in} onChange={(event) => setForm({ ...form, requested_check_in: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
                  <input type="time" value={form.requested_check_out} onChange={(event) => setForm({ ...form, requested_check_out: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Reason" rows={3} className="rounded border border-gray-300 px-3 py-2 text-sm" />
                <button disabled={saving} onClick={() => void submitCorrection()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
                  <Send size={14} /> Submit
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Correction history</h2>
                  <p className="text-xs text-gray-500">{isHr ? `${approvalCorrections.length} submitted in HR queue` : `${corrections.length} requests`}</p>
                </div>
                <select value={requestStatus} onChange={(event) => setRequestStatus(event.target.value as RequestStatus | "all")} className="rounded border border-gray-300 px-2 py-1.5 text-xs">
                  {requestStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
                </select>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {corrections.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No correction requests.</p>
                ) : corrections.map((request) => (
                  <div key={request.id} className="border-t border-gray-100 px-4 py-3 first:border-t-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatDate(request.attendance_date)} - {label(request.requested_status)}</p>
                        <p className="text-xs text-gray-500">{employeeLabel(request.employee)}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles[request.status]}`}>{label(request.status)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-gray-500">{request.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
