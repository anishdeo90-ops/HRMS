"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type TypeRow = { id: string; name?: string | null; description?: string | null; is_active?: boolean | null };
type GrievanceRow = { id: string; employee_name?: string | null; type_name?: string | null; title?: string | null; assigned_to_name?: string | null; status?: string | null; resolution_summary?: string | null; submitted_at?: string | null };

function statusClass(status?: string | null) {
  if (status === "resolved" || status === "closed") return "bg-green-100 text-green-700";
  if (status === "submitted" || status === "assigned" || status === "in_review") return "bg-blue-100 text-blue-700";
  if (status === "rejected" || status === "cancelled" || status === "escalated") return "bg-red-100 text-red-700";
  if (status === "draft") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function GrievancesPage() {
  const router = useRouter();
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [grievances, setGrievances] = useState<GrievanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState({ type_id: "", title: "", description: "", employee_id: "" });

  async function load(currentRole = role) {
    setLoading(true);
    setError("");
    const scope = currentRole === "employee" ? "?scope=mine" : "";
    const [typeRes, grievanceRes] = await Promise.all([
      fetch("/api/hrms/grievances/types"),
      fetch(`/api/hrms/grievances${scope}`),
    ]);
    if (typeRes.ok) setTypes(await readList<TypeRow>(typeRes));
    else {
      const message = (await typeRes.json().catch(() => ({}))).error ?? "Could not load grievance types";
      setError(message);
      toast.error(message);
    }
    if (grievanceRes.ok) setGrievances(await readList<GrievanceRow>(grievanceRes));
    else setGrievances([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const currentRole = json?.data?.role;
        const allowed = getNavForRole(currentRole).some((item) => item.href === "/grievances");
        if (!allowed) router.replace("/dashboard");
        else {
          setRole(currentRole);
          void load(currentRole);
        }
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const summary = useMemo(() => ({
    open: grievances.filter((row) => row.status === "submitted" || row.status === "assigned" || row.status === "in_review").length,
    resolved: grievances.filter((row) => row.status === "resolved" || row.status === "closed").length,
    activeTypes: types.filter((row) => row.is_active !== false).length,
  }), [grievances, types]);

  async function saveGrievance() {
    if (!form.type_id || !form.title || !form.description) {
      toast.error("Type, title and description are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrms/grievances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, employee_id: form.employee_id || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not save grievance";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Grievance saved");
    setForm({ type_id: "", title: "", description: "", employee_id: "" });
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Grievances</h1>
          <p className="mt-1 text-sm text-gray-500">Submit employee grievances and track assignment, status and resolution.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
      </div>

      {role === "employee" && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Employee-safe own grievance view: grievance form and table are scoped to your records.</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Grievance types</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.activeTypes}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Open grievances</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.open}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Resolved grievances</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.resolved}</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-bold text-gray-900">Employee grievance form/table</h2>
            <div className="mt-3 grid gap-3">
              <select value={form.type_id} onChange={(event) => setForm({ ...form, type_id: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                <option value="">Select grievance type</option>
                {types.map((row) => <option key={row.id} value={row.id}>{row.name ?? "Type"}</option>)}
              </select>
              <input value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} placeholder="Employee ID for HR submission" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Grievance title" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" className="min-h-24 rounded border border-gray-300 px-3 py-2 text-sm" />
              <button disabled={saving} onClick={() => void saveGrievance()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"><Save size={14} /> Save grievance</button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Grievance type list</h2></div>
            <div className="divide-y divide-gray-100">
              {types.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No grievance types found.</div> : types.map((row) => (
                <div key={row.id} className="px-4 py-3"><p className="font-medium text-gray-900">{row.name ?? "Type"}</p><p className="text-xs text-gray-500">{row.description ?? "Governed grievance type"} - {row.is_active === false ? "inactive" : "active"}</p></div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Assignment, status, resolution summary</h2><p className="text-xs text-gray-500">{grievances.length} grievances loaded</p></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Grievance</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Assigned</th><th className="px-4 py-3">Resolution</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : grievances.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No grievances found.</td></tr> : grievances.map((row) => (
                  <tr key={row.id}><td className="px-4 py-3 font-medium text-gray-900">{row.title ?? "Grievance"}</td><td className="px-4 py-3 text-gray-600">{row.employee_name ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.type_name ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.assigned_to_name ?? "Unassigned"}</td><td className="px-4 py-3 text-gray-600">{row.resolution_summary ?? "-"}</td><td className="px-4 py-3"><button className="mr-2 inline-flex items-center gap-1 rounded border border-green-300 px-2 py-1 text-xs text-green-700"><Check size={12} /> Review</button><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "submitted"}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
