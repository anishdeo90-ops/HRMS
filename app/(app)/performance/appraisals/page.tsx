"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type TemplateRow = { id: string; name?: string | null; scoring_scale?: string | null; is_active?: boolean | null };
type GoalWeightRow = { id: string; template_name?: string | null; goal_title?: string | null; weight?: number | null };
type CycleRow = { id: string; name?: string | null; status?: string | null; period_start?: string | null; period_end?: string | null; review_start?: string | null; review_end?: string | null };
type AppraisalRow = { id: string; employee_name?: string | null; cycle_name?: string | null; status?: string | null; total_score?: number | null; reviewer_name?: string | null };

function statusClass(status?: string | null) {
  if (status === "approved" || status === "completed" || status === "closed") return "bg-green-100 text-green-700";
  if (status === "submitted" || status === "in_review" || status === "open") return "bg-blue-100 text-blue-700";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "draft") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function PerformanceAppraisalsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [goalWeights, setGoalWeights] = useState<GoalWeightRow[]>([]);
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [appraisals, setAppraisals] = useState<AppraisalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState({ name: "", period_start: "", period_end: "", review_start: "", review_end: "", status: "draft" });

  async function load(currentRole = role) {
    setLoading(true);
    setError("");
    const scope = currentRole === "employee" ? "?scope=mine" : "";
    const [templateRes, weightRes, cycleRes, appraisalRes] = await Promise.all([
      fetch("/api/hrms/performance/templates"),
      fetch("/api/hrms/performance/templates"),
      fetch("/api/hrms/performance/cycles"),
      fetch(`/api/hrms/performance/appraisals${scope}`),
    ]);
    if (templateRes.ok) setTemplates(await readList<TemplateRow>(templateRes));
    else {
      const message = (await templateRes.json().catch(() => ({}))).error ?? "Could not load appraisal templates";
      setError(message);
      toast.error(message);
    }
    if (weightRes.ok) setGoalWeights(await readList<GoalWeightRow>(weightRes));
    else setGoalWeights([]);
    if (cycleRes.ok) setCycles(await readList<CycleRow>(cycleRes));
    else setCycles([]);
    if (appraisalRes.ok) setAppraisals(await readList<AppraisalRow>(appraisalRes));
    else setAppraisals([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const currentRole = json?.data?.role;
        const allowed = getNavForRole(currentRole).some((item) => item.href === "/performance/appraisals");
        if (!allowed) router.replace("/dashboard");
        else {
          setRole(currentRole);
          void load(currentRole);
        }
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const summary = useMemo(() => ({
    activeTemplates: templates.filter((row) => row.is_active !== false).length,
    openCycles: cycles.filter((row) => row.status === "open" || row.status === "in_review").length,
    pending: appraisals.filter((row) => row.status === "draft" || row.status === "submitted" || row.status === "in_review").length,
  }), [appraisals, cycles, templates]);

  async function saveCycle() {
    if (!form.name.trim() || !form.period_start || !form.period_end || !form.review_start || !form.review_end) {
      toast.error("Cycle name, period and review dates are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrms/performance/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not save appraisal cycle";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Appraisal cycle saved");
    setForm({ name: "", period_start: "", period_end: "", review_start: "", review_end: "", status: "draft" });
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Appraisals</h1>
          <p className="mt-1 text-sm text-gray-500">Configure templates, run appraisal cycles and monitor employee review status.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {role === "employee" && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Employee appraisal view is scoped to your assigned review cycles and submitted appraisals.</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Active templates</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.activeTemplates}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Open cycles</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.openCycles}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Pending appraisals</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.pending}</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Appraisal cycle form</h2>
          <div className="mt-3 grid gap-3">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Cycle name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="date" value={form.period_start} onChange={(event) => setForm({ ...form, period_start: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="date" value={form.period_end} onChange={(event) => setForm({ ...form, period_end: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="date" value={form.review_start} onChange={(event) => setForm({ ...form, review_start: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="date" value={form.review_end} onChange={(event) => setForm({ ...form, review_end: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="in_review">In review</option>
              <option value="closed">Closed</option>
            </select>
            <button disabled={saving} onClick={() => void saveCycle()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <Save size={14} /> Save cycle
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Appraisal template list</h2></div>
              <div className="divide-y divide-gray-100">
                {templates.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No templates found.</div> : templates.map((row) => (
                  <div key={row.id} className="px-4 py-3"><p className="font-medium text-gray-900">{row.name ?? "Template"}</p><p className="text-xs text-gray-500">Scoring scale {row.scoring_scale ?? "-"} - {row.is_active === false ? "inactive" : "active"}</p></div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Template goal-weight table</h2></div>
              <div className="divide-y divide-gray-100">
                {goalWeights.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No goal weights found.</div> : goalWeights.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="truncate font-medium text-gray-900">{row.goal_title ?? "Goal"}</p><p className="text-xs text-gray-500">{row.template_name ?? "Template"}</p></div><p className="text-sm font-semibold text-gray-900">{row.weight ?? 0}%</p></div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Appraisal table</h2><p className="text-xs text-gray-500">{appraisals.length} appraisals loaded</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Cycle</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Total score</th><th className="px-4 py-3">Reviewer</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : appraisals.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No appraisals found.</td></tr> : appraisals.map((row) => (
                    <tr key={row.id}><td className="px-4 py-3 font-medium text-gray-900">{row.employee_name ?? "Employee"}</td><td className="px-4 py-3 text-gray-600">{row.cycle_name ?? "-"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td><td className="px-4 py-3 text-gray-900">{row.total_score ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.reviewer_name ?? "-"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
