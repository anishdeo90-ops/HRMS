"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type TemplateRow = { id: string; name?: string | null; description?: string | null; is_active?: boolean | null };
type OnboardingRow = { id: string; employee_name?: string | null; template_name?: string | null; start_date?: string | null; target_date?: string | null; status?: string | null };
type ActivityRow = { id: string; employee_name?: string | null; task_name?: string | null; owner_name?: string | null; due_date?: string | null; status?: string | null };

function statusClass(status?: string | null) {
  if (status === "completed" || status === "approved") return "bg-green-100 text-green-700";
  if (status === "in_progress" || status === "submitted") return "bg-blue-100 text-blue-700";
  if (status === "blocked" || status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "draft" || status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function LifecycleOnboardingPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [onboardings, setOnboardings] = useState<OnboardingRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState({ employee_id: "", template_id: "", start_date: "", target_date: "", status: "draft" });

  async function load(currentRole = role) {
    setLoading(true);
    setError("");
    const scope = currentRole === "employee" ? "?scope=mine" : "";
    const [templateRes, onboardingRes, activityRes] = await Promise.all([
      fetch("/api/hrms/lifecycle/onboarding/templates"),
      fetch(`/api/hrms/lifecycle/onboarding${scope}`),
      fetch(`/api/hrms/lifecycle/onboarding/activities${scope}`),
    ]);
    if (templateRes.ok) setTemplates(await readList<TemplateRow>(templateRes));
    else {
      const message = (await templateRes.json().catch(() => ({}))).error ?? "Could not load onboarding templates";
      setError(message);
      toast.error(message);
    }
    if (onboardingRes.ok) setOnboardings(await readList<OnboardingRow>(onboardingRes));
    else setOnboardings([]);
    if (activityRes.ok) setActivities(await readList<ActivityRow>(activityRes));
    else setActivities([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const currentRole = json?.data?.role;
        const allowed = getNavForRole(currentRole).some((item) => item.href === "/lifecycle/onboarding");
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
    activeOnboardings: onboardings.filter((row) => row.status === "in_progress" || row.status === "pending").length,
    openActivities: activities.filter((row) => row.status !== "completed" && row.status !== "cancelled").length,
  }), [activities, onboardings, templates]);

  async function saveOnboarding() {
    if (!form.employee_id || !form.template_id || !form.start_date) {
      toast.error("Employee, template and start date are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrms/lifecycle/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, target_date: form.target_date || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not save onboarding";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Onboarding saved");
    setForm({ employee_id: "", template_id: "", start_date: "", target_date: "", status: "draft" });
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Onboarding</h1>
          <p className="mt-1 text-sm text-gray-500">Manage onboarding templates, employee checklists and activity status.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
      </div>

      {role === "employee" && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Employee-safe own onboarding state: checklist and activity status are scoped to your records.</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Onboarding templates</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.activeTemplates}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Employee checklists</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.activeOnboardings}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Open activities</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.openActivities}</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Create/update form for HR users</h2>
          <div className="mt-3 grid gap-3">
            <input value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} placeholder="Employee ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <select value={form.template_id} onChange={(event) => setForm({ ...form, template_id: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select onboarding template</option>
              {templates.map((row) => <option key={row.id} value={row.id}>{row.name ?? "Template"}</option>)}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="date" value={form.target_date} onChange={(event) => setForm({ ...form, target_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="draft">Draft</option><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option>
            </select>
            <button disabled={saving} onClick={() => void saveOnboarding()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"><Save size={14} /> Save onboarding</button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Onboarding template list</h2></div>
              <div className="divide-y divide-gray-100">
                {templates.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No templates found.</div> : templates.map((row) => (
                  <div key={row.id} className="px-4 py-3"><p className="font-medium text-gray-900">{row.name ?? "Template"}</p><p className="text-xs text-gray-500">{row.description ?? "Checklist template"} - {row.is_active === false ? "inactive" : "active"}</p></div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Employee onboarding checklist</h2></div>
              <div className="divide-y divide-gray-100">
                {onboardings.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No onboarding records found.</div> : onboardings.map((row) => (
                  <div key={row.id} className="px-4 py-3"><p className="font-medium text-gray-900">{row.employee_name ?? "Employee"}</p><p className="text-xs text-gray-500">{row.template_name ?? "Template"} - {row.start_date ?? "-"} to {row.target_date ?? "-"}</p></div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Activity status table</h2><p className="text-xs text-gray-500">{activities.length} activities loaded</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : activities.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No activities found.</td></tr> : activities.map((row) => (
                    <tr key={row.id}><td className="px-4 py-3 font-medium text-gray-900">{row.task_name ?? "Checklist activity"}</td><td className="px-4 py-3 text-gray-600">{row.employee_name ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.owner_name ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.due_date ?? "-"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "pending"}</span></td></tr>
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
