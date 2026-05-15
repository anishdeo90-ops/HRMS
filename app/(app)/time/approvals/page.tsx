"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3, RefreshCw, X } from "lucide-react";
import toast from "react-hot-toast";
import { getVisibleTimeRoutes } from "@/lib/hrms/route-access";

type EmployeeRef = { name?: string | null; employee_code?: string | null };
type ShiftRef = { name?: string | null; code?: string | null };
type AttendanceDayRef = { attendance_date?: string | null; status?: string | null };

type ApprovalKind = "corrections" | "shifts" | "overtime";
type ApprovalAction = "approve" | "reject" | "cancel";

type BaseApproval = {
  id: string;
  employee?: EmployeeRef | null;
  status?: string | null;
  reason?: string | null;
  approver_comment?: string | null;
  created_at?: string | null;
  decided_at?: string | null;
};

type CorrectionRequest = BaseApproval & {
  attendance_date?: string | null;
  requested_status?: string | null;
  requested_check_in?: string | null;
  requested_check_out?: string | null;
};

type ShiftRequest = BaseApproval & {
  requested_date?: string | null;
  current_shift_type?: ShiftRef | null;
  requested_shift_type?: ShiftRef | null;
};

type OvertimeRequest = BaseApproval & {
  overtime_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  overtime_minutes?: number | null;
  attendance_day?: AttendanceDayRef | null;
};

type QueueConfig<T extends BaseApproval> = {
  key: ApprovalKind;
  label: string;
  endpoint: string;
  rows: T[];
};

const QUEUE_LABELS: Record<ApprovalKind, string> = {
  corrections: "Attendance Corrections",
  shifts: "Shift Requests",
  overtime: "Overtime",
};

function employeeLabel(person?: EmployeeRef | null) {
  if (!person) return "Unassigned person";
  return person.employee_code ? `${person.employee_code} - ${person.name ?? "Person"}` : person.name ?? "Person";
}

function shortDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function shortDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function shiftLabel(shift?: ShiftRef | null) {
  if (!shift) return "-";
  return shift.code ? `${shift.code} - ${shift.name ?? "Shift"}` : shift.name ?? "Shift";
}

function minutesLabel(minutes?: number | null) {
  if (!minutes) return "-";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function statusClass(status?: string | null) {
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "cancelled") return "bg-gray-100 text-gray-500";
  if (status === "submitted") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

export default function TimeApprovalsPage() {
  const router = useRouter();
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [shifts, setShifts] = useState<ShiftRequest[]>([]);
  const [overtime, setOvertime] = useState<OvertimeRequest[]>([]);
  const [active, setActive] = useState<ApprovalKind>("corrections");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const [correctionRes, shiftRes, overtimeRes] = await Promise.all([
      fetch("/api/hrms/attendance/corrections?approval_queue=true&status=submitted"),
      fetch("/api/hrms/shifts/requests?status=submitted"),
      fetch("/api/hrms/overtime?status=submitted"),
    ]);

    if (correctionRes.ok) setCorrections((await correctionRes.json()).data ?? []);
    else toast.error("Could not load correction approvals");
    if (shiftRes.ok) setShifts((await shiftRes.json()).data ?? []);
    else toast.error("Could not load shift approvals");
    if (overtimeRes.ok) setOvertime((await overtimeRes.json()).data ?? []);
    else toast.error("Could not load overtime approvals");
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        const allowed = getVisibleTimeRoutes(json?.data).some((route) => route.href === "/time/approvals");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const queues = useMemo<QueueConfig<BaseApproval>[]>(() => [
    { key: "corrections", label: QUEUE_LABELS.corrections, endpoint: "/api/hrms/attendance/corrections", rows: corrections },
    { key: "shifts", label: QUEUE_LABELS.shifts, endpoint: "/api/hrms/shifts/requests", rows: shifts },
    { key: "overtime", label: QUEUE_LABELS.overtime, endpoint: "/api/hrms/overtime", rows: overtime },
  ], [corrections, overtime, shifts]);

  const activeQueue = queues.find((queue) => queue.key === active) ?? queues[0];
  const submittedTotal = corrections.length + shifts.length + overtime.length;

  async function decide(queue: QueueConfig<BaseApproval>, row: BaseApproval, action: ApprovalAction) {
    const key = `${queue.key}:${row.id}`;
    setSavingKey(`${key}:${action}`);
    const res = await fetch(`${queue.endpoint}/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, approver_comment: comments[key]?.trim() || null }),
    });
    setSavingKey("");

    if (!res.ok) {
      toast.error((await res.json()).error ?? "Action failed");
      return;
    }

    toast.success(action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Cancelled");
    setComments((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    await load();
  }

  function renderDetails(queue: ApprovalKind, row: BaseApproval) {
    if (queue === "corrections") {
      const item = row as CorrectionRequest;
      return (
        <>
          <span>{shortDate(item.attendance_date)}</span>
          <span>{item.requested_status ?? "-"}</span>
          <span>{shortDateTime(item.requested_check_in)} to {shortDateTime(item.requested_check_out)}</span>
        </>
      );
    }
    if (queue === "shifts") {
      const item = row as ShiftRequest;
      return (
        <>
          <span>{shortDate(item.requested_date)}</span>
          <span>{shiftLabel(item.current_shift_type)} to {shiftLabel(item.requested_shift_type)}</span>
        </>
      );
    }
    const item = row as OvertimeRequest;
    return (
      <>
        <span>{shortDate(item.overtime_date ?? item.attendance_day?.attendance_date)}</span>
        <span>{minutesLabel(item.overtime_minutes)}</span>
        <span>{shortDateTime(item.start_time)} to {shortDateTime(item.end_time)}</span>
      </>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Time Approvals</h1>
          <p className="mt-1 text-sm text-gray-500">Review submitted attendance corrections, shift changes and overtime requests.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Submitted</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{submittedTotal}</p>
        </div>
        {queues.map((queue) => (
          <button key={queue.key} onClick={() => setActive(queue.key)} className={`rounded-lg border p-4 text-left ${active === queue.key ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}>
            <p className="text-xs font-medium uppercase text-gray-500">{queue.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{queue.rows.length}</p>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{activeQueue.label}</h2>
            <p className="text-xs text-gray-500">{activeQueue.rows.length} pending decisions</p>
          </div>
          <Clock3 size={18} className="text-gray-400" />
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : activeQueue.rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No submitted requests in this queue.</div>
          ) : activeQueue.rows.map((row) => {
            const commentKey = `${activeQueue.key}:${row.id}`;
            const disabled = savingKey.startsWith(commentKey);
            return (
              <div key={row.id} className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-gray-900">{employeeLabel(row.employee)}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span>
                    <span className="text-xs text-gray-400">{shortDateTime(row.created_at)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    {renderDetails(activeQueue.key, row)}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">{row.reason || "No reason provided."}</p>
                </div>

                <div className="space-y-2">
                  <textarea
                    value={comments[commentKey] ?? ""}
                    onChange={(event) => setComments({ ...comments, [commentKey]: event.target.value })}
                    placeholder="Decision comment"
                    className="h-20 w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <button disabled={disabled} onClick={() => void decide(activeQueue, row, "approve")} className="inline-flex items-center gap-1.5 rounded bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50">
                      <Check size={14} /> Approve
                    </button>
                    <button disabled={disabled} onClick={() => void decide(activeQueue, row, "reject")} className="inline-flex items-center gap-1.5 rounded bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50">
                      <X size={14} /> Reject
                    </button>
                    <button disabled={disabled} onClick={() => void decide(activeQueue, row, "cancel")} className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
