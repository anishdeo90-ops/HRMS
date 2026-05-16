"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, RefreshCw, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { getNavForRole } from "@/lib/nav/config";

type PeriodRow = { id: string; name?: string | null; month?: number | null; year?: number | null; start_date?: string | null; end_date?: string | null; status?: string | null };
type EmployeeRef = { id?: string; employee_code?: string | null; name?: string | null };
type PeriodRef = { id?: string; name?: string | null; month?: number | null; fiscal_year?: number | null; year?: number | null; start_date?: string | null; end_date?: string | null };
type SalarySlipRef = { id?: string; status?: string | null; gross_pay?: number | null; total_deductions?: number | null; net_pay?: number | null };
type EntryRow = {
  id: string;
  name?: string | null;
  period_name?: string | null;
  employee_count?: number | null;
  gross_pay?: number | null;
  total_deductions?: number | null;
  net_pay?: number | null;
  status?: string | null;
  payroll_period_id?: string | null;
  employee_id?: string | null;
  salary_structure_assignment_id?: string | null;
  salary_structure_name?: string | null;
  structure_name?: string | null;
  employee?: EmployeeRef | null;
  period?: PeriodRef | null;
  structure?: { name?: string | null } | null;
  salary_structure?: { name?: string | null } | null;
  assignment?: { structure?: { name?: string | null } | null } | null;
  slip_status?: string | null;
  salary_slip?: SalarySlipRef | null;
};
type RunDetail = { data?: EntryRow | null; included_employees?: EntryRow[]; error?: string };

function money(value?: number | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function statusClass(status?: string | null) {
  if (status === "approved" || status === "locked" || status === "paid") return "bg-green-100 text-green-700";
  if (status === "submitted" || status === "calculated" || status === "generated" || status === "published") return "bg-blue-100 text-blue-700";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "draft") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

function periodLabel(row?: EntryRow | PeriodRef | null) {
  if (!row) return "Payroll run";
  const period = ("period" in row ? row.period : row) as PeriodRef | null | undefined;
  const entryPeriodName = "period_name" in row ? row.period_name : null;
  return row.name ?? entryPeriodName ?? period?.name ?? `${period?.month ?? "-"}/${period?.fiscal_year ?? period?.year ?? "-"}`;
}

function employeeLabel(row: EntryRow) {
  const code = row.employee?.employee_code;
  const name = row.employee?.name ?? row.name ?? "Employee";
  return code ? `${code} - ${name}` : name;
}

function structureLabel(row: EntryRow) {
  return row.structure?.name
    ?? row.salary_structure?.name
    ?? row.assignment?.structure?.name
    ?? row.salary_structure_name
    ?? row.structure_name
    ?? (row.salary_structure_assignment_id ? "Assigned structure" : "Not available");
}

function slipStatus(row: EntryRow) {
  return row.salary_slip?.status ?? row.slip_status ?? "not generated";
}

export default function PayrollRunsPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", month: "", year: "", start_date: "", end_date: "" });

  async function loadRunDetail(id: string) {
    if (!id) {
      setRunDetail(null);
      return;
    }
    setDetailLoading(true);
    const res = await fetch(`/api/hrms/payroll/runs/${id}`);
    const json = (await res.json().catch(() => ({}))) as RunDetail;
    if (res.ok) setRunDetail(json);
    else {
      setRunDetail(null);
      const message = json.error ?? "Could not load payroll run detail";
      setError(message);
      toast.error(message);
    }
    setDetailLoading(false);
  }

  async function load() {
    setLoading(true);
    setError("");
    const [periodRes, entryRes] = await Promise.all([
      fetch("/api/hrms/payroll/periods"),
      fetch("/api/hrms/payroll/runs"),
    ]);
    if (periodRes.ok) setPeriods(await readList<PeriodRow>(periodRes));
    else {
      const message = (await periodRes.json().catch(() => ({}))).error ?? "Could not load payroll periods";
      setError(message);
      toast.error(message);
    }
    if (entryRes.ok) {
      const nextEntries = await readList<EntryRow>(entryRes);
      setEntries(nextEntries);
      setSelectedId((current) => {
        const nextId = current && nextEntries.some((entry) => entry.id === current) ? current : nextEntries[0]?.id ?? "";
        if (nextId) void loadRunDetail(nextId);
        else setRunDetail(null);
        return nextId;
      });
    } else {
      setEntries([]);
      setSelectedId("");
      setRunDetail(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const allowed = getNavForRole(json?.data?.role).some((item) => item.href === "/payroll/runs");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  async function createPeriod() {
    if (!form.month || !form.year || !form.start_date || !form.end_date) {
      toast.error("Month, year and date range are required");
      return;
    }
    setSaving("period");
    const res = await fetch("/api/hrms/payroll/periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name || `${form.month}/${form.year}`,
        month: Number(form.month),
        year: Number(form.year),
        start_date: form.start_date,
        end_date: form.end_date,
        status: "draft",
      }),
    });
    setSaving("");
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Could not create payroll period";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Payroll period created");
    setForm({ name: "", month: "", year: "", start_date: "", end_date: "" });
    await load();
  }

  async function selectRun(id: string) {
    setSelectedId(id);
    await loadRunDetail(id);
  }

  async function transition(entry: EntryRow, action: "draft" | "submit" | "approve" | "lock" | "cancel") {
    setSaving(`${entry.id}:${action}`);
    const res = await fetch(`/api/hrms/payroll/runs/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setSaving("");
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Payroll status update failed";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Payroll status updated");
    if (entry.id === selectedId) {
      const json = (await res.json().catch(() => ({}))) as RunDetail;
      setRunDetail(json);
    }
    await load();
  }

  const includedEmployees = runDetail?.included_employees ?? [];
  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? runDetail?.data ?? null;
  const runTotals = useMemo(() => ({
    gross: includedEmployees.reduce((sum, row) => sum + Number(row.salary_slip?.gross_pay ?? row.gross_pay ?? 0), 0),
    deductions: includedEmployees.reduce((sum, row) => sum + Number(row.salary_slip?.total_deductions ?? row.total_deductions ?? 0), 0),
    net: includedEmployees.reduce((sum, row) => sum + Number(row.salary_slip?.net_pay ?? row.net_pay ?? 0), 0),
  }), [includedEmployees]);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payroll Runs</h1>
          <p className="mt-1 text-sm text-gray-500">Prepare payroll periods, review entries and control payroll status transitions.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Payroll period</h2>
          <div className="mt-3 grid gap-3">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Period name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" min="1" max="12" value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} placeholder="Month" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="number" min="2000" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} placeholder="Year" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <button disabled={saving === "period"} onClick={() => void createPeriod()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <Save size={14} /> Save period
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Payroll entries</h2><p className="text-xs text-gray-500">{entries.length} entries loaded</p></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr><th className="px-4 py-3">Entry</th><th className="px-4 py-3">Employees</th><th className="px-4 py-3">Gross</th><th className="px-4 py-3">Deductions</th><th className="px-4 py-3">Net</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                  ) : entries.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No payroll entries found.</td></tr>
                  ) : entries.map((row) => (
                    <tr key={row.id} onClick={() => void selectRun(row.id)} className={`cursor-pointer hover:bg-gray-50 ${selectedId === row.id ? "bg-brand-50" : ""}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <span>{periodLabel(row)}</span>
                        <span className="block text-xs font-normal text-gray-500">{employeeLabel(row)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.employee_count ?? (row.employee_id ? 1 : 0)}</td>
                      <td className="px-4 py-3 text-gray-900">{money(row.gross_pay)}</td>
                      <td className="px-4 py-3 text-gray-900">{money(row.total_deductions)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{money(row.net_pay)}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={(event) => { event.stopPropagation(); void transition(row, "submit"); }} className="inline-flex items-center gap-1 rounded border border-blue-300 px-2 py-1 text-xs text-blue-700"><Check size={12} /> Submit</button>
                          <button onClick={(event) => { event.stopPropagation(); void transition(row, "approve"); }} className="inline-flex items-center gap-1 rounded border border-green-300 px-2 py-1 text-xs text-green-700"><Check size={12} /> Approve</button>
                          <button onClick={(event) => { event.stopPropagation(); void transition(row, "lock"); }} className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"><Lock size={12} /> Lock</button>
                          <button onClick={(event) => { event.stopPropagation(); void transition(row, "cancel"); }} className="inline-flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-xs text-red-700"><X size={12} /> Cancel</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-bold text-gray-900">Selected run detail</h2>
              <p className="text-xs text-gray-500">{selectedEntry ? `${periodLabel(selectedEntry)} - ${includedEmployees.length} included employees` : "Select a payroll entry or period to review included employees."}</p>
            </div>
            <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-4">
              <div className="rounded border border-gray-100 p-3">
                <p className="text-xs font-medium uppercase text-gray-500">Included employees</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{detailLoading ? "..." : includedEmployees.length}</p>
              </div>
              <div className="rounded border border-gray-100 p-3">
                <p className="text-xs font-medium uppercase text-gray-500">Gross amount</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{detailLoading ? "..." : money(runTotals.gross)}</p>
              </div>
              <div className="rounded border border-gray-100 p-3">
                <p className="text-xs font-medium uppercase text-gray-500">Deductions</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{detailLoading ? "..." : money(runTotals.deductions)}</p>
              </div>
              <div className="rounded border border-gray-100 p-3">
                <p className="text-xs font-medium uppercase text-gray-500">Total run amount</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{detailLoading ? "..." : money(runTotals.net)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Salary structure</th><th className="px-4 py-3">Gross</th><th className="px-4 py-3">Net</th><th className="px-4 py-3">Slip status</th><th className="px-4 py-3">Entry status</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailLoading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading run detail...</td></tr>
                  ) : !selectedEntry ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Select a payroll run to inspect included employees.</td></tr>
                  ) : includedEmployees.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No included employees returned for this run.</td></tr>
                  ) : includedEmployees.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{employeeLabel(row)}</td>
                      <td className="px-4 py-3 text-gray-600">{structureLabel(row)}</td>
                      <td className="px-4 py-3 text-gray-900">{money(row.salary_slip?.gross_pay ?? row.gross_pay)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{money(row.salary_slip?.net_pay ?? row.net_pay)}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(slipStatus(row))}`}>{slipStatus(row)}</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-bold text-gray-900">Periods</h2></div>
            <div className="divide-y divide-gray-100">
              {periods.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-400">No periods found.</div> : periods.map((row) => (
                <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div><p className="font-medium text-gray-900">{row.name ?? `${row.month ?? "-"}/${row.year ?? "-"}`}</p><p className="text-xs text-gray-500">{row.start_date ?? "-"} to {row.end_date ?? "-"}</p></div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status ?? "draft"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
