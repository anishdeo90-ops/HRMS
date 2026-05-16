"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type TransferRow = { id: string; employee_name?: string | null; from_company_name?: string | null; to_company_name?: string | null; from_branch_name?: string | null; to_branch_name?: string | null; from_department_name?: string | null; to_department_name?: string | null; from_manager_name?: string | null; to_manager_name?: string | null; effective_date?: string | null; status?: string | null };

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

export default function LifecycleTransfersPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ employee_id: "", from_company_id: "", to_company_id: "", from_branch_id: "", to_branch_id: "", from_department_id: "", to_department_id: "", reporting_manager_id: "", effective_date: "", status: "draft" });

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/hrms/lifecycle/transfers");
    if (res.ok) setTransfers(await readList<TransferRow>(res));
    else {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not load transfers";
      setError(message);
      toast.error(message);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const allowed = getNavForRole(json?.data?.role).some((item) => item.href === "/lifecycle/transfers");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const summary = useMemo(() => ({
    submitted: transfers.filter((row) => row.status === "submitted" || row.status === "in_review").length,
    approved: transfers.filter((row) => row.status === "approved").length,
    draft: transfers.filter((row) => row.status === "draft").length,
  }), [transfers]);

  async function saveTransfer() {
    if (!form.employee_id || !form.to_department_id || !form.effective_date) {
      toast.error("Employee, destination department and effective date are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrms/lifecycle/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not save transfer";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Transfer saved");
    setForm({ employee_id: "", from_company_id: "", to_company_id: "", from_branch_id: "", to_branch_id: "", from_department_id: "", to_department_id: "", reporting_manager_id: "", effective_date: "", status: "draft" });
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transfers</h1>
          <p className="mt-1 text-sm text-gray-500">Manage company, branch, department and reporting-manager transfer records.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Submitted transfers</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.submitted}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Approved transfers</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.approved}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Draft transfers</p><p className="mt-1 text-2xl font-bold text-gray-900">{summary.draft}</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Transfer form</h2>
          <div className="mt-3 grid gap-3">
            <input value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} placeholder="Employee ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.from_company_id} onChange={(event) => setForm({ ...form, from_company_id: event.target.value })} placeholder="From company ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input value={form.to_company_id} onChange={(event) => setForm({ ...form, to_company_id: event.target.value })} placeholder="To company ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.from_branch_id} onChange={(event) => setForm({ ...form, from_branch_id: event.target.value })} placeholder="From branch ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input value={form.to_branch_id} onChange={(event) => setForm({ ...form, to_branch_id: event.target.value })} placeholder="To branch ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.from_department_id} onChange={(event) => setForm({ ...form, from_department_id: event.target.value })} placeholder="From department ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input value={form.to_department_id} onChange={(event) => setForm({ ...form, to_department_id: event.target.value })} placeholder="To department ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <input value={form.reporting_manager_id} onChange={(event) => setForm({ ...form, reporting_manager_id: event.target.value })} placeholder="Reporting manager ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="date" value={form.effective_date} onChange={(event) => setForm({ ...form, effective_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm"><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="approved">Approved</option></select>
            </div>
            <button disabled={saving} onClick={() => void saveTransfer()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"><Save size={14} /> Save transfer</button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Transfer record table</h2><p className="text-xs text-gray-500">From/to company, branch, department, reporting manager and effective date</p></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Reporting manager</th><th className="px-4 py-3">Approval/status controls</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : transfers.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No transfer records found.</td></tr> : transfers.map((row) => (
                  <tr key={row.id}><td className="px-4 py-3 font-medium text-gray-900">{row.employee_name ?? "Employee"}</td><td className="px-4 py-3 text-gray-600">{row.from_company_name ?? "-"} to {row.to_company_name ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.from_branch_name ?? "-"} to {row.to_branch_name ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.from_department_name ?? "-"} to {row.to_department_name ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.from_manager_name ?? "-"} to {row.to_manager_name ?? "-"}</td><td className="px-4 py-3"><button className="inline-flex items-center gap-1 rounded border border-green-300 px-2 py-1 text-xs text-green-700"><Check size={12} /> Approve</button><span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
