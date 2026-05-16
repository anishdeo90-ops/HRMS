"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type NamedRef = { id?: string; name?: string | null; code?: string | null; employee_code?: string | null };
type AttendanceSummary = { total_days?: number; present_days?: number; absent_days?: number; half_days?: number; total_work_minutes?: number; by_status?: Record<string, number> };
type LeaveBalance = { leave_type_key?: string | null; allocated?: number; ledger_delta?: number; balance?: number };
type LeaveApplication = { id: string; leave_type_key?: string | null; from_date?: string | null; to_date?: string | null; status?: string | null; days?: number | null };
type SalarySlip = { id?: string; slip_number?: string | null; status?: string | null; gross_pay?: number | null; net_pay?: number | null; issued_on?: string | null; payroll_period_id?: string | null };
type PerformanceItem = { id: string; title?: string | null; goal_title?: string | null; status?: string | null; cycle?: { name?: string | null } | null; final_score?: number | null; progress_percent?: number | null };
type LifecycleStage = { stage?: string | null; onboarding?: { id?: string; status?: string | null; template_name?: string | null; target_date?: string | null } | null; separation?: { id?: string; status?: string | null; target_date?: string | null } | null };
type EmployeeDetail = {
  id: string;
  employee_code?: string | null;
  name?: string | null;
  joining_date?: string | null;
  employment_status?: string | null;
  work_email?: string | null;
  mobile?: string | null;
  company?: NamedRef | null;
  branch?: NamedRef | null;
  department?: NamedRef | null;
  grade?: NamedRef | null;
  employment_type?: NamedRef | null;
  reporting_manager?: NamedRef | null;
  profile?: { name?: string | null; email?: string | null; role?: string | null } | null;
  source_candidate?: { id?: string; name?: string | null; email?: string | null; mobile?: string | null; final_status?: string | null; doj_actual?: string | null; doj?: string | null } | null;
  attendance_summary?: AttendanceSummary;
  leave_summary?: { balances?: LeaveBalance[]; recent_applications?: LeaveApplication[] };
  latest_salary_slip?: SalarySlip | null;
  performance?: { appraisals?: PerformanceItem[]; goals?: PerformanceItem[] };
  lifecycle_stage?: LifecycleStage;
};

function money(value?: number | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function statusClass(status?: string | null) {
  if (status === "active" || status === "approved" || status === "completed" || status === "paid" || status === "issued" || status === "published") return "bg-green-100 text-green-700";
  if (status === "submitted" || status === "in_review" || status === "open" || status === "onboarding" || status === "separation_in_progress") return "bg-blue-100 text-blue-700";
  if (status === "inactive" || status === "exited" || status === "rejected" || status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "draft" || status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

function readNumber(value?: number | null) {
  return Number(value ?? 0);
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const employeeId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!employeeId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/hrms/employees/${employeeId}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = json.error ?? "Could not load employee detail";
        setError(message);
        setEmployee(null);
        toast.error(message);
        return;
      }
      setEmployee(json.data ?? null);
    } catch {
      const message = "Could not load employee detail";
      setError(message);
      setEmployee(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const allowed = getNavForRole(json?.data?.role).some((item) => item.href === "/people/employees");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [params.id, router]);

  const attendance = employee?.attendance_summary;
  const workHours = useMemo(() => Math.round(readNumber(attendance?.total_work_minutes) / 60), [attendance?.total_work_minutes]);
  const leaveBalances = employee?.leave_summary?.balances ?? [];
  const latestAppraisal = employee?.performance?.appraisals?.[0] ?? null;
  const lifecycle = employee?.lifecycle_stage;

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href="/people/employees" className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-brand-600"><ArrowLeft size={14} /> People Records</Link>
          <h1 className="text-xl font-bold text-gray-900">{loading ? "Loading..." : employee?.name ?? "Employee Detail"}</h1>
          <p className="mt-1 text-sm text-gray-500">{employee?.employee_code ?? "Employee"} - {employee?.department?.name ?? "No department"} - {employee?.joining_date ?? "No joining date"}</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Status</p><p className="mt-1"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(employee?.employment_status)}`}>{employee?.employment_status ?? "No data yet"}</span></p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Attendance this month</p><p className="mt-1 text-2xl font-bold text-gray-900">{attendance?.present_days ?? 0}/{attendance?.total_days ?? 0}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Leave balance rows</p><p className="mt-1 text-2xl font-bold text-gray-900">{leaveBalances.length}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Lifecycle stage</p><p className="mt-1 text-sm font-semibold text-gray-900">{lifecycle?.stage ?? "No data yet"}</p></div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Core profile</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-gray-400">Company</dt><dd className="font-medium text-gray-800">{employee?.company?.name ?? "No data yet"}</dd></div>
            <div><dt className="text-xs text-gray-400">Branch</dt><dd className="font-medium text-gray-800">{employee?.branch?.name ?? "No data yet"}</dd></div>
            <div><dt className="text-xs text-gray-400">Grade</dt><dd className="font-medium text-gray-800">{employee?.grade?.name ?? "No data yet"}</dd></div>
            <div><dt className="text-xs text-gray-400">Role / type</dt><dd className="font-medium text-gray-800">{employee?.profile?.role ?? employee?.employment_type?.name ?? "No data yet"}</dd></div>
            <div><dt className="text-xs text-gray-400">Manager</dt><dd className="font-medium text-gray-800">{employee?.reporting_manager?.name ?? "No data yet"}</dd></div>
            <div><dt className="text-xs text-gray-400">Contact</dt><dd className="font-medium text-gray-800">{employee?.work_email ?? employee?.mobile ?? "No data yet"}</dd></div>
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Source candidate</h2>
          {employee?.source_candidate ? (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-gray-400">Name</dt><dd className="font-medium text-gray-800">{employee.source_candidate.name ?? "Candidate"}</dd></div>
              <div><dt className="text-xs text-gray-400">Status</dt><dd className="font-medium text-gray-800">{employee.source_candidate.final_status ?? "No data yet"}</dd></div>
              <div><dt className="text-xs text-gray-400">Email</dt><dd className="font-medium text-gray-800">{employee.source_candidate.email ?? "No data yet"}</dd></div>
              <div><dt className="text-xs text-gray-400">Joining date</dt><dd className="font-medium text-gray-800">{employee.source_candidate.doj_actual ?? employee.source_candidate.doj ?? "No data yet"}</dd></div>
            </dl>
          ) : <p className="mt-4 text-sm text-gray-400">No data yet</p>}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Attendance and leave</h2><p className="text-xs text-gray-500">{workHours} work hours this month</p></div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            <div className="rounded border border-gray-100 p-3 text-sm"><p className="text-xs text-gray-400">Absent / half days</p><p className="font-semibold text-gray-900">{attendance?.absent_days ?? 0} / {attendance?.half_days ?? 0}</p></div>
            <div className="rounded border border-gray-100 p-3 text-sm"><p className="text-xs text-gray-400">Status mix</p><p className="font-semibold text-gray-900">{Object.entries(attendance?.by_status ?? {}).map(([key, value]) => `${key}: ${value}`).join(", ") || "No data yet"}</p></div>
          </div>
          <div className="divide-y divide-gray-100">
            {leaveBalances.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No leave balance data yet.</div> : leaveBalances.map((row) => (
              <div key={`${row.leave_type_key}:${row.balance}`} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-gray-900">{row.leave_type_key ?? "Leave"}</span>
                <span className="text-gray-600">{readNumber(row.balance)} balance from {readNumber(row.allocated)} allocated</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Recent leave applications</h2></div>
          <div className="divide-y divide-gray-100">
            {(employee?.leave_summary?.recent_applications ?? []).length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No data yet.</div> : (employee?.leave_summary?.recent_applications ?? []).map((row) => (
              <div key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span><span className="font-medium text-gray-900">{row.leave_type_key ?? "Leave"}</span><span className="block text-xs text-gray-500">{row.from_date ?? "-"} to {row.to_date ?? "-"}</span></span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Latest salary slip</h2>
          {employee?.latest_salary_slip ? (
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-medium text-gray-900">{employee.latest_salary_slip.slip_number ?? employee.latest_salary_slip.id}</p>
              <p className="text-gray-500">{money(employee.latest_salary_slip.net_pay)} net from {money(employee.latest_salary_slip.gross_pay)} gross</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(employee.latest_salary_slip.status)}`}>{employee.latest_salary_slip.status ?? "No data yet"}</span>
            </div>
          ) : <p className="mt-4 text-sm text-gray-400">No data yet</p>}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Current appraisal</h2>
          {latestAppraisal ? (
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-medium text-gray-900">{latestAppraisal.cycle?.name ?? latestAppraisal.title ?? "Appraisal"}</p>
              <p className="text-gray-500">Score {latestAppraisal.final_score ?? "No data yet"}</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(latestAppraisal.status)}`}>{latestAppraisal.status ?? "draft"}</span>
            </div>
          ) : <p className="mt-4 text-sm text-gray-400">No data yet</p>}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Lifecycle record</h2>
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-medium text-gray-900">{lifecycle?.stage ?? "No data yet"}</p>
            <p className="text-gray-500">Onboarding {lifecycle?.onboarding?.status ?? "No data yet"}</p>
            <p className="text-gray-500">Separation {lifecycle?.separation?.status ?? "No data yet"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Active goals</h2><p className="text-xs text-gray-500">{employee?.performance?.goals?.length ?? 0} goals loaded</p></div>
        <div className="divide-y divide-gray-100">
          {(employee?.performance?.goals ?? []).length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No data yet.</div> : (employee?.performance?.goals ?? []).map((row) => (
            <div key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span><span className="font-medium text-gray-900">{row.title ?? row.goal_title ?? "Goal"}</span><span className="block text-xs text-gray-500">Progress {row.progress_percent ?? 0}%</span></span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
