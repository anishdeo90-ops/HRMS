"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Send } from "lucide-react";
import toast from "react-hot-toast";
import { getVisibleFinanceRoutes } from "@/lib/hrms/route-access";

type VehicleLog = { id: string; vehicle_number?: string | null; travel_date?: string | null; route?: string | null; purpose?: string | null; amount?: number | null; status?: string | null; employee?: PersonRef | null };
type VehicleService = { id: string; vehicle_number?: string | null; service_date?: string | null; vendor_name?: string | null; service_type?: string | null; amount?: number | null; status?: string | null; employee?: PersonRef | null };
type PersonRef = { name?: string | null; employee_code?: string | null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value?: number | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function personLabel(person?: PersonRef | null) {
  if (!person) return "Current person";
  return person.employee_code ? `${person.employee_code} - ${person.name ?? "Person"}` : person.name ?? "Person";
}

function statusClass(status?: string | null) {
  if (status === "approved" || status === "paid") return "bg-green-100 text-green-700";
  if (status === "rejected" || status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "submitted") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

async function readList<T>(res: Response): Promise<T[]> {
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.data) ? json.data : [];
}

export default function VehiclesPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [services, setServices] = useState<VehicleService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [logForm, setLogForm] = useState({ vehicle_number: "", travel_date: today(), start_km: "", end_km: "", route: "", purpose: "", amount: "", status: "submitted" });
  const [serviceForm, setServiceForm] = useState({ vehicle_number: "", service_date: today(), vendor_name: "", service_type: "", amount: "", notes: "", attachment_path: "", status: "submitted" });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (employeeFilter.trim()) params.set("employee_id", employeeFilter.trim());
    if (dateFilter) params.set("date", dateFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const [logRes, serviceRes] = await Promise.all([
      fetch(`/api/hrms/vehicles/logs?${params.toString()}`),
      fetch(`/api/hrms/vehicles/services?${params.toString()}`),
    ]);
    if (logRes.ok) setLogs(await readList<VehicleLog>(logRes));
    else toast.error("Could not load vehicle logs");
    if (serviceRes.ok) setServices(await readList<VehicleService>(serviceRes));
    else setServices([]);
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/me")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        const allowed = getVisibleFinanceRoutes(json?.data).some((route) => route.href === "/vehicles");
        if (!allowed) router.replace("/dashboard");
        else void load();
      })
      .catch(() => router.replace("/dashboard"));
  }, [router]);

  const totals = useMemo(() => ({
    logs: logs.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    services: services.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
  }), [logs, services]);

  async function submitLog() {
    if (!logForm.vehicle_number.trim() || !logForm.travel_date || !logForm.purpose.trim()) {
      toast.error("Vehicle, trip date and purpose are required");
      return;
    }
    setSaving("log");
    const res = await fetch("/api/hrms/vehicles/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...logForm, amount: Number(logForm.amount || 0), start_km: Number(logForm.start_km || 0), end_km: Number(logForm.end_km || 0) }),
    });
    setSaving("");
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Vehicle log failed");
      return;
    }
    toast.success("Vehicle log saved");
    setLogForm({ vehicle_number: "", travel_date: today(), start_km: "", end_km: "", route: "", purpose: "", amount: "", status: "submitted" });
    await load();
  }

  async function submitService() {
    if (!serviceForm.vehicle_number.trim() || !serviceForm.service_date || !serviceForm.vendor_name.trim()) {
      toast.error("Vehicle, service date and vendor are required");
      return;
    }
    setSaving("service");
    const res = await fetch("/api/hrms/vehicles/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...serviceForm, amount: Number(serviceForm.amount || 0) }),
    });
    setSaving("");
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Vehicle service failed");
      return;
    }
    toast.success("Vehicle service saved");
    setServiceForm({ vehicle_number: "", service_date: today(), vendor_name: "", service_type: "", amount: "", notes: "", attachment_path: "", status: "submitted" });
    await load();
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vehicle Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">Track trip logs, service entries, status filters and vehicle-related costs.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <input value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} placeholder="Employee ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>
        <button onClick={() => void load()} className="rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700">Apply filters</button>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Vehicle log form</h2>
          <div className="mt-3 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={logForm.vehicle_number} onChange={(event) => setLogForm({ ...logForm, vehicle_number: event.target.value })} placeholder="Vehicle identifier" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="date" value={logForm.travel_date} onChange={(event) => setLogForm({ ...logForm, travel_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input type="number" min="0" value={logForm.start_km} onChange={(event) => setLogForm({ ...logForm, start_km: event.target.value })} placeholder="Start km" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="number" min="0" value={logForm.end_km} onChange={(event) => setLogForm({ ...logForm, end_km: event.target.value })} placeholder="End km" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="number" min="0" value={logForm.amount} onChange={(event) => setLogForm({ ...logForm, amount: event.target.value })} placeholder="Amount" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <input value={logForm.route} onChange={(event) => setLogForm({ ...logForm, route: event.target.value })} placeholder="Route" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <textarea value={logForm.purpose} onChange={(event) => setLogForm({ ...logForm, purpose: event.target.value })} placeholder="Purpose" className="h-20 resize-none rounded border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={saving === "log"} onClick={() => void submitLog()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <Send size={14} /> Save log
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">Vehicle service form</h2>
          <div className="mt-3 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={serviceForm.vehicle_number} onChange={(event) => setServiceForm({ ...serviceForm, vehicle_number: event.target.value })} placeholder="Vehicle identifier" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="date" value={serviceForm.service_date} onChange={(event) => setServiceForm({ ...serviceForm, service_date: event.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <input value={serviceForm.vendor_name} onChange={(event) => setServiceForm({ ...serviceForm, vendor_name: event.target.value })} placeholder="Vendor" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input value={serviceForm.service_type} onChange={(event) => setServiceForm({ ...serviceForm, service_type: event.target.value })} placeholder="Service type" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="number" min="0" value={serviceForm.amount} onChange={(event) => setServiceForm({ ...serviceForm, amount: event.target.value })} placeholder="Amount" className="rounded border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <textarea value={serviceForm.notes} onChange={(event) => setServiceForm({ ...serviceForm, notes: event.target.value })} placeholder="Notes and attachment reference" className="h-20 resize-none rounded border border-gray-300 px-3 py-2 text-sm" />
            <button disabled={saving === "service"} onClick={() => void submitService()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <Send size={14} /> Save service
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <RecordPanel title="Trip logs" total={money(totals.logs)} loading={loading} rows={logs.map((row) => ({
          id: row.id,
          title: row.vehicle_number ?? "Vehicle",
          detail: `${personLabel(row.employee)} - ${row.route ?? row.purpose ?? "No route"}`,
          date: row.travel_date ?? "-",
          amount: money(row.amount),
          status: row.status ?? "draft",
        }))} />
        <RecordPanel title="Service entries" total={money(totals.services)} loading={loading} rows={services.map((row) => ({
          id: row.id,
          title: row.vehicle_number ?? "Vehicle",
          detail: `${row.vendor_name ?? "Vendor"} - ${row.service_type ?? personLabel(row.employee)}`,
          date: row.service_date ?? "-",
          amount: money(row.amount),
          status: row.status ?? "draft",
        }))} />
      </div>
    </div>
  );
}

function RecordPanel({ title, total, loading, rows }: { title: string; total: string; loading: boolean; rows: Array<{ id: string; title: string; detail: string; date: string; amount: string; status: string }> }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{rows.length} records - {total}</p>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">No records found.</div>
        ) : rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_130px] gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-gray-900">{row.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>{row.status}</span>
              </div>
              <p className="mt-1 truncate text-sm text-gray-500">{row.detail}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-gray-900">{row.amount}</p>
              <p className="text-xs text-gray-400">{row.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
