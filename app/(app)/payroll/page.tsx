"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type PeriodRow = { id: string; name?: string | null; month?: number | null; year?: number | null; start_date?: string | null; end_date?: string | null; status?: string | null };
type EntryRow = { id: string; name?: string | null; period_name?: string | null; status?: string | null; gross_pay?: number | null; net_pay?: number | null };
type SlipRow = { id: string; employee_name?: string | null; status?: string | null; gross_pay?: number | null; net_pay?: number | null };
type StructureRow = { id: string; name?: string | null; is_active?: boolean | null };

function money(value?: number | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function statusClass(status?: string | null) {
  if (status === "approved" || status === "locked" || status === "submitted") return "bg-green-100 text-green-700";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "draft") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function PayrollOverviewPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [slips, setSlips] = useState<SlipRow[]>([]);
  const [structures, setStructures] = useState<StructureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const [periodRes, entryRes, slipRes, structureRes] = await Promise.all([
      fetch("/api/hrms/payroll/periods"),
      fetch("/api/hrms/payroll/runs"),
      fetch("/api/hrms/payroll/salary-slips"),
      fetch("/api/hrms/payroll/salary-structures"),
    ]);

    if (periodRes.ok) setPeriods(await readList<PeriodRow>(periodRes));
    else {
      const message = (await periodRes.json().catch(() => ({}))).error ?? "Could not load payroll periods";
      setError(message);
      toast.error(message);
    }
    if (entryRes.ok) setEntries(await readList<EntryRow>(entryRes));
    else setEntries([]);
    if (slipRes.ok) setSlips(await readList<SlipRow>(slipRes));
    else setSlips([]);
    if (structureRes.ok) setStructures(await readList<StructureRow>(structureRes));
    else setStructures([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const allowed = getNavForRole(json?.data?.role).some((item) => item.href === "/payroll");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const kpis = useMemo(() => [
    { label: "Active structures", value: structures.filter((row) => row.is_active !== false).length },
    { label: "Open periods", value: periods.filter((row) => row.status !== "locked" && row.status !== "cancelled").length },
    { label: "Draft runs", value: entries.filter((row) => row.status === "draft").length },
    { label: "Generated slips", value: slips.length },
  ], [entries, periods, slips.length, structures]);

  const pendingActions = useMemo(() => [
    ...periods.filter((row) => row.status === "draft" || row.status === "open").map((row) => ({ id: `period:${row.id}`, label: row.name ?? `${row.month ?? ""}/${row.year ?? ""}`, status: row.status ?? "draft", href: "/payroll/runs" })),
    ...entries.filter((row) => row.status === "draft" || row.status === "submitted").map((row) => ({ id: `entry:${row.id}`, label: row.name ?? row.period_name ?? "Payroll entry", status: row.status ?? "draft", href: "/payroll/runs" })),
    ...slips.filter((row) => row.status === "draft").map((row) => ({ id: `slip:${row.id}`, label: row.employee_name ?? "Salary slip", status: row.status ?? "draft", href: "/payroll/salary-slips" })),
  ], [entries, periods, slips]);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payroll Overview</h1>
          <p className="mt-1 text-sm text-gray-500">Review salary readiness, payroll periods, run status and generated salary slips.</p>
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
            <h2 className="text-sm font-bold text-gray-900">Payroll periods</h2>
            <p className="text-xs text-gray-500">{periods.length} configured periods</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr><th className="px-4 py-3">Period</th><th className="px-4 py-3">Range</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Net run value</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : periods.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No payroll periods found.</td></tr>
                ) : periods.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name ?? `${row.month ?? "-"} / ${row.year ?? "-"}`}</td>
                    <td className="px-4 py-3 text-gray-600">{row.start_date ?? "-"} to {row.end_date ?? "-"}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td>
                    <td className="px-4 py-3 text-gray-900">{money(entries.filter((entry) => entry.period_name === row.name).reduce((sum, entry) => sum + Number(entry.net_pay ?? 0), 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">Pending payroll actions</h2>
              <p className="text-xs text-gray-500">{pendingActions.length} items need review</p>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
              ) : pendingActions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No pending payroll actions.</div>
              ) : pendingActions.slice(0, 6).map((item) => (
                <Link key={item.id} href={item.href} className="block px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-gray-900">{item.label}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(item.status)}`}>{item.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {[
            { href: "/payroll/salary-structures", label: "Salary structures", detail: "Components, structures and assignments" },
            { href: "/payroll/runs", label: "Payroll runs", detail: "Periods, entries and status review" },
            { href: "/payroll/salary-slips", label: "Salary slips", detail: "Generated slips and line preview" },
            { href: "/payroll/tax-benefits", label: "Tax & benefits", detail: "Declarations, slabs and claims" },
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
