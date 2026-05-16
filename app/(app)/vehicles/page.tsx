"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, RefreshCw, Send } from "lucide-react";
import toast from "react-hot-toast";
import { getVisibleFinanceRoutes } from "@/lib/hrms/route-access";

type VehicleLog = { id: string; vehicle_number?: string | null; travel_date?: string | null; route?: string | null; notes?: string | null; purpose?: string | null; distance_km?: number | null; amount?: number | null; status?: string | null; employee?: PersonRef | null };
type VehicleService = { id: string; vehicle_number?: string | null; service_date?: string | null; vendor_name?: string | null; service_type?: string | null; amount?: number | null; notes?: string | null; status?: string | null; employee?: PersonRef | null };
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
  if (status === "approved") return "bg-green-100 text-green-700";
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
  const [error, setError] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceAttachment, setServiceAttachment] = useState<File | null>(null);
  const [logForm, setLogForm] = useState({ vehicle_number: "", travel_date: today(), odometer_start: "", odometer_end: "", route: "", purpose: "", amount: "", status: "submitted" });
  const [serviceForm, setServiceForm] = useState({ vehicle_number: "", service_date: today(), vendor_name: "", service_type: "", amount: "", notes: "", status: "submitted" });

  async function load() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (employeeFilter.trim()) params.set("employee_id", employeeFilter.trim());
    if (dateFilter) params.set("date", dateFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const [logRes, serviceRes] = await Promise.all([
      fetch(`/api/hrms/vehicles/logs?${params.toString()}`),
      fetch(`/api/hrms/vehicles/services?${params.toString()}`),
    ]);
    if (logRes.ok) setLogs(await readList<VehicleLog>(logRes));
    else {
      const message = (await logRes.json().catch(() => ({}))).error ?? "Could not load vehicle logs";
      setError(message);
      toast.error(message);
    }
    if (serviceRes.ok) setServices(await readList<VehicleService>(serviceRes));
    else {
      const message = (await serviceRes.json().catch(() => ({}))).error ?? "Could not load vehicle services";
      setError(message);
      setServices([]);
    }
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

  const filteredLogs = useMemo(() => logs.filter((row) => {
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    const matchesDate = !dateFilter || row.travel_date === dateFilter;
    return matchesStatus && matchesDate;
  }), [dateFilter, logs, statusFilter]);

  const filteredServices = useMemo(() => services.filter((row) => {
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    const matchesDate = !dateFilter || row.service_date === dateFilter;
    return matchesStatus && matchesDate;
  }), [dateFilter, services, statusFilter]);

  const totals = useMemo(() => ({
    logs: filteredLogs.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
    services: filteredServices.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
  }), [filteredLogs, filteredServices]);

  async function submitLog() {
    if (!logForm.vehicle_number.trim() || !logForm.travel_date || !logForm.purpose.trim()) {
      toast.error("Vehicle, trip date and purpose are required");
      return;
    }
    setSaving("log");
    const odometerStart = Number(logForm.odometer_start || 0);
    const odometerEnd = Number(logForm.odometer_end || 0);
    const distanceKm = odometerEnd > odometerStart ? odometerEnd - odometerStart : 0;
    const res = await fetch("/api/hrms/vehicles/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        travel_date: logForm.travel_date,
        vehicle_number: logForm.vehicle_number,
        distance_km: distanceKm,
        amount: Number(logForm.amount || 0),
        purpose: logForm.purpose,
        notes: logForm.route,
        status: logForm.status,
      }),
    });
    setSaving("");
    if (!res.ok) {
      const message = (await res.json().catch(() => ({}))).error ?? "Vehicle log failed";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Vehicle log saved");
    setLogForm({ vehicle_number: "", travel_date: today(), odometer_start: "", odometer_end: "", route: "", purpose: "", amount: "", status: "submitted" });
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
      const message = (await res.json().catch(() => ({}))).error ?? "Vehicle service failed";
      setError(message);
      toast.error(message);
      return;
    }
    toast.success("Vehicle service saved");
    setServiceForm({ vehicle_number: "", service_date: today(), vendor_name: "", service_type: "", amount: "", notes: "", status: "submitted" });
    setServiceAttachment(null);
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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <input value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} placeholder="Employee ID" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
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
              <input type="number" min="0" value={logForm.odometer_start} onChange={(event) => setLogForm({ ...logForm, odometer_start: event.target.value })} placeholder="Odometer start" className="rounded border border-gray-300 px-3 py-2 text-sm" />
              <input type="number" min="0" value={logForm.odometer_end} onChange={(event) => setLogForm({ ...logForm, odometer_end: event.target.value })} placeholder="Odometer end" className="rounded border border-gray-300 px-3 py-2 text-sm" />
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
            <textarea value={serviceForm.notes} onChange={(event) => setServiceForm({ ...serviceForm, notes: event.target.value })} placeholder="Notes" className="h-20 resize-none rounded border border-gray-300 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600">
              <Paperclip size={14} /> {serviceAttachment?.name ?? "Attach service file"}
              <input type="file" className="hidden" onChange={(event) => setServiceAttachment(event.target.files?.[0] ?? null)} />
            </label>
            <button disabled={saving === "service"} onClick={() => void submitService()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
              <Send size={14} /> Save service
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <RecordPanel title="Trip logs" total={money(totals.logs)} loading={loading} rows={filteredLogs.map((row) => ({
          id: row.id,
          title: row.vehicle_number ?? "Vehicle",
          detail: `${personLabel(row.employee)} - ${row.notes ?? row.route ?? row.purpose ?? "No route"}`,
          date: row.travel_date ?? "-",
          amount: money(row.amount),
          status: row.status ?? "draft",
        }))} />
        <RecordPanel title="Service entries" total={money(totals.services)} loading={loading} rows={filteredServices.map((row) => ({
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
