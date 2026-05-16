"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type PromotionRow = { id: string; employee_name?: string | null; current_role?: string | null; new_role?: string | null; current_department_name?: string | null; new_department_name?: string | null; current_grade?: string | null; new_grade?: string | null; salary_reference?: string | null; effective_date?: string | null; status?: string | null };

function statusClass(status?: string | null) {
  if (status === "approved" || status === "completed") return "bg-green-100 text-green-700";
  if (status === "submitted" || status === "in_review") return "bg-blue-100 text-blue-700";
  if (status === "rejected" || status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "draft" || status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function LifecyclePromotionsPage() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ employee_id: "", current_role: "", new_role: "", current_department_id: "", new_department_id: "", current_grade: "", new_grade: "", salary_reference: "", effective_date: "", status: "draft" });

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/hrms/lifecycle/promotions");
    if (res.ok) setPromotions(await readList<PromotionRow>(res));
    else {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not load promotions";
      setError(message);
      toast.error(message);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const allowed = getNavForRole(json?.data?.role).some((item) => item.href === "/lifecycle/promotions");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const summary = useMemo(() => ({
    submitted: promotions.filter((row) => row.status === "submitted" || row.status === "in_review").length,
    approved: promotions.filter((row) => row.status === "approved").length,
    draft: promotions.filter((row) => row.status === "draft").length,
  }), [promotions]);

  async function savePromotion() {
    if (!form.employee_id || !form.new_role || !form.effective_date) {
      toast.error("Employee, new role and effective date are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrms/lifecycle/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, salary_reference: form.salary_reference || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not save promotion";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Promotion saved");
    setForm({ employee_id: "", current_role: "", new_role: "", current_department_id: "", new_department_id: "", current_grade: "", new_grade: "", salary_reference: "", effective_date: "", status: "draft" });
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Promotions</h1>
          <p className="mt-1 text-sm text-gray-500">Manage promotion records, role changes, grade changes and approval status.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Submitted promotions</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.submitted}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Approved promotions</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.approved}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Draft promotions</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.draft}</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Promotion form</h2>
          <div className="mt-3 grid gap-3">
            <input value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} placeholder="Employee ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.current_role} onChange={(event) => setForm({ ...form, current_role: event.target.value })} placeholder="Current role" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input value={form.new_role} onChange={(event) => setForm({ ...form, new_role: event.target.value })} placeholder="New role" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.current_department_id} onChange={(event) => setForm({ ...form, current_department_id: event.target.value })} placeholder="Current department ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input value={form.new_department_id} onChange={(event) => setForm({ ...form, new_department_id: event.target.value })} placeholder="New department ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.current_grade} onChange={(event) => setForm({ ...form, current_grade: event.target.value })} placeholder="Current grade" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input value={form.new_grade} onChange={(event) => setForm({ ...form, new_grade: event.target.value })} placeholder="New grade" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <input value={form.salary_reference} onChange={(event) => setForm({ ...form, salary_reference: event.target.value })} placeholder="Salary-reference fields" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="date" value={form.effective_date} onChange={(event) => setForm({ ...form, effective_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm"><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="approved">Approved</option></select>
            </div>
            <button disabled={saving} onClick={() => void savePromotion()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"><Save size={14} /> Save promotion</button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Promotion record table</h2><p className="text-xs text-gray-500">Current/new role, department, grade and salary-reference fields</p></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Salary reference</th><th className="px-4 py-3">Approval/status controls</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : promotions.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No promotion records found.</td></tr> : promotions.map((row) => (
                  <tr key={row.id}><td className="px-4 py-3 font-medium text-gray-900">{row.employee_name ?? "Employee"}</td><td className="px-4 py-3 text-gray-600">{row.current_role ?? "-"} to {row.new_role ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.current_department_name ?? "-"} to {row.new_department_name ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.current_grade ?? "-"} to {row.new_grade ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.salary_reference ?? "-"}</td><td className="px-4 py-3"><button className="inline-flex items-center gap-1 rounded border border-green-300 px-2 py-1 text-xs text-green-700"><Check size={12} /> Approve</button><span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
