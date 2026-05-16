"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type SlipLine = { id?: string; component_name?: string | null; component_type?: string | null; amount?: number | null };
type SlipRow = { id: string; employee_name?: string | null; employee_code?: string | null; period_name?: string | null; gross_pay?: number | null; total_deductions?: number | null; net_pay?: number | null; status?: string | null; lines?: SlipLine[] | null };

function money(value?: number | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function statusClass(status?: string | null) {
  if (status === "submitted" || status === "paid") return "bg-green-100 text-green-700";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "draft") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function SalarySlipsPage() {
  const router = useRouter();
  const [slips, setSlips] = useState<SlipRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [role, setRole] = useState("");

  async function load(nextScope = scope) {
    setLoading(true);
    setError("");
    const endpoint = nextScope === "mine" ? "/api/hrms/payroll/salary-slips?scope=mine" : "/api/hrms/payroll/salary-slips";
    const res = await fetch(endpoint);
    if (res.ok) setSlips(await readList<SlipRow>(res));
    else {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not load salary slips";
      setError(message);
      toast.error(message);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        setRole(json?.data?.role ?? "");
        const allowed = getNavForRole(json?.data?.role).some((item) => item.href === "/payroll/salary-slips");
        if (!allowed) router.replace("/dashboard");
        else {
          const initialScope = json?.data?.role === "employee" ? "mine" : "all";
          setScope(initialScope);
          void load(initialScope);
        }
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const selected = useMemo(() => slips.find((row) => row.id === selectedId) ?? slips[0], [selectedId, slips]);
  const lines = selected?.lines ?? [];

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Salary Slips</h1>
          <p className="mt-1 text-sm text-gray-500">Review generated salary slips, totals, status and slip line breakdowns.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {role !== "employee" && (
            <select value={scope} onChange={(event) => { const next = event.target.value as "all" | "mine"; setScope(next); void load(next); }} className="rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="all">All slips</option>
              <option value="mine">Own slips</option>
            </select>
          )}
          <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {role === "employee" && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Employee self-service mode shows only your own salary slips.</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Slip register</h2><p className="text-xs text-gray-500">{slips.length} slips loaded</p></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Gross</th><th className="px-4 py-3">Deductions</th><th className="px-4 py-3">Net</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : slips.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No salary slips found.</td></tr>
                ) : slips.map((row) => (
                  <tr key={row.id} onClick={() => setSelectedId(row.id)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.employee_code ? `${row.employee_code} - ${row.employee_name ?? "Employee"}` : row.employee_name ?? "Employee"}</td>
                    <td className="px-4 py-3 text-gray-600">{row.period_name ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-900">{money(row.gross_pay)}</td>
                    <td className="px-4 py-3 text-gray-900">{money(row.total_deductions)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{money(row.net_pay)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Slip line preview</h2>
            <p className="text-xs text-gray-500">{selected?.employee_name ?? "Select a slip"}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {!selected ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No slip selected.</div>
            ) : lines.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No slip lines found.</div>
            ) : lines.map((line, index) => (
              <div key={line.id ?? index} className="flex items-center justify-between gap-3 px-4 py-3">
                <div><p className="text-sm font-medium text-gray-900">{line.component_name ?? "Component"}</p><p className="text-xs text-gray-500">{line.component_type ?? "earning"}</p></div>
                <p className="text-sm font-semibold text-gray-900">{money(line.amount)}</p>
              </div>
            ))}
          </div>
          {selected && (
            <div className="border-t border-gray-200 p-4">
              <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <Download size={14} /> Download slip
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
