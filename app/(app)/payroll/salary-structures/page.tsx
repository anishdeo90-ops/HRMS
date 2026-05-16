"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type ComponentRow = { id: string; name?: string | null; code?: string | null; type?: string | null; is_statutory?: boolean | null; is_active?: boolean | null };
type StructureRow = { id: string; name?: string | null; frequency?: string | null; is_active?: boolean | null; total_earnings?: number | null; total_deductions?: number | null };
type AssignmentRow = { id: string; employee_name?: string | null; structure_name?: string | null; effective_from?: string | null; effective_to?: string | null; base_amount?: number | null; status?: string | null };
type DetailRow = { component_key: string; amount: string; formula: string };

const emptyDetail: DetailRow = { component_key: "", amount: "", formula: "" };

function money(value?: number | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function SalaryStructuresPage() {
  const router = useRouter();
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [structures, setStructures] = useState<StructureRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [details, setDetails] = useState<DetailRow[]>([{ ...emptyDetail }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", frequency: "monthly", effective_from: "", currency: "INR" });

  async function load() {
    setLoading(true);
    setError("");
    const [componentRes, structureRes, assignmentRes] = await Promise.all([
      fetch("/api/hrms/payroll/salary-components"),
      fetch("/api/hrms/payroll/salary-structures"),
      fetch("/api/hrms/payroll/salary-structure-assignments"),
    ]);
    if (componentRes.ok) setComponents(await readList<ComponentRow>(componentRes));
    else {
      const message = (await componentRes.json().catch(() => ({}))).error ?? "Could not load salary components";
      setError(message);
      toast.error(message);
    }
    if (structureRes.ok) setStructures(await readList<StructureRow>(structureRes));
    else setStructures([]);
    if (assignmentRes.ok) setAssignments(await readList<AssignmentRow>(assignmentRes));
    else setAssignments([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const allowed = getNavForRole(json?.data?.role).some((item) => item.href === "/payroll/salary-structures");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const componentTotals = useMemo(() => ({
    earnings: components.filter((row) => row.type === "earning").length,
    deductions: components.filter((row) => row.type === "deduction").length,
    statutory: components.filter((row) => row.is_statutory).length,
  }), [components]);

  function updateDetail(index: number, patch: Partial<DetailRow>) {
    setDetails((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  async function saveStructure() {
    if (!form.name.trim()) {
      toast.error("Structure name is required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/hrms/payroll/salary-structures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        frequency: form.frequency,
        effective_from: form.effective_from || null,
        currency: form.currency,
        details: details.filter((row) => row.component_key).map((row) => ({
          component_key: row.component_key,
          amount: Number(row.amount || 0),
          formula: row.formula || null,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not save salary structure";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Salary structure saved");
    setForm({ name: "", frequency: "monthly", effective_from: "", currency: "INR" });
    setDetails([{ ...emptyDetail }]);
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Salary Structures</h1>
          <p className="mt-1 text-sm text-gray-500">Configure salary components, salary structures and employee assignments.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Earnings</p><p className="mt-1 text-2xl font-bold text-gray-900">{componentTotals.earnings}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Deductions</p><p className="mt-1 text-2xl font-bold text-gray-900">{componentTotals.deductions}</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-xs font-medium uppercase text-gray-500">Statutory components</p><p className="mt-1 text-2xl font-bold text-gray-900">{componentTotals.statutory}</p></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">New salary structure</h2>
          <div className="mt-3 grid gap-3">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Structure name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-3 gap-3">
              <select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm">
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="annual">Annual</option>
              </select>
              <input type="date" value={form.effective_from} onChange={(event) => setForm({ ...form, effective_from: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-gray-500">Structure details</p>
                <button onClick={() => setDetails([...details, { ...emptyDetail }])} className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"><Plus size={12} /> Add</button>
              </div>
              {details.map((detail, index) => (
                <div key={index} className="grid gap-2 rounded border border-gray-200 p-2">
                  <input value={detail.component_key} onChange={(event) => updateDetail(index, { component_key: event.target.value })} placeholder="Component key" className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" min="0" value={detail.amount} onChange={(event) => updateDetail(index, { amount: event.target.value })} placeholder="Amount" className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                    <input value={detail.formula} onChange={(event) => updateDetail(index, { formula: event.target.value })} placeholder="Formula" className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
                  </div>
                </div>
              ))}
            </div>
            <button disabled={saving} onClick={() => void saveStructure()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <Save size={14} /> Save structure
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Salary components</h2><p className="text-xs text-gray-500">{components.length} components loaded</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Component</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Flags</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr> : components.length === 0 ? <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No salary components found.</td></tr> : components.map((row) => (
                    <tr key={row.id}><td className="px-4 py-3 font-medium text-gray-900">{row.name ?? row.code ?? "Component"}</td><td className="px-4 py-3 text-gray-600">{row.type ?? "-"}</td><td className="px-4 py-3 text-gray-600">{row.is_statutory ? "Statutory" : "Regular"}{row.is_active === false ? " / inactive" : ""}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Structures</h2></div>
              <div className="divide-y divide-gray-100">
                {structures.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No structures found.</div> : structures.map((row) => (
                  <div key={row.id} className="px-4 py-3"><p className="font-medium text-gray-900">{row.name ?? "Salary structure"}</p><p className="text-xs text-gray-500">{row.frequency ?? "monthly"} - earnings {money(row.total_earnings)} - deductions {money(row.total_deductions)}</p></div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Employee assignments</h2></div>
              <div className="divide-y divide-gray-100">
                {assignments.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No assignments found.</div> : assignments.map((row) => (
                  <div key={row.id} className="px-4 py-3"><p className="font-medium text-gray-900">{row.employee_name ?? "Employee"}</p><p className="text-xs text-gray-500">{row.structure_name ?? "Structure"} - from {row.effective_from ?? "-"} - {money(row.base_amount)}</p></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
