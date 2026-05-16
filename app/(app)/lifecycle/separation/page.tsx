"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type TemplateRow = { id: string; name?: string | null; description?: string | null; is_active?: boolean | null };
type SeparationRow = { id: string; employee_name?: string | null; template_name?: string | null; separation_type?: string | null; requested_date?: string | null; last_working_date?: string | null; status?: string | null; reason?: string | null };
type ExitRow = { id: string; employee_name?: string | null; interviewer_name?: string | null; interview_date?: string | null; status?: string | null; summary?: string | null };

function statusClass(status?: string | null) {
  if (status === "approved" || status === "completed" || status === "closed") return "bg-green-100 text-green-700";
  if (status === "submitted" || status === "in_review" || status === "open") return "bg-blue-100 text-blue-700";
  if (status === "rejected" || status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "draft" || status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function LifecycleSeparationPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [separations, setSeparations] = useState<SeparationRow[]>([]);
  const [exitInterviews, setExitInterviews] = useState<ExitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState({ employee_id: "", template_id: "", separation_type: "resignation", requested_date: "", last_working_date: "", reason: "" });

  async function load(currentRole = role) {
    setLoading(true);
    setError("");
    const scope = currentRole === "employee" ? "?scope=mine" : "";
    const [templateRes, separationRes, exitRes] = await Promise.all([
      fetch("/api/hrms/lifecycle/separation/templates"),
      fetch(`/api/hrms/lifecycle/separation${scope}`),
      fetch(`/api/hrms/lifecycle/exit-interviews${scope}`),
    ]);
    if (templateRes.ok) setTemplates(await readList<TemplateRow>(templateRes));
    else {
      const message = (await templateRes.json().catch(() => ({}))).error ?? "Could not load separation templates";
      setError(message);
      toast.error(message);
    }
    if (separationRes.ok) setSeparations(await readList<SeparationRow>(separationRes));
    else setSeparations([]);
    if (exitRes.ok) setExitInterviews(await readList<ExitRow>(exitRes));
    else setExitInterviews([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const currentRole = json?.data?.role;
        const allowed = getNavForRole(currentRole).some((item) => item.href === "/lifecycle/separation");
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
    openRequests: separations.filter((row) => row.status === "draft" || row.status === "submitted" || row.status === "in_review").length,
    exitPending: exitInterviews.filter((row) => row.status !== "completed" && row.status !== "cancelled").length,
  }), [exitInterviews, separations, templates]);

  async function saveSeparation() {
    if (!form.employee_id || !form.requested_date || !form.last_working_date) {
      toast.error("Employee and separation dates are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrms/lifecycle/separation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, template_id: form.template_id || null, reason: form.reason || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not save separation request";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Separation request saved");
    setForm({ employee_id: "", template_id: "", separation_type: "resignation", requested_date: "", last_working_date: "", reason: "" });
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Separation</h1>
          <p className="mt-1 text-sm text-gray-500">Review separation requests, exit checklists and interview status.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
      </div>

      {role === "employee" && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Employee-safe own separation state: requests, exit checklist and interview status are scoped to your records.</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Separation templates</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.activeTemplates}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Open requests</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.openRequests}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Exit checklist pending</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.exitPending}</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Separation request form</h2>
          <div className="mt-3 grid gap-3">
            <input value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} placeholder="Employee ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <select value={form.template_id} onChange={(event) => setForm({ ...form, template_id: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select separation template</option>
              {templates.map((row) => <option key={row.id} value={row.id}>{row.name ?? "Template"}</option>)}
            </select>
            <select value={form.separation_type} onChange={(event) => setForm({ ...form, separation_type: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="resignation">Resignation</option><option value="termination">Termination</option><option value="retirement">Retirement</option>
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="date" value={form.requested_date} onChange={(event) => setForm({ ...form, requested_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="date" value={form.last_working_date} onChange={(event) => setForm({ ...form, last_working_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Reason" className="min-h-24 rounded border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={saving} onClick={() => void saveSeparation()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"><Save size={14} /> Save request</button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Separation template list</h2></div>
            <div className="divide-y divide-gray-100">
              {templates.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No templates found.</div> : templates.map((row) => (
                <div key={row.id} className="px-4 py-3"><p className="font-medium text-gray-900">{row.name ?? "Template"}</p><p className="text-xs text-gray-500">{row.description ?? "Exit checklist template"} - {row.is_active === false ? "inactive" : "active"}</p></div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Separation request/table</h2><p className="text-xs text-gray-500">Exit checklist and exit interview status included</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Last working date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">HR approval controls</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : separations.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No separation requests found.</td></tr> : separations.map((row) => (
                    <tr key={row.id}><td className="px-4 py-3 font-medium text-gray-900">{row.employee_name ?? "Employee"}</td><td className="px-4 py-3 text-gray-600">{row.separation_type ?? "Separation"}</td><td className="px-4 py-3 text-gray-600">{row.last_working_date ?? "-"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td><td className="px-4 py-3"><button className="inline-flex items-center gap-1 rounded border border-green-300 px-2 py-1 text-xs text-green-700"><Check size={12} /> Approve</button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Exit interview status</h2><p className="text-xs text-gray-500">{exitInterviews.length} interviews loaded</p></div>
            <div className="divide-y divide-gray-100">
              {exitInterviews.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No exit interviews found.</div> : exitInterviews.map((row) => (
                <div key={row.id} className="px-4 py-3"><p className="font-medium text-gray-900">{row.employee_name ?? "Employee"}</p><p className="text-xs text-gray-500">{row.interviewer_name ?? "Interviewer"} - {row.interview_date ?? "-"} - {row.summary ?? "Summary pending"}</p></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
