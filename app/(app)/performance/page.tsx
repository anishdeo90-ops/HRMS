"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type GoalRow = { id: string; title?: string | null; owner_name?: string | null; status?: string | null; progress?: number | null; weight?: number | null; due_date?: string | null };
type CycleRow = { id: string; name?: string | null; status?: string | null; period_start?: string | null; period_end?: string | null; review_start?: string | null; review_end?: string | null };
type AppraisalRow = { id: string; employee_name?: string | null; cycle_name?: string | null; reviewer_name?: string | null; status?: string | null; total_score?: number | null };
type FeedbackRow = { id: string; employee_name?: string | null; reviewer_name?: string | null; criteria_name?: string | null; rating?: number | null; status?: string | null };

function statusClass(status?: string | null) {
  if (status === "approved" || status === "completed" || status === "closed") return "bg-green-100 text-green-700";
  if (status === "submitted" || status === "in_review" || status === "open") return "bg-blue-100 text-blue-700";
  if (status === "overdue" || status === "blocked") return "bg-red-100 text-red-700";
  if (status === "draft") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function PerformanceOverviewPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [appraisals, setAppraisals] = useState<AppraisalRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");

  async function load(currentRole = role) {
    setLoading(true);
    setError("");
    const mine = currentRole === "employee" ? "?scope=mine" : "";
    const [goalRes, cycleRes, appraisalRes, feedbackRes] = await Promise.all([
      fetch(`/api/hrms/performance/goals${mine}`),
      fetch("/api/hrms/performance/cycles"),
      fetch(`/api/hrms/performance/appraisals${mine}`),
      fetch(`/api/hrms/performance/feedback${mine}`),
    ]);

    if (goalRes.ok) setGoals(await readList<GoalRow>(goalRes));
    else {
      const message = (await goalRes.json().catch(() => ({}))).error ?? "Could not load performance goals";
      setError(message);
      toast.error(message);
    }
    if (cycleRes.ok) setCycles(await readList<CycleRow>(cycleRes));
    else setCycles([]);
    if (appraisalRes.ok) setAppraisals(await readList<AppraisalRow>(appraisalRes));
    else setAppraisals([]);
    if (feedbackRes.ok) setFeedback(await readList<FeedbackRow>(feedbackRes));
    else setFeedback([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const currentRole = json?.data?.role;
        const allowed = getNavForRole(currentRole).some((item) => item.href === "/performance");
        if (!allowed) router.replace("/dashboard");
        else {
          setRole(currentRole);
          void load(currentRole);
        }
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const kpis = useMemo(() => [
    { label: "Active goals", value: goals.filter((row) => row.status === "active" || row.status === "in_progress").length },
    { label: "Open cycles", value: cycles.filter((row) => row.status === "open" || row.status === "in_review").length },
    { label: "Pending appraisals", value: appraisals.filter((row) => row.status === "draft" || row.status === "submitted" || row.status === "in_review").length },
    { label: "Feedback due", value: feedback.filter((row) => row.status === "draft" || row.status === "requested").length },
  ], [appraisals, cycles, feedback, goals]);

  const pendingActions = useMemo(() => [
    ...goals.filter((row) => row.status === "draft" || row.status === "in_progress").map((row) => ({ id: `goal:${row.id}`, label: row.title ?? "Performance goal", detail: row.owner_name ?? "Owner pending", status: row.status ?? "draft", href: "/performance/goals" })),
    ...appraisals.filter((row) => row.status === "draft" || row.status === "submitted" || row.status === "in_review").map((row) => ({ id: `appraisal:${row.id}`, label: row.employee_name ?? "Employee appraisal", detail: row.cycle_name ?? row.reviewer_name ?? "Cycle pending", status: row.status ?? "draft", href: "/performance/appraisals" })),
    ...feedback.filter((row) => row.status === "draft" || row.status === "requested").map((row) => ({ id: `feedback:${row.id}`, label: row.employee_name ?? "Feedback rating", detail: row.criteria_name ?? row.reviewer_name ?? "Criteria pending", status: row.status ?? "requested", href: "/performance/feedback" })),
  ], [appraisals, feedback, goals]);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Performance Overview</h1>
          <p className="mt-1 text-sm text-gray-500">Track goal readiness, open appraisal cycles, pending reviews and feedback due.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase text-gray-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Current appraisal cycles</h2>
            <p className="text-xs text-gray-500">{cycles.length} cycles loaded</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr><th className="px-4 py-3">Cycle</th><th className="px-4 py-3">Performance period</th><th className="px-4 py-3">Review window</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : cycles.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No appraisal cycles found.</td></tr>
                ) : cycles.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name ?? "Appraisal cycle"}</td>
                    <td className="px-4 py-3 text-gray-600">{row.period_start ?? "-"} to {row.period_end ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{row.review_start ?? "-"} to {row.review_end ?? "-"}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">Pending performance actions</h2>
              <p className="text-xs text-gray-500">{pendingActions.length} items need attention</p>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
              ) : pendingActions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No pending performance actions.</div>
              ) : pendingActions.slice(0, 6).map((item) => (
                <Link key={item.id} href={item.href} className="block px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="truncate text-xs text-gray-500">{item.detail}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(item.status)}`}>{item.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {[
            { href: "/performance/goals", label: "Goals and KRAs", detail: "Owner goals, progress and weights" },
            { href: "/performance/appraisals", label: "Appraisals", detail: "Templates, cycles and review scores" },
            { href: "/performance/feedback", label: "Feedback", detail: "Criteria, ratings and reviewer notes" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50">
              <span>
                <span className="block text-sm font-semibold text-gray-900">{item.label}</span>
                <span className="text-xs text-gray-500">{item.detail}</span>
              </span>
              <ArrowRight size={16} className="text-gray-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
