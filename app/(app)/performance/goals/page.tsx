"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type GoalRow = { id: string; title?: string | null; owner_name?: string | null; period_start?: string | null; period_end?: string | null; status?: string | null; progress?: number | null; weight?: number | null; measurable_target?: string | null };
type KraRow = { id: string; category?: string | null; description?: string | null; expected_outcome?: string | null; weight?: number | null; goal_title?: string | null };

function statusClass(status?: string | null) {
  if (status === "completed" || status === "approved") return "bg-green-100 text-green-700";
  if (status === "active" || status === "in_progress") return "bg-blue-100 text-blue-700";
  if (status === "blocked" || status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "draft") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function PerformanceGoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [kras, setKras] = useState<KraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState({ title: "", owner_id: "", period_start: "", period_end: "", status: "draft", measurable_target: "", weight: "0" });

  async function load(currentRole = role) {
    setLoading(true);
    setError("");
    const scope = currentRole === "employee" ? "?scope=mine" : "";
    const [goalRes, kraRes] = await Promise.all([
      fetch(`/api/hrms/performance/goals${scope}`),
      fetch(`/api/hrms/performance/kras${scope}`),
    ]);
    if (goalRes.ok) setGoals(await readList<GoalRow>(goalRes));
    else {
      const message = (await goalRes.json().catch(() => ({}))).error ?? "Could not load goals";
      setError(message);
      toast.error(message);
    }
    if (kraRes.ok) setKras(await readList<KraRow>(kraRes));
    else setKras([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const currentRole = json?.data?.role;
        const allowed = getNavForRole(currentRole).some((item) => item.href === "/performance/goals");
        if (!allowed) router.replace("/dashboard");
        else {
          setRole(currentRole);
          void load(currentRole);
        }
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const totals = useMemo(() => ({
    active: goals.filter((row) => row.status === "active" || row.status === "in_progress").length,
    completed: goals.filter((row) => row.status === "completed").length,
    totalWeight: goals.reduce((sum, row) => sum + Number(row.weight ?? 0), 0),
  }), [goals]);

  async function saveGoal() {
    if (!form.title.trim() || !form.period_start || !form.period_end) {
      toast.error("Title and dates are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrms/performance/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        owner_id: form.owner_id || null,
        period_start: form.period_start,
        period_end: form.period_end,
        status: form.status,
        measurable_target: form.measurable_target || null,
        weight: Number(form.weight || 0),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not save goal";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Goal saved");
    setForm({ title: "", owner_id: "", period_start: "", period_end: "", status: "draft", measurable_target: "", weight: "0" });
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Goals and KRAs</h1>
          <p className="mt-1 text-sm text-gray-500">Manage goal ownership, periods, measurable targets, progress and KRA weights.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {role === "employee" && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Employee-safe own-goal view: goals, KRAs and progress are scoped to your records.</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Active goals</p><p className="mt-1 text-2xl font-bold text-gray-900">{totals.active}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Completed goals</p><p className="mt-1 text-2xl font-bold text-gray-900">{totals.completed}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Assigned weight</p><p className="mt-1 text-2xl font-bold text-gray-900">{totals.totalWeight}%</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Goal form</h2>
          <div className="mt-3 grid gap-3">
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Goal title" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <input value={form.owner_id} onChange={(event) => setForm({ ...form, owner_id: event.target.value })} placeholder="Owner employee ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="date" value={form.period_start} onChange={(event) => setForm({ ...form, period_start: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="date" value={form.period_end} onChange={(event) => setForm({ ...form, period_end: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
              <input type="number" min="0" max="100" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} placeholder="Weight" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <textarea value={form.measurable_target} onChange={(event) => setForm({ ...form, measurable_target: event.target.value })} placeholder="Measurable target" className="min-h-24 rounded border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={saving} onClick={() => void saveGoal()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <Save size={14} /> Save goal
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Goal list</h2><p className="text-xs text-gray-500">{goals.length} goals loaded</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Goal</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Weight</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : goals.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No goals found.</td></tr> : goals.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.title ?? "Performance goal"}</td>
                      <td className="px-4 py-3 text-gray-600">{row.owner_name ?? "Owner"}</td>
                      <td className="px-4 py-3 text-gray-600">{row.period_start ?? "-"} to {row.period_end ?? "-"}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td>
                      <td className="px-4 py-3 text-gray-900">{row.progress ?? 0}%</td>
                      <td className="px-4 py-3 text-gray-900">{row.weight ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">KRA table</h2><p className="text-xs text-gray-500">{kras.length} KRAs loaded</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Expected outcome</th><th className="px-4 py-3">Weight</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {kras.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No KRAs found.</td></tr> : kras.map((row) => (
                    <tr key={row.id}><td className="px-4 py-3 font-medium text-gray-900">{row.category ?? row.goal_title ?? "KRA"}</td><td className="px-4 py-3 text-gray-600">{row.description ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.expected_outcome ?? "-"}</td><td className="px-4 py-3 text-gray-900">{row.weight ?? 0}%</td></tr>
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
